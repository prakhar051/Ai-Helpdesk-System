const PDFDocument = require('pdfkit');
const ticketService = require('./ticketService');
const dashboardService = require('./dashboardService');
const kbService = require('./kbService');
const categoryService = require('./categoryService');
const userService = require('./userService');

// Helper to escape CSV values
function escapeCsv(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Draw professional PDF Header
function drawPdfHeader(doc, title, filters = {}) {
  // Brand title
  doc.fontSize(20).fillColor('#4f46e5').text('AI HELPDESK SYSTEM', 50, 40, { bold: true });
  
  // Document title
  doc.fontSize(14).fillColor('#1f2937').text(title, 50, 70, { bold: true });
  
  // Generated time
  doc.fontSize(9).fillColor('#6b7280').text(`Report Generated: ${new Date().toLocaleString()}`, 50, 90);

  // Filters listing
  const filterTexts = [];
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      filterTexts.push(`${k}: ${v}`);
    }
  });
  if (filterTexts.length > 0) {
    doc.text(`Filters Applied: ${filterTexts.join(' | ')}`, 50, 105);
  }
  
  doc.moveTo(50, 120).lineTo(550, 120).strokeColor('#e5e7eb').stroke();
}

// Draw professional PDF Footer on every page
function drawPdfFooter(doc, pageNum) {
  doc.fontSize(8).fillColor('#9ca3af');
  doc.text('AI Helpdesk System — Confidential Report', 50, 750);
  doc.text(`Page ${pageNum}`, 500, 750, { align: 'right' });
}

/**
 * Generate report streams directly to HTTP response object
 */
class ReportService {
  async generateTicketsReport(params, user, res, format) {
    // 1. Retrieve all matching tickets from existing service (bypassing pagination take limit)
    const result = await ticketService.getAllTickets({
      ...params,
      role: user.role,
      currentUserId: user.id,
      page: 1,
      limit: 1000000 // High value to fetch all matching entries
    });
    const tickets = result.tickets;

    if (format === 'csv') {
      res.write('Ticket Number,Title,Category,Priority,Status,Customer,Assigned Agent,Created Date,Updated Date\n');
      tickets.forEach(t => {
        const num = `HD-${t.ticketNumber.toString().padStart(6, '0')}`;
        const title = escapeCsv(t.title);
        const cat = t.category ? escapeCsv(t.category.name) : 'Uncategorized';
        const pri = t.priority;
        const stat = t.status;
        const cust = escapeCsv(t.customer.name);
        const ag = t.agent ? escapeCsv(t.agent.name) : 'Unassigned';
        const cAt = t.createdAt.toISOString();
        const uAt = t.updatedAt.toISOString();
        res.write(`${num},${title},${cat},${pri},${stat},${cust},${ag},${cAt},${uAt}\n`);
      });
      res.end();
      return;
    }

    // PDF format
    const doc = new PDFDocument({ margin: 50, autoFirstPage: true });
    doc.pipe(res);

    let pageNum = 1;
    drawPdfHeader(doc, 'Tickets Summary Report', {
      Search: params.search,
      Status: params.status,
      Priority: params.priority,
      Category: params.categoryId ? 'Selected' : undefined,
      'Start Date': params.startDate,
      'End Date': params.endDate
    });
    drawPdfFooter(doc, pageNum);

    // Summary statistics
    doc.fontSize(11).fillColor('#1f2937').text(`Summary Statistics`, 50, 140, { bold: true });
    doc.fontSize(10).fillColor('#4b5563');
    doc.text(`Total Matching Tickets: ${tickets.length}`, 50, 160);
    
    // Status metrics
    const stats = { OPEN: 0, IN_PROGRESS: 0, PENDING: 0, RESOLVED: 0, CLOSED: 0 };
    tickets.forEach(t => {
      if (stats[t.status] !== undefined) stats[t.status]++;
    });
    doc.text(`Open: ${stats.OPEN} | In Progress: ${stats.IN_PROGRESS} | Pending: ${stats.PENDING} | Resolved: ${stats.RESOLVED} | Closed: ${stats.CLOSED}`, 50, 175);
    
    doc.moveTo(50, 195).lineTo(550, 195).strokeColor('#e5e7eb').stroke();

    // Table Header
    let y = 210;
    doc.fontSize(10).fillColor('#374151');
    doc.text('Ticket ID', 50, y, { bold: true });
    doc.text('Title', 125, y, { bold: true });
    doc.text('Category', 280, y, { bold: true });
    doc.text('Priority', 380, y, { bold: true });
    doc.text('Status', 450, y, { bold: true });
    y += 18;
    doc.moveTo(50, y - 5).lineTo(550, y - 5).strokeColor('#d1d5db').stroke();

    // Rows
    doc.fontSize(9).fillColor('#4b5563');
    tickets.forEach(t => {
      if (y > 700) {
        doc.addPage();
        pageNum++;
        drawPdfFooter(doc, pageNum);
        y = 50;
      }
      const num = `HD-${t.ticketNumber.toString().padStart(6, '0')}`;
      const title = t.title.length > 25 ? t.title.substring(0, 25) + '...' : t.title;
      const cat = t.category ? t.category.name : 'Uncategorized';
      const catTrunc = cat.length > 15 ? cat.substring(0, 15) + '...' : cat;
      const pri = t.priority;
      const stat = t.status;

      doc.text(num, 50, y);
      doc.text(title, 125, y);
      doc.text(catTrunc, 280, y);
      doc.text(pri, 380, y);
      doc.text(stat, 450, y);
      y += 18;
    });

    doc.end();
  }

