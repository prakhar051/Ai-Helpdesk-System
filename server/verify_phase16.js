const { chromium } = require('playwright');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

async function typeInto(page, typeSelector, text) {
  const locator = page.locator(typeSelector);
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
    console.log('🚀 Starting Phase 16 AI Auto Ticket Routing & Assignment Integration Tests...');

    // Wait for server and client to be fully online
    console.log('Waiting for backend and client servers to be online...');
    for (let i = 0; i < 20; i++) {
      try {
        const backendRes = await fetch('http://localhost:5000/api/v1/health');
        const clientRes = await fetch('http://localhost:5173/');
        if (backendRes.ok && clientRes.ok) break;
      } catch (e) {}
      await new Promise(r => setTimeout(r, 1000));
    }

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

    // Elevate roles in the DB
    const dbCustomer = await prisma.user.findUnique({ where: { email: customerEmail } });
    const dbAgent = await prisma.user.update({ where: { email: agentEmail }, data: { role: 'AGENT' } });
    const dbAdmin = await prisma.user.update({ where: { email: adminEmail }, data: { role: 'ADMIN' } });

    // Admin creates category "Hardware"
    console.log('   Creating category Hardware...');
    await page.goto('http://localhost:5173/categories');
    await page.click('button:has-text("Add Category")');
    await page.fill('input[placeholder*="Network Issues"]', 'Hardware');
    await page.fill('textarea[placeholder*="what kind of tickets"]', 'Hardware repairs.');
    await page.click('button:has-text("Save Category")');
    await page.waitForSelector('text=Category "Hardware" created successfully.');

    // Logout Admin
    await page.goto('http://localhost:5173/dashboard');
    await page.click('button:has-text("Logout")');
    await page.waitForURL('**/login');

    // Seed support tickets and historical expertise data
    const hardwareCat = await prisma.category.findFirst({ where: { name: 'Hardware' } });

    // Seed resolved ticket for Agent to establish expertise dynamically
    await prisma.ticket.create({
      data: {
        title: 'Old Resolved Hardware Ticket',
        description: 'Fixed bad power cord.',
        status: 'RESOLVED',
        priority: 'LOW',
        customerId: dbCustomer.id,
        categoryId: hardwareCat.id,
        agentId: dbAgent.id
      }
    });

    // Seed unresolved ticket to route
    const ticket = await prisma.ticket.create({
      data: {
        title: 'Outlook Sync Errors',
        description: 'Outlook fails to authenticate with sync.',
        status: 'OPEN',
        priority: 'HIGH',
        customerId: dbCustomer.id,
        categoryId: hardwareCat.id
      }
    });
    console.log('   ✓ Seeded ticket and historical expertise records.');

    // 2. Fetch login tokens for API validation
    console.log('2. Validating AI Assignment API endpoint...');
    const loginCustRes = await apiPost('http://localhost:5000/api/v1/auth/login', { email: customerEmail, password: 'password123' });
    const custToken = loginCustRes.data.data.token;

    const loginAdminRes = await apiPost('http://localhost:5000/api/v1/auth/login', { email: adminEmail, password: 'password123' });
    const adminToken = loginAdminRes.data.data.token;

    // Test Customer RBAC Block (should return 403)
    const blockRes = await apiPost('http://localhost:5000/api/v1/tickets/ai/assign', { ticketId: ticket.id }, custToken);
    console.log('   Customer response status code:', blockRes.status);
    if (blockRes.status !== 403) {
      throw new Error(`RBAC Leak: Customer was not blocked. Response status: ${blockRes.status}`);
    }
    console.log('   ✓ Customer blocked successfully.');

    // Test Admin recommendation query
    const recommendRes = await apiPost('http://localhost:5000/api/v1/tickets/ai/assign', { ticketId: ticket.id }, adminToken);
    console.log('   Admin recommendation response status:', recommendRes.status);
    console.log('   Admin recommendation output data:', recommendRes.data.data.recommendation);

    if (recommendRes.status !== 200) {
      throw new Error(`AI Assignment API failed: status ${recommendRes.status}`);
    }

    // 3. Verify Frontend UI layout and direct assignment action
    console.log('3. Verifying Frontend AI Assignment widget and manual assignment trigger...');
    // Log in admin on UI
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('**/dashboard');

    await page.goto('http://localhost:5173/tickets');
    await page.click('text=HD-000002');

    // Wait for the Copilot Assignment widget block header
    await page.waitForSelector('text=AI Assignment Recommendation');
    
    // Trigger on-demand recommendation
    await page.click('button:has-text("Recommend Agent Assignment")');
    
    // Wait for suggested agent name or fallback "No agents available" to render
    await page.waitForSelector('text=Recommended Agent');
    console.log('   ✓ AI Assignment widget successfully rendered.');

    // Screenshot saved directly to artifacts directory
    await page.screenshot({ path: 'C:\\Users\\yadav\\.gemini\\antigravity-ide\\brain\\335b840c-d794-43b2-b47e-7852199b3973\\admin_assignment_recommendation.png' });
    console.log('   ✓ Frontend widget verified and captured.');

    // 4. Verify Fallback behavior when API key is missing
    console.log('4. Verifying offline fallback boundaries...');
    const originalApiKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = '';

    delete require.cache[require.resolve('./services/aiService')];
    const aiServiceInstance = require('./services/aiService');

    const fallbackResult = await aiServiceInstance.recommendAgentAssignment(ticket.id, dbAdmin);
    console.log('   Fallback routing output:', fallbackResult);
    if (fallbackResult.recommendedAgentId !== null || fallbackResult.confidence !== 0) {
      throw new Error('Fallback failed to yield clean empty assignment defaults.');
    }
    console.log('   ✓ Fallback behavior correctly handled.');

    // Restore API Key
    process.env.GEMINI_API_KEY = originalApiKey;

    console.log('\n🎉 ALL PHASE 16 AI AUTO ROUTING & ASSIGNMENT TESTS PASSED SUCCESSFULLY!');
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
