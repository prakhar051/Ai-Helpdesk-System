const { chromium } = require('playwright');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

async function typeInto(page, pageTitle, typeSelector, text) {
  const selector = `div:has(h1:has-text("${pageTitle}")) ${typeSelector}, div:has(h2:has-text("${pageTitle}")) ${typeSelector}`;
  const locator = page.locator(selector);
  await locator.fill(text);
}

async function apiGet(url, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { method: 'GET', headers });
  const data = await res.json();
  return { status: res.status, data };
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
    console.log('🚀 Starting Phase 15 AI Dashboard & Analytics Integration Tests...');

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

    // Register Admin
    const adminEmail = 'admin@example.com';
    await page.goto('http://localhost:5173/register');
    await page.fill('input[placeholder="John Doe"]', 'Admin User');
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[placeholder*="Min 6"]', 'password123');
    await page.fill('input[placeholder="••••••••"]', 'password123');
    await page.click('button:has-text("Create Account")');
    await page.waitForURL('**/dashboard');

    // Elevate admin
    const dbAdmin = await prisma.user.update({ where: { email: adminEmail }, data: { role: 'ADMIN' } });

    // Admin creates category "Hardware" and "Billing"
    console.log('   Creating categories...');
    await page.goto('http://localhost:5173/categories');
    await page.click('button:has-text("Add Category")');
    await page.fill('input[placeholder*="Network Issues"]', 'Hardware');
    await page.fill('textarea[placeholder*="what kind of tickets"]', 'Hardware repairs.');
    await page.click('button:has-text("Save Category")');
    await page.waitForSelector('text=Category "Hardware" created successfully.');

    await page.click('button:has-text("Add Category")');
    await page.fill('input[placeholder*="Network Issues"]', 'Billing');
    await page.fill('textarea[placeholder*="what kind of tickets"]', 'Invoicing and billing issues.');
    await page.click('button:has-text("Save Category")');
    await page.waitForSelector('text=Category "Billing" created successfully.');

    // Logout Admin
    await page.goto('http://localhost:5173/dashboard');
    await page.click('button:has-text("Logout")');
    await page.waitForURL('**/login');

    // Retrieve database objects
    const dbCustomer = await prisma.user.findUnique({ where: { email: customerEmail } });
    const hardwareCat = await prisma.category.findFirst({ where: { name: 'Hardware' } });
    const billingCat = await prisma.category.findFirst({ where: { name: 'Billing' } });

    // Create tickets
    console.log('   Seeding support tickets...');
    const t1 = await prisma.ticket.create({
      data: {
        title: 'Outlook Sync Errors',
        description: 'Outlook fails to authenticate with sync.',
        status: 'OPEN',
        priority: 'HIGH',
        customerId: dbCustomer.id,
        categoryId: hardwareCat.id,
        agentId: dbAdmin.id,
        aiReason: 'Priority evaluated as HIGH based on sync blocking.'
      }
    });

    const t2 = await prisma.ticket.create({
      data: {
        title: 'Monthly Invoice Missing',
        description: 'Need invoice for June 2026.',
        status: 'IN_PROGRESS',
        priority: 'LOW',
        customerId: dbCustomer.id,
        categoryId: billingCat.id
      }
    });

    // 2. Fetch login tokens for API validation
    console.log('2. Validating Dashboard API endpoint...');
    const loginAdminRes = await apiPost('http://localhost:5000/api/v1/auth/login', { email: adminEmail, password: 'password123' });
    const adminToken = loginAdminRes.data.data.token;

    const loginCustRes = await apiPost('http://localhost:5000/api/v1/auth/login', { email: customerEmail, password: 'password123' });
    const custToken = loginCustRes.data.data.token;

    // Test Admin metrics query
    const adminStatsRes = await apiGet('http://localhost:5000/api/v1/dashboard', adminToken);
    console.log('   Admin stats response code:', adminStatsRes.status);
    const adminStats = adminStatsRes.data.data;
    console.log('   Admin stats dataset ticketMetrics:', adminStats.ticketMetrics);
    console.log('   Admin stats dataset priorityMetrics:', adminStats.priorityMetrics);
    console.log('   Admin stats dataset categoryMetrics:', adminStats.categoryMetrics);
    console.log('   Admin stats dataset assignmentMetrics:', adminStats.assignmentMetrics);
    console.log('   Admin stats dataset aiMetrics:', adminStats.aiMetrics);

    if (adminStatsRes.status !== 200) {
      throw new Error(`Admin stats API returned status ${adminStatsRes.status}`);
    }

    if (adminStats.ticketMetrics.total !== 2 || adminStats.ticketMetrics.open !== 1 || adminStats.ticketMetrics.inProgress !== 1) {
      throw new Error('Incorrect ticket status aggregates for Admin dashboard.');
    }

    if (adminStats.priorityMetrics.high !== 1 || adminStats.priorityMetrics.low !== 1) {
      throw new Error('Incorrect priority aggregates for Admin dashboard.');
    }

    if (adminStats.aiMetrics.classifiedCount !== 1) {
      throw new Error('Incorrect AI auto-classification count.');
    }

    // Test Customer metrics query (scope checks)
    const custStatsRes = await apiGet('http://localhost:5000/api/v1/dashboard', custToken);
    console.log('   Customer stats response code:', custStatsRes.status);
    const custStats = custStatsRes.data.data;
    console.log('   Customer stats dataset ticketMetrics:', custStats.ticketMetrics);
    console.log('   Customer stats dataset assignmentMetrics:', custStats.assignmentMetrics);

    if (custStatsRes.status !== 200) {
      throw new Error(`Customer stats API returned status ${custStatsRes.status}`);
    }

    // Customer workload lists must be empty
    if (custStats.assignmentMetrics.agentWorkload.length !== 0) {
      throw new Error('RBAC Leak: Customer received agent workload metrics.');
    }

    // 3. Verify Frontend Dashboard view rendering
    console.log('3. Verifying Frontend Dashboard layouts...');
    // Log in admin on UI
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('**/dashboard');

    // Wait for Dashboard Portal text and stats card
    await page.waitForSelector('text=Total Tickets');
    await page.waitForSelector('text=✨ AI Copilot Operations Analytics');

    await page.screenshot({ path: 'C:\\Users\\yadav\\.gemini\\antigravity-ide\\brain\\335b840c-d794-43b2-b47e-7852199b3973\\admin_dashboard_recharts.png' });
    console.log('   ✓ Admin Dashboard rendered and captured.');

    console.log('\n🎉 ALL PHASE 15 AI DASHBOARD & ANALYTICS TESTS PASSED SUCCESSFULLY!');
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
