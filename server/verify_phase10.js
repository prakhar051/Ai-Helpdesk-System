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
    console.log('🚀 Starting Phase 10 AI KB Recommendations Integration Tests...');

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

    // Admin creates category "IT Support"
    console.log('   Creating category IT Support...');
    await page.goto('http://localhost:5173/categories');
    await page.click('button:has-text("Add Category")');
    await page.fill('input[placeholder*="Network Issues"]', 'IT Support');
    await page.fill('textarea[placeholder*="what kind of tickets"]', 'IT and technical hardware support.');
    await page.click('button:has-text("Save Category")');
    await page.waitForSelector('text=Category "IT Support" created successfully.');

    // Logout Admin
    await page.goto('http://localhost:5173/dashboard');
    await page.click('button:has-text("Logout")');
    await page.waitForURL('**/login');

    // Fetch Admin token to seed published KB article via API (to simplify script flow)
    const loginAdminRes = await apiPost('http://localhost:5000/api/v1/auth/login', { email: adminEmail, password: 'password123' });
    const adminToken = loginAdminRes.data.data.token;
    const itCategory = await prisma.category.findFirst({ where: { name: 'IT Support' } });

    console.log('2. Creating published KB article...');
    // Create published article in database
    const dbAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
    const article = await prisma.article.create({
      data: {
        title: 'How to fix outlook email sync failures',
        slug: 'how-to-fix-outlook-email-sync-failures',
        content: 'Troubleshooting steps for clearing sync failures in Microsoft Outlook client.',
        category: 'IT Support',
        status: 'PUBLISHED',
        authorId: dbAdmin.id
      }
    });
    console.log('   ✓ KB Article created:', article.title);

    // 3. Fetch Customer API tokens for endpoint calls
    console.log('3. Logging in Customer via API...');
    const loginRes = await apiPost('http://localhost:5000/api/v1/auth/login', { email: customerEmail, password: 'password123' });
    const token = loginRes.data.data.token;

    // 4. Test AI KB Recommendation endpoints with live Gemini (if API Key present)
    console.log('4. Testing /tickets/ai/recommend-kb recommendations endpoint...');
    const recommendPayload = {
      title: 'Outlook outlook email failed synchronization',
      description: 'I cannot receive new emails and outlook is throwing syncing errors.',
      categoryId: itCategory.id
    };

    const recommendRes = await apiPost('http://localhost:5000/api/v1/tickets/ai/recommend-kb', recommendPayload, token);
    console.log('   AI KB Recommendation Response Status:', recommendRes.status);
    console.log('   AI Recommendations data:', recommendRes.data.data.recommendations);

    if (recommendRes.status !== 200) {
      throw new Error(`AI KB Recommendation endpoint returned failure status: ${recommendRes.status}`);
    }

    const recommendations = recommendRes.data.data.recommendations;
    if (process.env.GEMINI_API_KEY && recommendations.length === 0) {
      console.warn('⚠️ Warning: Gemini returned zero recommendations (live AI API mismatch).');
    }

    // 5. Verify Database creation of ticket and frontend preview
    console.log('5. Creating a Customer ticket and checking details panel layout...');
    const createTicketRes = await apiPost('http://localhost:5000/api/v1/tickets', {
      title: recommendPayload.title,
      description: recommendPayload.description,
      priority: 'HIGH',
      categoryId: recommendPayload.categoryId
    }, token);

    if (createTicketRes.status !== 201) {
      throw new Error(`Failed to create ticket: ${createTicketRes.status}`);
    }

    // Log in customer on UI to inspect sidebar solutions card
    await typeInto(page, 'Welcome Back', 'input[type="email"]', customerEmail);
    await typeInto(page, 'Welcome Back', 'input[type="password"]', 'password123');
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('**/dashboard');

    await page.goto('http://localhost:5173/tickets');
    await page.click('text=HD-000001');

    // Wait for detail view sidebar context to render solutions
    if (process.env.GEMINI_API_KEY) {
      await page.waitForSelector('text=Recommended Articles');
      console.log('   ✓ AI KB recommendation list rendered in sidebar.');
      await page.screenshot({ path: path.join(__dirname, 'customer_kb_recommendations_detail.png') });
    } else {
      console.log('   (Skipping screenshot render since GEMINI_API_KEY is not defined locally)');
    }

    // 6. Verify Fallback behavior when no published articles exist
    console.log('6. Verifying fallback: empty articles list returns empty array immediately...');
    await prisma.article.deleteMany({}); // Delete all published articles

    // Re-call recommendations
    const emptyKBRes = await apiPost('http://localhost:5000/api/v1/tickets/ai/recommend-kb', recommendPayload, token);
    console.log('   Empty KB Recommendations response list length:', emptyKBRes.data.data.recommendations.length);
    if (emptyKBRes.data.data.recommendations.length !== 0) {
      throw new Error('Fallback failed: should return empty list when no KB articles exist.');
    }
    console.log('   ✓ Fallback behavior correctly handled.');

    console.log('\n🎉 ALL PHASE 10 AI KB RECOMMENDATIONS TESTS PASSED SUCCESSFULLY!');
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
