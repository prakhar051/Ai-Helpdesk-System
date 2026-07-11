const { chromium } = require('playwright');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');

// 1. Intercept Nodemailer transporter creation
const nodemailer = require('nodemailer');
const sentEmails = [];
let simulateSmtpFailure = false;

nodemailer.createTransport = (config) => {
  return {
    sendMail: async (mailOptions) => {
      if (simulateSmtpFailure) {
        throw new Error('SMTP Connection Refused - Socket closed unexpectedly');
      }
      sentEmails.push({ config, mailOptions });
      return { messageId: `mock-msg-${Date.now()}` };
    }
  };
};

const emailService = require('./services/emailService');
const prisma = new PrismaClient();

async function apiPost(url, body, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  const data = await res.json();
  return { status: res.status, data };
}

async function apiPatch(url, body, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { method: 'PATCH', headers, body: JSON.stringify(body) });
  const data = await res.json();
  return { status: res.status, data };
}

(async () => {
  let browser;
  try {
    console.log('🚀 Starting Phase 17 AI Email Notifications & Automation Integration Tests...');

    // Clean database
    console.log('Cleaning up database...');
    await prisma.comment.deleteMany({});
    await prisma.attachment.deleteMany({});
    await prisma.ticket.deleteMany({});
    await prisma.article.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$executeRawUnsafe('ALTER SEQUENCE tickets_ticket_number_seq RESTART WITH 1;');

    // 1. Create seed entries
    console.log('1. Seeding test accounts...');
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(45000);

    // Register Customer
    const customerEmail = 'customer@example.com';
    await page.goto('http://localhost:5173/register');
    await page.fill('input[placeholder="John Doe"]', 'Customer User');
    await page.fill('input[type="email"]', customerEmail);
    await page.fill('input[placeholder*="Min 6"]', 'password123');
    await page.fill('input[placeholder="••••••••"]', 'password123');
    await page.click('button:has-text("Create Account")');
    await page.waitForURL('**/dashboard');
    await page.click('button:has-text("Logout")');
    await page.waitForURL('**/login');

    // Register Agent
    const agentEmail = 'agent@example.com';
    await page.goto('http://localhost:5173/register');
    await page.fill('input[placeholder="John Doe"]', 'Agent User');
    await page.fill('input[type="email"]', agentEmail);
    await page.fill('input[placeholder*="Min 6"]', 'password123');
    await page.fill('input[placeholder="••••••••"]', 'password123');
    await page.click('button:has-text("Create Account")');
    await page.waitForURL('**/dashboard');
    await page.click('button:has-text("Logout")');
    await page.waitForURL('**/login');

    // Register Admin
    const adminEmail = 'admin@example.com';
    await page.goto('http://localhost:5173/register');
    await page.fill('input[placeholder="John Doe"]', 'Admin User');
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[placeholder*="Min 6"]', 'password123');
    await page.fill('input[placeholder="••••••••"]', 'password123');
    await page.click('button:has-text("Create Account")');
    await page.waitForURL('**/dashboard');

    const dbCustomer = await prisma.user.findUnique({ where: { email: customerEmail } });
    const dbAgent = await prisma.user.update({ where: { email: agentEmail }, data: { role: 'AGENT' } });
    const dbAdmin = await prisma.user.update({ where: { email: adminEmail }, data: { role: 'ADMIN' } });

    // Admin creates category "Software"
    console.log('   Creating category Software...');
    await page.goto('http://localhost:5173/categories');
    await page.click('button:has-text("Add Category")');
    await page.fill('input[placeholder*="Network Issues"]', 'Software');
    await page.fill('textarea[placeholder*="what kind of tickets"]', 'Software bugs and issues.');
    await page.click('button:has-text("Save Category")');
    await page.waitForSelector('text=Category "Software" created successfully.');

    // Logout Admin
    await page.goto('http://localhost:5173/dashboard');
    await page.click('button:has-text("Logout")');
    await page.waitForURL('**/login');

    const softwareCat = await prisma.category.findFirst({ where: { name: 'Software' } });

    // Fetch login tokens for API validation
    const loginCustRes = await apiPost('http://localhost:5000/api/v1/auth/login', { email: customerEmail, password: 'password123' });
    const custToken = loginCustRes.data.data.token;

    const loginAdminRes = await apiPost('http://localhost:5000/api/v1/auth/login', { email: adminEmail, password: 'password123' });
    const adminToken = loginAdminRes.data.data.token;

    // 2. Validate Ticket Creation notification & Admin Notification for URGENT tickets
    console.log('2. Validating Ticket Creation notification logic...');
    sentEmails.length = 0; // Clear history

    const newTicketRes = await apiPost('http://localhost:5000/api/v1/tickets', {
      title: 'Database connection fails',
      description: 'Production db connection pool error.',
      priority: 'URGENT',
      categoryId: softwareCat.id
    }, custToken);

    if (newTicketRes.status !== 201) {
      throw new Error(`Failed to create ticket via API: status ${newTicketRes.status}`);
    }

    // Wait short time for async nextTick events
    await new Promise(r => setTimeout(r, 200));

    console.log(`   Captured ${sentEmails.length} outgoing emails from ticket creation.`);
    // Should send 1 to customer, and 1 alert to admin (since priority is URGENT)
    const customerCreationEmail = sentEmails.find(e => e.mailOptions.to === customerEmail);
    const adminAlertEmail = sentEmails.find(e => e.mailOptions.to === adminEmail);

    if (!customerCreationEmail) throw new Error('Customer did not receive ticket creation notification.');
    if (!adminAlertEmail) throw new Error('Admin did not receive URGENT priority alert.');

    // Verify HTML templates rendering structures
    if (!customerCreationEmail.mailOptions.html.includes('HD-000001') || !customerCreationEmail.mailOptions.html.includes('Database connection fails')) {
      throw new Error('Ticket Creation HTML Template content rendering mismatch.');
    }
    console.log('   ✓ Creation and Urgent Alert notifications successfully sent & validated.');

    // 3. Validate Assignment notification
    console.log('3. Validating Assignment notification logic...');
    sentEmails.length = 0; // Clear history
    const ticketId = newTicketRes.data.data.ticket.id;

    // Admin assigns ticket to Agent
    const assignRes = await apiPatch(`http://localhost:5000/api/v1/tickets/${ticketId}`, {
      agentId: dbAgent.id
    }, adminToken);

    if (assignRes.status !== 200) {
      throw new Error(`Failed to assign agent: status ${assignRes.status}`);
    }

    await new Promise(r => setTimeout(r, 200));
    const agentAssignEmail = sentEmails.find(e => e.mailOptions.to === agentEmail);
    if (!agentAssignEmail) throw new Error('Agent did not receive assignment notification.');
    if (!agentAssignEmail.mailOptions.html.includes('New Ticket Assigned')) {
      throw new Error('Assignment HTML Template content rendering mismatch.');
    }
    console.log('   ✓ Agent assignment notification successfully sent & validated.');

    // 4. Validate Status change notification
    console.log('4. Validating Status Change notification logic...');
    sentEmails.length = 0; // Clear history

    const statusRes = await apiPatch(`http://localhost:5000/api/v1/tickets/${ticketId}`, {
      status: 'IN_PROGRESS'
    }, adminToken);

    if (statusRes.status !== 200) {
      throw new Error(`Failed to update status: status ${statusRes.status}`);
    }

    await new Promise(r => setTimeout(r, 200));
    const custStatusEmail = sentEmails.find(e => e.mailOptions.to === customerEmail);
    if (!custStatusEmail) throw new Error('Customer did not receive status changed notification.');
    if (!custStatusEmail.mailOptions.html.includes('Status Changed to IN_PROGRESS')) {
      throw new Error('Status Change HTML Template content rendering mismatch.');
    }
    console.log('   ✓ Status change notification successfully sent & validated.');

    // 5. Validate Comments reply notifications
    console.log('5. Validating Comments notification logic...');
    
    // Test Case: Agent replies to Customer
    sentEmails.length = 0; // Clear history
    const commentAgentRes = await apiPost(`http://localhost:5000/api/v1/tickets/${ticketId}/comments`, {
      content: 'Hello, we are investigating the database pools now.'
    }, adminToken); // Admin acting as Support Agent role

    if (commentAgentRes.status !== 201) {
      throw new Error(`Failed to add agent comment: status ${commentAgentRes.status}`);
    }

    await new Promise(r => setTimeout(r, 200));
    const custCommentEmail = sentEmails.find(e => e.mailOptions.to === customerEmail);
    if (!custCommentEmail) throw new Error('Customer did not receive comment reply notification from agent.');
    if (!custCommentEmail.mailOptions.html.includes('we are investigating the database pools')) {
      throw new Error('Agent reply template content mismatch.');
    }

    // Test Case: Customer replies to Agent
    sentEmails.length = 0; // Clear history
    const commentCustRes = await apiPost(`http://localhost:5000/api/v1/tickets/${ticketId}/comments`, {
      content: 'Thank you, please check server memory as well.'
    }, custToken);

    if (commentCustRes.status !== 201) {
      throw new Error(`Failed to add customer comment: status ${commentCustRes.status}`);
    }

    await new Promise(r => setTimeout(r, 200));
    const agentCommentEmail = sentEmails.find(e => e.mailOptions.to === agentEmail);
    if (!agentCommentEmail) throw new Error('Agent did not receive comment notification from customer.');
    if (!agentCommentEmail.mailOptions.html.includes('check server memory')) {
      throw new Error('Customer reply template content mismatch.');
    }
    console.log('   ✓ Comment notifications successfully validated.');

    // 6. Validate Resolution & Closure notifications
    console.log('6. Validating Resolution & Closure notification logic...');
    sentEmails.length = 0; // Clear history

    // Resolve ticket
    await apiPatch(`http://localhost:5000/api/v1/tickets/${ticketId}`, { status: 'RESOLVED' }, adminToken);
    await new Promise(r => setTimeout(r, 200));
    const resolveEmail = sentEmails.find(e => e.mailOptions.to === customerEmail && e.mailOptions.subject.includes('[Resolved]'));
    if (!resolveEmail) throw new Error('Customer did not receive resolution email.');

    // Close ticket
    sentEmails.length = 0;
    await apiPatch(`http://localhost:5000/api/v1/tickets/${ticketId}`, { status: 'CLOSED' }, adminToken);
    await new Promise(r => setTimeout(r, 200));
    const closeEmail = sentEmails.find(e => e.mailOptions.to === customerEmail && e.mailOptions.subject.includes('[Closed]'));
    if (!closeEmail) throw new Error('Customer did not receive closure email.');
    console.log('   ✓ Resolution and Closure notifications successfully validated.');

    // 7. Verify SMTP failure boundaries (API response unaffected by email failure)
    console.log('7. Verifying SMTP failure boundary conditions...');
    simulateSmtpFailure = true;
    sentEmails.length = 0;

    const newTicketFailRes = await apiPost('http://localhost:5000/api/v1/tickets', {
      title: 'Email error fallback test',
      description: 'SMTP is down, but this API request must succeed.',
      priority: 'MEDIUM',
      categoryId: softwareCat.id
    }, custToken);

    // API should return 201 successfully, without throwing 500 errors!
    console.log('   API Response status when SMTP is offline:', newTicketFailRes.status);
    if (newTicketFailRes.status !== 201) {
      throw new Error(`API failed on SMTP errors: status ${newTicketFailRes.status}`);
    }
    console.log('   ✓ API unaffected by SMTP connection offline failures.');

    // 8. Verify UI rendering details showing notification queues
    console.log('8. Verifying Frontend UI notification feedback overlays...');
    // Log in admin on UI
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('**/dashboard');

    await page.goto('http://localhost:5173/tickets');
    await page.click('text=HD-000001');

    // Trigger status update via UI dropdown select
    await page.selectOption('div:has(label:has-text("Status")) select', 'IN_PROGRESS');

    // Wait for the UI toast or feedback containing Notification email queued
    await page.waitForSelector('text=Notification email queued');
    console.log('   ✓ Frontend notification overlay render validation successful.');

    // Screenshot saved directly to artifacts directory
    await page.screenshot({ path: 'C:\\Users\\yadav\\.gemini\\antigravity-ide\\brain\\335b840c-d794-43b2-b47e-7852199b3973\\admin_email_notification.png' });
    console.log('   ✓ Screenshot captured.');

    console.log('\n🎉 ALL PHASE 17 AI EMAIL NOTIFICATION TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
    await prisma.$disconnect();
  }
})();
