const { chromium } = require('playwright');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

const prisma = new PrismaClient();

async function typeInto(page, pageTitle, typeSelector, text) {
  const selector = `div:has(h2:has-text("${pageTitle}")) ${typeSelector}`;
  const locator = page.locator(selector);
  await locator.fill(text);
}

(async () => {
  let browser;
  try {
    console.log('🚀 Starting Phase 6 Categories & Priorities Integration Tests...');
    
    // Clean database
    console.log('Cleaning up users, tickets, and categories...');
    await prisma.ticket.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$executeRawUnsafe('ALTER SEQUENCE tickets_ticket_number_seq RESTART WITH 1;');

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(10000);

    // Bind logs
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

    // 1. Register Customer & Admin
    console.log('1. Registering test accounts...');
    
    // Register Customer
    const customerEmail = 'customer@example.com';
    await page.goto('http://localhost:5173/register');
    await typeInto(page, 'Create Account', 'input[type="text"]', 'Customer User');
    await typeInto(page, 'Create Account', 'input[type="email"]', customerEmail);
    await typeInto(page, 'Create Account', 'input[placeholder*="Min 6"]', 'password123');
    await typeInto(page, 'Create Account', 'input[placeholder="••••••••"]', 'password123');
    await page.click('button:has-text("Create Account")');
    await page.waitForURL('**/dashboard');
    
    // Logout Customer
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
    console.log('   Elevating admin role to ADMIN...');
    await prisma.user.update({
      where: { email: adminEmail },
      data: { role: 'ADMIN' }
    });
    await page.reload();
    await page.waitForSelector('text=Role: ADMIN');
    console.log('   ✓ Test accounts initialized.');

    // 2. Admin creates two categories
    console.log('2. Admin creating Categories...');
    await page.click('a:has-text("Categories")');
    await page.waitForURL('**/categories');
    
    // Create Hardware Support
    await page.click('button:has-text("Add Category")');
    await page.fill('input[placeholder*="Network Issues"]', 'Hardware Support');
    await page.fill('textarea[placeholder*="what kind of tickets"]', 'For hardware component defects and physical damage issues.');
    await page.click('button:has-text("Save Category")');
    await page.waitForSelector('text=Category "Hardware Support" created successfully.');
    
    // Create Software Config
    await page.click('button:has-text("Add Category")');
    await page.fill('input[placeholder*="Network Issues"]', 'Software Config');
    await page.fill('textarea[placeholder*="what kind of tickets"]', 'For software setup issues and licensing errors.');
    await page.click('button:has-text("Save Category")');
    await page.waitForSelector('text=Category "Software Config" created successfully.');
    
    console.log('   ✓ Two categories created successfully.');
    await page.screenshot({ path: path.join(__dirname, 'admin_categories_list.png') });

    // Logout Admin
    await page.goto('http://localhost:5173/dashboard');
    await page.click('button:has-text("Logout")');
    await page.waitForURL('**/login');

    // 3. Customer logs in, creates a category-assigned ticket & an uncategorized ticket
    console.log('3. Customer creating tickets...');
    await typeInto(page, 'Welcome Back', 'input[type="email"]', customerEmail);
    await typeInto(page, 'Welcome Back', 'input[type="password"]', 'password123');
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('**/dashboard');
    
    // Check if Customer can see Categories in navigation, but cannot manage them
    await page.click('a:has-text("Categories")');
    await page.waitForURL('**/categories');
    const addBtnVisible = await page.locator('button:has-text("Add Category")').isVisible();
    console.log(`   Is Add Category button visible to Customer? ${addBtnVisible} (expected: false)`);
    if (addBtnVisible) throw new Error('Customer display allowed categories write operations');
    
    // Go to Tickets
    await page.goto('http://localhost:5173/tickets');
    await page.waitForURL('**/tickets');
    
    // Create Ticket 1: Assigned to Hardware Support with HIGH priority
    console.log('   Creating ticket 1 (Hardware Support, HIGH priority)...');
    await page.click('button:has-text("New Ticket")');
    await page.fill('input[placeholder*="Describe the issue"]', 'Laptop battery overheating');
    await page.selectOption('select:has-text("Medium")', 'HIGH');
    await page.selectOption('select:has-text("Uncategorized")', { label: 'Hardware Support' });
    await page.fill('textarea[placeholder*="Please enter details"]', 'The laptop chassis gets extremely hot after 15 minutes of runtime.');
    await page.click('button:has-text("Save Ticket")');
    await page.waitForSelector('text=HD-000001');

    // Create Ticket 2: Uncategorized with default priority (MEDIUM)
    console.log('   Creating ticket 2 (Uncategorized)...');
    await page.click('button:has-text("New Ticket")');
    await page.fill('input[placeholder*="Describe the issue"]', 'Login validation fails intermittently');
    await page.fill('textarea[placeholder*="Please enter details"]', 'Sometimes clicking sign in shows a spinner forever without response.');
    await page.click('button:has-text("Save Ticket")');
    await page.waitForSelector('text=HD-000002');
    
    // Verify Ticket 2 displays "Uncategorized" tag card preview
    await page.waitForSelector('span:has-text("Uncategorized")');
    console.log('   ✓ Created tickets successfully.');
    await page.screenshot({ path: path.join(__dirname, 'customer_tickets_priorities.png') });

    // Logout Customer
    await page.goto('http://localhost:5173/dashboard');
    await page.click('button:has-text("Logout")');
    await page.waitForURL('**/login');

    // 4. Admin reassigns Category and Priority to ticket 2
    console.log('4. Admin editing ticket 2 category and priority...');
    await typeInto(page, 'Welcome Back', 'input[type="email"]', adminEmail);
    await typeInto(page, 'Welcome Back', 'input[type="password"]', 'password123');
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('**/dashboard');
    
    await page.click('a:has-text("Support Tickets")');
    await page.waitForURL('**/tickets');
    
    // Filter by Uncategorized to test category filters
    console.log('   Filtering by Uncategorized category filter...');
    await page.selectOption('select:has-text("All Categories")', { label: 'Uncategorized' });
    await page.waitForTimeout(400);
    const uncategorizedCount = await page.locator('h3:has-text("Login validation fails")').count();
    if (uncategorizedCount !== 1) throw new Error('Uncategorized filter failed');

    // Select Ticket 2
    await page.click('text=HD-000002');
    await page.waitForSelector('text=Back to Queue');
    
    // Change Category to Software Config
    console.log('   Admin updating category to Software Config...');
    await page.selectOption('select:has-text("Uncategorized")', { label: 'Software Config' });
    await page.waitForSelector('text=Ticket categoryId updated successfully.');

    // Change Priority to URGENT
    console.log('   Admin updating priority to URGENT...');
    await page.selectOption('select:has-text("Medium")', 'URGENT');
    await page.waitForSelector('text=Ticket priority updated successfully.');
    
    console.log('   ✓ Reassignment and priority update successful.');
    await page.screenshot({ path: path.join(__dirname, 'admin_ticket2_reassigned.png') });

    // 5. Admin deactivates category "Hardware Support"
    console.log('5. Admin deactivating Hardware Support category...');
    await page.goto('http://localhost:5173/categories');
    await page.waitForURL('**/categories');
    
    // Click Deactivate on Hardware Support card
    const card = page.locator('div.bg-slate-900\\/40:has(h3:has-text("Hardware Support"))');
    await card.locator('button:has-text("Deactivate")').click();
    await page.waitForSelector('text=Category "Hardware Support" deactivated successfully.');
    console.log('   ✓ Hardware Support category deactivated.');

    // Logout Admin
    await page.goto('http://localhost:5173/dashboard');
    await page.click('button:has-text("Logout")');
    await page.waitForURL('**/login');

    // 6. Customer logs in, verifies deactivated category behavior
    console.log('6. Logging back as Customer & checking historical categories...');
    await typeInto(page, 'Welcome Back', 'input[type="email"]', customerEmail);
    await typeInto(page, 'Welcome Back', 'input[type="password"]', 'password123');
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('**/dashboard');
    
    await page.click('a:has-text("Support Tickets")');
    await page.waitForURL('**/tickets');
    
    // Verify ticket 1 (HD-000001) STILL lists deactivated Hardware Support category
    const ticket1Row = page.locator('div.bg-slate-900\\/40:has(h3:has-text("battery overheating"))');
    await ticket1Row.waitFor();
    await page.waitForSelector('text=Hardware Support');
    console.log('   ✓ Ticket 1 correctly preserves the deactivated category (historical reference).');

    // Open creation modal and verify "Hardware Support" is NOT visible in category options
    await page.click('button:has-text("New Ticket")');
    await page.waitForSelector('select:has-text("Uncategorized")');
    
    // Verify Hardware Support is absent from categories select
    const selectOptions = await page.locator('select:has-text("Uncategorized") option').allInnerTexts();
    console.log('   Active categories visible to Customer:', selectOptions);
    if (selectOptions.includes('Hardware Support')) {
      throw new Error('Deactivated category is still selectable in forms');
    }
    console.log('   ✓ Deactivated category is correctly hidden from forms.');
    await page.screenshot({ path: path.join(__dirname, 'customer_categories_deactivated_hidden.png') });

    console.log('\n🎉 ALL PHASE 6 CATEGORIES & PRIORITIES PORTAL TESTS PASSED SUCCESSFULLY!');
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
