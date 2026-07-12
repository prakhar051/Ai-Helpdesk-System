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
    console.log('🚀 Starting Phase 9 AI Ticket Intelligence Integration Tests...');

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

    // Admin creates categories: General Support, Billing & Invoices
    console.log('   Creating categories: General Support, Billing & Invoices...');
    await page.goto('http://localhost:5173/categories');
    
    // Create General Support
    await page.click('button:has-text("Add Category")');
    await page.fill('input[placeholder*="Network Issues"]', 'General Support');
    await page.fill('textarea[placeholder*="what kind of tickets"]', 'General support queries.');
    await page.click('button:has-text("Save Category")');
    await page.waitForSelector('text=Category "General Support" created successfully.');

    // Create Billing & Invoices
    await page.click('button:has-text("Add Category")');
    await page.fill('input[placeholder*="Network Issues"]', 'Billing & Invoices');
    await page.fill('textarea[placeholder*="what kind of tickets"]', 'Payments, charges and billing receipts.');
    await page.click('button:has-text("Save Category")');
    await page.waitForSelector('text=Category "Billing & Invoices" created successfully.');

    // Logout Admin
    await page.goto('http://localhost:5173/dashboard');
    await page.click('button:has-text("Logout")');
    await page.waitForURL('**/login');

    // 2. Fetch Customer API tokens for endpoint calls
    console.log('2. Logging in Customer via API...');
    const loginRes = await apiPost('http://localhost:5000/api/v1/auth/login', { email: customerEmail, password: 'password123' });
    const token = loginRes.data.data.token;

    // 3. Test AI Suggestion endpoints with live Gemini (if API Key present)
    console.log('3. Testing /tickets/ai/analyze intelligence endpoint...');
    const analyzePayload = {
      title: 'Payment declined on checkout page',
      description: 'I tried to buy the premium plan package using my visa card but it failed twice with transaction error code 402.'
    };

    const analyzeRes = await apiPost('http://localhost:5000/api/v1/tickets/ai/analyze', analyzePayload, token);
    console.log('   AI Analysis Response Status:', analyzeRes.status);
    console.log('   AI Prediction data:', analyzeRes.data.data);

    if (analyzeRes.status !== 200) {
      throw new Error(`AI Prediction endpoint returned failure status: ${analyzeRes.status}`);
    }

    const prediction = analyzeRes.data.data;
    if (!prediction.priority || !prediction.reason) {
      throw new Error('Prediction return is missing expected fields priority/reason.');
    }
    
    // Check if live prediction matches Billing Category
    const billingCategory = await prisma.category.findUnique({ where: { name: 'Billing & Invoices' } });
    if (process.env.GEMINI_API_KEY && prediction.categoryId !== billingCategory.id) {
      console.warn(`⚠️ Warning: Predicted category id ${prediction.categoryId} does not match expected Billing Category id ${billingCategory.id}. (AI variance or fallback activated)`);
    }

    // 4. Verify Database mapping and creation with aiReason
    console.log('4. Verifying ticket creation with AI recommendations...');
    const createTicketRes = await apiPost('http://localhost:5000/api/v1/tickets', {
      title: analyzePayload.title,
      description: analyzePayload.description,
      priority: prediction.priority,
      categoryId: prediction.categoryId,
      aiReason: prediction.reason
    }, token);

    if (createTicketRes.status !== 201) {
      throw new Error(`Failed to create ticket with prediction parameters: ${createTicketRes.status}`);
    }

    const createdTicket = await prisma.ticket.findFirst({
      where: { aiReason: prediction.reason }
    });

    if (!createdTicket) {
      throw new Error('Ticket was not successfully saved with correct aiReason stored in the database.');
    }
    console.log('   ✓ Ticket saved successfully with aiReason:', createdTicket.aiReason);

    // 5. Verify Frontend interface loading details
    console.log('5. Verifying AI recommendation visibility in the frontend detail panel...');
    await typeInto(page, 'Welcome Back', 'input[type="email"]', customerEmail);
    await typeInto(page, 'Welcome Back', 'input[type="password"]', 'password123');
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('**/dashboard');

    await page.goto('http://localhost:5173/tickets');
    await page.click('text=HD-000001');

    // Wait for detail view sidebar context to render
    await page.waitForSelector('text=AI Recommendation Context');
    console.log('   ✓ AI recommendation context sidebar widget rendered.');
    await page.screenshot({ path: path.join(__dirname, 'customer_ai_ticket_detail.png') });

    // 6. Verify Fallback behavior when API Key is missing or invalid
    console.log('6. Verifying API fallback boundaries...');
    const originalApiKey = process.env.GEMINI_API_KEY;
    
    // Temporarily clear key
    process.env.GEMINI_API_KEY = '';
    delete require.cache[require.resolve('./services/aiService')];
    const aiServiceInstance = require('./services/aiService');

    const fallbackResult = await aiServiceInstance.predictCategoryPriority('Testing fallback', 'Short description to trigger fallback.');
    console.log('   Fallback prediction result:', fallbackResult);
    
    if (fallbackResult.priority !== 'MEDIUM' || fallbackResult.categoryId !== null || !fallbackResult.reason.includes('unavailable')) {
      throw new Error('Fallback failed to return expected defaults.');
    }
    console.log('   ✓ Fallback behavior correctly handled.');

    // Restore API Key
    process.env.GEMINI_API_KEY = originalApiKey;

    console.log('\n🎉 ALL PHASE 9 AI TICKET INTELLIGENCE TESTS PASSED SUCCESSFULLY!');
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
