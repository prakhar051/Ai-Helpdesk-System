const { chromium } = require('playwright');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function apiPost(url, body, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  const data = await res.json();
  return { status: res.status, data };
}

async function apiGetRaw(url, params = {}, token = null) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) query.set(k, v);
  }
  const res = await fetch(`${url}?${query.toString()}`, { method: 'GET', headers });
  const contentType = res.headers.get('content-type');
  const contentDisposition = res.headers.get('content-disposition');
  
  let body;
  if (contentType && contentType.includes('application/json')) {
    body = await res.json();
  } else {
    body = await res.text();
  }
  return { status: res.status, contentType, contentDisposition, body };
}

(async () => {
  let browser;
  try {
    console.log('🚀 Starting Phase 20 Reports & Exports Validation Tests...');

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

    // Database cleanup and seeding
    console.log('Cleaning up database...');
    await prisma.comment.deleteMany({});
    await prisma.attachment.deleteMany({});
    await prisma.ticket.deleteMany({});
    await prisma.article.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$executeRawUnsafe('ALTER SEQUENCE tickets_ticket_number_seq RESTART WITH 1;');

    const custEmail = 'cust_export@example.com';
    const agentEmail = 'agent_export@example.com';
    const adminEmail = 'admin_export@example.com';

    const hashedPassword = await bcrypt.hash('password123', 10);

    // Seeding users via Prisma directly to guarantee role configurations
    const custUser = await prisma.user.create({
      data: { name: 'Alice Customer', email: custEmail, password: hashedPassword, role: 'CUSTOMER' }
    });
    const agentUser = await prisma.user.create({
      data: { name: 'Bob Agent', email: agentEmail, password: hashedPassword, role: 'AGENT' }
    });
    const adminUser = await prisma.user.create({
      data: { name: 'Charlie Admin', email: adminEmail, password: hashedPassword, role: 'ADMIN' }
    });

    const category = await prisma.category.create({
      data: { name: 'Database Queries', isActive: true }
    });

    // Seed 10 mock tickets for Alice Customer
    console.log('Seeding tickets...');
    const tickets = [];
    for (let i = 1; i <= 10; i++) {
      tickets.push(
        await prisma.ticket.create({
          data: {
            title: `Issue ticket number ${i}`,
            description: `Testing export and search lists for report filters ${i}`,
            status: i % 2 === 0 ? 'OPEN' : 'RESOLVED',
            priority: i % 3 === 0 ? 'HIGH' : 'LOW',
            categoryId: category.id,
            customerId: custUser.id,
            agentId: i <= 5 ? agentUser.id : null // Agent has 5 tickets assigned
          }
        })
      );
    }

    // Seed KB Article
    await prisma.article.create({
      data: {
        title: 'Query optimizations in Prisma',
        content: 'Avoid N+1 queries by leveraging correct include selects.',
        category: 'Database',
        status: 'PUBLISHED',
        isFaq: false,
        slug: 'query-optimizations-prisma',
        authorId: adminUser.id
      }
    });

    // Login for JWT tokens
    const loginCustRes = await apiPost('http://localhost:5000/api/v1/auth/login', { email: custEmail, password: 'password123' });
    const custToken = loginCustRes.data.data.token;

    const loginAgentRes = await apiPost('http://localhost:5000/api/v1/auth/login', { email: agentEmail, password: 'password123' });
    const agentToken = loginAgentRes.data.data.token;

    const loginAdminRes = await apiPost('http://localhost:5000/api/v1/auth/login', { email: adminEmail, password: 'password123' });
    const adminToken = loginAdminRes.data.data.token;

    // 1. RBAC Tests
    console.log('1. Validating Role-Based Access Control restrictions...');

    // A. CUSTOMER tries forbidden routes
    const custDbRes = await apiGetRaw('http://localhost:5000/api/v1/reports/dashboard', { format: 'pdf' }, custToken);
    if (custDbRes.status !== 403) throw new Error('Security leak: Customer accessed Dashboard Report.');

    const custUsersRes = await apiGetRaw('http://localhost:5000/api/v1/reports/users', { format: 'pdf' }, custToken);
    if (custUsersRes.status !== 403) throw new Error('Security leak: Customer accessed Users Report.');

    const custKbRes = await apiGetRaw('http://localhost:5000/api/v1/reports/kb', { format: 'pdf' }, custToken);
    if (custKbRes.status !== 403) throw new Error('Security leak: Customer accessed KB Report.');

    // B. CUSTOMER ticket scoping
    const custTicketsRes = await apiGetRaw('http://localhost:5000/api/v1/reports/tickets', { format: 'csv' }, custToken);
    const custLines = custTicketsRes.body.trim().split('\n');
    // Header + 10 tickets
    if (custLines.length !== 11) {
      throw new Error(`Customer export ticket scoping failed. Found lines: ${custLines.length}`);
    }
    console.log('   ✓ Customer scoping boundaries verified.');

    // C. AGENT tries forbidden routes
    const agentUsersRes = await apiGetRaw('http://localhost:5000/api/v1/reports/users', { format: 'pdf' }, agentToken);
    if (agentUsersRes.status !== 403) throw new Error('Security leak: Agent accessed Users Report.');

    const agentCatsRes = await apiGetRaw('http://localhost:5000/api/v1/reports/categories', { format: 'pdf' }, agentToken);
    if (agentCatsRes.status !== 403) throw new Error('Security leak: Agent accessed Categories Report.');

    // E. ADMIN access
    const adminUsersRes = await apiGetRaw('http://localhost:5000/api/v1/reports/users', { format: 'csv' }, adminToken);
    if (adminUsersRes.status !== 200) throw new Error('Admin denied access to Users Report.');
    console.log('   ✓ Admin role permissions verified.');

    // 2. Export Formats & Streaming Integrity
    console.log('2. Validating format output structures & streaming headers...');
    
    // Ticket CSV
    const tCsv = await apiGetRaw('http://localhost:5000/api/v1/reports/tickets', { format: 'csv' }, adminToken);
    if (!tCsv.contentType.includes('text/csv')) throw new Error('Invalid Content-Type header returned for CSV.');
    if (!tCsv.contentDisposition.includes('attachment; filename=')) throw new Error('Missing Content-Disposition for CSV export.');
    if (!tCsv.body.includes('Ticket Number,Title,Category,Priority,Status')) throw new Error('CSV headers format invalid.');

    // Ticket PDF
    const tPdf = await apiGetRaw('http://localhost:5000/api/v1/reports/tickets', { format: 'pdf' }, adminToken);
    if (!tPdf.contentType.includes('application/pdf')) throw new Error('Invalid Content-Type header returned for PDF.');
    if (!tPdf.body.startsWith('%PDF-')) throw new Error('PDF output header signature is corrupted.');

    // Dashboard CSV
    const dCsv = await apiGetRaw('http://localhost:5000/api/v1/reports/dashboard', { format: 'csv' }, adminToken);
    if (!dCsv.body.includes('Metric Key,Metric Group,Metric Name,Value')) throw new Error('Dashboard CSV headers invalid.');

    // Dashboard PDF
    const dPdf = await apiGetRaw('http://localhost:5000/api/v1/reports/dashboard', { format: 'pdf' }, adminToken);
    if (!dPdf.body.startsWith('%PDF-')) throw new Error('Dashboard PDF signature is corrupted.');

    console.log('   ✓ Stream headers and file formats verified.');

    // 3. Active Filters preservation
    console.log('3. Validating Active Filters exports matches...');
    const filteredRes = await apiGetRaw('http://localhost:5000/api/v1/reports/tickets', {
      format: 'csv',
      status: 'RESOLVED',
      priority: 'HIGH'
    }, adminToken);
    const filteredLines = filteredRes.body.trim().split('\n');
    // Seeding check: i % 2 === 0 (OPEN) or RESOLVED. i % 3 === 0 (HIGH) or LOW.
    // i = 3 (RESOLVED, HIGH)
    // i = 9 (RESOLVED, HIGH)
    // Total matching tickets = 2. Lines should be 3 (Header + 2 rows)
    if (filteredLines.length !== 3) {
      throw new Error(`Active filter exports failed. Expected matching tickets: 2, but got lines: ${filteredLines.length}`);
    }
    console.log('   ✓ Active filter count matches verified.');

    // 4. Playwright UI Button Verification
    console.log('4. Launching Playwright UI verification...');
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    // Login as Admin
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('**/dashboard');

    // Screenshot of Dashboard with download buttons
    await page.waitForSelector('button:has-text("Export PDF")');
    await page.screenshot({ path: 'C:\\Users\\yadav\\.gemini\\antigravity-ide\\brain\\335b840c-d794-43b2-b47e-7852199b3973\\dashboard_reports.png' });
    console.log('   ✓ Captured Dashboard Report Export UI screenshot.');

    // Navigate to Tickets list
    await page.goto('http://localhost:5173/tickets');
    await page.waitForSelector('button:has-text("Export PDF")');

    // Trigger Ticket Export PDF download listener
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Export PDF")')
    ]);
    const downloadPath = path.join(__dirname, 'downloaded_test_tickets.pdf');
    await download.saveAs(downloadPath);

    if (!fs.existsSync(downloadPath) || fs.statSync(downloadPath).size === 0) {
      throw new Error('Downloaded report file is empty or missing.');
    }
    fs.unlinkSync(downloadPath); // cleanup

    console.log('   ✓ Playwright UI download integration verified successfully.');

    console.log('\n🎉 ALL PHASE 20 REPORTS & EXPORTS TESTS PASSED!');
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