  async generateDashboardReport(user, res, format) {
    // Retrieve dashboard statistics from existing service
    const stats = await dashboardService.getDashboardStats(user);

    if (format === 'csv') {
      res.write('Metric Key,Metric Group,Metric Name,Value\n');
      // Ticket Counts
      res.write(`total_tickets,Ticket Count,Total Tickets,${stats.ticketMetrics.total}\n`);
      res.write(`open_tickets,Ticket Count,Open Tickets,${stats.ticketMetrics.open}\n`);
      res.write(`pending_tickets,Ticket Count,Pending Tickets,${stats.ticketMetrics.pending}\n`);
      res.write(`resolved_tickets,Ticket Count,Resolved Tickets,${stats.ticketMetrics.resolved}\n`);
      res.write(`closed_tickets,Ticket Count,Closed Tickets,${stats.ticketMetrics.closed}\n`);

      // Priority Distribution
      res.write(`priority_low,Priority Distribution,Priority LOW,${stats.priorityMetrics.low || 0}\n`);
      res.write(`priority_medium,Priority Distribution,Priority MEDIUM,${stats.priorityMetrics.medium || 0}\n`);
      res.write(`priority_high,Priority Distribution,Priority HIGH,${stats.priorityMetrics.high || 0}\n`);
      res.write(`priority_urgent,Priority Distribution,Priority URGENT,${stats.priorityMetrics.urgent || 0}\n`);

      // Category Distribution
      stats.categoryMetrics.forEach(c => {
        res.write(`category_${c.categoryId},Category Distribution,${escapeCsv(c.categoryName)},${c.count}\n`);
      });

      // Agent Workloads
      if (stats.assignmentMetrics.agentWorkload) {
        stats.assignmentMetrics.agentWorkload.forEach(aw => {
          res.write(`agent_workload_${aw.agentId},Agent Workload,${escapeCsv(aw.agentName)},${aw.count}\n`);
        });
      }

      // AI Metrics
      res.write(`ai_classified,AI Metrics,AI Classified Count,${stats.aiMetrics.classifiedCount}\n`);
      res.write(`ai_summaries,AI Metrics,Summaries Status,${escapeCsv(stats.aiMetrics.summariesStatus)}\n`);
      res.write(`ai_suggested_replies,AI Metrics,Suggested Replies Status,${escapeCsv(stats.aiMetrics.suggestedRepliesStatus)}\n`);
      res.write(`ai_duplicates,AI Metrics,Duplicate Detection Status,${escapeCsv(stats.aiMetrics.duplicateDetectionStatus)}\n`);

      res.end();
      return;
    }

    // PDF Format
    const doc = new PDFDocument({ margin: 50, autoFirstPage: true });
    doc.pipe(res);

    let pageNum = 1;
    drawPdfHeader(doc, 'Dashboard Analytics Report');
    drawPdfFooter(doc, pageNum);

    let y = 140;
    
    // Section 1: Ticket Metrics
    doc.fontSize(11).fillColor('#1f2937').text('Operational Ticket Volume', 50, y, { bold: true });
    y += 18;
    doc.fontSize(10).fillColor('#4b5563');
    doc.text(`Total Tickets: ${stats.ticketMetrics.total}`, 55, y);
    doc.text(`Open: ${stats.ticketMetrics.open} | Pending: ${stats.ticketMetrics.pending} | Resolved: ${stats.ticketMetrics.resolved} | Closed: ${stats.ticketMetrics.closed}`, 180, y);
    y += 25;

    // Section 2: Priority Distribution
    doc.fontSize(11).fillColor('#1f2937').text('Priority Distribution', 50, y, { bold: true });
    y += 18;
    doc.fontSize(10).fillColor('#4b5563');
    const priorityTxt = `Low: ${stats.priorityMetrics.low || 0} | Medium: ${stats.priorityMetrics.medium || 0} | High: ${stats.priorityMetrics.high || 0} | Urgent: ${stats.priorityMetrics.urgent || 0}`;
    doc.text(priorityTxt, 55, y);
    y += 25;

    // Section 3: Category Distribution
    doc.fontSize(11).fillColor('#1f2937').text('Category Distribution', 50, y, { bold: true });
    y += 18;
    doc.fontSize(10).fillColor('#4b5563');
    const catTxt = stats.categoryMetrics.map(c => `${c.categoryName}: ${c.count}`).join(' | ');
    doc.text(catTxt || 'No records', 55, y);
    y += 25;

    // Section 4: AI Telemetry Metrics (Real DB metrics)
    doc.fontSize(11).fillColor('#1f2937').text('AI Integration Statuses', 50, y, { bold: true });
    y += 18;
    doc.fontSize(10).fillColor('#4b5563');
    doc.text(`AI Auto-Routed & Classified: ${stats.aiMetrics.classifiedCount}`, 55, y);
    doc.text(`Knowledge Base Recs: ${stats.aiMetrics.kbUsageStatus}`, 55, y + 15);
    doc.text(`AI Ticket Summarization: ${stats.aiMetrics.summariesStatus}`, 280, y);
    doc.text(`AI Suggested Replies: ${stats.aiMetrics.suggestedRepliesStatus}`, 280, y + 15);
    y += 45;

    // Section 5: Agent Workloads (Admins/Agents only)
    if (user.role !== 'CUSTOMER') {
      doc.fontSize(11).fillColor('#1f2937').text('Support Agent Workload', 50, y, { bold: true });
      y += 18;
      doc.fontSize(10).fillColor('#4b5563');
      const workloadTxt = stats.assignmentMetrics.agentWorkload.map(a => `${a.agentName}: ${a.count} open`).join(' | ');
      doc.text(workloadTxt || 'No active assignments', 55, y);
      y += 25;
    }

    // Section 6: Recent Tickets
    if (y > 550) {
      doc.addPage();
      pageNum++;
      drawPdfFooter(doc, pageNum);
      y = 50;
    }
    doc.fontSize(11).fillColor('#1f2937').text('Recent Activity Tickets', 50, y, { bold: true });
    y += 18;
    doc.fontSize(10).fillColor('#374151');
    doc.text('Ticket ID', 50, y, { bold: true });
    doc.text('Title', 130, y, { bold: true });
    doc.text('Priority', 320, y, { bold: true });
    doc.text('Status', 420, y, { bold: true });
    y += 15;
    doc.moveTo(50, y - 3).lineTo(550, y - 3).strokeColor('#e5e7eb').stroke();

    doc.fontSize(9).fillColor('#4b5563');
    stats.recentTickets.forEach(t => {
      const num = `HD-${t.ticketNumber.toString().padStart(6, '0')}`;
      const title = t.title.length > 25 ? t.title.substring(0, 25) + '...' : t.title;
      doc.text(num, 50, y);
      doc.text(title, 130, y);
      doc.text(t.priority, 320, y);
      doc.text(t.status, 420, y);
      y += 15;
    });

    doc.end();
  }

