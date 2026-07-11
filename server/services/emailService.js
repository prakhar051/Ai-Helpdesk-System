const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// Retrieve SMTP Config from environment variables with fallbacks
const smtpHost = process.env.SMTP_HOST || 'localhost';
const smtpPort = parseInt(process.env.SMTP_PORT || '1025', 10);
const smtpUser = process.env.SMTP_USER || '';
const smtpPass = process.env.SMTP_PASS || '';
const smtpFrom = process.env.SMTP_FROM || 'AI Helpdesk <no-reply@aihelpdesk.com>';
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

// Initialize transporter
let transporter;
try {
  const mailConfig = {
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined
  };
  transporter = nodemailer.createTransport(mailConfig);
} catch (err) {
  logger.error(`Failed to initialize Nodemailer transporter: ${err.message}`);
}

/**
 * Sends a generic styled email.
 * Handles failures gracefully without throwing errors.
 */
const sendEmail = async ({ to, subject, html, text }) => {
  if (!transporter) {
    logger.warn(`SMTP transporter is uninitialized. Skipping email to: ${to}`);
    return false;
  }
  try {
    const info = await transporter.sendMail({
      from: smtpFrom,
      to,
      subject,
      html,
      text
    });
    logger.info(`Email sent successfully: ${info.messageId} to ${to}`);
    return true;
  } catch (err) {
    logger.error(`Email delivery failed to ${to}: ${err.message}`);
    return false;
  }
};

// ==========================================
// EMAIL TEMPLATES BUILDERS
// ==========================================

