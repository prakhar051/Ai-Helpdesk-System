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

// Helpers for API requests via fetch
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

async function apiDelete(url, token = null) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { method: 'DELETE', headers });
  const data = await res.json();
  return { status: res.status, data };
}

async function apiUpload(url, filePath, fieldName, token = null) {
  const boundary = '----PlaywrightBoundary' + Math.random().toString(16).substring(2);
  const headers = { 'Content-Type': `multipart/form-data; boundary=${boundary}` };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const fileContent = fs.readFileSync(filePath);
  const filename = path.basename(filePath);

  let body = '';
  body += `--${boundary}\r\n`;
  body += `Content-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\n`;
  body += `Content-Type: text/plain\r\n\r\n`;
  
  const payload = Buffer.concat([
    Buffer.from(body, 'utf8'),
    fileContent,
    Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8')
  ]);

  const res = await fetch(url, { method: 'POST', headers, body: payload });
  const data = await res.json();
  return { status: res.status, data };
}

(async () => {
  let browser;
  try {
    console.log('🚀 Starting Phase 8 Comments & Attachments Integration Tests...');

    // Clean database
    console.log('Cleaning up database...');
    await prisma.comment.deleteMany({});
    await prisma.attachment.deleteMany({});
    await prisma.ticket.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$executeRawUnsafe('ALTER SEQUENCE tickets_ticket_number_seq RESTART WITH 1;');

    // Cleanup upload folder
    const uploadDir = path.join(__dirname, 'uploads');
    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir);
      for (const file of files) {
        fs.unlinkSync(path.join(uploadDir, file));
      }
    }

    // 1. Create seed entries via UI
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

    // Register Stranger (Other Customer)
    const strangerEmail = 'stranger@example.com';
    await page.goto('http://localhost:5173/register');
    await typeInto(page, 'Create Account', 'input[type="text"]', 'Stranger Customer');
    await typeInto(page, 'Create Account', 'input[type="email"]', strangerEmail);
    await typeInto(page, 'Create Account', 'input[placeholder*="Min 6"]', 'password123');
    await typeInto(page, 'Create Account', 'input[placeholder="••••••••"]', 'password123');
    await page.click('button:has-text("Create Account")');
    await page.waitForURL('**/dashboard');
    await page.click('button:has-text("Logout")');
    await page.waitForURL('**/login');

    // Register Agent
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

    // Register Admin
    const adminEmail = 'admin@example.com';
    await page.goto('http://localhost:5173/register');
    await typeInto(page, 'Create Account', 'input[type="text"]', 'Admin User');
    await typeInto(page, 'Create Account', 'input[type="email"]', adminEmail);
    await typeInto(page, 'Create Account', 'input[placeholder*="Min 6"]', 'password123');
    await typeInto(page, 'Create Account', 'input[placeholder="••••••••"]', 'password123');
    await page.click('button:has-text("Create Account")');
    await page.waitForURL('**/dashboard');
    
    // Elevate roles
    console.log('   Elevating roles...');
    const dbAdmin = await prisma.user.update({ where: { email: adminEmail }, data: { role: 'ADMIN' } });
    const dbAgent = await prisma.user.update({ where: { email: agentEmail }, data: { role: 'AGENT' } });
    const dbCustomer = await prisma.user.findUnique({ where: { email: customerEmail } });
    const dbStranger = await prisma.user.findUnique({ where: { email: strangerEmail } });

    // Admin creates category
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

    // 2. Customer submits a ticket and posts comment / attachment
    console.log('2. Customer creating ticket & uploading file...');
    await typeInto(page, 'Welcome Back', 'input[type="email"]', customerEmail);
    await typeInto(page, 'Welcome Back', 'input[type="password"]', 'password123');
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('**/dashboard');

    await page.goto('http://localhost:5173/tickets');
    await page.click('button:has-text("New Ticket")');
    await page.fill('input[placeholder*="Describe the issue"]', 'Need config file review');
    await page.selectOption('select:has-text("Uncategorized")', { label: 'General Support' });
    await page.fill('textarea[placeholder*="Please enter details"]', 'I am attaching my config file for validation checks.');
    await page.click('button:has-text("Save Ticket")');
    await page.waitForSelector('text=HD-000001');

    // Select the ticket to load detail pane
    await page.click('text=HD-000001');
    await page.waitForSelector('text=Collaboration Thread');

    // Customer posts a comment
    console.log('   Customer writing comment...');
    await page.fill('textarea[placeholder="Write a comment..."]', 'This is a customer comment.');
    await page.click('button:has-text("Post Comment")');
    await page.waitForSelector('text=This is a customer comment.');

    // Customer uploads a file (notes.txt)
    console.log('   Customer uploading attachment notes.txt...');
    const tempFilePath = path.join(__dirname, 'notes.txt');
    fs.writeFileSync(tempFilePath, 'customer file logs');
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('button:has-text("Upload File")');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(tempFilePath);
    
    // Wait for upload listing card to show
    await page.waitForSelector('text=notes.txt');
    console.log('   ✓ Comment posted and file attached.');
    await page.screenshot({ path: path.join(__dirname, 'customer_collaboration_sections.png') });

    // Clean local temp file
    fs.unlinkSync(tempFilePath);

    // Logout Customer
    await page.goto('http://localhost:5173/dashboard');
    await page.click('button:has-text("Logout")');
    await page.waitForURL('**/login');

    // 3. API Token log in & verify scoping (Stranger, Agent, Admin)
    console.log('3. Log in API users to verify RBAC & scopes...');
    const loginStranger = await apiPost('http://localhost:5000/api/v1/auth/login', { email: strangerEmail, password: 'password123' });
    const loginAgent = await apiPost('http://localhost:5000/api/v1/auth/login', { email: agentEmail, password: 'password123' });
    const loginAdmin = await apiPost('http://localhost:5000/api/v1/auth/login', { email: adminEmail, password: 'password123' });

    const strangerToken = loginStranger.data.data.token;
    const agentToken = loginAgent.data.data.token;
    const adminToken = loginAdmin.data.data.token;

    const ticketId = (await prisma.ticket.findFirst()).id;
    const commentId = (await prisma.comment.findFirst()).id;
    const attachmentId = (await prisma.attachment.findFirst()).id;

    // 4. Stranger scoping validation (Should return 403 Forbidden)
    console.log('4. Verifying Stranger Customer access boundaries...');
    // Try to post comment to HD-000001
    const resStrangerComment = await apiPost(`http://localhost:5000/api/v1/tickets/${ticketId}/comments`, { content: 'Hack' }, strangerToken);
    if (resStrangerComment.status !== 403) throw new Error(`Expected 403 for stranger comment, got ${resStrangerComment.status}`);
    
    // Try to delete customer's attachment
    const resStrangerAttach = await apiDelete(`http://localhost:5000/api/v1/tickets/${ticketId}/attachments/${attachmentId}`, strangerToken);
    if (resStrangerAttach.status !== 403) throw new Error(`Expected 403 for stranger delete attachment, got ${resStrangerAttach.status}`);
    console.log('   ✓ Stranger correctly restricted (403 Forbidden).');

    // 5. Agent edits/deletes validation
    console.log('5. Verifying Agent scope restrictions...');
    // Agent posts a comment
    const resAgentComment = await apiPost(`http://localhost:5000/api/v1/tickets/${ticketId}/comments`, { content: 'Agent response comment.' }, agentToken);
    if (resAgentComment.status !== 201) throw new Error('Agent failed to post comment');
    const agentCommentId = resAgentComment.data.data.comment.id;

    // Agent attempts to edit Customer's comment -> Should yield 403
    const resAgentEdit = await apiPatch(`http://localhost:5000/api/v1/tickets/${ticketId}/comments/${commentId}`, { content: 'Malicious Edit' }, agentToken);
    if (resAgentEdit.status !== 403) throw new Error(`Expected 403 for Agent editing Customer comment, got ${resAgentEdit.status}`);
    console.log('   ✓ Agent blocked from editing Customer comment.');

    // Agent edits own comment -> Should succeed
    const resAgentEditOwn = await apiPatch(`http://localhost:5000/api/v1/tickets/${ticketId}/comments/${agentCommentId}`, { content: 'Agent edited response.' }, agentToken);
    if (resAgentEditOwn.status !== 200) throw new Error('Agent failed to edit own comment');

    // Agent attempts to delete Customer's attachment -> Should yield 403
    const resAgentDeleteAttach = await apiDelete(`http://localhost:5000/api/v1/tickets/${ticketId}/attachments/${attachmentId}`, agentToken);
    if (resAgentDeleteAttach.status !== 403) throw new Error(`Expected 403 for Agent deleting Customer attachment, got ${resAgentDeleteAttach.status}`);
    console.log('   ✓ Agent blocked from deleting Customer attachment.');

    // 6. Admin deletes customer's comment & attachment metadata + file deletion check
    console.log('6. Verifying Admin global moderation override...');
    
    // Check if the physical file notes.txt exists on disk
    const dbAttachment = await prisma.attachment.findUnique({ where: { id: attachmentId } });
    const physicalPath = path.join(__dirname, 'uploads', path.basename(dbAttachment.filePath));
    console.log('   Checking physical file path:', physicalPath);
    if (!fs.existsSync(physicalPath)) throw new Error('Physical attachment notes.txt is missing on disk!');
    console.log('   ✓ Physical file found on disk.');

    // Admin deletes Customer's comment
    const resAdminDeleteComment = await apiDelete(`http://localhost:5000/api/v1/tickets/${ticketId}/comments/${commentId}`, adminToken);
    if (resAdminDeleteComment.status !== 200) throw new Error('Admin failed to delete Customer comment');

    // Admin deletes Customer's attachment
    const resAdminDeleteAttach = await apiDelete(`http://localhost:5000/api/v1/tickets/${ticketId}/attachments/${attachmentId}`, adminToken);
    if (resAdminDeleteAttach.status !== 200) throw new Error('Admin failed to delete Customer attachment');

    // Check if the physical file is deleted from disk
    if (fs.existsSync(physicalPath)) throw new Error('Physical attachment was NOT deleted from local filesystem!');
    console.log('   ✓ Physical file was successfully cleaned from local filesystem.');
    console.log('   ✓ Admin deleted comment and attachment successfully.');

    // 7. Verify concurrent uploads / limits
    console.log('7. Verifying upload bounds...');
    const oversizedFilePath = path.join(__dirname, 'large.txt');
    // Create 11MB file buffer
    const size = 11 * 1024 * 1024;
    fs.writeFileSync(oversizedFilePath, Buffer.alloc(size));

    const uploadRes = await apiUpload(`http://localhost:5000/api/v1/tickets/${ticketId}/attachments`, oversizedFilePath, 'file', adminToken);
    fs.unlinkSync(oversizedFilePath);

    console.log('   Oversized file upload response code:', uploadRes.status);
    if (uploadRes.status !== 400 && uploadRes.status !== 500) {
      throw new Error(`Expected error status for oversized file, got ${uploadRes.status}`);
    }
    console.log('   ✓ Oversized file correctly rejected.');

    console.log('\n🎉 ALL PHASE 8 COMMENTS & ATTACHMENTS TESTS PASSED SUCCESSFULLY!');
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
