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
    console.log('🚀 Starting Phase 14 AI Sentiment Analysis Integration Tests...');

    // Wait for server to be fully restarted
    console.log('Waiting for backend server to be online...');
    for (let i = 0; i < 15; i++) {
      try {
        const res = await fetch('http://localhost:5000/api/v1/health');
        if (res.ok) break;
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

    // 1. Create seed entries via UI
    console.log('1. Seeding test accounts...');
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(15000);

    // Register Customer 1
    const customerEmail1 = 'customer1@example.com';
    await page.goto('http://localhost:5173/register');
    await typeInto(page, 'Create Account', 'input[type="text"]', 'Customer User 1');
    await typeInto(page, 'Create Account', 'input[type="email"]', customerEmail1);
    await typeInto(page, 'Create Account', 'input[placeholder*="Min 6"]', 'password123');
    await typeInto(page, 'Create Account', 'input[placeholder="••••••••"]', 'password123');
    await page.click('button:has-text("Create Account")');
    await page.waitForURL('**/dashboard');
    await page.click('button:has-text("Logout")');
    await page.waitForURL('**/login');

    // Register Customer 2
    const customerEmail2 = 'customer2@example.com';
    await page.goto('http://localhost:5173/register');
    await typeInto(page, 'Create Account', 'input[type="text"]', 'Customer User 2');
    await typeInto(page, 'Create Account', 'input[type="email"]', customerEmail2);
    await typeInto(page, 'Create Account', 'input[placeholder*="Min 6"]', 'password123');
    await typeInto(page, 'Create Account', 'input[placeholder="••••••••"]', 'password123');
    await page.click('button:has-text("Create Account")');
    await page.waitForURL('**/dashboard');
    await page.click('button:has-text("Logout")');
    await page.waitForURL('**/login');

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
    await prisma.user.update({ where: { email: adminEmail }, data: { role: 'ADMIN' } });

    // Admin creates category "IT Support"
    console.log('   Creating category IT Support...');
    await page.goto('http://localhost:5173/categories');
    await page.click('button:has-text("Add Category")');
    await page.fill('input[placeholder*="Network Issues"]', 'IT Support');
    await page.fill('textarea[placeholder*="what kind of tickets"]', 'IT support tickets.');
    await page.click('button:has-text("Save Category")');
    await page.waitForSelector('text=Category "IT Support" created successfully.');

    // Logout Admin
    await page.goto('http://localhost:5173/dashboard');
    await page.click('button:has-text("Logout")');
    await page.waitForURL('**/login');

    // 2. Fetch Customer 1 and 2 API tokens for endpoint calls
    console.log('2. Seeding existing unresolved ticket...');
    const loginCustomer1Res = await apiPost('http://localhost:5000/api/v1/auth/login', { email: customerEmail1, password: 'password123' });
    const token1 = loginCustomer1Res.data.data.token;
    const dbCustomer1 = await prisma.user.findUnique({ where: { email: customerEmail1 } });

    const loginCustomer2Res = await apiPost('http://localhost:5000/api/v1/auth/login', { email: customerEmail2, password: 'password123' });
    const token2 = loginCustomer2Res.data.data.token;

    const itCategory = await prisma.category.findFirst({ where: { name: 'IT Support' } });

    // Seed ticket belonging to Customer 1
    const ticket = await prisma.ticket.create({
      data: {
        title: 'Exchange Sync Failing',
        description: 'Outlook client fails to authenticate and synchronise folders.',
        status: 'OPEN',
        priority: 'MEDIUM',
        customerId: dbCustomer1.id,
        categoryId: itCategory.id
      }
    });

    // Seed customer and agent comments
    await prisma.comment.create({
      data: {
        content: 'Customer 1: Having Outlook sync issues. Urgently need fix.',
        ticketId: ticket.id,
        authorId: dbCustomer1.id
      }
    });

    const dbAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
    await prisma.comment.create({
      data: {
        content: 'Admin: Please check network status first.',
        ticketId: ticket.id,
        authorId: dbAdmin.id
      }
    });

    await prisma.comment.create({
      data: {
        content: 'Customer 1: Network is working but authentication error still happens. Pls respond!',
        ticketId: ticket.id,
        authorId: dbCustomer1.id
      }
    });
    console.log('   ✓ Seeded ticket and comments.');

    // 3. Test RBAC: Non-owner Customer 2 should receive 403
    console.log('3. Testing RBAC validation: Customer 2 must receive 403...');
    const blockRes = await apiPost('http://localhost:5000/api/v1/tickets/ai/sentiment', { ticketId: ticket.id }, token2);
    console.log('   Customer 2 response status:', blockRes.status);
    if (blockRes.status !== 403) {
      throw new Error(`RBAC failure: expected 403 for Customer 2, got ${blockRes.status}`);
    }
    console.log('   ✓ RBAC checks successfully block Customer 2.');

    // 4. Test AI Sentiment Analysis API endpoint for Customer 1 (Owner)
    console.log('4. Querying /tickets/ai/sentiment endpoint...');
    const sentimentRes = await apiPost('http://localhost:5000/api/v1/tickets/ai/sentiment', { ticketId: ticket.id }, token1);
    console.log('   AI Sentiment response status:', sentimentRes.status);
    console.log('   AI Sentiment data:', sentimentRes.data.data);

    if (sentimentRes.status !== 200) {
      throw new Error(`AI Sentiment analysis endpoint failed: ${sentimentRes.status}`);
    }

    if (!sentimentRes.data.data.sentiment) {
      throw new Error('AI sentiment field is missing in response payload.');
    }

    // 5. Verify Frontend UI layout
    console.log('5. Verifying AI Sentiment Analysis widget on details sidebar...');
    // Log in customer 1 on UI
    await typeInto(page, 'Welcome Back', 'input[type="email"]', customerEmail1);
    await typeInto(page, 'Welcome Back', 'input[type="password"]', 'password123');
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('**/dashboard');

    await page.goto('http://localhost:5173/tickets');
    await page.click('text=HD-000001');

    // Wait for sentiment analysis header
    await page.waitForSelector('text=AI Sentiment Analysis');
    
    // Trigger on-demand replies generator
    await page.click('button:has-text("Analyze Sentiment")');
    
    // Wait for badge text
    await page.waitForSelector('span:has-text("NEGATIVE"), span:has-text("UNKNOWN"), span:has-text("POSITIVE")', { timeout: 10000 });
    console.log('   ✓ Sentiment status badge rendered inside widget container.');

    await page.screenshot({ path: path.join(__dirname, 'customer_sentiment_detail.png') });
    console.log('   ✓ Frontend sentiment widget verified.');

    // 6. Verify Fallback behavior when API key is missing
    console.log('6. Verifying offline fallback boundaries...');
    const originalApiKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = '';

    delete require.cache[require.resolve('./services/aiService')];
    const aiServiceInstance = require('./services/aiService');

    const fallbackResult = await aiServiceInstance.analyzeTicketSentiment(ticket.id, dbCustomer1);
    console.log('   Fallback sentiment output:', fallbackResult);
    if (fallbackResult.sentiment !== 'UNKNOWN' || fallbackResult.confidence !== 0) {
      throw new Error('Fallback failed to yield clean empty defaults.');
    }
    console.log('   ✓ Fallback behavior correctly handled.');

    // Restore API Key
    process.env.GEMINI_API_KEY = originalApiKey;

    console.log('\n🎉 ALL PHASE 14 AI SENTIMENT ANALYSIS TESTS PASSED SUCCESSFULLY!');
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
