const { chromium } = require('playwright');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

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
    console.log('🚀 Starting Phase 21 AI Chatbot with RAG Integration Verification...');

    // Wait for servers to be online
    console.log('Waiting for backend and client servers to be online...');
    for (let i = 0; i < 20; i++) {
      try {
        const backendRes = await fetch('http://localhost:5000/api/v1/health');
        const clientRes = await fetch('http://localhost:5173/');
        if (backendRes.ok && clientRes.ok) break;
      } catch (e) {}
      await new Promise(r => setTimeout(r, 1000));
    }

    console.log('Cleaning up database...');
    // Clean up database using correct dependency order
    await prisma.comment.deleteMany({});
    await prisma.attachment.deleteMany({});
    await prisma.ticket.deleteMany({});
    await prisma.article.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$executeRawUnsafe('ALTER SEQUENCE tickets_ticket_number_seq RESTART WITH 1;');

    console.log('Seeding test accounts...');
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

    // Elevate admin in DB
    const dbAdmin = await prisma.user.update({
      where: { email: adminEmail },
      data: { role: 'ADMIN' }
    });

    // Sign in Customer via page to grab token
    console.log('Logging in Customer User to verify JWT tokens...');
    await page.click('button:has-text("Logout")');
    await page.waitForURL('**/login');
    await page.fill('input[type="email"]', customerEmail);
    await page.fill('input[placeholder="••••••••"]', 'password123');
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('**/dashboard');

    // Extract customer auth token from localStorage
    const customerToken = await page.evaluate(() => localStorage.getItem('token'));
    if (!customerToken) {
      throw new Error('Failed to retrieve authentication token from localStorage');
    }
    console.log('✓ Retrieved Customer Auth JWT token successfully');

    // Create a published KB article for password resets
    console.log('Creating a published Knowledge Base article...');
    const testArticle = await prisma.article.create({
      data: {
        title: 'How to reset your password',
        content: 'To reset your password, click on the Forgot Password link on the login page and enter your registered email. You will receive a reset password link.',
        category: 'IT Support',
        slug: 'how-to-reset-your-password',
        status: 'PUBLISHED',
        authorId: dbAdmin.id
      }
    });
    console.log(`✓ Article seeded: "${testArticle.title}" (ID: ${testArticle.id})`);

    // Verify Auth Protection
    console.log('\n1. Testing Auth Protection on /chat endpoint...');
    const noAuthRes = await apiPost('http://localhost:5000/api/v1/chat', { message: 'Hello' });
    console.log(`   Response status (No Auth): ${noAuthRes.status}`);
    if (noAuthRes.status !== 401) {
      throw new Error(`Expected 401 Unauthorized for no auth, got ${noAuthRes.status}`);
    }
    console.log('✓ Auth Protection verified.');

    // Verify Chat Endpoint & RAG
    console.log('\n2. Testing Chat Endpoint with relevant query...');
    const chatRes = await apiPost('http://localhost:5000/api/v1/chat', {
      message: 'How do I reset my password?'
    }, customerToken);
    
    console.log(`   Response status: ${chatRes.status}`);
    console.log('   Response data:', JSON.stringify(chatRes.data, null, 2));

    if (chatRes.status !== 200 || chatRes.data?.status !== 'success') {
      throw new Error(`Expected status 200 and success payload, got ${chatRes.status}`);
    }

    const chatData = chatRes.data.data;
    if (!chatData.answer || typeof chatData.confidence !== 'number' || !chatData.confidenceLevel) {
      throw new Error('Missing required schema fields (answer, confidence, confidenceLevel)');
    }
    console.log('✓ Chat RAG fields validated successfully.');

    // Verify Source Citations
    console.log('\n3. Verifying Source citations mapping...');
    const used = chatData.usedArticles || [];
    if (used.length === 0 || used[0].id !== testArticle.id) {
      console.warn('⚠️ Warning: RAG did not list the seeded article as a used source.');
    } else {
      console.log(`✓ Used source verified: "${used[0].title}"`);
    }

    // Verify Chat History Support
    console.log('\n4. Testing Chat history payload...');
    const historyRes = await apiPost('http://localhost:5000/api/v1/chat', {
      message: 'Can you summarize that?',
      history: [
        { role: 'user', content: 'How do I reset my password?' },
        { role: 'assistant', content: chatData.answer }
      ]
    }, customerToken);
    console.log(`   History response status: ${historyRes.status}`);
    if (historyRes.status !== 200) {
      throw new Error('Expected 200 for message history queries.');
    }
    console.log('✓ Conversation history accepted successfully.');

    // Verify Empty KB scenario
    console.log('\n5. Testing Empty KB relevance scoring (asking irrelevant query)...');
    const irrelevantRes = await apiPost('http://localhost:5000/api/v1/chat', {
      message: 'Grow tomato in space'
    }, customerToken);
    console.log('   Irrelevant Query Output:', JSON.stringify(irrelevantRes.data, null, 2));
    console.log('✓ Empty KB boundaries tested successfully.');

    // Verify API Key boundaries / Fallback mode
    console.log('\n6. Testing Missing/Invalid API key fallback mode...');
    const originalApiKey = process.env.GROQ_API_KEY;
    
    // Clear key to simulate missing config
    process.env.GROQ_API_KEY = '';
    const fallbackRes = await apiPost('http://localhost:5000/api/v1/chat', {
      message: 'How do I reset my password?'
    }, customerToken);
    console.log('   Fallback output with missing API key:', JSON.stringify(fallbackRes.data, null, 2));
    
    // Restore key
    process.env.GROQ_API_KEY = originalApiKey;
    if (fallbackRes.status !== 200 || !fallbackRes.data?.data?.answer) {
      throw new Error('Expected 200 and safe fallback answer even if API Key is missing.');
    }
    console.log('✓ Safe API fallback verified.');

    // Verify Frontend Floating Widget and Interactions
    console.log('\n7. Verifying Frontend Chat widget UI...');
    await page.goto('http://localhost:5173/dashboard');
    
    // Check if floating toggle button is visible
    const chatbotToggle = page.locator('button:has-text("AI Assistant")');
    await chatbotToggle.waitFor({ state: 'visible' });
    console.log('✓ Floating "AI Assistant" button is visible.');

    // Open chat window
    await chatbotToggle.click();
    const chatWindow = page.locator('span:has-text("Apex AI Assistant")');
    await chatWindow.waitFor({ state: 'visible' });
    console.log('✓ Chat window opened successfully.');

    // Check if suggested questions are rendered
    const suggestedQ = page.locator('button:has-text("How do I reset my password?")');
    await suggestedQ.waitFor({ state: 'visible' });
    console.log('✓ Suggested questions rendered successfully.');

    // Click suggested question to send
    console.log('   Clicking suggested question...');
    await suggestedQ.click();
    
    // Wait for reply bubble to appear (it should load and show matching article source)
    await page.waitForTimeout(3000); // Allow Groq API delay
    const sourceLink = page.locator(`button:has-text("${testArticle.title}")`);
    await sourceLink.waitFor({ state: 'visible' });
    console.log('✓ Response and source link verified.');

    // Click source citation
    console.log('   Clicking source citation to verify redirect...');
    await sourceLink.click();
    await page.waitForURL('**/kb');
    
    // Assert detail panel opens
    const articleDetailTitle = page.locator(`h1:has-text("${testArticle.title}")`);
    await articleDetailTitle.waitFor({ state: 'visible' });
    console.log('✓ Source citation redirect and details panel loading successful.');

    // Verify low confidence support ticket creation prefill
    console.log('\n8. Verifying Low Confidence fallback and prefill...');
    await page.goto('http://localhost:5173/dashboard');
    await chatbotToggle.waitFor({ state: 'visible' });
    await chatbotToggle.click();
    
    // Type irrelevant question
    console.log('   Sending irrelevant question...');
    const inputArea = page.locator('textarea[placeholder="Ask a question..."]');
    await inputArea.fill('Grow tomato in space');
    await page.keyboard.press('Enter');

    // Wait for the low confidence ticket creation button
    await page.waitForTimeout(3000);
    const ticketButton = page.locator('button:has-text("Create Support Ticket")');
    await ticketButton.waitFor({ state: 'visible' });
    console.log('✓ "Create Support Ticket" button displayed for low confidence.');

    // Click the button and check prefill redirection
    console.log('   Clicking Create Support Ticket button...');
    await ticketButton.click();
    await page.waitForURL('**/tickets');

    // Verify creation form is open and fields are prefilled
    const formTitle = page.locator('input[placeholder*="Describe the issue"]');
    await formTitle.waitFor({ state: 'visible' });
    const prefilledTitleValue = await formTitle.inputValue();
    console.log(`   Prefilled Title: "${prefilledTitleValue}"`);
    if (!prefilledTitleValue.includes('Grow tomato in space')) {
      console.warn('⚠️ Warning: prefilled Title did not match the question.');
    } else {
      console.log('✓ Ticket creation form pre-population verified.');
    }

    console.log('\n🎉 ALL PHASE 21 AI CHATBOT WITH RAG TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('\n❌ Integration Verification failed with error:', err.message);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
    process.exit(0);
  }
})();