  async generateKbReport(user, res, format) {
    const result = await kbService.getAllArticles({
      role: user.role,
      page: 1,
      limit: 1000000
    });
    const articles = result.articles;

    if (format === 'csv') {
      res.write('Article ID,Title,Author,Category,Type,Status,Views,Created Date\n');
      articles.forEach(a => {
        const id = a.id;
        const title = escapeCsv(a.title);
        const authorName = escapeCsv(a.author.name);
        const cat = escapeCsv(a.category);
        const type = a.isFaq ? 'FAQ' : 'Article';
        const stat = a.status;
        const views = a.viewCount;
        const cAt = a.createdAt.toISOString();
        res.write(`${id},${title},${authorName},${cat},${type},${stat},${views},${cAt}\n`);
      });
      res.end();
      return;
    }

    // PDF Format
    const doc = new PDFDocument({ margin: 50, autoFirstPage: true });
    doc.pipe(res);

    let pageNum = 1;
    drawPdfHeader(doc, 'Knowledge Base Articles Directory');
    drawPdfFooter(doc, pageNum);

    let y = 140;
    doc.fontSize(10).fillColor('#374151');
    doc.text('Article Title', 50, y, { bold: true });
    doc.text('Category', 240, y, { bold: true });
    doc.text('Type', 340, y, { bold: true });
    doc.text('Status', 400, y, { bold: true });
    doc.text('Views', 480, y, { bold: true });
    y += 18;
    doc.moveTo(50, y - 5).lineTo(550, y - 5).strokeColor('#d1d5db').stroke();

    doc.fontSize(9).fillColor('#4b5563');
    articles.forEach(a => {
      if (y > 700) {
        doc.addPage();
        pageNum++;
        drawPdfFooter(doc, pageNum);
        y = 50;
      }
      const title = a.title.length > 25 ? a.title.substring(0, 25) + '...' : a.title;
      const cat = a.category ? a.category : 'General';
      const type = a.isFaq ? 'FAQ' : 'Article';
      const stat = a.status;

      doc.text(title, 50, y);
      doc.text(cat, 240, y);
      doc.text(type, 340, y);
      doc.text(stat, 400, y);
      doc.text(String(a.viewCount), 480, y);
      y += 18;
    });

    doc.end();
  }

