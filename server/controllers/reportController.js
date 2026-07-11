const reportService = require('../services/reportService');

/**
 * Handle Tickets report export streaming
 */
const exportTickets = async (req, res, next) => {
  try {
    const format = (req.query.format || 'pdf').toLowerCase();
    if (!['pdf', 'csv'].includes(format)) {
      return res.status(400).json({ status: 'error', message: 'Format must be pdf or csv' });
    }

    const params = { ...req.query };
    
    // Scoping restrictions per role
    if (req.user.role === 'CUSTOMER') {
      params.customerId = req.user.id;
    } else if (req.user.role === 'AGENT') {
      // Force export to be limited to agent's assigned tickets
      params.agentId = req.user.id;
    }

    const filename = `report_tickets_${Date.now()}.${format}`;
    const contentType = format === 'pdf' ? 'application/pdf' : 'text/csv; charset=utf-8';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await reportService.generateTicketsReport(params, req.user, res, format);
  } catch (err) {
    next(err);
  }
};

/**
 * Handle Dashboard metrics report export streaming
 */
const exportDashboard = async (req, res, next) => {
  try {
    const format = (req.query.format || 'pdf').toLowerCase();
    if (!['pdf', 'csv'].includes(format)) {
      return res.status(400).json({ status: 'error', message: 'Format must be pdf or csv' });
    }

    // RBAC: Customer has no access to dashboard reports
    if (req.user.role === 'CUSTOMER') {
      return res.status(403).json({ status: 'error', message: 'Forbidden. Customers cannot access dashboard reports.' });
    }

    const filename = `report_dashboard_${Date.now()}.${format}`;
    const contentType = format === 'pdf' ? 'application/pdf' : 'text/csv; charset=utf-8';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await reportService.generateDashboardReport(req.user, res, format);
  } catch (err) {
    next(err);
  }
};

/**
 * Handle KB articles list report export streaming
 */
const exportKb = async (req, res, next) => {
  try {
    const format = (req.query.format || 'pdf').toLowerCase();
    if (!['pdf', 'csv'].includes(format)) {
      return res.status(400).json({ status: 'error', message: 'Format must be pdf or csv' });
    }

    // RBAC: Customer has no access to internal KB reports
    if (req.user.role === 'CUSTOMER') {
      return res.status(403).json({ status: 'error', message: 'Forbidden. Customers cannot access KB article directories.' });
    }

    const filename = `report_kb_${Date.now()}.${format}`;
    const contentType = format === 'pdf' ? 'application/pdf' : 'text/csv; charset=utf-8';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await reportService.generateKbReport(req.user, res, format);
  } catch (err) {
    next(err);
  }
};

/**
 * Handle Users directory export streaming (Admin only)
 */
const exportUsers = async (req, res, next) => {
  try {
    const format = (req.query.format || 'pdf').toLowerCase();
    if (!['pdf', 'csv'].includes(format)) {
      return res.status(400).json({ status: 'error', message: 'Format must be pdf or csv' });
    }

    // RBAC: Admin only
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ status: 'error', message: 'Forbidden. Admins only.' });
    }

    const filename = `report_users_${Date.now()}.${format}`;
    const contentType = format === 'pdf' ? 'application/pdf' : 'text/csv; charset=utf-8';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await reportService.generateUsersReport(res, format);
  } catch (err) {
    next(err);
  }
};

/**
 * Handle Ticket Categories export streaming (Admin only)
 */
const exportCategories = async (req, res, next) => {
  try {
    const format = (req.query.format || 'pdf').toLowerCase();
    if (!['pdf', 'csv'].includes(format)) {
      return res.status(400).json({ status: 'error', message: 'Format must be pdf or csv' });
    }

    // RBAC: Admin only
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ status: 'error', message: 'Forbidden. Admins only.' });
    }

    const filename = `report_categories_${Date.now()}.${format}`;
    const contentType = format === 'pdf' ? 'application/pdf' : 'text/csv; charset=utf-8';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await reportService.generateCategoriesReport(res, format);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  exportTickets,
  exportDashboard,
  exportKb,
  exportUsers,
  exportCategories
};
