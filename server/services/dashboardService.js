const prisma = require('../config/prisma');

class DashboardService {
  /**
   * Generates operations statistics and metrics.
   * @param {object} user - The requesting user object.
   * @returns {Promise<object>} Dashboard metrics dataset.
   */
  async getDashboardStats(user) {
    // 1. Establish query filter scope based on user role
    const filterScope = { isDeleted: false };
    if (user.role === 'CUSTOMER') {
      filterScope.customerId = user.id;
    }

    // 2. Fetch concurrent aggregates using Promise.all
    const [
      ticketCounts,
      priorityCounts,
      categoryCountsRaw,
      allCategories,
      assignedCount,
      unassignedCount,
      myAssignedCount,
      agentWorkloadRaw,
      allAgents,
      aiClassifiedCount,
      recentTickets
    ] = await Promise.all([
      // Ticket status counts
      prisma.ticket.groupBy({
        by: ['status'],
        where: filterScope,
        _count: true
      }),
      // Priority counts
      prisma.ticket.groupBy({
        by: ['priority'],
        where: filterScope,
        _count: true
      }),
      // Category counts
      prisma.ticket.groupBy({
        by: ['categoryId'],
        where: filterScope,
        _count: true
      }),
      // Fetch categories list to map IDs to Names
      prisma.category.findMany({
        select: { id: true, name: true }
      }),
      // Assigned tickets
      prisma.ticket.count({
        where: { ...filterScope, agentId: { not: null } }
      }),
      // Unassigned tickets
      prisma.ticket.count({
        where: { ...filterScope, agentId: null }
      }),
      // My assigned tickets
      prisma.ticket.count({
        where: { ...filterScope, agentId: user.id }
      }),
      // Agent workload (only calculated for Admin/Agent)
      user.role !== 'CUSTOMER'
        ? prisma.ticket.groupBy({
            by: ['agentId'],
            where: { ...filterScope, agentId: { not: null } },
            _count: true
          })
        : Promise.resolve([]),
      // Fetch agents info to map names
      user.role !== 'CUSTOMER'
        ? prisma.user.findMany({
            where: { role: { in: ['AGENT', 'ADMIN'] } },
            select: { id: true, name: true }
          })
        : Promise.resolve([]),
      // AI auto-classified tickets
      prisma.ticket.count({
        where: { ...filterScope, aiReason: { not: null } }
      }),
      // Recent tickets (latest 5)
      prisma.ticket.findMany({
        where: filterScope,
        select: {
          id: true,
          ticketNumber: true,
          title: true,
          status: true,
          priority: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      })
    ]);

    // 3. Process Status Metrics
    const ticketMetrics = {
      total: 0,
      open: 0,
      inProgress: 0,
      pending: 0,
      resolved: 0,
      closed: 0
    };
    ticketCounts.forEach(group => {
      const count = group._count;
      ticketMetrics.total += count;
      if (group.status === 'OPEN') ticketMetrics.open = count;
      else if (group.status === 'IN_PROGRESS') ticketMetrics.inProgress = count;
      else if (group.status === 'PENDING') ticketMetrics.pending = count;
      else if (group.status === 'RESOLVED') ticketMetrics.resolved = count;
      else if (group.status === 'CLOSED') ticketMetrics.closed = count;
    });

    // 4. Process Priority Metrics
    const priorityMetrics = {
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0
    };
    priorityCounts.forEach(group => {
      const count = group._count;
      if (group.priority === 'LOW') priorityMetrics.low = count;
      else if (group.priority === 'MEDIUM') priorityMetrics.medium = count;
      else if (group.priority === 'HIGH') priorityMetrics.high = count;
      else if (group.priority === 'URGENT') priorityMetrics.urgent = count;
    });

    // 5. Process Category Metrics (map categoryId to name)
    const categoryMap = new Map(allCategories.map(c => [c.id, c.name]));
    const categoryMetrics = categoryCountsRaw.map(group => {
      const catId = group.categoryId;
      const catName = catId ? (categoryMap.get(catId) || 'Deleted Category') : 'Unassigned';
      return {
        id: catId || 'unassigned',
        name: catName,
        count: group._count
      };
    });

    // 6. Process Assignment Metrics
    const agentMap = new Map(allAgents.map(a => [a.id, a.name]));
    const agentWorkload = agentWorkloadRaw.map(group => {
      const agentId = group.agentId;
      const agentName = agentMap.get(agentId) || 'Unknown Agent';
      return {
        agentId,
        agentName,
        count: group._count
      };
    });

    const assignmentMetrics = {
      assigned: assignedCount,
      unassigned: unassignedCount,
      myAssigned: myAssignedCount,
      agentWorkload: user.role !== 'CUSTOMER' ? agentWorkload : []
    };

    // 7. Process AI Integration Statuses (representing real DB statistics & capability flags)
    const aiMetrics = {
      classifiedCount: aiClassifiedCount,
      kbUsageStatus: 'Available On Demand',
      summariesStatus: 'Generated Per Request',
      suggestedRepliesStatus: 'Available On Demand',
      duplicateDetectionStatus: 'Generated Per Request'
    };

    return {
      ticketMetrics,
      priorityMetrics,
      categoryMetrics,
      assignmentMetrics,
      aiMetrics,
      recentTickets
    };
  }
}

module.exports = new DashboardService();
