import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';
import CategoryCard from '../components/CategoryCard';
import CategoryForm from '../components/CategoryForm';

export default function Categories() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  // View States: 'LIST', 'CREATE', 'EDIT'
  const [view, setView] = useState('LIST');
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Listing Data
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // '' (All), 'true' (Active), 'false' (Inactive)

  // Loading & Alerts
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Fetch categories matching query parameters
  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/categories', {
        params: {
          search: debouncedSearch.trim() || undefined,
          isActive: statusFilter || undefined
        }
      });
      if (response.data?.status === 'success') {
        setCategories(response.data.data.categories);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch categories list.');
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

  // Run initial listing query
  useEffect(() => {
    if (view === 'LIST') {
      fetchCategories();
    }
  }, [debouncedSearch, statusFilter, view]);

  const hasActiveFilters = () => {
    return !!(debouncedSearch || statusFilter);
  };

  const handleResetAllFilters = () => {
    setSearch('');
    setStatusFilter('');
  };

  // Create Category submission
  const handleCreateCategory = async (payload) => {
    setFormLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await apiClient.post('/categories', payload);
      if (response.data?.status === 'success') {
        setSuccess(`Category "${payload.name}" created successfully.`);
        setView('LIST');
      }
    } catch (err) {
      console.error('Failed to create category:', err);
      setError(err.response?.data?.message || err.message || 'Failed to create category.');
    } finally {
      setFormLoading(false);
    }
  };

  // Edit Category submission
  const handleEditCategory = async (payload) => {
    if (!selectedCategory) return;
    setFormLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await apiClient.patch(`/categories/${selectedCategory.id}`, payload);
      if (response.data?.status === 'success') {
        setSuccess(`Category details updated successfully.`);
        setView('LIST');
      }
    } catch (err) {
      console.error('Failed to update category:', err);
      setError(err.response?.data?.message || err.message || 'Failed to update category.');
    } finally {
      setFormLoading(false);
    }
  };

  // Deactivate/Reactivate toggle action
  const handleToggleStatus = async (category) => {
    setError(null);
    setSuccess(null);
    try {
      const nextActiveState = !category.isActive;
      // We call the patch update directly
      const response = await apiClient.patch(`/categories/${category.id}`, {
        isActive: nextActiveState
      });
      if (response.data?.status === 'success') {
        setSuccess(`Category "${category.name}" ${nextActiveState ? 'reactivated' : 'deactivated'} successfully.`);
        fetchCategories();
      }
    } catch (err) {
      console.error('Failed to toggle category status:', err);
      setError(err.response?.data?.message || err.message || 'Failed to toggle category status.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-gray-200 p-6 flex flex-col items-center justify-start relative overflow-hidden">
      {/* Background radial blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-6xl bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl z-10">
        
        {/* Navigation header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-white/5 mb-6 gap-4">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-gray-400 hover:text-white transition text-sm font-medium">
              ← Dashboard
            </Link>
            <span className="text-white font-bold text-xl ml-2">Ticket Categories</span>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && view === 'LIST' && (
              <button
                onClick={() => {
                  setError(null);
                  setSuccess(null);
                  setView('CREATE');
                }}
                className="py-2 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-semibold text-xs shadow-lg shadow-indigo-500/20 hover:opacity-90 transition"
              >
                + Add Category
              </button>
            )}
            <div className="text-xs text-indigo-400 font-semibold px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              Access: {user?.role}
            </div>
          </div>
        </div>

        {/* Alerts Notifications */}
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

        {/* -------------------- LIST MODE -------------------- */}
        {view === 'LIST' && (
          <div className="space-y-6">
            
            {/* Filter Search controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Search Form */}
              <div className="relative col-span-1 md:col-span-2">
                <input
                  type="text"
                  placeholder="Search categories by name, description..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-[#161C2C] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition placeholder-gray-500"
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

              {/* Status Select (Admins/Agents only) */}
              {user?.role !== 'CUSTOMER' ? (
                <div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full bg-[#161C2C] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-indigo-500/50 transition"
                  >
                    <option value="">All Statuses</option>
                    <option value="true">Active Only</option>
                    <option value="false">Inactive Only</option>
                  </select>
                </div>
              ) : (
                <div />
              )}
            </div>

            {/* Active badges & reset row */}
            {hasActiveFilters() && (
              <div className="flex flex-wrap items-center gap-2 mt-2 mb-4">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Active Filters:</span>
                {debouncedSearch && <FilterBadge label={`Search: "${debouncedSearch}"`} onClear={() => setSearch('')} />}
                {statusFilter && (
                  <FilterBadge
                    label={`Status: ${statusFilter === 'true' ? 'Active' : 'Inactive'}`}
                    onClear={() => setStatusFilter('')}
                  />
                )}
                <button
                  onClick={handleResetAllFilters}
                  className="text-[10px] text-rose-400 hover:text-rose-300 font-bold uppercase ml-2 transition"
                >
                  Reset All ×
                </button>
              </div>
            )}

            {/* List Grids */}
            <div className="relative min-h-[250px]">
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/20 z-20 rounded-2xl">
                  <div className="w-8 h-8 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                </div>
              ) : categories.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-20 text-gray-400">
                  <span className="text-base font-medium">No categories found</span>
                  <p className="text-xs text-gray-500 mt-1">Adjust search parameters or status options.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categories.map(cat => (
                    <CategoryCard
                      key={cat.id}
                      category={cat}
                      isAdmin={isAdmin}
                      onEdit={(c) => {
                        setSelectedCategory(c);
                        setView('EDIT');
                      }}
                      onToggleStatus={handleToggleStatus}
                    />
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* -------------------- CREATE MODE -------------------- */}
        {view === 'CREATE' && (
          <CategoryForm
            loading={formLoading}
            onSubmit={handleCreateCategory}
            onCancel={() => setView('LIST')}
          />
        )}

        {/* -------------------- EDIT MODE -------------------- */}
        {view === 'EDIT' && selectedCategory && (
          <CategoryForm
            category={selectedCategory}
            loading={formLoading}
            onSubmit={handleEditCategory}
            onCancel={() => setView('LIST')}
          />
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