  async generateUsersReport(res, format) {
    const result = await userService.getAllUsers({
      page: 1,
      limit: 1000000
    });
    const users = result.users;

    if (format === 'csv') {
      res.write('User ID,Name,Email,Role,Status,Created Date\n');
      users.forEach(u => {
        const id = u.id;
        const name = escapeCsv(u.name);
        const email = escapeCsv(u.email);
        const role = u.role;
        const stat = u.isActive ? 'Active' : 'Inactive';
        const cAt = u.createdAt.toISOString();
        res.write(`${id},${name},${email},${role},${stat},${cAt}\n`);
      });
      res.end();
      return;
    }

    // PDF Format
    const doc = new PDFDocument({ margin: 50, autoFirstPage: true });
    doc.pipe(res);

    let pageNum = 1;
    drawPdfHeader(doc, 'User Management Directory');
    drawPdfFooter(doc, pageNum);

    let y = 140;
    doc.fontSize(10).fillColor('#374151');
    doc.text('Name', 50, y, { bold: true });
    doc.text('Email', 160, y, { bold: true });
    doc.text('Role', 330, y, { bold: true });
    doc.text('Status', 420, y, { bold: true });
    doc.text('Joined Date', 480, y, { bold: true });
    y += 18;
    doc.moveTo(50, y - 5).lineTo(550, y - 5).strokeColor('#d1d5db').stroke();

    doc.fontSize(9).fillColor('#4b5563');
    users.forEach(u => {
      if (y > 700) {
        doc.addPage();
        pageNum++;
        drawPdfFooter(doc, pageNum);
        y = 50;
      }
      const name = u.name.length > 18 ? u.name.substring(0, 18) + '...' : u.name;
      const email = u.email.length > 25 ? u.email.substring(0, 25) + '...' : u.email;
      const stat = u.isActive ? 'Active' : 'Inactive';
      const cDate = new Date(u.createdAt).toLocaleDateString();

      doc.text(name, 50, y);
      doc.text(email, 160, y);
      doc.text(u.role, 330, y);
      doc.text(stat, 420, y);
      doc.text(cDate, 480, y);
      y += 18;
    });

    doc.end();
  }

  async generateCategoriesReport(res, format) {
    const categories = await categoryService.getAllCategories();

    if (format === 'csv') {
      res.write('Category ID,Category Name,Description,Status,Created Date\n');
      categories.forEach(c => {
        const id = c.id;
        const name = escapeCsv(c.name);
        const desc = escapeCsv(c.description || '');
        const stat = c.isActive ? 'Active' : 'Inactive';
        const cAt = c.createdAt.toISOString();
        res.write(`${id},${name},${desc},${stat},${cAt}\n`);
      });
      res.end();
      return;
    }

    // PDF Format
    const doc = new PDFDocument({ margin: 50, autoFirstPage: true });
    doc.pipe(res);

    let pageNum = 1;
    drawPdfHeader(doc, 'Ticket Categories Directory');
    drawPdfFooter(doc, pageNum);

    let y = 140;
    doc.fontSize(10).fillColor('#374151');
    doc.text('Category Name', 50, y, { bold: true });
    doc.text('Description', 180, y, { bold: true });
    doc.text('Status', 420, y, { bold: true });
    doc.text('Created Date', 480, y, { bold: true });
    y += 18;
    doc.moveTo(50, y - 5).lineTo(550, y - 5).strokeColor('#d1d5db').stroke();

    doc.fontSize(9).fillColor('#4b5563');
    categories.forEach(c => {
      if (y > 700) {
        doc.addPage();
        pageNum++;
        drawPdfFooter(doc, pageNum);
        y = 50;
      }
      const name = c.name.length > 20 ? c.name.substring(0, 20) + '...' : c.name;
      const descVal = c.description || '';
      const desc = descVal.length > 35 ? descVal.substring(0, 35) + '...' : descVal;
      const stat = c.isActive ? 'Active' : 'Inactive';
      const cDate = new Date(c.createdAt).toLocaleDateString();

      doc.text(name, 50, y);
      doc.text(desc, 180, y);
      doc.text(stat, 420, y);
      doc.text(cDate, 480, y);
      y += 18;
    });

    doc.end();
  }
}

module.exports = new ReportService();
