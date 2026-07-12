const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { hashPassword } = require('./utils/password');
const { generateToken } = require('./utils/jwt');

async function apiPost(url, body, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  const data = await res.json();
  return { status: res.status, data };
}

(async () => {
  try {
    console.log('🚀 Starting Groq API Integration Verification Tests...');

    // Clean database
    console.log('Cleaning up database...');
    await prisma.comment.deleteMany({});
    await prisma.attachment.deleteMany({});
    await prisma.ticket.deleteMany({});
    await prisma.article.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.user.deleteMany({});

    // Seed test accounts
    console.log('Seeding test accounts...');
    const hashedPassword = await hashPassword('password123');

    const adminUser = await prisma.user.create({
      data: {
        email: 'admin_groq@example.com',
        password: hashedPassword,
        name: 'Admin Groq',
        role: 'ADMIN',
        isActive: true
      }
    });

    await prisma.user.create({
      data: {
        email: 'agent_groq@example.com',
        password: hashedPassword,
        name: 'Agent Groq',
        role: 'AGENT',
        isActive: true
      }
    });

    const token = generateToken({ id: adminUser.id, role: adminUser.role });

    // Seed Category & Knowledge Base
    const category = await prisma.category.create({
      data: {
        name: 'IT Support',
        description: 'Technical issues.'
      }
    });

    await prisma.article.create({
      data: {
        title: 'Outlook Sync failing',
        content: 'Troubleshooting Outlook Sync issues. Ensure you have network connectivity and clear cached credentials.',
        category: 'IT Support',
        slug: 'outlook-sync-failing',
        status: 'PUBLISHED',
        authorId: adminUser.id
      }
    });

    // Seed Ticket & Comment
    const ticket = await prisma.ticket.create({
      data: {
        title: 'VGA port not working',
        description: 'The screen remains black when plugged into the VGA monitor.',
        status: 'OPEN',
        priority: 'MEDIUM',
        customerId: adminUser.id,
        categoryId: category.id
      }
    });

    await prisma.comment.create({
      data: {
        content: 'I tried plugging it in again but still black screen.',
        ticketId: ticket.id,
        authorId: adminUser.id
      }
    });

    // Endpoints array
    const testCases = [
      {
        name: 'AI Ticket Classification',
        url: 'http://localhost:5000/api/v1/tickets/ai/analyze',
        body: { title: 'Keyboard keys not registering', description: 'When I type on the keyboard, several letters do not display on screen.' },
        validate: (data) => data.categoryId !== undefined && data.priority !== undefined
      },
      {
        name: 'Knowledge Base Recommendation',
        url: 'http://localhost:5000/api/v1/tickets/ai/recommend-kb',
        body: { title: 'Outlook Sync issue', description: 'Having problems synchronising Outlook client with mail server.', categoryId: category.id },
        validate: (data) => Array.isArray(data.recommendations)
      },
      {
        name: 'Ticket Summary',
        url: 'http://localhost:5000/api/v1/tickets/ai/summary',
        body: { ticketId: ticket.id },
        validate: (data) => typeof data.summary === 'string'
      },
      {
        name: 'Suggested Reply',
        url: 'http://localhost:5000/api/v1/tickets/ai/reply',
        body: { ticketId: ticket.id },
        validate: (data) => typeof data.reply === 'string'
      },
      {
        name: 'Duplicate Detection',
        url: 'http://localhost:5000/api/v1/tickets/ai/duplicates',
        body: { title: 'VGA monitor blank', description: 'The screen is black when connected' },
        validate: (data) => Array.isArray(data.duplicates)
      },
      {
        name: 'Sentiment Analysis',
        url: 'http://localhost:5000/api/v1/tickets/ai/sentiment',
        body: { ticketId: ticket.id },
        validate: (data) => data.sentiment !== undefined && data.confidence !== undefined
      },
      {
        name: 'Agent Recommendation',
        url: 'http://localhost:5000/api/v1/tickets/ai/assign',
        body: { ticketId: ticket.id },
        validate: (data) => data.recommendation !== undefined && data.recommendation.recommendedAgentName !== undefined
      }
    ];

    let success = true;
    for (const testCase of testCases) {
      console.log(`\nTesting: ${testCase.name}...`);
      const { status, data } = await apiPost(testCase.url, testCase.body, token);
      console.log(`   Response status: ${status}`);
      console.log(`   Response data:`, JSON.stringify(data, null, 2));

      if (status !== 200 || data.status !== 'success' || !testCase.validate(data.data)) {
        console.error(`❌ Validation failed for: ${testCase.name}`);
        success = false;
      } else {
        console.log(`✓ ${testCase.name} verified successfully.`);
      }
    }

    if (success) {
      console.log('\n🎉 ALL GROQ AI SERVICE MODULES VERIFIED SUCCESSFULLY!');
      process.exit(0);
    } else {
      console.error('\n❌ SOME VERIFICATIONS FAILED.');
      process.exit(1);
    }

  } catch (err) {
    console.error('❌ Verification script crashed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
