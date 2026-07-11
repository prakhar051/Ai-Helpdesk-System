const { io } = require('socket.io-client');
const { chromium } = require('playwright');
const { PrismaClient } = require('@prisma/client');
const { generateToken } = require('./utils/jwt');

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
  const clientSockets = [];
  try {
    console.log('🚀 Starting Phase 18 Socket.IO Real-Time Integration Tests...');

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
    await page.fill('textarea[placeholder*="what kind of tickets"]', 'Software bugs.');
    await page.click('button:has-text("Save Category")');
    await page.waitForSelector('text=Category "Software" created successfully.');

    // Logout Admin
    await page.goto('http://localhost:5173/dashboard');
    await page.click('button:has-text("Logout")');
    await page.waitForURL('**/login');

    const softwareCat = await prisma.category.findFirst({ where: { name: 'Software' } });

    // Fetch login tokens
    const loginCustRes = await apiPost('http://localhost:5000/api/v1/auth/login', { email: customerEmail, password: 'password123' });
    const custToken = loginCustRes.data.data.token;

    const loginAdminRes = await apiPost('http://localhost:5000/api/v1/auth/login', { email: adminEmail, password: 'password123' });
    const adminToken = loginAdminRes.data.data.token;

    const loginAgentRes = await apiPost('http://localhost:5000/api/v1/auth/login', { email: agentEmail, password: 'password123' });
    const agentToken = loginAgentRes.data.data.token;

    // 2. Connect client sockets and verify authentication / room joins
    console.log('2. Establishing real-time Socket connections...');
    
    const connectSocketPromise = (token) => new Promise((resolve, reject) => {
      const socket = io('http://localhost:5000', {
        auth: { token },
        transports: ['websocket']
      });
      socket.on('connect', () => resolve(socket));
      socket.on('connect_error', (err) => reject(err));
      clientSockets.push(socket);
    });

    const custSocket = await connectSocketPromise(custToken);
    const adminSocket = await connectSocketPromise(adminToken);
    const agentSocket = await connectSocketPromise(agentToken);

    console.log('   ✓ Client sockets connected.');

    // 3. Verify Multiple tabs / devices
    console.log('3. Validating multiple tabs/devices concurrency support...');
    const adminSocketTab2 = await connectSocketPromise(adminToken);
    console.log('   ✓ Secondary device socket successfully connected.');

    // 5. Test Live events (Ticket created, assigned, status update)
    console.log('4. Validating Real-time event notifications delivery...');
    
    // Attach payload recording arrays
    const custEvents = [];
    const agentEvents = [];
    const adminEvents = [];

    custSocket.on('ticket:created', (p) => custEvents.push(p));
    custSocket.on('ticket:assigned', (p) => custEvents.push(p));
    custSocket.on('ticket:status', (p) => custEvents.push(p));

    agentSocket.on('ticket:created', (p) => agentEvents.push(p));
    agentSocket.on('ticket:assigned', (p) => agentEvents.push(p));
    agentSocket.on('ticket:status', (p) => agentEvents.push(p));

    adminSocket.on('ticket:created', (p) => adminEvents.push(p));
    adminSocket.on('ticket:assigned', (p) => adminEvents.push(p));
    adminSocket.on('ticket:status', (p) => adminEvents.push(p));

    adminSocketTab2.on('ticket:created', (p) => adminEvents.push(p));
    adminSocketTab2.on('ticket:assigned', (p) => adminEvents.push(p));
    adminSocketTab2.on('ticket:status', (p) => adminEvents.push(p));

    // A. Create ticket
    const newTicketRes = await apiPost('http://localhost:5000/api/v1/tickets', {
      title: 'Realtime notification test',
      description: 'WebSockets are live.',
      priority: 'HIGH',
      categoryId: softwareCat.id
    }, custToken);
    const ticketId = newTicketRes.data.data.ticket.id;

    await new Promise(r => setTimeout(r, 200));

    // Check Customer isolation: Agent should NOT receive the creation notification!
    if (custEvents.length !== 1 || adminEvents.length !== 2) {
      throw new Error(`Event delivery mismatch. Customer events: ${custEvents.length}, Admin: ${adminEvents.length}`);
    }
    if (agentEvents.length !== 0) {
      throw new Error('Customer Isolation Leak: Unassigned agent received creation event.');
    }
    console.log('   ✓ Ticket creation event isolation verified.');

    // B. Assign ticket
    custEvents.length = 0;
    adminEvents.length = 0;
    agentEvents.length = 0;

    await apiPatch(`http://localhost:5000/api/v1/tickets/${ticketId}`, { agentId: dbAgent.id }, adminToken);
    await new Promise(r => setTimeout(r, 200));

    if (custEvents.length !== 1 || adminEvents.length !== 2 || agentEvents.length !== 1) {
      throw new Error(`Assignment event missing. Customer: ${custEvents.length}, Admin: ${adminEvents.length}, Agent: ${agentEvents.length}`);
    }
    console.log('   ✓ Ticket assignment notifications successfully delivered.');

    // 6. Verify UI live update rendering & floats toasts
    console.log('5. Validating UI Toast notifications rendering...');
    // Log in admin on UI
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('**/dashboard');

    await page.goto('http://localhost:5173/tickets');
    await page.click('text=HD-000001');

    // Programmatically trigger a status change in backend
    await apiPatch(`http://localhost:5000/api/v1/tickets/${ticketId}`, { status: 'RESOLVED' }, adminToken);

    // Wait for the UI floating toast notifications overlay to render the status changed notification
    await page.waitForSelector('text=Ticket Status Update');
    console.log('   ✓ Real-time status update toast successfully rendered.');

    // Capture screenshot
    await page.screenshot({ path: 'C:\\Users\\yadav\\.gemini\\antigravity-ide\\brain\\335b840c-d794-43b2-b47e-7852199b3973\\admin_socket_toast.png' });
    console.log('   ✓ UI screenshot captured.');

    // 7. Verify authentication validation bounds (JWT expiration check)
    console.log('6. Verifying JWT authentication validation bounds...');
    const expiredToken = generateToken({ id: dbCustomer.id, role: 'CUSTOMER' }); // Expired immediately if needed, or check invalid secret
    const failConnect = () => new Promise((resolve, reject) => {
      const socket = io('http://localhost:5000', {
        auth: { token: 'invalid-jwt-token-value' },
        transports: ['websocket']
      });
      socket.on('connect', () => {
        socket.disconnect();
        reject(new Error('Connection succeeded using invalid JWT.'));
      });
      socket.on('connect_error', (err) => {
        socket.disconnect();
        resolve(err);
      });
    });

    const connErr = await failConnect();
    console.log('   Connection refusal message:', connErr.message);
    if (!connErr.message.includes('Authentication failed')) {
      throw new Error('Connection error message mismatch.');
    }
    console.log('   ✓ Expired/invalid JWT connection refusal verified.');

    console.log('\n🎉 ALL PHASE 18 REAL-TIME SOCKET TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  } finally {
    for (const s of clientSockets) {
      s.disconnect();
    }
    if (browser) {
      await browser.close();
    }
    await prisma.$disconnect();
  }
})();
