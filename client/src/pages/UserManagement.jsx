import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUsers, updateUserRole, updateUserStatus } from '../services/userService';

export default function UserManagement() {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [limit] = useState(8);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Fetch users list
  // Fetch users list
  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getUsers({
        search: debouncedSearch.trim() || undefined,
        role: roleFilter || undefined,
        isActive: statusFilter === 'ACTIVE' ? 'true' : statusFilter === 'INACTIVE' ? 'false' : undefined,
        page,
        limit
      });
      if (data.status === 'success') {
        setUsers(data.data.users);
        setTotal(data.data.pagination.total);
        setPages(data.data.pagination.pages);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch users list.');
    } finally {
      setLoading(false);
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
  }, [debouncedSearch, roleFilter, statusFilter]);

  // Fetch users when page or filters change
  useEffect(() => {
    fetchUsers();
  }, [page, debouncedSearch, roleFilter, statusFilter]);

  const hasActiveFilters = () => {
    return !!(debouncedSearch || roleFilter || statusFilter);
  };

  const handleResetAllFilters = () => {
    setSearch('');
    setRoleFilter('');
    setStatusFilter('');
  };

  // Handle role modification
  const handleRoleChange = async (userId, newRole) => {
    setActionLoadingId(userId);
    setError(null);
    setSuccess(null);
    try {
      const response = await updateUserRole(userId, newRole);
      if (response.status === 'success') {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
        setSuccess(`User role updated to ${newRole} successfully.`);
      }
    } catch (err) {
      console.error('Failed to update role:', err);
      setError(err.response?.data?.message || err.message || 'Failed to update user role.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle status toggle (Activate/Deactivate)
  const handleStatusToggle = async (userId, currentStatus) => {
    setActionLoadingId(userId);
    setError(null);
    setSuccess(null);
    const targetStatus = !currentStatus;
    try {
      const response = await updateUserStatus(userId, targetStatus);
      if (response.status === 'success') {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive: targetStatus } : u));
        setSuccess(`User successfully ${targetStatus ? 'activated' : 'deactivated'}.`);
      }
    } catch (err) {
      console.error('Failed to update user status:', err);
      setError(err.response?.data?.message || err.message || 'Failed to update user status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-gray-200 p-6 flex flex-col items-center">
      {/* Container card */}
      <div className="w-full max-w-6xl bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl">
        
        {/* Header navigation bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-white/5 mb-6 gap-4">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-gray-400 hover:text-white transition duration-150 text-sm font-medium">
              ← Dashboard
            </Link>
            <span className="text-white font-bold text-xl ml-2">User Management System</span>
          </div>
          <div className="text-xs text-indigo-400 font-semibold px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 self-start">
            Access Level: {currentUser?.role}
          </div>
        </div>

        {/* Notifications and Alerts */}
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

        {/* Query Filters & Search Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="relative flex gap-2">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#161C2C] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition duration-150 placeholder-gray-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-3 text-gray-500 hover:text-gray-300 text-xs font-semibold"
              >
                Clear
              </button>
            )}
          </div>

          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full bg-[#161C2C] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-indigo-500/50 transition duration-150"
            >
              <option value="">All Roles</option>
              <option value="ADMIN">ADMIN</option>
              <option value="AGENT">AGENT</option>
              <option value="CUSTOMER">CUSTOMER</option>
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-[#161C2C] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-indigo-500/50 transition duration-150"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active Users</option>
              <option value="INACTIVE">Deactivated Users</option>
            </select>
          </div>
        </div>

        {/* Active badges & reset row */}
        {hasActiveFilters() && (
          <div className="flex flex-wrap items-center gap-2 mt-2 mb-4">
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Active Filters:</span>
            {debouncedSearch && <FilterBadge label={`Search: "${debouncedSearch}"`} onClear={() => setSearch('')} />}
            {roleFilter && <FilterBadge label={`Role: ${roleFilter}`} onClear={() => setRoleFilter('')} />}
            {statusFilter && <FilterBadge label={`Status: ${statusFilter}`} onClear={() => setStatusFilter('')} />}
            <button
              onClick={handleResetAllFilters}
              className="text-[10px] text-rose-400 hover:text-rose-300 font-bold uppercase ml-2 transition"
            >
              Reset All ×
            </button>
          </div>
        )}

        {/* Table View */}
        <div className="overflow-x-auto bg-slate-950/20 border border-white/5 rounded-2xl relative min-h-[300px]">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40 z-20 rounded-2xl">
              <div className="w-8 h-8 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-20 text-gray-400">
              <span className="text-lg font-medium">No users found</span>
              <p className="text-xs text-gray-500 mt-1">Try adjusting your filters or search keywords.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="text-xs text-gray-400 uppercase bg-white/5 font-bold">
                <tr>
                  <th className="px-6 py-4">User Info</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Created Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition duration-100">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{item.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{item.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={item.role}
                        onChange={(e) => handleRoleChange(item.id, e.target.value)}
                        disabled={actionLoadingId === item.id || item.id === currentUser?.id}
                        className="bg-[#161C2C] border border-white/5 rounded-lg px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-indigo-500/50 transition duration-150 disabled:opacity-50"
                      >
                        <option value="ADMIN">ADMIN</option>
                        <option value="AGENT">AGENT</option>
                        <option value="CUSTOMER">CUSTOMER</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase inline-flex items-center gap-1.5 ${
                        item.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${item.isActive ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                        {item.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-400">
                      {new Date(item.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {item.id === currentUser?.id ? (
                        <span className="text-xs text-gray-500 italic px-3 py-1.5">You</span>
                      ) : (
                        <button
                          onClick={() => handleStatusToggle(item.id, item.isActive)}
                          disabled={actionLoadingId === item.id}
                          className={`py-1.5 px-3 rounded-lg font-semibold text-xs transition duration-150 disabled:opacity-50 ${
                            item.isActive
                              ? 'bg-red-600/10 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/20'
                              : 'bg-emerald-600/10 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/20'
                          }`}
                        >
                          {actionLoadingId === item.id ? 'Loading...' : item.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Controls */}
        {users.length > 0 && !loading && (
          <div className="flex justify-between items-center mt-6 pt-4 border-t border-white/5 text-sm text-gray-400">
            <div>
              Showing page <strong className="text-white">{page}</strong> of <strong className="text-white">{pages}</strong> ({total} total users)
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="py-1.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-gray-200 border border-white/5 font-semibold text-xs transition duration-150 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="py-1.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-gray-200 border border-white/5 font-semibold text-xs transition duration-150 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

const FilterBadge = ({ label, onClear }) => (
  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg text-[10px] font-bold">
    {label}
    <button onClick={onClear} className="hover:text-white transition font-black ml-1 select-none">×</button>
  </span>
);
