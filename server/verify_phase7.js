const { chromium } = require('playwright');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

const prisma = new PrismaClient();

async function typeInto(page, pageTitle, typeSelector, text) {
  const selector = `div:has(h2:has-text("${pageTitle}")) ${typeSelector}`;
  const locator = page.locator(selector);
  await locator.fill(text);
}

// Helper to make API post requests using fetch
async function apiPost(url, body, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  
  const data = await res.json();
  return { status: res.status, data };
}

// Helper to make API patch requests using fetch
async function apiPatch(url, body, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const res = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body)
  });
  
  const data = await res.json();
  return { status: res.status, data };
}

(async () => {
  let browser;
  try {
    console.log('🚀 Starting Phase 7 Ticket Assignment Integration Tests...');
    
    // Clean database
    console.log('Cleaning up database tables...');
    await prisma.ticket.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$executeRawUnsafe('ALTER SEQUENCE tickets_ticket_number_seq RESTART WITH 1;');

    // 1. Create seed entries
    console.log('1. Seeding test accounts...');
    
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(10000);

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

    // Register Agent 1
    const agent1Email = 'agent1@example.com';
    await page.goto('http://localhost:5173/register');
    await typeInto(page, 'Create Account', 'input[type="text"]', 'Agent User One');
    await typeInto(page, 'Create Account', 'input[type="email"]', agent1Email);
    await typeInto(page, 'Create Account', 'input[placeholder*="Min 6"]', 'password123');
    await typeInto(page, 'Create Account', 'input[placeholder="••••••••"]', 'password123');
    await page.click('button:has-text("Create Account")');
    await page.waitForURL('**/dashboard');
    await page.click('button:has-text("Logout")');
    await page.waitForURL('**/login');

    // Register Agent 2
    const agent2Email = 'agent2@example.com';
    await page.goto('http://localhost:5173/register');
    await typeInto(page, 'Create Account', 'input[type="text"]', 'Agent User Two');
    await typeInto(page, 'Create Account', 'input[type="email"]', agent2Email);
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
    
    // Elevate admin, agent1, and agent2 roles in database
    console.log('   Elevating roles...');
    const dbAdmin = await prisma.user.update({ where: { email: adminEmail }, data: { role: 'ADMIN' } });
    const dbAgent1 = await prisma.user.update({ where: { email: agent1Email }, data: { role: 'AGENT' } });
    const dbAgent2 = await prisma.user.update({ where: { email: agent2Email }, data: { role: 'AGENT' } });
    const dbCustomer = await prisma.user.findUnique({ where: { email: customerEmail } });

    console.log('   ✓ Accounts seeded & elevated.');

    // 2. Admin creates category
    console.log('2. Admin creating category General Support...');
    await page.goto('http://localhost:5173/categories');
    await page.click('button:has-text("Add Category")');
    await page.fill('input[placeholder*="Network Issues"]', 'General Support');
    await page.fill('textarea[placeholder*="what kind of tickets"]', 'Standard support category.');
    await page.click('button:has-text("Save Category")');
    await page.waitForSelector('text=Category "General Support" created successfully.');

    // Logout Admin
    await page.goto('http://localhost:5173/dashboard');
    await page.click('button:has-text("Logout")');
    await page.waitForURL('**/login');

    // 3. Customer logs in & submits a ticket
    console.log('3. Customer creating support ticket...');
    await typeInto(page, 'Welcome Back', 'input[type="email"]', customerEmail);
    await typeInto(page, 'Welcome Back', 'input[type="password"]', 'password123');
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('**/dashboard');

    await page.goto('http://localhost:5173/tickets');
    await page.click('button:has-text("New Ticket")');
    await page.fill('input[placeholder*="Describe the issue"]', 'General system lockups');
    await page.selectOption('select:has-text("Uncategorized")', { label: 'General Support' });
    await page.fill('textarea[placeholder*="Please enter details"]', 'The interface freezes when listing tickets queue.');
    await page.click('button:has-text("Save Ticket")');
    await page.waitForSelector('text=HD-000001');

    // Verify card footer says "Unassigned"
    await page.waitForSelector('span:has-text("Unassigned")');
    console.log('   ✓ Ticket HD-000001 created with status Unassigned.');
    await page.screenshot({ path: path.join(__dirname, 'customer_ticket_unassigned.png') });

    // Logout Customer
    await page.goto('http://localhost:5173/dashboard');
    await page.click('button:has-text("Logout")');
    await page.waitForURL('**/login');

    // 4. Agent 1 claims ticket
    console.log('4. Agent 1 claiming ticket...');
    await typeInto(page, 'Welcome Back', 'input[type="email"]', agent1Email);
    await typeInto(page, 'Welcome Back', 'input[type="password"]', 'password123');
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('**/dashboard');

    await page.goto('http://localhost:5173/tickets');
    await page.click('text=HD-000001');
    await page.waitForSelector('text=Claim Ticket (Assign to Me)');
    await page.click('button:has-text("Claim Ticket")');
    await page.waitForSelector('text=Ticket agentId updated successfully.');
    
    // Verify UI displays Agent User One name
    await page.waitForSelector('text=Agent User One');
    
    // Verify listing card now displays "Assigned to: Agent User One"
    await page.click('button:has-text("Back to Queue")');
    await page.waitForSelector('span:has-text("Assigned to: Agent User One")');
    console.log('   ✓ Agent 1 claimed the ticket successfully.');
    await page.screenshot({ path: path.join(__dirname, 'agent1_ticket_claimed.png') });

    // Logout Agent 1
    await page.goto('http://localhost:5173/dashboard');
    await page.click('button:has-text("Logout")');
    await page.waitForURL('**/login');

    // 5. Verify API-level RBAC rules for Agent 2
    console.log('5. Verifying Agent 2 RBAC restrictions...');
    // Log in as Agent 2 using fetch API
    const loginRes = await apiPost('http://localhost:5000/api/v1/auth/login', {
      email: agent2Email,
      password: 'password123'
    });
    const agent2Token = loginRes.data.data.token;
    const ticketId = (await prisma.ticket.findFirst()).id;

    // Agent 2 attempts to claim Agent 1's ticket -> Should return 403
    console.log('   Agent 2 trying to claim ticket assigned to Agent 1...');
    const claimRes1 = await apiPatch(`http://localhost:5000/api/v1/tickets/${ticketId}`, 
      { agentId: dbAgent2.id },
      agent2Token
    );
    if (claimRes1.status !== 403) {
      throw new Error(`Expected 403 response, got ${claimRes1.status}`);
    }
    console.log('   ✓ Server correctly blocked reassignment (403 Forbidden).');

    // Agent 2 attempts to assign to Admin -> Should return 403
    console.log('   Agent 2 trying to assign ticket to Admin...');
    const claimRes2 = await apiPatch(`http://localhost:5000/api/v1/tickets/${ticketId}`, 
      { agentId: dbAdmin.id },
      agent2Token
    );
    if (claimRes2.status !== 403) {
      throw new Error(`Expected 403 response, got ${claimRes2.status}`);
    }
    console.log('   ✓ Server correctly blocked assigning to others (403 Forbidden).');

    // 6. Admin reassigns and unassigns ticket
    console.log('6. Admin reassigning & unassigning ticket...');
    await typeInto(page, 'Welcome Back', 'input[type="email"]', adminEmail);
    await typeInto(page, 'Welcome Back', 'input[type="password"]', 'password123');
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('**/dashboard');

    await page.goto('http://localhost:5173/tickets');
    await page.click('text=HD-000001');
    await page.waitForSelector('select:has-text("Agent User One")');

    // Admin reassigns to Agent User Two
    await page.selectOption('select:has-text("Agent User One")', { label: 'Agent User Two (AGENT)' });
    await page.waitForSelector('text=Ticket agentId updated successfully.');
    console.log('   ✓ Admin reassigned ticket to Agent 2.');

    // Admin unassigns ticket
    await page.selectOption('select:has-text("Agent User Two")', { label: 'Unassigned' });
    await page.waitForSelector('text=Ticket agentId updated successfully.');
    console.log('   ✓ Admin unassigned ticket.');
    await page.screenshot({ path: path.join(__dirname, 'admin_ticket_unassigned.png') });

    // 7. Verify Concurrent claiming (Race condition claim checks)
    console.log('7. Verifying concurrent claim race condition controls...');
    // Log in as Agent 1
    const loginRes1 = await apiPost('http://localhost:5000/api/v1/auth/login', {
      email: agent1Email,
      password: 'password123'
    });
    const agent1Token = loginRes1.data.data.token;

    // Send two concurrent claiming requests: Agent 1 claims first, Agent 2 claims concurrently
    const p1 = apiPatch(`http://localhost:5000/api/v1/tickets/${ticketId}`, 
      { agentId: dbAgent1.id },
      agent1Token
    );
    const p2 = apiPatch(`http://localhost:5000/api/v1/tickets/${ticketId}`, 
      { agentId: dbAgent2.id },
      agent2Token
    );

    const results = await Promise.allSettled([p1, p2]);
    const fulfilled = results.filter(r => r.status === 'fulfilled').map(r => r.value);
    
    // Check statuses
    const succeeded = fulfilled.filter(r => r.status === 200);
    const conflicted = fulfilled.filter(r => r.status === 409);

    console.log(`   Claim requests results: ${succeeded.length} succeeded, ${conflicted.length} conflicted.`);
    
    if (succeeded.length !== 1 || conflicted.length !== 1) {
      throw new Error(`Race condition checks failed: expected 1 success (200) and 1 conflict (409), got ${succeeded.length} and ${conflicted.length}`);
    }

    const conflictPayload = conflicted[0].data;
    console.log('   Conflict error message payload:', conflictPayload.message);
    if (!conflictPayload.message.includes('claimed by another agent')) {
      throw new Error('Incorrect conflict message returned');
    }

    console.log('   ✓ Concurrent claiming race conditions correctly blocked.');
    console.log('\n🎉 ALL PHASE 7 TICKET ASSIGNMENT TESTS PASSED SUCCESSFULLY!');
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
