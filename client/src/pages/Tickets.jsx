import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';
import TicketCard from '../components/TicketCard';
import TicketForm from '../components/TicketForm';
import CommentSection from '../components/CommentSection';
import AttachmentSection from '../components/AttachmentSection';

export default function Tickets() {
  const { user } = useAuth();

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
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState(''); // '' (All), 'unassigned', or AGENT_ID

  // Lists for dropdown selectors
  const [agents, setAgents] = useState([]);
  const [categories, setCategories] = useState([]);

  // Loading & Alerts
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Fetch tickets list matching active filters
  const fetchTickets = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/tickets', {
        params: {
          search: search.trim() || undefined,
          status: statusFilter || undefined,
          priority: priorityFilter || undefined,
          categoryId: categoryFilter || undefined,
          agentId: assigneeFilter || undefined,
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

  // Run queries
  useEffect(() => {
    if (view === 'LIST') {
      fetchTickets();
    }
  }, [page, statusFilter, priorityFilter, categoryFilter, assigneeFilter, view]);

  useEffect(() => {
    fetchAgents();
    fetchCategories();
  }, [user]);

  // Handle ticket selection detail view
  const handleSelectTicket = async (ticket) => {
    setError(null);
    setSuccess(null);
    try {
      const response = await apiClient.get(`/tickets/${ticket.id}`);
      if (response.data?.status === 'success') {
        setSelectedTicket(response.data.data.ticket);
        setView('DETAIL');
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
        setSuccess('Support ticket created successfully.');
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
        setSuccess('Ticket details updated successfully.');
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
        setSuccess(`Ticket ${field} updated successfully.`);
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
    <div className="min-h-screen bg-[#0B0F19] text-gray-200 p-6 flex flex-col items-center justify-start relative overflow-hidden">
      {/* Visual glowing layout nodes */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-6xl bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl z-10">
        
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-white/5 mb-6 gap-4">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-gray-400 hover:text-white transition text-sm font-medium">
              ← Dashboard
            </Link>
            <span className="text-white font-bold text-xl ml-2">Support Tickets Portal</span>
          </div>

          <div className="flex items-center gap-3">
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
            <div className="text-xs text-indigo-400 font-semibold px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              
              {/* Search Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setPage(1);
                  fetchTickets();
                }}
                className="flex gap-2 col-span-1 sm:col-span-2"
              >
                <input
                  type="text"
                  placeholder="Search tickets..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-[#161C2C] border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition placeholder-gray-500"
                />
                <button
                  type="submit"
                  className="px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition"
                >
                  Search
                </button>
              </form>

              {/* Status filter dropdown */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full bg-[#161C2C] border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-indigo-500/50 transition"
                >
                  <option value="">All Statuses</option>
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="PENDING">Pending</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>

              {/* Priority filter dropdown */}
              <div>
                <select
                  value={priorityFilter}
                  onChange={(e) => {
                    setPriorityFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full bg-[#161C2C] border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-indigo-500/50 transition"
                >
                  <option value="">All Priorities</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              {/* Category filter dropdown */}
              <div>
                <select
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full bg-[#161C2C] border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-indigo-500/50 transition"
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

              {/* Assignee Filter Dropdown (Admins / Agents only) */}
              {user?.role !== 'CUSTOMER' && (
                <div>
                  <select
                    value={assigneeFilter}
                    onChange={(e) => {
                      setAssigneeFilter(e.target.value);
                      setPage(1);
                    }}
                    className="w-full bg-[#161C2C] border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-indigo-500/50 transition"
                  >
                    <option value="">All Assignees</option>
                    <option value="unassigned">Unassigned Queue</option>
                    <option value={user.id}>Assigned to Me</option>
                    {user?.role === 'ADMIN' && agents.map(ag => (
                      ag.id !== user.id && (
                        <option key={ag.id} value={ag.id}>
                          {ag.name} ({ag.role})
                        </option>
                      )
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Grid Container */}
            <div className="relative min-h-[300px]">
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/20 z-20 rounded-2xl">
                  <div className="w-8 h-8 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                </div>
              ) : tickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-24 text-gray-400">
                  <span className="text-lg font-medium">No tickets found</span>
                  <p className="text-xs text-gray-500 mt-1">Submit a new request or adjust filters.</p>
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
              <div className="flex justify-between items-center mt-8 pt-4 border-t border-white/5 text-sm text-gray-400">
                <div>
                  Showing page <strong className="text-white">{page}</strong> of <strong className="text-white">{pages}</strong> ({total} total tickets)
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="py-1.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-gray-200 border border-white/5 font-semibold text-xs transition disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(pages, p + 1))}
                    disabled={page === pages}
                    className="py-1.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-gray-200 border border-white/5 font-semibold text-xs transition disabled:opacity-40"
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
              className="text-sm text-gray-400 hover:text-white transition"
            >
              ← Back to Queue
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Main reading content (col span 2) */}
              <div className="lg:col-span-2 space-y-4">
                <div className="pb-4 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-indigo-400">
                      HD-{selectedTicket.ticketNumber.toString().padStart(6, '0')}
                    </span>
                    <h1 className="text-2xl font-bold text-white leading-tight">
                      {selectedTicket.title}
                    </h1>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-gray-400">
                    <span>
                      Created by <strong className="text-gray-200">{selectedTicket.customer?.name}</strong>
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
                <div className="text-sm text-gray-300 leading-relaxed bg-white/5 p-6 rounded-2xl border border-white/5 font-sans whitespace-pre-wrap min-h-[250px]">
                  {selectedTicket.description}
                </div>

                {/* Edit details trigger for Customer (only if OPEN status) */}
                {((user?.role === 'CUSTOMER' && selectedTicket.status === 'OPEN') || user?.role === 'ADMIN') && (
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => setView('EDIT')}
                      className="py-1.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/5 font-semibold text-xs transition"
                    >
                      Edit Ticket Description
                    </button>
                  </div>
                )}

                {/* Ticket Collaboration: Comments & Attachments Sections */}
                <CommentSection ticketId={selectedTicket.id} />
                <AttachmentSection ticketId={selectedTicket.id} />
              </div>

              {/* Sidebar Action Widgets Panel */}
              <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-5 space-y-6 h-fit">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 pb-2 border-b border-white/5">
                  Ticket Actions & Attributes
                </h3>

                {/* Status Toggles */}
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase font-semibold block">Ticket Status</label>
                  {user?.role !== 'CUSTOMER' ? (
                    <select
                      value={selectedTicket.status}
                      onChange={(e) => handleMetaUpdate('status', e.target.value)}
                      className="w-full bg-[#161C2C] border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-indigo-500/50"
                    >
                      <option value="OPEN">Open</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="PENDING">Pending</option>
                      <option value="RESOLVED">Resolved</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  ) : (
                    <span className="inline-block px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold rounded-lg uppercase">
                      {selectedTicket.status}
                    </span>
                  )}
                </div>

                {/* Agent Assignment selection */}
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase font-semibold block">Assigned Agent</label>
                  {user?.role === 'ADMIN' ? (
                    <select
                      value={selectedTicket.agentId || 'unassigned'}
                      onChange={(e) => handleMetaUpdate('agentId', e.target.value)}
                      className="w-full bg-[#161C2C] border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-indigo-500/50"
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
                      <div className="text-xs text-gray-300 font-semibold">
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
                    <span className="text-xs text-gray-300 font-semibold">
                      {selectedTicket.agent ? selectedTicket.agent.name : 'Unassigned'}
                    </span>
                  )}
                </div>

                {/* Priority Selection Dropdown */}
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase font-semibold block">Priority Level</label>
                  {user?.role !== 'CUSTOMER' ? (
                    <select
                      value={selectedTicket.priority}
                      onChange={(e) => handleMetaUpdate('priority', e.target.value)}
                      className="w-full bg-[#161C2C] border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-indigo-500/50"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  ) : (
                    <span className="inline-block px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold rounded-lg uppercase">
                      {selectedTicket.priority}
                    </span>
                  )}
                </div>

                {/* Category Selection Dropdown */}
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500 uppercase font-semibold block">Category</label>
                  {user?.role !== 'CUSTOMER' ? (
                    <select
                      value={selectedTicket.categoryId || 'unassigned'}
                      onChange={(e) => handleMetaUpdate('categoryId', e.target.value)}
                      className="w-full bg-[#161C2C] border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-indigo-500/50"
                    >
                      <option value="unassigned">Uncategorized</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="inline-block px-3 py-1.5 bg-white/5 border border-white/10 text-gray-300 text-xs font-bold rounded-lg uppercase">
                      {selectedTicket.category ? selectedTicket.category.name : 'Uncategorized'}
                    </span>
                  )}
                </div>

                {/* AI Reason explanation */}
                {selectedTicket.aiReason && (
                  <div className="space-y-2 p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl text-xs">
                    <label className="text-[10px] text-indigo-400 uppercase font-bold block">✨ AI Recommendation Context</label>
                    <p className="text-gray-300 leading-relaxed italic">
                      "{selectedTicket.aiReason}"
                    </p>
                  </div>
                )}

                {/* Soft Delete widget for ADMIN */}
                {user?.role === 'ADMIN' && (
                  <div className="pt-4 border-t border-white/5">
                    <button
                      onClick={handleDeleteTicket}
                      className="w-full py-2.5 rounded-xl bg-red-600/10 hover:bg-red-600 border border-red-500/20 text-red-300 hover:text-white font-semibold text-xs transition"
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
