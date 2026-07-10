const { chromium } = require('playwright');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

async function typeInto(page, pageTitle, typeSelector, text) {
  const selector = `div:has(h2:has-text("${pageTitle}")) ${typeSelector}`;
  const locator = page.locator(selector);
  await locator.fill(text);
}

async function apiPost(url, body, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  const data = await res.json();
  return { status: res.status, data };
}

(async () => {
  let browser;
  try {
    console.log('🚀 Starting Phase 12 AI Suggested Replies Integration Tests...');

    // Clean database
    console.log('Cleaning up database...');
    await prisma.comment.deleteMany({});
    await prisma.attachment.deleteMany({});
    await prisma.ticket.deleteMany({});
    await prisma.article.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$executeRawUnsafe('ALTER SEQUENCE tickets_ticket_number_seq RESTART WITH 1;');

    // 1. Create seed entries via UI
    console.log('1. Seeding test accounts...');
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(15000);

    // Register Customer
    const customerEmail = 'customer@example.com';
    await page.goto('http://localhost:5173/register');
    await typeInto(page, 'Create Account', 'input[type="text"]', 'Customer User');
    await typeInto(page, 'Create Account', 'input[type="email"]', customerEmail);
    await typeInto(page, 'Create Account', 'input[placeholder*="Min 6"]', 'password123');
    await typeInto(page, 'Create Account', 'input[placeholder="••••••••"]', 'password123');
    await page.click('button:has-text("Create Account")');
    await page.waitForURL('**/dashboard');
    await page.click('button:has-text("Logout")');
    await page.waitForURL('**/login');

    // Register Agent (as Customer first, then elevate role)
    const agentEmail = 'agent@example.com';
    await page.goto('http://localhost:5173/register');
    await typeInto(page, 'Create Account', 'input[type="text"]', 'Agent User');
    await typeInto(page, 'Create Account', 'input[type="email"]', agentEmail);
    await typeInto(page, 'Create Account', 'input[placeholder*="Min 6"]', 'password123');
    await typeInto(page, 'Create Account', 'input[placeholder="••••••••"]', 'password123');
    await page.click('button:has-text("Create Account")');
    await page.waitForURL('**/dashboard');
    await page.click('button:has-text("Logout")');
    await page.waitForURL('**/login');

    // Elevate agent
    await prisma.user.update({ where: { email: agentEmail }, data: { role: 'AGENT' } });

    // Register Admin
    const adminEmail = 'admin@example.com';
    await page.goto('http://localhost:5173/register');
    await typeInto(page, 'Create Account', 'input[type="text"]', 'Admin User');
    await typeInto(page, 'Create Account', 'input[type="email"]', adminEmail);
    await typeInto(page, 'Create Account', 'input[placeholder*="Min 6"]', 'password123');
    await typeInto(page, 'Create Account', 'input[placeholder="••••••••"]', 'password123');
    await page.click('button:has-text("Create Account")');
    await page.waitForURL('**/dashboard');

    // Elevate admin
    const dbAdmin = await prisma.user.update({ where: { email: adminEmail }, data: { role: 'ADMIN' } });

    // Admin creates category "General Support"
    console.log('   Creating category General Support...');
    await page.goto('http://localhost:5173/categories');
    await page.click('button:has-text("Add Category")');
    await page.fill('input[placeholder*="Network Issues"]', 'General Support');
    await page.fill('textarea[placeholder*="what kind of tickets"]', 'General support queries.');
    await page.click('button:has-text("Save Category")');
    await page.waitForSelector('text=Category "General Support" created successfully.');

    // Logout Admin
    await page.goto('http://localhost:5173/dashboard');
    await page.click('button:has-text("Logout")');
    await page.waitForURL('**/login');

    // 2. Fetch API tokens for endpoint calls
    console.log('2. Fetching user login credentials...');
    const loginCustomerRes = await apiPost('http://localhost:5000/api/v1/auth/login', { email: customerEmail, password: 'password123' });
    const customerToken = loginCustomerRes.data.data.token;
    const dbCustomer = await prisma.user.findUnique({ where: { email: customerEmail } });

    const loginAgentRes = await apiPost('http://localhost:5000/api/v1/auth/login', { email: agentEmail, password: 'password123' });
    const agentToken = loginAgentRes.data.data.token;
    const dbAgent = await prisma.user.findUnique({ where: { email: agentEmail } });

    const supportCategory = await prisma.category.findFirst({ where: { name: 'General Support' } });

    // 3. Create Ticket and seed comments
    console.log('3. Seeding ticket and comments...');
    const ticket = await prisma.ticket.create({
      data: {
        title: 'Outlook connection sync failures',
        description: 'Outlook cannot connect to exchange server and syncing fails.',
        status: 'OPEN',
        priority: 'MEDIUM',
        customerId: dbCustomer.id,
        categoryId: supportCategory.id,
        agentId: dbAgent.id
      }
    });

    await prisma.comment.create({
      data: {
        content: 'Customer: Having Outlook sync issues.',
        ticketId: ticket.id,
        authorId: dbCustomer.id
      }
    });

    await prisma.comment.create({
      data: {
        content: 'Agent: Please check network status first.',
        ticketId: ticket.id,
        authorId: dbAgent.id
      }
    });
    console.log('   ✓ Ticket and comments seeded.');

    // Seed KB article
    await prisma.article.create({
      data: {
        title: 'Outlook Sync Guide',
        slug: 'outlook-sync-guide',
        content: 'Guidance to solve Outlook cache synchronization issues.',
        category: 'General Support',
        status: 'PUBLISHED',
        authorId: dbAdmin.id
      }
    });

    // 4. Test RBAC: Customer should be blocked from suggested replies
    console.log('4. Testing RBAC restrictions: Customer should receive 403...');
    const blockRes = await apiPost('http://localhost:5000/api/v1/tickets/ai/reply', { ticketId: ticket.id }, customerToken);
    console.log('   Customer response status:', blockRes.status);
    if (blockRes.status !== 403) {
      throw new Error(`RBAC failure: expected 403 for Customer, got ${blockRes.status}`);
    }
    console.log('   ✓ RBAC checks successfully block Customer.');

    // 5. Test AI Suggested Reply endpoint (POST /tickets/ai/reply)
    console.log('5. Testing /tickets/ai/reply endpoint for Agent...');
    const replyRes = await apiPost('http://localhost:5000/api/v1/tickets/ai/reply', { ticketId: ticket.id }, agentToken);
    console.log('   Agent AI Suggested Reply Response Status:', replyRes.status);
    console.log('   Agent AI Suggested Reply data:', replyRes.data.data);

    if (replyRes.status !== 200) {
      throw new Error(`AI suggested reply endpoint returned failure status: ${replyRes.status}`);
    }

    if (!replyRes.data.data.reply) {
      throw new Error('AI reply suggested text is missing.');
    }

    // 6. Verify Frontend UI layout for Agent
    console.log('6. Verifying suggested replies panel layout on Agent dashboard...');
    await typeInto(page, 'Welcome Back', 'input[type="email"]', agentEmail);
    await typeInto(page, 'Welcome Back', 'input[type="password"]', 'password123');
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('**/dashboard');

    await page.goto('http://localhost:5173/tickets');
    await page.click('text=HD-000001');

    // Wait for suggested reply header to load
    await page.waitForSelector('text=AI Suggested Reply');
    
    // Trigger on-demand replies generator
    await page.click('button:has-text("Generate Reply")');
    
    // Wait for text box or final rendering
    await page.waitForSelector('textarea', { timeout: 10000 });
    console.log('   ✓ Suggested reply draft loaded inside editable textarea.');

    // Test Copy Action
    await page.click('button:has-text("Copy Reply")');
    await page.waitForSelector('text=Copied!');
    console.log('   ✓ Copy indicator feedback validated successfully.');

    await page.screenshot({ path: path.join(__dirname, 'agent_suggested_reply_detail.png') });

    // 7. Verify Fallback behavior when API Key is missing or invalid
    console.log('7. Verifying API key failure boundaries...');
    const originalApiKey = process.env.GEMINI_API_KEY;
    
    // Temporarily clear key
    process.env.GEMINI_API_KEY = '';
    delete require.cache[require.resolve('./services/aiService')];
    const aiServiceInstance = require('./services/aiService');

    const fallbackResult = await aiServiceInstance.generateSuggestedReply(ticket.id, dbAgent);
    console.log('   Fallback suggested reply result:', fallbackResult);
    
    if (!fallbackResult.reply.includes('unavailable')) {
      throw new Error('Fallback failed to return expected defaults.');
    }
    console.log('   ✓ Fallback behavior correctly handled.');

    // Restore API Key
    process.env.GEMINI_API_KEY = originalApiKey;

    console.log('\n🎉 ALL PHASE 12 AI SUGGESTED REPLIES TESTS PASSED SUCCESSFULLY!');
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
