const { chromium } = require('playwright');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function apiPost(url, body, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  const data = await res.json();
  return { status: res.status, data };
}

async function apiGet(url, params = {}, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) query.set(k, v);
  }
  const res = await fetch(`${url}?${query.toString()}`, { method: 'GET', headers });
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
    console.log('🚀 Starting Phase 19 Advanced Search & Global Filtering Integration Tests...');

    // Wait for backend to be ready
    console.log('Waiting for backend and client servers to be online...');
    for (let i = 0; i < 20; i++) {
      try {
        const backendRes = await fetch('http://localhost:5000/api/v1/health');
        const clientRes = await fetch('http://localhost:5173/');
        if (backendRes.ok && clientRes.ok) break;
      } catch (e) {}
      await new Promise(r => setTimeout(r, 1000));
    }

    // Database cleanup
    console.log('Cleaning up database...');
    await prisma.comment.deleteMany({});
    await prisma.attachment.deleteMany({});
    await prisma.ticket.deleteMany({});
    await prisma.article.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$executeRawUnsafe('ALTER SEQUENCE tickets_ticket_number_seq RESTART WITH 1;');

    // 1. Seed accounts & roles
    console.log('1. Seeding database for search scenarios...');
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(45000);

    // Register Customer A
    const custAEmail = 'cust_a@example.com';
    await page.goto('http://localhost:5173/register');
    await page.fill('input[placeholder="John Doe"]', 'Alice Customer');
    await page.fill('input[type="email"]', custAEmail);
    await page.fill('input[placeholder*="Min 6"]', 'password123');
    await page.fill('input[placeholder="••••••••"]', 'password123');
    await page.click('button:has-text("Create Account")');
    await page.waitForURL('**/dashboard');
    await page.click('button:has-text("Logout")');

    // Register Customer B
    const custBEmail = 'cust_b@example.com';
    await page.goto('http://localhost:5173/register');
    await page.fill('input[placeholder="John Doe"]', 'Bob Customer');
    await page.fill('input[type="email"]', custBEmail);
    await page.fill('input[placeholder*="Min 6"]', 'password123');
    await page.fill('input[placeholder="••••••••"]', 'password123');
    await page.click('button:has-text("Create Account")');
    await page.waitForURL('**/dashboard');
    await page.click('button:has-text("Logout")');

    // Register Admin
    const adminEmail = 'admin_search@example.com';
    await page.goto('http://localhost:5173/register');
    await page.fill('input[placeholder="John Doe"]', 'Charlie Admin');
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[placeholder*="Min 6"]', 'password123');
    await page.fill('input[placeholder="••••••••"]', 'password123');
    await page.click('button:has-text("Create Account")');
    await page.waitForURL('**/dashboard');

    const dbCustA = await prisma.user.findUnique({ where: { email: custAEmail } });
    const dbCustB = await prisma.user.findUnique({ where: { email: custBEmail } });
    const dbAdmin = await prisma.user.update({ where: { email: adminEmail }, data: { role: 'ADMIN' } });

    // Seed Categories
    const hardwareCat = await prisma.category.create({ data: { name: 'Hardware Parts', isActive: true } });
    const softwareCat = await prisma.category.create({ data: { name: 'Software Glitches', isActive: true } });
    const inactiveCat = await prisma.category.create({ data: { name: 'Legacy Systems', isActive: false } });

    // Login for JWT tokens
    const loginCustARes = await apiPost('http://localhost:5000/api/v1/auth/login', { email: custAEmail, password: 'password123' });
    const custAToken = loginCustARes.data.data.token;

    const loginAdminRes = await apiPost('http://localhost:5000/api/v1/auth/login', { email: adminEmail, password: 'password123' });
    const adminToken = loginAdminRes.data.data.token;

    // Seed Tickets
    const t1 = await prisma.ticket.create({
      data: {
        title: 'Broken screen on laptop',
        description: 'LCD panel cracked, requires replacement hardware.',
        priority: 'HIGH',
        status: 'OPEN',
        categoryId: hardwareCat.id,
        customerId: dbCustA.id
      }
    });

    const t2 = await prisma.ticket.create({
      data: {
        title: 'Vite server connection fails',
        description: 'Vite reload loops continuously on port 5173.',
        priority: 'LOW',
        status: 'RESOLVED',
        categoryId: softwareCat.id,
        customerId: dbCustA.id
      }
    });

    const t3 = await prisma.ticket.create({
      data: {
        title: 'Database connection issue',
        description: 'PostgreSQL connection timeout on AWS cluster.',
        priority: 'URGENT',
        status: 'PENDING',
        categoryId: softwareCat.id,
        customerId: dbCustB.id
      }
    });

    // Seed KB Articles
    await prisma.article.create({
      data: {
        title: 'Vite Port Bind Guide',
        content: 'Configure custom port configurations inside vite.config.js.',
        category: 'Software',
        status: 'PUBLISHED',
        isFaq: false,
        slug: 'vite-port-guide-' + Math.random().toString(36).substring(7),
        authorId: dbAdmin.id
      }
    });

    await prisma.article.create({
      data: {
        title: 'Admin Setup Drafts',
        content: 'Draft internal setups for helpdesk agents.',
        category: 'Admin',
        status: 'DRAFT',
        isFaq: false,
        slug: 'admin-drafts-' + Math.random().toString(36).substring(7),
        authorId: dbAdmin.id
      }
    });

    // 2. Validate API Search & Advanced Filters
    console.log('2. Validating Tickets advanced search API endpoints...');
    
    // A. Customer Isolation check
    const listCustARes = await apiGet('http://localhost:5000/api/v1/tickets', {}, custAToken);
    if (listCustARes.data.data.tickets.length !== 2) {
      throw new Error(`Customer scoping leak. Customer A has 2 tickets, but API returned: ${listCustARes.data.data.tickets.length}`);
    }

    // B. Search keyword match description
    const searchDescRes = await apiGet('http://localhost:5000/api/v1/tickets', { search: 'reload' }, adminToken);
    if (searchDescRes.data.data.tickets.length !== 1 || searchDescRes.data.data.tickets[0].id !== t2.id) {
      throw new Error('Search by description text content fails.');
    }

    // C. Search matching customer name
    const searchCustNameRes = await apiGet('http://localhost:5000/api/v1/tickets', { search: 'Alice' }, adminToken);
    if (searchCustNameRes.data.data.tickets.length !== 2) {
      throw new Error('Search by customer name fails.');
    }

    // D. Search matching category name
    const searchCatNameRes = await apiGet('http://localhost:5000/api/v1/tickets', { search: 'Glitches' }, adminToken);
    if (searchCatNameRes.data.data.tickets.length !== 2) {
      throw new Error('Search by category name fails.');
    }

    // E. Search exact ID/Number
    const searchNumRes = await apiGet('http://localhost:5000/api/v1/tickets', { search: `HD-${t3.ticketNumber.toString().padStart(6, '0')}` }, adminToken);
    if (searchNumRes.data.data.tickets.length !== 1 || searchNumRes.data.data.tickets[0].id !== t3.id) {
      throw new Error('Search by formatted ticket reference fails.');
    }

    // F. Search by status enum case-insensitively
    const searchStatusRes = await apiGet('http://localhost:5000/api/v1/tickets', { search: 'resolved' }, adminToken);
    if (searchStatusRes.data.data.tickets.length !== 1 || searchStatusRes.data.data.tickets[0].id !== t2.id) {
      throw new Error('Search by status keyword matches fails.');
    }

    // G. Filter combinations (Category + Status)
    const filterComboRes = await apiGet('http://localhost:5000/api/v1/tickets', { categoryId: softwareCat.id, status: 'PENDING' }, adminToken);
    if (filterComboRes.data.data.tickets.length !== 1 || filterComboRes.data.data.tickets[0].id !== t3.id) {
      throw new Error('Query filters combinations fail.');
    }

    // H. Sorting order check
    const sortOrderRes = await apiGet('http://localhost:5000/api/v1/tickets', { sortBy: 'ticketNumber', sortOrder: 'asc' }, adminToken);
    if (sortOrderRes.data.data.tickets[0].id !== t1.id || sortOrderRes.data.data.tickets[2].id !== t3.id) {
      throw new Error('Sorting by ticketNumber ascending order fails.');
    }

    console.log('   ✓ Tickets advanced query checks passed successfully.');

    // 3. Validate KB Search constraints
    console.log('3. Validating Knowledge Base Search scoping...');
    
    // Customer sees only published
    const kbCustRes = await apiGet('http://localhost:5000/api/v1/kb', {}, custAToken);
    if (kbCustRes.data.data.articles.length !== 1 || kbCustRes.data.data.articles[0].status !== 'PUBLISHED') {
      throw new Error('KB customer scoping restrictions failed.');
    }

    // Admin sees draft
    const kbAdminRes = await apiGet('http://localhost:5000/api/v1/kb', { status: 'DRAFT' }, adminToken);
    if (kbAdminRes.data.data.articles.length !== 1 || kbAdminRes.data.data.articles[0].status !== 'DRAFT') {
      throw new Error('KB admin draft status filter failed.');
    }

    console.log('   ✓ Knowledge Base query checks passed.');

    // 4. Validate Categories Search
    console.log('4. Validating Categories Search...');
    const catSearchRes = await apiGet('http://localhost:5000/api/v1/categories', { search: 'Parts' }, adminToken);
    if (catSearchRes.data.data.categories.length !== 1 || catSearchRes.data.data.categories[0].id !== hardwareCat.id) {
      throw new Error('Categories name/description search failed.');
    }
    console.log('   ✓ Categories query checks passed.');

    // 5. Validate User Search (Admin only)
    console.log('5. Validating Users directory search...');
    const userSearchRes = await apiGet('http://localhost:5000/api/v1/users', { search: 'Bob' }, adminToken);
    if (userSearchRes.data.data.users.length !== 1 || userSearchRes.data.data.users[0].id !== dbCustB.id) {
      throw new Error('User search by name/email failed.');
    }
    console.log('   ✓ User directory query checks passed.');

    // 6. Playwright UI Advanced Search interactions check
    console.log('6. Validating UI search & debounce interactions...');
    
    // Log back in as admin
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('**/dashboard');

    await page.goto('http://localhost:5173/tickets');
    
    // Enter search text "Broken"
    await page.fill('input[placeholder*="Search by ID"]', 'Broken');
    
    // Wait for debounce period (300ms) and subsequent network load
    await new Promise(r => setTimeout(r, 600));

    // Verify list updates to display only t1 ("Broken screen on laptop")
    await page.waitForSelector('text=Broken screen on laptop');
    
    // Check that t2 ("Vite server connection fails") is NOT visible
    const isT2Visible = await page.locator('text=Vite server connection fails').count();
    if (isT2Visible > 0) {
      throw new Error('UI Debounce search filtering failed to prune list.');
    }

    // Verify Active Filter Badge renders
    await page.waitForSelector('text=Search: "Broken"');

    // Click Reset All filters
    await page.click('button:has-text("Reset All")');
    await new Promise(r => setTimeout(r, 600));

    // Verify all tickets reload
    await page.waitForSelector('text=Vite server connection fails');
    console.log('   ✓ UI filter debounce, active badges, and reset button verified.');

    // Take verification screenshot
    await page.screenshot({ path: 'C:\\Users\\yadav\\.gemini\\antigravity-ide\\brain\\335b840c-d794-43b2-b47e-7852199b3973\\advanced_search_filters.png' });
    console.log('   ✓ Advanced search filters view screenshot captured.');

    console.log('\n🎉 ALL PHASE 19 ADVANCED SEARCH & FILTERING TESTS PASSED!');
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