const getEmailTemplate = (title, contentHTML) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #F8FAFC;
      color: #1E293B;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .header {
      background: linear-gradient(135deg, #0B0F19 0%, #1E293B 100%);
      color: #FFFFFF;
      padding: 32px 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.025em;
    }
    .body {
      padding: 32px 24px;
    }
    .ticket-card {
      background-color: #F1F5F9;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 20px;
      margin: 24px 0;
    }
    .ticket-row {
      display: flex;
      margin-bottom: 8px;
      font-size: 14px;
    }
    .ticket-label {
      width: 130px;
      color: #64748B;
      font-weight: 600;
    }
    .ticket-value {
      color: #0F172A;
      font-weight: 500;
    }
    .btn {
      display: inline-block;
      background-color: #6366F1;
      color: #FFFFFF !important;
      font-weight: 600;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      margin-top: 16px;
      text-align: center;
      transition: background-color 0.15s ease;
    }
    .footer {
      background-color: #F8FAFC;
      border-top: 1px solid #E2E8F0;
      padding: 16px 24px;
      text-align: center;
      font-size: 12px;
      color: #64748B;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${title}</h1>
    </div>
    <div class="body">
      ${contentHTML}
    </div>
    <div class="footer">
      This is an automated notification from AI Helpdesk Support Portal.
    </div>
  </div>
</body>
</html>
  `;
};

const formatTicketNumber = (num) => `HD-${num.toString().padStart(6, '0')}`;

const getTicketCardHTML = (ticket) => {
  const agentName = ticket.agent?.name || 'Unassigned';
  const statusColor = ticket.status === 'RESOLVED' ? '#22C55E' : ticket.status === 'CLOSED' ? '#64748B' : '#3B82F6';
  return `
    <div class="ticket-card">
      <div class="ticket-row">
        <span class="ticket-label">Ticket ID:</span>
        <span class="ticket-value" style="font-family: monospace; font-weight: bold;">${formatTicketNumber(ticket.ticketNumber)}</span>
      </div>
      <div class="ticket-row">
        <span class="ticket-label">Subject:</span>
        <span class="ticket-value">${ticket.title}</span>
      </div>
      <div class="ticket-row">
        <span class="ticket-label">Status:</span>
        <span class="ticket-value" style="color: ${statusColor}; font-weight: 700;">${ticket.status}</span>
      </div>
      <div class="ticket-row">
        <span class="ticket-label">Priority:</span>
        <span class="ticket-value" style="text-transform: uppercase;">${ticket.priority}</span>
      </div>
      <div class="ticket-row">
        <span class="ticket-label">Category:</span>
        <span class="ticket-value">${ticket.category?.name || 'Unassigned'}</span>
      </div>
      <div class="ticket-row">
        <span class="ticket-label">Assigned Agent:</span>
        <span class="ticket-value">${agentName}</span>
      </div>
      <div class="ticket-row">
        <span class="ticket-label">Timestamp:</span>
        <span class="ticket-value">${new Date(ticket.createdAt).toLocaleString()}</span>
      </div>
    </div>
  `;
};

// ==========================================
// TICKET EVENTS TRIGGERS
// ==========================================

/**
 * Triggered when a new ticket is submitted.
 * Recipient: Customer (confirmation) and optionally Admin (if ticket is URGENT/CRITICAL).
 */
const sendTicketCreatedEmail = async (ticket) => {
  const formattedNo = formatTicketNumber(ticket.ticketNumber);
  const portalLink = `${clientUrl}/tickets`;

  // 1. Notify Customer
  if (ticket.customer?.email) {
    const subject = `[Created] Ticket ${formattedNo}: ${ticket.title}`;
    const html = getEmailTemplate(
      'Ticket Created Successfully',
      `
      <p>Hello ${ticket.customer.name},</p>
      <p>Your support ticket has been registered in our system and is placed in queue.</p>
      ${getTicketCardHTML(ticket)}
      <a href="${portalLink}" class="btn">View Ticket Details</a>
      `
    );
    const text = `Hello ${ticket.customer.name},\n\nYour support ticket ${formattedNo} was created successfully.\nSubject: ${ticket.title}\nStatus: ${ticket.status}\nLink: ${portalLink}`;
    await sendEmail({ to: ticket.customer.email, subject, html, text });
  }

  // 2. Notify Admin if Priority is URGENT
  if (ticket.priority === 'URGENT') {
    // Query active admins in background
    try {
      const prisma = require('../config/prisma');
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN', isActive: true },
        select: { email: true }
      });
      const adminEmails = admins.map(a => a.email);
      if (adminEmails.length > 0) {
        const subject = `[ALERT] Urgent Ticket ${formattedNo} Created`;
        const html = getEmailTemplate(
          '🚨 Urgent Ticket Alert',
          `
          <p>An urgent priority support ticket has been submitted to the queue.</p>
          ${getTicketCardHTML(ticket)}
          <a href="${portalLink}" class="btn">Access Support Queue</a>
          `
        );
        const text = `ALERT: Urgent ticket ${formattedNo} has been submitted.\nSubject: ${ticket.title}\nLink: ${portalLink}`;
        await sendEmail({ to: adminEmails.join(','), subject, html, text });
      }
    } catch (err) {
      logger.error(`Failed to send urgent admin notifications: ${err.message}`);
    }
  }
};

/**
 * Triggered when a ticket is assigned to an agent.
 * Recipient: Agent.
 */
const sendTicketAssignmentEmail = async (ticket) => {
  if (!ticket.agent?.email) return;

  const formattedNo = formatTicketNumber(ticket.ticketNumber);
  const portalLink = `${clientUrl}/tickets`;
  const subject = `[Assigned] Ticket ${formattedNo}: ${ticket.title}`;
  const html = getEmailTemplate(
    'New Ticket Assigned',
    `
    <p>Hello ${ticket.agent.name},</p>
    <p>You have been assigned to handle support ticket <strong>${formattedNo}</strong>.</p>
    ${getTicketCardHTML(ticket)}
    <a href="${portalLink}" class="btn">Open Assignment Queue</a>
    `
  );
  const text = `Hello ${ticket.agent.name},\n\nYou have been assigned ticket ${formattedNo}.\nSubject: ${ticket.title}\nLink: ${portalLink}`;
  await sendEmail({ to: ticket.agent.email, subject, html, text });
};

/**
 * Triggered when ticket status is changed.
 * Recipient: Customer.
 */
const sendTicketStatusChangedEmail = async (ticket, oldStatus) => {
  if (!ticket.customer?.email) return;

  const formattedNo = formatTicketNumber(ticket.ticketNumber);
  const portalLink = `${clientUrl}/tickets`;
  const subject = `[Update] Ticket ${formattedNo} Status Changed to ${ticket.status}`;
  const html = getEmailTemplate(
    'Ticket Status Update',
    `
    <p>Hello ${ticket.customer.name},</p>
    <p>The status of your ticket has changed from <strong>${oldStatus}</strong> to <strong>${ticket.status}</strong>.</p>
    ${getTicketCardHTML(ticket)}
    <a href="${portalLink}" class="btn">View Discussion Board</a>
    `
  );
  const text = `Hello ${ticket.customer.name},\n\nThe status of ticket ${formattedNo} was changed from ${oldStatus} to ${ticket.status}.\nLink: ${portalLink}`;
  await sendEmail({ to: ticket.customer.email, subject, html, text });
};

/**
 * Triggered when a new comment is posted.
 * Recipient: Customer (if Agent replies) OR Agent (if Customer replies).
 */
const sendCommentNotificationEmail = async (ticket, comment, commenter) => {
  const formattedNo = formatTicketNumber(ticket.ticketNumber);
  const portalLink = `${clientUrl}/tickets`;

  // If customer comments -> Notify Agent
  if (commenter.role === 'CUSTOMER') {
    if (ticket.agent?.email) {
      const subject = `[New Comment] Customer replied to Ticket ${formattedNo}`;
      const html = getEmailTemplate(
        'New Customer Reply',
        `
        <p>Hello ${ticket.agent.name},</p>
        <p>The customer <strong>${commenter.name}</strong> added a new message to ticket <strong>${formattedNo}</strong>:</p>
        <div style="background-color: #FFFbeb; border: 1px solid #FEF3c7; border-radius: 8px; padding: 12px; font-style: italic; margin: 16px 0;">
          "${comment.content}"
        </div>
        ${getTicketCardHTML(ticket)}
        <a href="${portalLink}" class="btn">Reply on Portal</a>
        `
      );
      const text = `Hello ${ticket.agent.name},\n\nCustomer ${commenter.name} added a comment to ${formattedNo}:\n"${comment.content}"\nLink: ${portalLink}`;
      await sendEmail({ to: ticket.agent.email, subject, html, text });
    }
  } else {
    // If agent/admin comments -> Notify Customer
    if (ticket.customer?.email) {
      const subject = `[New Comment] Support update for Ticket ${formattedNo}`;
      const html = getEmailTemplate(
        'Support Agent Update',
        `
        <p>Hello ${ticket.customer.name},</p>
        <p>Support agent <strong>${commenter.name}</strong> has posted a response to ticket <strong>${formattedNo}</strong>:</p>
        <div style="background-color: #EFF6ff; border: 1px solid #DBEAFe; border-radius: 8px; padding: 12px; font-style: italic; margin: 16px 0;">
          "${comment.content}"
        </div>
        ${getTicketCardHTML(ticket)}
        <a href="${portalLink}" class="btn">Post Response</a>
        `
      );
      const text = `Hello ${ticket.customer.name},\n\nAgent ${commenter.name} replied to ${formattedNo}:\n"${comment.content}"\nLink: ${portalLink}`;
      await sendEmail({ to: ticket.customer.email, subject, html, text });
    }
  }
};

/**
 * Triggered when a ticket status resolves.
 * Recipient: Customer.
 */
const sendTicketResolvedEmail = async (ticket) => {
  if (!ticket.customer?.email) return;

  const formattedNo = formatTicketNumber(ticket.ticketNumber);
  const portalLink = `${clientUrl}/tickets`;
  const subject = `[Resolved] Ticket ${formattedNo} has been marked as Resolved`;
  const html = getEmailTemplate(
    'Ticket Resolved Successfully',
    `
    <p>Hello ${ticket.customer.name},</p>
    <p>Your support ticket has been resolved by our support staff.</p>
    ${getTicketCardHTML(ticket)}
    <p>If your issues have been resolved, please confirm closure on the portal.</p>
    <a href="${portalLink}" class="btn">Confirm Resolution & Close</a>
    `
  );
  const text = `Hello ${ticket.customer.name},\n\nYour ticket ${formattedNo} is resolved.\nLink: ${portalLink}`;
  await sendEmail({ to: ticket.customer.email, subject, html, text });
};

/**
 * Triggered when a ticket is closed.
 * Recipient: Customer.
 */
const sendTicketClosedEmail = async (ticket) => {
  if (!ticket.customer?.email) return;

  const formattedNo = formatTicketNumber(ticket.ticketNumber);
  const portalLink = `${clientUrl}/tickets`;
  const subject = `[Closed] Ticket ${formattedNo} is now Closed`;
  const html = getEmailTemplate(
    'Ticket Closed',
    `
    <p>Hello ${ticket.customer.name},</p>
    <p>Your support ticket has been successfully closed. Thank you for contacting support.</p>
    ${getTicketCardHTML(ticket)}
    <a href="${portalLink}" class="btn">View Conversation Archive</a>
    `
  );
  const text = `Hello ${ticket.customer.name},\n\nYour ticket ${formattedNo} has been closed.\nLink: ${portalLink}`;
  await sendEmail({ to: ticket.customer.email, subject, html, text });
};

module.exports = {
  sendTicketCreatedEmail,
  sendTicketAssignmentEmail,
  sendTicketStatusChangedEmail,
  sendCommentNotificationEmail,
  sendTicketResolvedEmail,
  sendTicketClosedEmail
};
