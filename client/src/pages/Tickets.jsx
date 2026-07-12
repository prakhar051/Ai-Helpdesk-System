import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';
import { useSocket } from '../context/SocketContext';
import TicketCard from '../components/TicketCard';
import TicketForm from '../components/TicketForm';
import CommentSection from '../components/CommentSection';
import AttachmentSection from '../components/AttachmentSection';

export default function Tickets() {
  const { user } = useAuth();
  const { socket } = useSocket();

  // View States: 'LIST', 'DETAIL', 'CREATE', 'EDIT'
  const [view, setView] = useState('LIST');
  const [selectedTicket, setSelectedTicket] = useState(null);

  // Listing Data States
  const [tickets, setTickets] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [limit] = useState(6);

  // Filters State
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState(''); // '' (All), 'unassigned', or AGENT_ID
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [createdByMe, setCreatedByMe] = useState(false);
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [unassignedFilter, setUnassignedFilter] = useState(false);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Lists for dropdown selectors
  const [agents, setAgents] = useState([]);
  const [categories, setCategories] = useState([]);

  // Loading & Alerts
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // AI KB Recommendations
  const [kbRecs, setKbRecs] = useState([]);
  const [recsLoading, setRecsLoading] = useState(false);

  // AI Ticket Summarization
  const [ticketSummary, setTicketSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);

  const handleGenerateSummary = async () => {
    if (!selectedTicket) return;
    setSummaryLoading(true);
    try {
      const response = await apiClient.post('/tickets/ai/summary', { ticketId: selectedTicket.id });
      if (response.data?.status === 'success') {
        setTicketSummary(response.data.data.summary);
      }
    } catch (err) {
      console.error('Failed to generate summary:', err);
      setTicketSummary('AI summary is currently unavailable.');
    } finally {
      setSummaryLoading(false);
    }
  };

  // AI Suggested Replies
  const [suggestedReply, setSuggestedReply] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerateReply = async () => {
    if (!selectedTicket) return;
    setReplyLoading(true);
    setCopied(false);
    try {
      const response = await apiClient.post('/tickets/ai/reply', { ticketId: selectedTicket.id });
      if (response.data?.status === 'success') {
        setSuggestedReply(response.data.data.reply);
      }
    } catch (err) {
      console.error('Failed to generate suggested reply:', err);
      setSuggestedReply('AI reply is currently unavailable.');
    } finally {
      setReplyLoading(false);
    }
  };

  const handleCopyReply = () => {
    if (!suggestedReply) return;
    navigator.clipboard.writeText(suggestedReply);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // AI Sentiment Analysis
  const [sentiment, setSentiment] = useState(null);
  const [sentimentLoading, setSentimentLoading] = useState(false);

  const handleAnalyzeSentiment = async () => {
    if (!selectedTicket) return;
    setSentimentLoading(true);
    try {
      const response = await apiClient.post('/tickets/ai/sentiment', { ticketId: selectedTicket.id });
      if (response.data?.status === 'success') {
        setSentiment(response.data.data);
      }
    } catch (err) {
      console.error('Failed to analyze sentiment:', err);
      setSentiment({
        sentiment: 'UNKNOWN',
        confidence: 0,
        emotion: 'Unknown',
        summary: 'AI sentiment analysis is currently unavailable.',
        agentAdvice: ''
      });
    } finally {
      setSentimentLoading(false);
    }
  };

  // AI Agent Assignment Recommendation
  const [assignmentRec, setAssignmentRec] = useState(null);
  const [assignmentLoading, setAssignmentLoading] = useState(false);

  const handleRecommendAssignment = async () => {
    if (!selectedTicket) return;
    setAssignmentLoading(true);
    try {
      const response = await apiClient.post('/tickets/ai/assign', { ticketId: selectedTicket.id });
      if (response.data?.status === 'success') {
        setAssignmentRec(response.data.data.recommendation);
      }
    } catch (err) {
      console.error('Failed to get agent recommendation:', err);
      setAssignmentRec({
        recommendedAgentId: null,
        recommendedAgentName: null,
        confidence: 0,
        reason: 'AI agent assignment recommendation is currently unavailable.'
      });
    } finally {
      setAssignmentLoading(false);
    }
  };

  const handleAssignAgent = async (agentId) => {
    if (!selectedTicket || !agentId) return;
    setFormLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await apiClient.patch(`/tickets/${selectedTicket.id}`, { agentId });
      if (response.data?.status === 'success') {
        setSuccess('Support ticket successfully assigned to agent.');
        setSelectedTicket(response.data.data.ticket);
        setAssignmentRec(null); // Clear recommendation on success
      }
    } catch (err) {
      console.error('Failed to assign agent:', err);
      setError(err.response?.data?.message || err.message || 'Failed to update assignee.');
    } finally {
      setFormLoading(false);
    }
  };

  const fetchKBRecommendations = async (ticket) => {
    if (!ticket) return;
    setRecsLoading(true);
    try {
      const response = await apiClient.post('/tickets/ai/recommend-kb', {
        title: ticket.title,
        description: ticket.description,
        categoryId: ticket.categoryId
      });
      if (response.data?.status === 'success') {
        setKbRecs(response.data.data.recommendations || []);
      }
    } catch (err) {
      console.error('Failed to fetch KB recommendations:', err);
    } finally {
      setRecsLoading(false);
    }
  };

  // Fetch tickets list matching active filters
  const fetchTickets = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/tickets', {
        params: {
          search: debouncedSearch.trim() || undefined,
          status: statusFilter || undefined,
          priority: priorityFilter || undefined,
          categoryId: categoryFilter || undefined,
          agentId: assigneeFilter || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          createdByMe: createdByMe || undefined,
          assignedToMe: assignedToMe || undefined,
          unassigned: unassignedFilter || undefined,
          sortBy,
          sortOrder,
          page,
          limit
        }
      });
      if (response.data?.status === 'success') {
        setTickets(response.data.data.tickets);
        setTotal(response.data.data.pagination.total);
        setPages(response.data.data.pagination.pages);
      }
    } catch (err) {
      console.error('Failed to load tickets:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch tickets.');
    } finally {
      setLoading(false);
    }
  };

  // Export tickets matching filters
  const handleExport = async (format) => {
    setError(null);
    setSuccess('Preparing Report... Your download will begin automatically.');
    try {
      const response = await apiClient.get('/reports/tickets', {
        params: {
          search: debouncedSearch.trim() || undefined,
          status: statusFilter || undefined,
          priority: priorityFilter || undefined,
          categoryId: categoryFilter || undefined,
          agentId: assigneeFilter || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          createdByMe: createdByMe || undefined,
          assignedToMe: assignedToMe || undefined,
          unassigned: unassignedFilter || undefined,
          sortBy,
          sortOrder,
          format
        },
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: format === 'pdf' ? 'application/pdf' : 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report_tickets_${Date.now()}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      setSuccess('Report downloaded successfully!');
    } catch (err) {
      console.error('Failed to export report:', err);
      setError('Failed to export report.');
      setSuccess(null);
    }
  };

  // Fetch agents list for Admin assignment selectors
  const fetchAgents = async () => {
    if (user?.role !== 'ADMIN') return;
    try {
      const response = await apiClient.get('/users', { params: { limit: 100 } });
      if (response.data?.status === 'success') {
        const filtered = response.data.data.users.filter(u => u.role === 'AGENT' || u.role === 'ADMIN');
        setAgents(filtered);
      }
    } catch (err) {
      console.error('Failed to load agent listings:', err);
    }
  };

  // Fetch active categories list for dropdown selectors
  const fetchCategories = async () => {
    try {
      const response = await apiClient.get('/categories', {
        params: user?.role === 'CUSTOMER' ? { isActive: 'true' } : undefined
      });
      if (response.data?.status === 'success') {
        setCategories(response.data.data.categories);
      }
    } catch (err) {
      console.error('Failed to load categories list:', err);
    }
  };

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => {
      clearTimeout(handler);
    };
  }, [search]);

  // Reset page to 1 on filter changes
  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    statusFilter,
    priorityFilter,
    categoryFilter,
    assigneeFilter,
    startDate,
    endDate,
    createdByMe,
    assignedToMe,
    unassignedFilter,
    sortBy,
    sortOrder
  ]);

  // Run queries
  useEffect(() => {
    if (view === 'LIST') {
      fetchTickets();
    }
  }, [
    page,
    debouncedSearch,
    statusFilter,
    priorityFilter,
    categoryFilter,
    assigneeFilter,
    startDate,
    endDate,
    createdByMe,
    assignedToMe,
    unassignedFilter,
    sortBy,
    sortOrder,
    view
  ]);

  const hasActiveFilters = () => {
    return !!(
      debouncedSearch ||
      statusFilter ||
      priorityFilter ||
      categoryFilter ||
      startDate ||
      endDate ||
      assignedToMe ||
      createdByMe ||
      unassignedFilter
    );
  };

  const handleResetAllFilters = () => {
    setSearch('');
    setStatusFilter('');
    setPriorityFilter('');
    setCategoryFilter('');
    setAssigneeFilter('');
    setStartDate('');
    setEndDate('');
    setAssignedToMe(false);
    setCreatedByMe(false);
    setUnassignedFilter(false);
    setSortBy('createdAt');
    setSortOrder('desc');
  };

  useEffect(() => {
    fetchAgents();
    fetchCategories();
  }, [user]);

  // Real-time WebSockets synchronization
  useEffect(() => {
    if (!socket) return;

    const handleTicketCreated = (payload) => {
      fetchTickets();
    };

    const handleTicketUpdated = (payload) => {
      const { ticket } = payload.data || {};
      if (!ticket) return;
      setTickets((prev) => prev.map((t) => (t.id === ticket.id ? { ...t, ...ticket } : t)));
      setSelectedTicket((prev) => (prev && prev.id === ticket.id ? ticket : prev));
    };

    socket.on('ticket:created', handleTicketCreated);
    socket.on('ticket:updated', handleTicketUpdated);
    socket.on('ticket:assigned', handleTicketUpdated);
    socket.on('ticket:status', handleTicketUpdated);
    socket.on('ticket:resolved', handleTicketUpdated);
    socket.on('ticket:closed', handleTicketUpdated);

    return () => {
      socket.off('ticket:created', handleTicketCreated);
      socket.off('ticket:updated', handleTicketUpdated);
      socket.off('ticket:assigned', handleTicketUpdated);
      socket.off('ticket:status', handleTicketUpdated);
      socket.off('ticket:resolved', handleTicketUpdated);
      socket.off('ticket:closed', handleTicketUpdated);
    };
  }, [socket]);

  // Handle ticket selection detail view
  const handleSelectTicket = async (ticket) => {
    setError(null);
    setSuccess(null);
    setKbRecs([]);
    setTicketSummary('');
    setSummaryLoading(false);
    setSuggestedReply('');
    setReplyLoading(false);
    setCopied(false);
    setSentiment(null);
    setSentimentLoading(false);
    setAssignmentRec(null);
    setAssignmentLoading(false);
    try {
      const response = await apiClient.get(`/tickets/${ticket.id}`);
      if (response.data?.status === 'success') {
        const fullTicket = response.data.data.ticket;
        setSelectedTicket(fullTicket);
        setView('DETAIL');
        fetchKBRecommendations(fullTicket);
      }
    } catch (err) {
      console.error('Failed to load ticket details:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch ticket details.');
    }
  };

  // Create new ticket submission
  const handleCreateTicket = async (payload) => {
    setFormLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await apiClient.post('/tickets', payload);
      if (response.data?.status === 'success') {
        setSuccess('Support ticket created successfully. Notification email queued.');
        setView('LIST');
        setPage(1);
      }
    } catch (err) {
      console.error('Failed to create ticket:', err);
      setError(err.response?.data?.message || err.message || 'Failed to submit ticket.');
    } finally {
      setFormLoading(false);
    }
  };

  // Update ticket title/description
  const handleUpdateTicket = async (payload) => {
    if (!selectedTicket) return;
    setFormLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await apiClient.patch(`/tickets/${selectedTicket.id}`, payload);
      if (response.data?.status === 'success') {
        setSuccess('Ticket details updated successfully. Notification email queued.');
        setSelectedTicket(response.data.data.ticket);
        setView('DETAIL');
      }
    } catch (err) {
      console.error('Failed to update ticket:', err);
      setError(err.response?.data?.message || err.message || 'Failed to save changes.');
    } finally {
      setFormLoading(false);
    }
  };

  // Update status or assignee fields
  const handleMetaUpdate = async (field, value) => {
    if (!selectedTicket) return;
    setError(null);
    setSuccess(null);
    try {
      const payload = { [field]: value };
      const response = await apiClient.patch(`/tickets/${selectedTicket.id}`, payload);
      if (response.data?.status === 'success') {
        setSuccess(`Ticket ${field} updated successfully. Notification email queued.`);
        setSelectedTicket(response.data.data.ticket);
      }
    } catch (err) {
      console.error('Failed to update ticket parameters:', err);
      setError(err.response?.data?.message || err.message || 'Failed to update fields.');
    }
  };

  // Soft delete ticket (Admin only)
  const handleDeleteTicket = async () => {
    if (!selectedTicket) return;
    if (!window.confirm('Are you sure you want to delete this ticket?')) return;
    setError(null);
    setSuccess(null);
    try {
      const response = await apiClient.delete(`/tickets/${selectedTicket.id}`);
      if (response.data?.status === 'success') {
        setSuccess('Ticket deleted successfully.');
        setView('LIST');
        setPage(1);
      }
    } catch (err) {
      console.error('Failed to delete ticket:', err);
      setError(err.response?.data?.message || err.message || 'Failed to delete ticket.');
    }
  };

  return (
    <div className="min-h-screen bg-bgBase text-textSecondary p-6 flex flex-col items-center justify-start relative overflow-hidden">
      {/* Visual glowing layout nodes */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-6xl bg-bgSurface border border-slate-200/60 backdrop-blur-md border border-borderDefault rounded-2xl p-6 shadow-2xl z-10">
        
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-borderDefault mb-6 gap-4">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-textMuted hover:text-textPrimary transition text-sm font-medium">
              ← Dashboard
            </Link>
            <span className="text-textPrimary font-bold text-xl ml-2">Support Tickets Portal</span>
          </div>

          <div className="flex items-center gap-3">
            {view === 'LIST' && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleExport('pdf')}
                  className="py-1.5 px-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-primary-hover border border-indigo-500/20 font-semibold text-xs transition"
                >
                  Export PDF
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  className="py-1.5 px-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-primary-hover border border-indigo-500/20 font-semibold text-xs transition"
                >
                  Export CSV
                </button>
              </div>
            )}
            {user?.role === 'CUSTOMER' && view === 'LIST' && (
              <button
                onClick={() => {
                  setError(null);
                  setSuccess(null);
                  setView('CREATE');
                }}
                className="py-2 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-semibold text-xs shadow-lg shadow-indigo-500/20 hover:opacity-90 transition"
              >
                + New Ticket
              </button>
            )}
            <div className="text-xs text-primary font-semibold px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              User: {user?.name} ({user?.role})
            </div>
          </div>
        </div>

        {/* Action Status Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm">
            <strong>Success:</strong> {success}
          </div>
        )}

        {/* -------------------- 1. QUEUE LISTING -------------------- */}
        {view === 'LIST' && (
          <div className="space-y-6">
            {/* Filter Panel */}
            <div className="space-y-4 mb-6">
              {/* Search and Filters grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Search Input */}
                <div className="col-span-1 sm:col-span-2 relative">
                  <input
                    type="text"
                    placeholder="Search by ID (e.g. HD-000001), keyword, names, status, or priority..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-bgBase border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-textPrimary placeholder-textDisabled focus:outline-none focus:border-primary transition placeholder-textDisabled"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="absolute right-3 top-2.5 text-textDisabled hover:text-textSecondary text-xs font-semibold"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Sorting options */}
                <div className="flex gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full bg-bgBase border border-slate-300 rounded-xl px-3 py-2 text-xs text-textSecondary focus:outline-none focus:border-indigo-500/50 transition"
                  >
                    <option value="createdAt">Sort: Created Date</option>
                    <option value="updatedAt">Sort: Updated Date</option>
                    <option value="priority">Sort: Priority</option>
                    <option value="ticketNumber">Sort: Ticket Number</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className="px-3 bg-indigo-500/10 border border-indigo-500/20 text-primary hover:bg-indigo-500/20 text-xs font-semibold rounded-xl transition flex items-center justify-center whitespace-nowrap"
                  >
                    {sortOrder === 'asc' ? 'Asc ▲' : 'Desc ▼'}
                  </button>
                </div>

                {/* Status selector */}
                <div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full bg-bgBase border border-slate-300 rounded-xl px-3 py-2 text-xs text-textSecondary focus:outline-none focus:border-indigo-500/50 transition"
                  >
                    <option value="">All Statuses</option>
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="PENDING">Pending</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>
              </div>

              {/* Advanced criteria row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Priority filter */}
                <div>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="w-full bg-bgBase border border-slate-300 rounded-xl px-3 py-2 text-xs text-textSecondary focus:outline-none focus:border-indigo-500/50 transition"
                  >
                    <option value="">All Priorities</option>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                {/* Category filter */}
                <div>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full bg-bgBase border border-slate-300 rounded-xl px-3 py-2 text-xs text-textSecondary focus:outline-none focus:border-indigo-500/50 transition"
                  >
                    <option value="">All Categories</option>
                    <option value="unassigned">Uncategorized</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date range filters */}
                <div className="flex gap-2 col-span-1 sm:col-span-2">
                  <div className="flex items-center gap-1.5 w-1/2">
                    <span className="text-[10px] text-textDisabled uppercase font-semibold">Start</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-bgBase border border-slate-300 rounded-xl px-3 py-2 text-xs text-textSecondary focus:outline-none focus:border-indigo-500/50 transition"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 w-1/2">
                    <span className="text-[10px] text-textDisabled uppercase font-semibold">End</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-bgBase border border-slate-300 rounded-xl px-3 py-2 text-xs text-textSecondary focus:outline-none focus:border-indigo-500/50 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Toggles row (only visible/meaningful depending on roles) */}
              {user?.role !== 'CUSTOMER' && (
                <div className="flex flex-wrap items-center gap-4 bg-bgBase/20 border border-borderDefault rounded-xl p-3 text-xs text-textSecondary">
                  <span className="font-semibold text-textMuted">Quick Filters:</span>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={assignedToMe}
                      onChange={(e) => {
                        setAssignedToMe(e.target.checked);
                        if (e.target.checked) {
                          setUnassignedFilter(false); // Mutually exclusive
                        }
                      }}
                      className="rounded bg-bgBase border-borderDefault text-indigo-600 focus:ring-0 cursor-pointer"
                    />
                    <span>Assigned to Me</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={createdByMe}
                      onChange={(e) => setCreatedByMe(e.target.checked)}
                      className="rounded bg-bgBase border-borderDefault text-indigo-600 focus:ring-0 cursor-pointer"
                    />
                    <span>Created by Me</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={unassignedFilter}
                      onChange={(e) => {
                        setUnassignedFilter(e.target.checked);
                        if (e.target.checked) {
                          setAssignedToMe(false); // Mutually exclusive
                        }
                      }}
                      className="rounded bg-bgBase border-borderDefault text-indigo-600 focus:ring-0 cursor-pointer"
                    />
                    <span>Unassigned</span>
                  </label>
                </div>
              )}

              {/* Active badges & reset row */}
              {hasActiveFilters() && (
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <span className="text-[10px] text-textDisabled uppercase font-bold tracking-wider">Active Filters:</span>
                  {debouncedSearch && <FilterBadge label={`Search: "${debouncedSearch}"`} onClear={() => setSearch('')} />}
                  {statusFilter && <FilterBadge label={`Status: ${statusFilter}`} onClear={() => setStatusFilter('')} />}
                  {priorityFilter && <FilterBadge label={`Priority: ${priorityFilter}`} onClear={() => setPriorityFilter('')} />}
                  {categoryFilter && (
                    <FilterBadge
                      label={`Category: ${categories.find(c => c.id === categoryFilter)?.name || 'Uncategorized'}`}
                      onClear={() => setCategoryFilter('')}
                    />
                  )}
                  {startDate && <FilterBadge label={`After: ${startDate}`} onClear={() => setStartDate('')} />}
                  {endDate && <FilterBadge label={`Before: ${endDate}`} onClear={() => setEndDate('')} />}
                  {assignedToMe && <FilterBadge label="Assigned to Me" onClear={() => setAssignedToMe(false)} />}
                  {createdByMe && <FilterBadge label="Created by Me" onClear={() => setCreatedByMe(false)} />}
                  {unassignedFilter && <FilterBadge label="Unassigned" onClear={() => setUnassignedFilter(false)} />}
                  <button
                    onClick={handleResetAllFilters}
                    className="text-[10px] text-rose-400 hover:text-rose-300 font-bold uppercase ml-2 transition"
                  >
                    Reset All ×
                  </button>
                </div>
              )}
            </div>

            {/* Grid Container */}
            <div className="relative min-h-[300px]">
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-bgBase/20 z-20 rounded-2xl">
                  <div className="w-8 h-8 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                </div>
              ) : tickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-24 text-textMuted">
                  <span className="text-lg font-medium">No tickets found</span>
                  <p className="text-xs text-textDisabled mt-1">Submit a new request or adjust filters.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {tickets.map((t) => (
                    <TicketCard 
                      key={t.id} 
                      ticket={t} 
                      onSelect={handleSelectTicket} 
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {tickets.length > 0 && !loading && (
              <div className="flex justify-between items-center mt-8 pt-4 border-t border-borderDefault text-sm text-textMuted">
                <div>
                  Showing page <strong className="text-textPrimary">{page}</strong> of <strong className="text-textPrimary">{pages}</strong> ({total} total tickets)
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="py-1.5 px-4 rounded-xl bg-bgSecondary hover:bg-slate-700 text-textSecondary border border-borderDefault font-semibold text-xs transition disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(pages, p + 1))}
                    disabled={page === pages}
                    className="py-1.5 px-4 rounded-xl bg-bgSecondary hover:bg-slate-700 text-textSecondary border border-borderDefault font-semibold text-xs transition disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* -------------------- 2. DETAILS WORKSPACE -------------------- */}
        {view === 'DETAIL' && selectedTicket && (
          <div className="space-y-6">
            <button
              onClick={() => {
                setError(null);
                setSuccess(null);
                setView('LIST');
              }}
              className="text-sm text-textMuted hover:text-textPrimary transition"
            >
              ← Back to Queue
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Main reading content (col span 2) */}
              <div className="lg:col-span-2 space-y-4">
                <div className="pb-4 border-b border-borderDefault">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-primary">
                      HD-{selectedTicket.ticketNumber.toString().padStart(6, '0')}
                    </span>
                    <h1 className="text-2xl font-bold text-textPrimary leading-tight">
                      {selectedTicket.title}
                    </h1>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-textMuted">
                    <span>
                      Created by <strong className="text-textSecondary">{selectedTicket.customer?.name}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      {new Date(selectedTicket.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>

                {/* Description Body */}
                <div className="text-sm text-textSecondary leading-relaxed bg-bgSecondary p-6 rounded-2xl border border-borderDefault font-sans whitespace-pre-wrap min-h-[250px]">
                  {selectedTicket.description}
                </div>

                {/* Edit details trigger for Customer (only if OPEN status) */}
                {((user?.role === 'CUSTOMER' && selectedTicket.status === 'OPEN') || user?.role === 'ADMIN') && (
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => setView('EDIT')}
                      className="py-1.5 px-4 rounded-xl bg-bgSecondary hover:bg-slate-700 border border-borderDefault font-semibold text-xs transition"
                    >
                      Edit Ticket Description
                    </button>
                  </div>
                )}
                {/* AI Summary card */}
                <div className="p-5 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl space-y-3 text-xs leading-relaxed">
                  <div className="flex items-center justify-between">
                    <strong className="text-primary font-bold uppercase tracking-wider text-[10px]">
                      ✨ AI Ticket Summary
                    </strong>
                    {!ticketSummary && !summaryLoading && (
                      <button
                        onClick={handleGenerateSummary}
                        className="py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-textPrimary font-bold text-[10px] transition shadow-md shadow-indigo-600/10"
                      >
                        Generate Summary
                      </button>
                    )}
                  </div>
                  
                  {summaryLoading ? (
                    <div className="flex items-center gap-2 text-textMuted italic">
                      <div className="w-3.5 h-3.5 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin"></div>
                      Summarizing discussion thread...
                    </div>
                  ) : ticketSummary ? (
                    <p className="text-textSecondary font-sans">
                      {ticketSummary}
                    </p>
                  ) : (
                    <p className="text-textDisabled italic">
                      Generate a quick AI summary of the ticket conversation thread.
                    </p>
                  )}
                </div>
                {/* Ticket Collaboration: Comments & Attachments Sections */}
                <CommentSection ticketId={selectedTicket.id} />
                <AttachmentSection ticketId={selectedTicket.id} />
              </div>

              {/* Sidebar Action Widgets Panel */}
              <div className="bg-bgBase/40 border border-borderDefault rounded-2xl p-5 space-y-6 h-fit">
                <h3 className="text-xs font-bold uppercase tracking-wider text-textMuted pb-2 border-b border-borderDefault">
                  Ticket Actions & Attributes
                </h3>

                {/* Status Toggles */}
                <div className="space-y-2">
                  <label className="text-[10px] text-textDisabled uppercase font-semibold block">Ticket Status</label>
                  {user?.role !== 'CUSTOMER' ? (
                    <select
                      value={selectedTicket.status}
                      onChange={(e) => handleMetaUpdate('status', e.target.value)}
                      className="w-full bg-bgBase border border-slate-300 rounded-xl px-3 py-2 text-xs text-textSecondary focus:outline-none focus:border-indigo-500/50"
                    >
                      <option value="OPEN">Open</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="PENDING">Pending</option>
                      <option value="RESOLVED">Resolved</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  ) : (
                    <span className="inline-block px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 text-primary text-xs font-bold rounded-lg uppercase">
                      {selectedTicket.status}
                    </span>
                  )}
                </div>

                {/* Agent Assignment selection */}
                <div className="space-y-2">
                  <label className="text-[10px] text-textDisabled uppercase font-semibold block">Assigned Agent</label>
                  {user?.role === 'ADMIN' ? (
                    <select
                      value={selectedTicket.agentId || 'unassigned'}
                      onChange={(e) => handleMetaUpdate('agentId', e.target.value)}
                      className="w-full bg-bgBase border border-slate-300 rounded-xl px-3 py-2 text-xs text-textSecondary focus:outline-none focus:border-indigo-500/50"
                    >
                      <option value="unassigned">Unassigned</option>
                      {agents.map(ag => (
                        <option key={ag.id} value={ag.id}>
                          {ag.name} ({ag.role})
                        </option>
                      ))}
                    </select>
                  ) : user?.role === 'AGENT' ? (
                    <div className="space-y-2">
                      <div className="text-xs text-textSecondary font-semibold">
                        {selectedTicket.agent ? selectedTicket.agent.name : 'Unassigned'}
                      </div>
                      {!selectedTicket.agentId && (
                        <button
                          onClick={() => handleMetaUpdate('agentId', user.id)}
                          className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition"
                        >
                          Claim Ticket (Assign to Me)
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-textSecondary font-semibold">
                      {selectedTicket.agent ? selectedTicket.agent.name : 'Unassigned'}
                    </span>
                  )}
                </div>

                {/* Priority Selection Dropdown */}
                <div className="space-y-2">
                  <label className="text-[10px] text-textDisabled uppercase font-semibold block">Priority Level</label>
                  {user?.role !== 'CUSTOMER' ? (
                    <select
                      value={selectedTicket.priority}
                      onChange={(e) => handleMetaUpdate('priority', e.target.value)}
                      className="w-full bg-bgBase border border-slate-300 rounded-xl px-3 py-2 text-xs text-textSecondary focus:outline-none focus:border-indigo-500/50"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  ) : (
                    <span className="inline-block px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 text-primary text-xs font-bold rounded-lg uppercase">
                      {selectedTicket.priority}
                    </span>
                  )}
                </div>

                {/* Category Selection Dropdown */}
                <div className="space-y-2">
                  <label className="text-[10px] text-textDisabled uppercase font-semibold block">Category</label>
                  {user?.role !== 'CUSTOMER' ? (
                    <select
                      value={selectedTicket.categoryId || 'unassigned'}
                      onChange={(e) => handleMetaUpdate('categoryId', e.target.value)}
                      className="w-full bg-bgBase border border-slate-300 rounded-xl px-3 py-2 text-xs text-textSecondary focus:outline-none focus:border-indigo-500/50"
                    >
                      <option value="unassigned">Uncategorized</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="inline-block px-3 py-1.5 bg-bgSurface border border-slate-200 shadow-sm text-textSecondary text-xs font-bold rounded-lg uppercase">
                      {selectedTicket.category ? selectedTicket.category.name : 'Uncategorized'}
                    </span>
                  )}
                </div>

                {/* AI Reason explanation */}
                {selectedTicket.aiReason && (
                  <div className="space-y-2 p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl text-xs">
                    <label className="text-[10px] text-primary uppercase font-bold block">✨ AI Recommendation Context</label>
                    <p className="text-textSecondary leading-relaxed italic">
                      "{selectedTicket.aiReason}"
                    </p>
                  </div>
                )}

                {/* AI KB Solutions Recommendations */}
                {kbRecs.length > 0 && (
                  <div className="space-y-3 p-3 bg-bgSurface border border-slate-200/50 border border-borderDefault rounded-xl text-xs">
                    <label className="text-[10px] text-textDisabled uppercase font-bold block">📚 Recommended Articles</label>
                    <div className="space-y-2">
                      {kbRecs.map(art => (
                        <div key={art.id} className="p-2.5 bg-bgSecondary border border-borderDefault rounded-lg space-y-1">
                          <h5 className="font-bold text-textSecondary">{art.title}</h5>
                          <p className="text-[9px] text-textDisabled uppercase">{art.categoryName}</p>
                          <p className="text-textMuted text-[10px] leading-relaxed italic">
                            "{art.explanation}"
                          </p>
                          <div className="pt-1.5 flex justify-end">
                            <a
                              href={`/kb/${art.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="py-1 px-2.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-primary font-bold text-[9px] rounded transition"
                            >
                              Open Article
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Suggested Reply block for support staff */}
                {user?.role !== 'CUSTOMER' && (
                  <div className="space-y-3 p-3 bg-bgSurface border border-slate-200/50 border border-borderDefault rounded-xl text-xs">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-textDisabled uppercase font-bold block">✨ AI Suggested Reply</label>
                      {copied && (
                        <span className="text-[9px] text-green-400 font-semibold animate-pulse">Copied!</span>
                      )}
                    </div>
                    {replyLoading ? (
                      <div className="flex items-center gap-2 text-textMuted italic">
                        <div className="w-3 h-3 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin"></div>
                        Generating reply draft...
                      </div>
                    ) : suggestedReply ? (
                      <div className="space-y-2">
                        <textarea
                          value={suggestedReply}
                          onChange={(e) => setSuggestedReply(e.target.value)}
                          rows={4}
                          className="w-full bg-bgBase border border-slate-300 rounded-xl p-2.5 text-xs text-textSecondary focus:outline-none focus:border-indigo-500/50"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleCopyReply}
                            className="flex-1 py-1 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-textPrimary font-bold text-[10px] transition"
                          >
                            Copy Reply
                          </button>
                          <button
                            type="button"
                            onClick={handleGenerateReply}
                            className="py-1 px-2.5 rounded-lg bg-bgSecondary hover:bg-slate-700 text-textSecondary font-semibold text-[10px] transition"
                          >
                            Regenerate
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleGenerateReply}
                        className="w-full py-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-primary border border-indigo-500/20 font-bold text-[10px] rounded-xl transition"
                      >
                        Generate Reply
                      </button>
                    )}
                  </div>
                )}

                {/* AI Sentiment Analysis block */}
                <div className="space-y-3 p-3 bg-bgSurface border border-slate-200/50 border border-borderDefault rounded-xl text-xs">
                  <label className="text-[10px] text-textDisabled uppercase font-bold block">😊 AI Sentiment Analysis</label>
                  {sentimentLoading ? (
                    <div className="flex items-center gap-2 text-textMuted italic">
                      <div className="w-3 h-3 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin"></div>
                      Analyzing customer sentiment...
                    </div>
                  ) : sentiment ? (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-textMuted font-medium">Sentiment Status:</span>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          sentiment.sentiment === 'POSITIVE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          sentiment.sentiment === 'NEUTRAL' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                          sentiment.sentiment === 'NEGATIVE' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                          'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                        }`}>
                          {sentiment.sentiment === 'POSITIVE' ? '🟢 POSITIVE' :
                           sentiment.sentiment === 'NEUTRAL' ? '🟡 NEUTRAL' :
                           sentiment.sentiment === 'NEGATIVE' ? '🔴 NEGATIVE' :
                           '⚪ UNKNOWN'}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-textMuted font-medium">Confidence Score:</span>
                        <span className="font-bold text-textSecondary">{sentiment.confidence}%</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-textMuted font-medium">Dominant Emotion:</span>
                        <span className="font-bold text-textSecondary">{sentiment.emotion}</span>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] text-textMuted font-medium block">Analysis Summary:</span>
                        <p className="text-textSecondary leading-relaxed italic bg-bgSecondary p-2 rounded-lg border border-borderDefault">
                          "{sentiment.summary}"
                        </p>
                      </div>

                      {sentiment.agentAdvice && (
                        <div className="space-y-1">
                          <span className="text-[10px] text-primary font-medium block">Recommended Agent Approach:</span>
                          <p className="text-textSecondary leading-relaxed bg-indigo-500/5 p-2 rounded-lg border border-indigo-500/10 font-sans">
                            {sentiment.agentAdvice}
                          </p>
                        </div>
                      )}

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleAnalyzeSentiment}
                          className="py-1 px-2.5 bg-bgSecondary hover:bg-slate-700 text-textSecondary font-semibold text-[9px] rounded-lg transition"
                        >
                          Re-Analyze
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleAnalyzeSentiment}
                      className="w-full py-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-primary border border-indigo-500/20 font-bold text-[10px] rounded-xl transition"
                    >
                      Analyze Sentiment
                    </button>
                  )}
                </div>

                {/* AI Agent Assignment Recommendation block (ADMIN and AGENT only) */}
                {user?.role !== 'CUSTOMER' && (
                  <div className="space-y-3 p-3 bg-bgSurface border border-slate-200/50 border border-borderDefault rounded-xl text-xs">
                    <label className="text-[10px] text-textDisabled uppercase font-bold block">✨ AI Assignment Recommendation</label>
                    {assignmentLoading ? (
                      <div className="flex items-center gap-2 text-textMuted italic">
                        <div className="w-3 h-3 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin"></div>
                        Generating routing recommendation...
                      </div>
                    ) : assignmentRec ? (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-textMuted font-medium">Recommended Agent:</span>
                          <span className="font-bold text-textSecondary">
                            {assignmentRec.recommendedAgentName || 'No agents available'}
                          </span>
                        </div>

                        {assignmentRec.recommendedAgentName && (
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-textMuted font-medium">Confidence Score:</span>
                            <span className="font-bold text-primary">{assignmentRec.confidence}%</span>
                          </div>
                        )}

                        <div className="space-y-1">
                          <span className="text-[10px] text-textMuted font-medium block">Match Reason:</span>
                          <p className="text-textSecondary leading-relaxed bg-bgSecondary p-2 rounded-lg border border-borderDefault italic">
                            "{assignmentRec.reason}"
                          </p>
                        </div>

                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            onClick={handleRecommendAssignment}
                            className="py-1 px-2.5 bg-bgSecondary hover:bg-slate-700 text-textSecondary font-semibold text-[9px] rounded-lg transition"
                          >
                            Refresh
                          </button>
                          {user?.role === 'ADMIN' && assignmentRec.recommendedAgentId && (
                            <button
                              type="button"
                              onClick={() => handleAssignAgent(assignmentRec.recommendedAgentId)}
                              disabled={formLoading}
                              className="py-1 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-textPrimary font-bold text-[9px] rounded-lg transition disabled:opacity-50"
                            >
                              Assign Recommended Agent
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleRecommendAssignment}
                        className="w-full py-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-primary border border-indigo-500/20 font-bold text-[10px] rounded-xl transition"
                      >
                        Recommend Agent Assignment
                      </button>
                    )}
                  </div>
                )}

                {/* Soft Delete widget for ADMIN */}
                {user?.role === 'ADMIN' && (
                  <div className="pt-4 border-t border-borderDefault">
                    <button
                      onClick={handleDeleteTicket}
                      className="w-full py-2.5 rounded-xl bg-red-600/10 hover:bg-red-600 border border-red-500/20 text-red-300 hover:text-textPrimary font-semibold text-xs transition"
                    >
                      Delete Ticket (Soft Delete)
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* -------------------- 3. CREATION FORM -------------------- */}
        {view === 'CREATE' && (
          <TicketForm 
            loading={formLoading} 
            onSubmit={handleCreateTicket} 
            onCancel={() => setView('LIST')} 
          />
        )}

        {/* -------------------- 4. EDIT FORM -------------------- */}
        {view === 'EDIT' && selectedTicket && (
          <TicketForm 
            ticket={selectedTicket}
            loading={formLoading}
            onSubmit={handleUpdateTicket}
            onCancel={() => setView('DETAIL')}
          />
        )}

      </div>
    </div>
  );
}

const FilterBadge = ({ label, onClear }) => (
  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-primary rounded-lg text-[10px] font-bold">
    {label}
    <button onClick={onClear} className="hover:text-textPrimary transition font-black ml-1 select-none">×</button>
  </span>
);
