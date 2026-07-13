import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/common/Loader';
import apiClient from '../services/apiClient';
import { useSocket } from '../context/SocketContext';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';

export default function Dashboard() {
  const { user, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleExport = async (format) => {
    setError(null);
    setSuccess('Preparing Report... Your download will begin automatically.');
    try {
      const response = await apiClient.get('/reports/dashboard', {
        params: { format },
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: format === 'pdf' ? 'application/pdf' : 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report_dashboard_${Date.now()}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      setSuccess('Report downloaded successfully!');
    } catch (err) {
      console.error('Failed to export dashboard report:', err);
      setError('Failed to export dashboard report.');
      setSuccess(null);
    }
  };

  const { socket } = useSocket();

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/dashboard');
      if (res.data?.status === 'success') {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
      setError('Failed to load dashboard metrics.');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user, fetchStats]);

  useEffect(() => {
    if (!socket) return;

    const handleDashboardUpdate = () => {
      fetchStats();
    };

    socket.on('dashboard:update', handleDashboardUpdate);

    return () => {
      socket.off('dashboard:update', handleDashboardUpdate);
    };
  }, [socket, fetchStats]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  if (authLoading || (statsLoading && !stats)) {
    return (
      <div className="min-h-screen bg-bgBase flex items-center justify-center">
        <Loader size="lg" text="Loading your dashboard analytics..." />
      </div>
    );
  }

  if (!user) return null;

  // Process data for charts
  const statusData = stats
    ? [
        { name: 'Open', value: stats.ticketMetrics.open, color: '#3B82F6' },
        { name: 'In Progress', value: stats.ticketMetrics.inProgress, color: '#06B6D4' },
        { name: 'Pending', value: stats.ticketMetrics.pending, color: '#F59E0B' },
        { name: 'Resolved', value: stats.ticketMetrics.resolved, color: '#10B981' },
        { name: 'Closed', value: stats.ticketMetrics.closed, color: '#6B7280' }
      ].filter(d => d.value > 0)
    : [];

  const priorityData = stats
    ? [
        { name: 'Low', count: stats.priorityMetrics.low, color: '#10B981' },
        { name: 'Medium', count: stats.priorityMetrics.medium, color: '#3B82F6' },
        { name: 'High', count: stats.priorityMetrics.high, color: '#F59E0B' },
        { name: 'Urgent', count: stats.priorityMetrics.urgent, color: '#EF4444' }
      ]
    : [];

  const categoryData = stats ? stats.categoryMetrics : [];

  const assignmentData = stats
    ? [
        { name: 'Assigned', count: stats.assignmentMetrics.assigned, color: '#818CF8' },
        { name: 'Unassigned', count: stats.assignmentMetrics.unassigned, color: '#F87171' }
      ]
    : [];

  // Render Admin View
  const renderAdminView = () => (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="p-4 bg-bgSurface border border-slate-200 shadow-sm rounded-2xl">
          <span className="text-textMuted text-[10px] uppercase font-bold tracking-wider">Total Tickets</span>
          <h3 className="text-2xl font-bold text-textPrimary mt-1">{stats.ticketMetrics.total}</h3>
        </div>
        <div className="p-4 bg-bgSurface border border-slate-200 shadow-sm rounded-2xl">
          <span className="text-textMuted text-[10px] uppercase font-bold tracking-wider">Open Queue</span>
          <h3 className="text-2xl font-bold text-primary mt-1">{stats.ticketMetrics.open}</h3>
        </div>
        <div className="p-4 bg-bgSurface border border-slate-200 shadow-sm rounded-2xl">
          <span className="text-textMuted text-[10px] uppercase font-bold tracking-wider">Pending</span>
          <h3 className="text-2xl font-bold text-amber-400 mt-1">{stats.ticketMetrics.pending}</h3>
        </div>
        <div className="p-4 bg-bgSurface border border-slate-200 shadow-sm rounded-2xl">
          <span className="text-textMuted text-[10px] uppercase font-bold tracking-wider">Closed</span>
          <h3 className="text-2xl font-bold text-textDisabled mt-1">{stats.ticketMetrics.closed}</h3>
        </div>
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
          <span className="text-red-400 text-[10px] uppercase font-bold tracking-wider">Urgent</span>
          <h3 className="text-2xl font-bold text-red-500 mt-1">{stats.priorityMetrics.urgent}</h3>
        </div>
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
          <span className="text-amber-400 text-[10px] uppercase font-bold tracking-wider">Unassigned</span>
          <h3 className="text-2xl font-bold text-amber-500 mt-1">{stats.assignmentMetrics.unassigned}</h3>
        </div>
      </div>

      {/* 2. Recharts Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Ticket Status Distribution */}
        <div className="p-6 bg-bgSurface border border-slate-200/50 border border-borderDefault rounded-2xl space-y-4">
          <h4 className="text-sm font-bold text-textPrimary uppercase tracking-wider">Ticket Status Distribution</h4>
          <div className="h-60">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-textDisabled italic text-xs">
                No active status data available.
              </div>
            )}
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="p-6 bg-bgSurface border border-slate-200/50 border border-borderDefault rounded-2xl space-y-4">
          <h4 className="text-sm font-bold text-textPrimary uppercase tracking-wider">Priority Distribution</h4>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityData}>
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                />
                <Bar dataKey="count" fill="#4F46E5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Distribution */}
        <div className="p-6 bg-bgSurface border border-slate-200/50 border border-borderDefault rounded-2xl space-y-4">
          <h4 className="text-sm font-bold text-textPrimary uppercase tracking-wider">Category Distribution</h4>
          <div className="h-60">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData}>
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
                  <YAxis stroke="#94A3B8" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  />
                  <Bar dataKey="count" fill="#06B6D4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-textDisabled italic text-xs">
                No categories registered.
              </div>
            )}
          </div>
        </div>

        {/* Assignment Overview */}
        <div className="p-6 bg-bgSurface border border-slate-200/50 border border-borderDefault rounded-2xl space-y-4">
          <h4 className="text-sm font-bold text-textPrimary uppercase tracking-wider">Assignment Overview</h4>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={assignmentData}>
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                />
                <Bar dataKey="count" fill="#818CF8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 3. AI Insights Dashboard */}
      <div className="bg-bgSurface border border-slate-200/50 border border-borderDefault rounded-2xl p-6 space-y-4">
        <h4 className="text-sm font-bold text-textPrimary uppercase tracking-wider flex items-center gap-2">
          ✨ AI Copilot Operations Analytics
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="p-4 bg-bgSecondary border border-borderDefault rounded-xl">
            <span className="text-[10px] text-textMuted font-bold block uppercase tracking-wider">AI Classified Tickets</span>
            <span className="text-xl font-bold text-textPrimary mt-1 block">{stats.aiMetrics.classifiedCount}</span>
            <span className="text-[9px] text-textDisabled italic">Auto-assigned priority/cat</span>
          </div>
          <div className="p-4 bg-bgSecondary border border-borderDefault rounded-xl">
            <span className="text-[10px] text-textMuted font-bold block uppercase tracking-wider">AI Summarization</span>
            <span className="text-xs font-semibold text-primary mt-2 block">{stats.aiMetrics.summariesStatus}</span>
          </div>
          <div className="p-4 bg-bgSecondary border border-borderDefault rounded-xl">
            <span className="text-[10px] text-textMuted font-bold block uppercase tracking-wider">Suggested Replies</span>
            <span className="text-xs font-semibold text-emerald-400 mt-2 block">{stats.aiMetrics.suggestedRepliesStatus}</span>
          </div>
          <div className="p-4 bg-bgSecondary border border-borderDefault rounded-xl">
            <span className="text-[10px] text-textMuted font-bold block uppercase tracking-wider">Duplicate Detection</span>
            <span className="text-xs font-semibold text-primary mt-2 block">{stats.aiMetrics.duplicateDetectionStatus}</span>
          </div>
          <div className="p-4 bg-bgSecondary border border-borderDefault rounded-xl">
            <span className="text-[10px] text-textMuted font-bold block uppercase tracking-wider">KB Recommendations</span>
            <span className="text-xs font-semibold text-emerald-400 mt-2 block">{stats.aiMetrics.kbUsageStatus}</span>
          </div>
        </div>
      </div>

      {/* 4. Agents Performance & Workload */}
      <div className="bg-bgSurface border border-slate-200/50 border border-borderDefault rounded-2xl p-6 space-y-4">
        <h4 className="text-sm font-bold text-textPrimary uppercase tracking-wider">Tickets Per Agent workload</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-borderDefault text-textMuted">
                <th className="py-2">Agent Name</th>
                <th className="py-2 text-right">Tickets Count</th>
              </tr>
            </thead>
            <tbody>
              {stats.assignmentMetrics.agentWorkload.length > 0 ? (
                stats.assignmentMetrics.agentWorkload.map(agent => (
                  <tr key={agent.agentId} className="border-b border-borderDefault text-textSecondary">
                    <td className="py-2.5 font-semibold">{agent.agentName}</td>
                    <td className="py-2.5 text-right font-bold text-primary">{agent.count}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="2" className="py-4 text-center text-textDisabled italic">
                    No active assignments recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. System settings shortcuts */}
      <div className="bg-bgSurface border border-slate-200/50 border border-borderDefault rounded-2xl p-6">
        <h3 className="text-sm font-bold text-textPrimary uppercase tracking-wider mb-4">Operations Management</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Link to="/admin/users" className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl text-center transition">
            Manage Users
          </Link>
          <Link to="/kb" className="p-3 bg-bgSecondary hover:bg-slate-700 text-textSecondary text-xs font-semibold rounded-xl text-center border border-borderDefault transition">
            Manage Articles
          </Link>
          <Link to="/categories" className="p-3 bg-bgSecondary hover:bg-slate-700 text-textSecondary text-xs font-semibold rounded-xl text-center border border-borderDefault transition">
            Manage Categories
          </Link>
        </div>
      </div>
    </div>
  );

  // Render Agent View
  const renderAgentView = () => (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. Workload Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-5 bg-bgSurface border border-slate-200 shadow-sm rounded-2xl">
          <span className="text-textMuted text-xs uppercase font-semibold">My Assigned Tickets</span>
          <h3 className="text-3xl font-bold text-textPrimary mt-1">{stats.assignmentMetrics.myAssigned}</h3>
          <span className="text-primary text-xs mt-2 block">Assigned queue target</span>
        </div>
        <div className="p-5 bg-bgSurface border border-slate-200 shadow-sm rounded-2xl">
          <span className="text-textMuted text-xs uppercase font-semibold">Total System Tickets</span>
          <h3 className="text-3xl font-bold text-textPrimary mt-1">{stats.ticketMetrics.total}</h3>
          <span className="text-emerald-400 text-xs mt-2 block">Across all categories</span>
        </div>
        <div className="p-5 bg-bgSurface border border-slate-200 shadow-sm rounded-2xl">
          <span className="text-textMuted text-xs uppercase font-semibold">System Unassigned</span>
          <h3 className="text-3xl font-bold text-amber-500 mt-1">{stats.assignmentMetrics.unassigned}</h3>
          <span className="text-amber-400 text-xs mt-2 block">Claimable from queue</span>
        </div>
      </div>

      {/* 2. Recharts Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-bgSurface border border-slate-200/50 border border-borderDefault rounded-2xl space-y-4">
          <h4 className="text-sm font-bold text-textPrimary uppercase tracking-wider">Queue Priority Distribution</h4>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityData}>
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                />
                <Bar dataKey="count" fill="#4F46E5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-6 bg-bgSurface border border-slate-200/50 border border-borderDefault rounded-2xl space-y-4">
          <h4 className="text-sm font-bold text-textPrimary uppercase tracking-wider">Queue Categories Distribution</h4>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                />
                <Bar dataKey="count" fill="#06B6D4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 3. AI Copilot status indicator */}
      <div className="bg-bgSurface border border-slate-200/50 border border-borderDefault rounded-2xl p-6 space-y-4">
        <h4 className="text-sm font-bold text-textPrimary uppercase tracking-wider">✨ AI Copilot Utilities Available</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-bgSecondary border border-borderDefault rounded-xl">
            <span className="text-[10px] text-textMuted font-semibold block uppercase">AI Classification</span>
            <span className="text-xs font-bold text-primary mt-1 block">{stats.aiMetrics.classifiedCount} tickets</span>
          </div>
          <div className="p-3 bg-bgSecondary border border-borderDefault rounded-xl">
            <span className="text-[10px] text-textMuted font-semibold block uppercase">AI Summarization</span>
            <span className="text-xs font-semibold text-emerald-400 mt-1 block">{stats.aiMetrics.summariesStatus}</span>
          </div>
          <div className="p-3 bg-bgSecondary border border-borderDefault rounded-xl">
            <span className="text-[10px] text-textMuted font-semibold block uppercase">AI Suggested Replies</span>
            <span className="text-xs font-semibold text-emerald-400 mt-1 block">{stats.aiMetrics.suggestedRepliesStatus}</span>
          </div>
          <div className="p-3 bg-bgSecondary border border-borderDefault rounded-xl">
            <span className="text-[10px] text-textMuted font-semibold block uppercase">KB Recommendation</span>
            <span className="text-xs font-semibold text-primary mt-1 block">{stats.aiMetrics.kbUsageStatus}</span>
          </div>
        </div>
      </div>

      {/* 4. Recent Tickets Queue */}
      <div className="bg-bgSurface border border-slate-200/50 border border-borderDefault rounded-2xl p-6">
        <h3 className="text-sm font-bold text-textPrimary uppercase tracking-wider mb-4">Latest Tickets activity</h3>
        <div className="space-y-3">
          {stats.recentTickets.length > 0 ? (
            stats.recentTickets.map(t => (
              <div key={t.id} className="p-4 bg-bgBase border border-borderDefault rounded-xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-primary text-[10px] font-mono font-bold uppercase">
                      HD-{String(t.ticketNumber).padStart(6, '0')}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                      t.priority === 'URGENT' ? 'bg-red-500/10 text-red-400' :
                      t.priority === 'HIGH' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-bgSecondary text-textMuted'
                    }`}>
                      {t.priority}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-textPrimary mt-1.5">{t.title}</h4>
                </div>
                <Link to="/tickets" className="py-1 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-lg transition">
                  View Ticket
                </Link>
              </div>
            ))
          ) : (
            <p className="text-center text-textDisabled italic text-xs py-4">No recent tickets logged.</p>
          )}
        </div>
      </div>
    </div>
  );

  // Render Customer View
  const renderCustomerView = () => (
    <div className="space-y-6 animate-fadeIn">
      {/* 1. Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-5 bg-bgSurface border border-slate-200 shadow-sm rounded-2xl flex justify-between items-center">
          <div>
            <span className="text-textMuted text-xs uppercase font-semibold">Active Support Tickets</span>
            <h3 className="text-3xl font-bold text-textPrimary mt-1">
              {stats.ticketMetrics.open + stats.ticketMetrics.inProgress + stats.ticketMetrics.pending}
            </h3>
            <span className="text-primary text-xs mt-2 block">Awaiting responses</span>
          </div>
          <div className="px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-primary text-xs font-semibold">
            In Queue
          </div>
        </div>
        <div className="p-5 bg-bgSurface border border-slate-200 shadow-sm rounded-2xl flex justify-between items-center">
          <div>
            <span className="text-textMuted text-xs uppercase font-semibold">Resolved Requests</span>
            <h3 className="text-3xl font-bold text-textPrimary mt-1">{stats.ticketMetrics.resolved}</h3>
            <span className="text-emerald-400 text-xs mt-2 block">All cleared issue threads</span>
          </div>
          <div className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            Resolved
          </div>
        </div>
        <div className="p-5 bg-bgSurface border border-slate-200 shadow-sm rounded-2xl flex justify-between items-center">
          <div>
            <span className="text-textMuted text-xs uppercase font-semibold">Total Tickets Created</span>
            <h3 className="text-3xl font-bold text-textPrimary mt-1">{stats.ticketMetrics.total}</h3>
            <span className="text-textMuted text-xs mt-2 block">Complete metrics history</span>
          </div>
          <div className="px-3 py-1.5 rounded-full bg-bgSecondary border border-borderDefault text-textSecondary text-xs font-semibold">
            Total
          </div>
        </div>
      </div>

      {/* 2. Need Assistance workspace */}
      <div className="bg-bgSurface border border-slate-200/50 border border-borderDefault rounded-2xl p-6 flex flex-col items-center text-center py-8">
        <h3 className="text-lg font-bold text-textPrimary mb-2">Need Technical Assistance?</h3>
        <p className="text-sm text-textMuted max-w-sm mb-6">
          Submit a ticket to connect with our dedicated customer support agents.
        </p>
        <Link to="/tickets" className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-semibold text-sm shadow-lg shadow-indigo-500/20 hover:opacity-90 transition block">
          Create Support Ticket
        </Link>
      </div>

      {/* 3. Customer Recent Tickets list */}
      <div className="bg-bgSurface border border-slate-200/50 border border-borderDefault rounded-2xl p-6">
        <h3 className="text-sm font-bold text-textPrimary uppercase tracking-wider mb-4">My Latest Ticket Updates</h3>
        <div className="space-y-3">
          {stats.recentTickets.length > 0 ? (
            stats.recentTickets.map(t => (
              <div key={t.id} className="p-4 bg-bgBase border border-borderDefault rounded-xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-primary text-[10px] font-mono font-bold uppercase">
                      HD-{String(t.ticketNumber).padStart(6, '0')}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                      t.status === 'RESOLVED' ? 'bg-emerald-500/10 text-emerald-400' :
                      t.status === 'IN_PROGRESS' ? 'bg-cyan-500/10 text-secondary' :
                      'bg-bgSecondary text-textMuted'
                    }`}>
                      {t.status}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-textPrimary mt-1.5">{t.title}</h4>
                </div>
                <Link to="/tickets" className="py-1 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-lg transition">
                  View Detail
                </Link>
              </div>
            ))
          ) : (
            <p className="text-center text-textDisabled italic text-xs py-4">You have not submitted any tickets yet.</p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-bgBase text-textSecondary p-6 flex flex-col items-center">
      <div className="w-full max-w-5xl bg-bgSurface border border-slate-200/60 backdrop-blur-md border border-borderDefault rounded-2xl p-6 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center font-bold text-textPrimary text-lg">
            A
          </div>
          <div>
            <h1 className="text-lg font-bold text-textPrimary">Dashboard Portal</h1>
            <p className="text-xs text-textMuted">Logged in as: <strong className="text-textSecondary">{user.name}</strong></p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {user.role !== 'CUSTOMER' && (
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
          <div className="px-3 py-1.5 rounded-xl bg-bgSurface border border-slate-200 shadow-sm text-xs font-semibold text-primary flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            Role: {user.role}
          </div>
          <Link 
            to="/kb"
            className="py-1.5 px-4 rounded-xl bg-bgSecondary hover:bg-bgSecondary text-textSecondary font-semibold text-xs border border-borderDefault transition"
          >
            Knowledge Base
          </Link>
          <Link 
            to="/tickets"
            className="py-1.5 px-4 rounded-xl bg-bgSecondary hover:bg-bgSecondary text-textSecondary font-semibold text-xs border border-borderDefault transition"
          >
            Support Tickets
          </Link>
          <Link 
            to="/categories"
            className="py-1.5 px-4 rounded-xl bg-bgSecondary hover:bg-bgSecondary text-textSecondary font-semibold text-xs border border-borderDefault transition"
          >
            Categories
          </Link>
          <Link 
            to="/profile"
            className="py-1.5 px-4 rounded-xl bg-bgSecondary hover:bg-bgSecondary text-textSecondary font-semibold text-xs border border-borderDefault transition"
          >
            My Profile
          </Link>
          <button 
            onClick={handleLogout}
            className="py-1.5 px-4 rounded-xl bg-red-600/10 hover:bg-red-600 text-red-300 hover:text-textPrimary border border-red-500/20 font-semibold text-xs transition"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Dashboard Space */}
      <div className="w-full max-w-5xl">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
            <strong>Error:</strong> {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs">
            <strong>Info:</strong> {success}
          </div>
        )}

        {user.role === 'ADMIN' && renderAdminView()}
        {user.role === 'AGENT' && renderAgentView()}
        {user.role === 'CUSTOMER' && renderCustomerView()}
      </div>
    </div>
  );
}
