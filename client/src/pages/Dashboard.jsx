import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/common/Loader';
import apiClient from '../services/apiClient';
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

  useEffect(() => {
    const fetchStats = async () => {
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
    };
    if (user) {
      fetchStats();
    }
  }, [user]);

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
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
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
        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
          <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Total Tickets</span>
          <h3 className="text-2xl font-bold text-white mt-1">{stats.ticketMetrics.total}</h3>
        </div>
        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
          <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Open Queue</span>
          <h3 className="text-2xl font-bold text-indigo-400 mt-1">{stats.ticketMetrics.open}</h3>
        </div>
        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
          <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Pending</span>
          <h3 className="text-2xl font-bold text-amber-400 mt-1">{stats.ticketMetrics.pending}</h3>
        </div>
        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
          <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Closed</span>
          <h3 className="text-2xl font-bold text-gray-500 mt-1">{stats.ticketMetrics.closed}</h3>
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
        <div className="p-6 bg-slate-900/50 border border-white/10 rounded-2xl space-y-4">
          <h4 className="text-sm font-bold text-white uppercase tracking-wider">Ticket Status Distribution</h4>
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
              <div className="h-full flex items-center justify-center text-gray-500 italic text-xs">
                No active status data available.
              </div>
            )}
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="p-6 bg-slate-900/50 border border-white/10 rounded-2xl space-y-4">
          <h4 className="text-sm font-bold text-white uppercase tracking-wider">Priority Distribution</h4>
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
        <div className="p-6 bg-slate-900/50 border border-white/10 rounded-2xl space-y-4">
          <h4 className="text-sm font-bold text-white uppercase tracking-wider">Category Distribution</h4>
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
              <div className="h-full flex items-center justify-center text-gray-500 italic text-xs">
                No categories registered.
              </div>
            )}
          </div>
        </div>

        {/* Assignment Overview */}
        <div className="p-6 bg-slate-900/50 border border-white/10 rounded-2xl space-y-4">
          <h4 className="text-sm font-bold text-white uppercase tracking-wider">Assignment Overview</h4>
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
      <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6 space-y-4">
        <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          ✨ AI Copilot Operations Analytics
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
            <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">AI Classified Tickets</span>
            <span className="text-xl font-bold text-white mt-1 block">{stats.aiMetrics.classifiedCount}</span>
            <span className="text-[9px] text-gray-500 italic">Auto-assigned priority/cat</span>
          </div>
          <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
            <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">AI Summarization</span>
            <span className="text-xs font-semibold text-indigo-400 mt-2 block">{stats.aiMetrics.summariesStatus}</span>
          </div>
          <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
            <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">Suggested Replies</span>
            <span className="text-xs font-semibold text-emerald-400 mt-2 block">{stats.aiMetrics.suggestedRepliesStatus}</span>
          </div>
          <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
            <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">Duplicate Detection</span>
            <span className="text-xs font-semibold text-indigo-400 mt-2 block">{stats.aiMetrics.duplicateDetectionStatus}</span>
          </div>
          <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
            <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">KB Recommendations</span>
            <span className="text-xs font-semibold text-emerald-400 mt-2 block">{stats.aiMetrics.kbUsageStatus}</span>
          </div>
        </div>
      </div>

      {/* 4. Agents Performance & Workload */}
      <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6 space-y-4">
        <h4 className="text-sm font-bold text-white uppercase tracking-wider">Tickets Per Agent workload</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-gray-400">
                <th className="py-2">Agent Name</th>
                <th className="py-2 text-right">Tickets Count</th>
              </tr>
            </thead>
            <tbody>
              {stats.assignmentMetrics.agentWorkload.length > 0 ? (
                stats.assignmentMetrics.agentWorkload.map(agent => (
                  <tr key={agent.agentId} className="border-b border-white/5 text-gray-200">
                    <td className="py-2.5 font-semibold">{agent.agentName}</td>
                    <td className="py-2.5 text-right font-bold text-indigo-400">{agent.count}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="2" className="py-4 text-center text-gray-500 italic">
                    No active assignments recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. System settings shortcuts */}
      <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Operations Management</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Link to="/admin/users" className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl text-center transition">
            Manage Users
          </Link>
          <Link to="/kb" className="p-3 bg-slate-800 hover:bg-slate-700 text-gray-200 text-xs font-semibold rounded-xl text-center border border-white/5 transition">
            Manage Articles
          </Link>
          <Link to="/categories" className="p-3 bg-slate-800 hover:bg-slate-700 text-gray-200 text-xs font-semibold rounded-xl text-center border border-white/5 transition">
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
        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
          <span className="text-gray-400 text-xs uppercase font-semibold">My Assigned Tickets</span>
          <h3 className="text-3xl font-bold text-white mt-1">{stats.assignmentMetrics.myAssigned}</h3>
          <span className="text-indigo-400 text-xs mt-2 block">Assigned queue target</span>
        </div>
        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
          <span className="text-gray-400 text-xs uppercase font-semibold">Total System Tickets</span>
          <h3 className="text-3xl font-bold text-white mt-1">{stats.ticketMetrics.total}</h3>
          <span className="text-emerald-400 text-xs mt-2 block">Across all categories</span>
        </div>
        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
          <span className="text-gray-400 text-xs uppercase font-semibold">System Unassigned</span>
          <h3 className="text-3xl font-bold text-amber-500 mt-1">{stats.assignmentMetrics.unassigned}</h3>
          <span className="text-amber-400 text-xs mt-2 block">Claimable from queue</span>
        </div>
      </div>

      {/* 2. Recharts Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-slate-900/50 border border-white/10 rounded-2xl space-y-4">
          <h4 className="text-sm font-bold text-white uppercase tracking-wider">Queue Priority Distribution</h4>
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

        <div className="p-6 bg-slate-900/50 border border-white/10 rounded-2xl space-y-4">
          <h4 className="text-sm font-bold text-white uppercase tracking-wider">Queue Categories Distribution</h4>
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
      <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6 space-y-4">
        <h4 className="text-sm font-bold text-white uppercase tracking-wider">✨ AI Copilot Utilities Available</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
            <span className="text-[10px] text-gray-400 font-semibold block uppercase">AI Classification</span>
            <span className="text-xs font-bold text-indigo-400 mt-1 block">{stats.aiMetrics.classifiedCount} tickets</span>
          </div>
          <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
            <span className="text-[10px] text-gray-400 font-semibold block uppercase">AI Summarization</span>
            <span className="text-xs font-semibold text-emerald-400 mt-1 block">{stats.aiMetrics.summariesStatus}</span>
          </div>
          <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
            <span className="text-[10px] text-gray-400 font-semibold block uppercase">AI Suggested Replies</span>
            <span className="text-xs font-semibold text-emerald-400 mt-1 block">{stats.aiMetrics.suggestedRepliesStatus}</span>
          </div>
          <div className="p-3 bg-white/5 border border-white/5 rounded-xl">
            <span className="text-[10px] text-gray-400 font-semibold block uppercase">KB Recommendation</span>
            <span className="text-xs font-semibold text-indigo-400 mt-1 block">{stats.aiMetrics.kbUsageStatus}</span>
          </div>
        </div>
      </div>

      {/* 4. Recent Tickets Queue */}
      <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Latest Tickets activity</h3>
        <div className="space-y-3">
          {stats.recentTickets.length > 0 ? (
            stats.recentTickets.map(t => (
              <div key={t.id} className="p-4 bg-[#161C2C] border border-white/5 rounded-xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-mono font-bold uppercase">
                      HD-{String(t.ticketNumber).padStart(6, '0')}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                      t.priority === 'URGENT' ? 'bg-red-500/10 text-red-400' :
                      t.priority === 'HIGH' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-slate-800 text-gray-400'
                    }`}>
                      {t.priority}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-white mt-1.5">{t.title}</h4>
                </div>
                <Link to="/tickets" className="py-1 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-lg transition">
                  View Ticket
                </Link>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 italic text-xs py-4">No recent tickets logged.</p>
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
        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl flex justify-between items-center">
          <div>
            <span className="text-gray-400 text-xs uppercase font-semibold">Active Support Tickets</span>
            <h3 className="text-3xl font-bold text-white mt-1">
              {stats.ticketMetrics.open + stats.ticketMetrics.inProgress + stats.ticketMetrics.pending}
            </h3>
            <span className="text-indigo-400 text-xs mt-2 block">Awaiting responses</span>
          </div>
          <div className="px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
            In Queue
          </div>
        </div>
        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl flex justify-between items-center">
          <div>
            <span className="text-gray-400 text-xs uppercase font-semibold">Resolved Requests</span>
            <h3 className="text-3xl font-bold text-white mt-1">{stats.ticketMetrics.resolved}</h3>
            <span className="text-emerald-400 text-xs mt-2 block">All cleared issue threads</span>
          </div>
          <div className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            Resolved
          </div>
        </div>
        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl flex justify-between items-center">
          <div>
            <span className="text-gray-400 text-xs uppercase font-semibold">Total Tickets Created</span>
            <h3 className="text-3xl font-bold text-white mt-1">{stats.ticketMetrics.total}</h3>
            <span className="text-gray-400 text-xs mt-2 block">Complete metrics history</span>
          </div>
          <div className="px-3 py-1.5 rounded-full bg-slate-800 border border-white/5 text-gray-300 text-xs font-semibold">
            Total
          </div>
        </div>
      </div>

      {/* 2. Need Assistance workspace */}
      <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6 flex flex-col items-center text-center py-8">
        <h3 className="text-lg font-bold text-white mb-2">Need Technical Assistance?</h3>
        <p className="text-sm text-gray-400 max-w-sm mb-6">
          Submit a ticket to connect with our dedicated customer support agents.
        </p>
        <Link to="/tickets" className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-semibold text-sm shadow-lg shadow-indigo-500/20 hover:opacity-90 transition block">
          Create Support Ticket
        </Link>
      </div>

      {/* 3. Customer Recent Tickets list */}
      <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">My Latest Ticket Updates</h3>
        <div className="space-y-3">
          {stats.recentTickets.length > 0 ? (
            stats.recentTickets.map(t => (
              <div key={t.id} className="p-4 bg-[#161C2C] border border-white/5 rounded-xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-mono font-bold uppercase">
                      HD-{String(t.ticketNumber).padStart(6, '0')}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                      t.status === 'RESOLVED' ? 'bg-emerald-500/10 text-emerald-400' :
                      t.status === 'IN_PROGRESS' ? 'bg-cyan-500/10 text-cyan-400' :
                      'bg-slate-800 text-gray-400'
                    }`}>
                      {t.status}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-white mt-1.5">{t.title}</h4>
                </div>
                <Link to="/tickets" className="py-1 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-lg transition">
                  View Detail
                </Link>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 italic text-xs py-4">You have not submitted any tickets yet.</p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0B0F19] text-gray-200 p-6 flex flex-col items-center">
      {/* Top Banner Navigation */}
      <div className="w-full max-w-5xl bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center font-bold text-white text-lg">
            A
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Dashboard Portal</h1>
            <p className="text-xs text-gray-400">Logged in as: <strong className="text-gray-200">{user.name}</strong></p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-indigo-400 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            Role: {user.role}
          </div>
          <Link 
            to="/kb"
            className="py-1.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-semibold text-xs border border-white/10 transition"
          >
            Knowledge Base
          </Link>
          <Link 
            to="/tickets"
            className="py-1.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-semibold text-xs border border-white/10 transition"
          >
            Support Tickets
          </Link>
          <Link 
            to="/categories"
            className="py-1.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-semibold text-xs border border-white/10 transition"
          >
            Categories
          </Link>
          <Link 
            to="/profile"
            className="py-1.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-semibold text-xs border border-white/10 transition"
          >
            My Profile
          </Link>
          <button 
            onClick={handleLogout}
            className="py-1.5 px-4 rounded-xl bg-red-600/10 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/20 font-semibold text-xs transition"
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

        {user.role === 'ADMIN' && renderAdminView()}
        {user.role === 'AGENT' && renderAgentView()}
        {user.role === 'CUSTOMER' && renderCustomerView()}
      </div>
    </div>
  );
}
