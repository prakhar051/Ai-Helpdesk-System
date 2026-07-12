import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';
import ArticleCard from '../components/ArticleCard';
import ArticleForm from '../components/ArticleForm';

export default function KnowledgeBase() {
  const { user } = useAuth();

  // View States: 'LIST', 'DETAIL', 'CREATE', 'EDIT'
  const [view, setView] = useState('LIST');
  const [selectedArticle, setSelectedArticle] = useState(null);

  // Listing Data States
  const [articles, setArticles] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [limit] = useState(6);

  // Filters State
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState(''); // '' (All), 'ARTICLES', 'FAQS'
  const [statusFilter, setStatusFilter] = useState(''); // '' (All), 'DRAFT', 'PUBLISHED'

  // Loading & Alerts
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Fetch articles from backend API
  const fetchArticles = async () => {
    setLoading(true);
    setError(null);
    try {
      const isFaqParam = typeFilter === 'FAQS' ? 'true' : typeFilter === 'ARTICLES' ? 'false' : undefined;
      const response = await apiClient.get('/kb', {
        params: {
          search: debouncedSearch.trim() || undefined,
          category: categoryFilter.trim() || undefined,
          status: statusFilter || undefined,
          isFaq: isFaqParam,
          page,
          limit
        }
      });
      if (response.data?.status === 'success') {
        setArticles(response.data.data.articles);
        setTotal(response.data.data.pagination.total);
        setPages(response.data.data.pagination.pages);
      }
    } catch (err) {
      console.error('Failed to load articles:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch knowledge base articles.');
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
  }, [debouncedSearch, categoryFilter, typeFilter, statusFilter]);

  // Run initial queries & paginate
  useEffect(() => {
    if (view === 'LIST') {
      fetchArticles();
    }
  }, [page, debouncedSearch, categoryFilter, typeFilter, statusFilter, view]);

  const hasActiveFilters = () => {
    return !!(debouncedSearch || categoryFilter || typeFilter || statusFilter);
  };

  const handleResetAllFilters = () => {
    setSearch('');
    setCategoryFilter('');
    setTypeFilter('');
    setStatusFilter('');
  };

  const handleExport = async (format) => {
    setError(null);
    setSuccess('Preparing Report... Your download will begin automatically.');
    try {
      const response = await apiClient.get('/reports/kb', {
        params: { format },
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: format === 'pdf' ? 'application/pdf' : 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report_kb_${Date.now()}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      setSuccess('Report downloaded successfully!');
    } catch (err) {
      console.error('Failed to export KB report:', err);
      setError('Failed to export KB report.');
      setSuccess(null);
    }
  };

  // Handle article view selection
  const handleSelectArticle = async (article) => {
    setError(null);
    setSuccess(null);
    try {
      // Fetch details again to trigger viewCount increment on server
      const response = await apiClient.get(`/kb/${article.id}`);
      if (response.data?.status === 'success') {
        setSelectedArticle(response.data.data.article);
        setView('DETAIL');
      }
    } catch (err) {
      console.error('Failed to load article details:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch article details.');
    }
  };

  // Handle article creation submission
  const handleCreateArticle = async (payload) => {
    setFormLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await apiClient.post('/kb', payload);
      if (response.data?.status === 'success') {
        setSuccess('Knowledge article created successfully.');
        setView('LIST');
        setPage(1);
      }
    } catch (err) {
      console.error('Failed to create article:', err);
      setError(err.response?.data?.message || err.message || 'Failed to create article.');
    } finally {
      setFormLoading(false);
    }
  };

  // Handle article updates
  const handleUpdateArticle = async (payload) => {
    if (!selectedArticle) return;
    setFormLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await apiClient.patch(`/kb/${selectedArticle.id}`, payload);
      if (response.data?.status === 'success') {
        setSuccess('Knowledge article updated successfully.');
        setSelectedArticle(response.data.data.article);
        setView('DETAIL');
      }
    } catch (err) {
      console.error('Failed to update article:', err);
      setError(err.response?.data?.message || err.message || 'Failed to update article.');
    } finally {
      setFormLoading(false);
    }
  };

  // Handle article deletion
  const handleDeleteArticle = async () => {
    if (!selectedArticle) return;
    if (!window.confirm('Are you sure you want to permanently delete this article?')) return;
    setError(null);
    setSuccess(null);
    try {
      const response = await apiClient.delete(`/kb/${selectedArticle.id}`);
      if (response.data?.status === 'success') {
        setSuccess('Article deleted successfully.');
        setView('LIST');
        setPage(1);
      }
    } catch (err) {
      console.error('Failed to delete article:', err);
      setError(err.response?.data?.message || err.message || 'Failed to delete article.');
    }
  };

  return (
    <div className="min-h-screen bg-bgBase text-textSecondary p-6 flex flex-col items-center justify-start relative overflow-hidden">
      {/* Background radial overlays */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-6xl bg-bgSurface border border-slate-200/60 backdrop-blur-md border border-borderDefault rounded-2xl p-6 shadow-2xl z-10">
        
        {/* Navigation & Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-borderDefault mb-6 gap-4">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-textMuted hover:text-textPrimary transition text-sm font-medium">
              ← Dashboard
            </Link>
            <span className="text-textPrimary font-bold text-xl ml-2">Knowledge Base Portal</span>
          </div>

          <div className="flex items-center gap-3">
            {user?.role !== 'CUSTOMER' && view === 'LIST' && (
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
            {user?.role === 'ADMIN' && view === 'LIST' && (
              <button
                onClick={() => {
                  setError(null);
                  setSuccess(null);
                  setView('CREATE');
                }}
                className="py-2 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-semibold text-xs shadow-lg shadow-indigo-500/20 hover:opacity-90 transition"
              >
                + New Article
              </button>
            )}
            <div className="text-xs text-primary font-semibold px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              Access: {user?.role}
            </div>
          </div>
        </div>

        {/* Global Notifications Panel */}
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

        {/* -------------------- 1. LIST VIEW -------------------- */}
        {view === 'LIST' && (
          <div className="space-y-6">
            {/* Filter Search Box and Controls */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              
              {/* Search Form */}
              <div className="relative col-span-1 md:col-span-2">
                <input
                  type="text"
                  placeholder="Search articles by title, content, or tags..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-bgBase border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-textPrimary placeholder-textDisabled focus:outline-none focus:border-primary transition placeholder-textDisabled"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-3 text-textDisabled hover:text-textSecondary text-xs font-semibold"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Category selector */}
              <div>
                <input
                  type="text"
                  placeholder="Filter by Category..."
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full bg-bgBase border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-textPrimary placeholder-textDisabled focus:outline-none focus:border-primary transition placeholder-textDisabled"
                />
              </div>

              {/* Role-Specific Filter Panel */}
              <div className="flex gap-2">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full bg-bgBase border border-slate-300 rounded-xl px-3 py-2 text-xs text-textSecondary focus:outline-none focus:border-indigo-500/50"
                >
                  <option value="">All Types</option>
                  <option value="ARTICLES">Articles</option>
                  <option value="FAQS">FAQs</option>
                </select>

                {user?.role !== 'CUSTOMER' && (
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full bg-bgBase border border-slate-300 rounded-xl px-3 py-2 text-xs text-textSecondary focus:outline-none focus:border-indigo-500/50"
                  >
                    <option value="">All Statuses</option>
                    <option value="PUBLISHED">Published Only</option>
                    <option value="DRAFT">Drafts Only</option>
                  </select>
                )}
              </div>
            </div>

            {/* Active badges & reset row */}
            {hasActiveFilters() && (
              <div className="flex flex-wrap items-center gap-2 mt-2 mb-4">
                <span className="text-[10px] text-textDisabled uppercase font-bold tracking-wider">Active Filters:</span>
                {debouncedSearch && <FilterBadge label={`Search: "${debouncedSearch}"`} onClear={() => setSearch('')} />}
                {categoryFilter && <FilterBadge label={`Category: ${categoryFilter}`} onClear={() => setCategoryFilter('')} />}
                {typeFilter && <FilterBadge label={`Type: ${typeFilter}`} onClear={() => setTypeFilter('')} />}
                {statusFilter && <FilterBadge label={`Status: ${statusFilter}`} onClear={() => setStatusFilter('')} />}
                <button
                  onClick={handleResetAllFilters}
                  className="text-[10px] text-rose-400 hover:text-rose-300 font-bold uppercase ml-2 transition"
                >
                  Reset All ×
                </button>
              </div>
            )}

            {/* List Table/Grid container */}
            <div className="relative min-h-[300px]">
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-bgBase/20 z-20 rounded-2xl">
                  <div className="w-8 h-8 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                </div>
              ) : articles.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-24 text-textMuted">
                  <span className="text-lg font-medium">No articles found</span>
                  <p className="text-xs text-textDisabled mt-1">Try resetting category or search criteria.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {articles.map((art) => (
                    <ArticleCard 
                      key={art.id} 
                      article={art} 
                      onSelect={handleSelectArticle} 
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Pagination components */}
            {articles.length > 0 && !loading && (
              <div className="flex justify-between items-center mt-8 pt-4 border-t border-borderDefault text-sm text-textMuted">
                <div>
                  Showing page <strong className="text-textPrimary">{page}</strong> of <strong className="text-textPrimary">{pages}</strong> ({total} total articles)
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

        {/* -------------------- 2. DETAIL VIEW -------------------- */}
        {view === 'DETAIL' && selectedArticle && (
          <div className="space-y-6">
            <button
              onClick={() => {
                setError(null);
                setSuccess(null);
                setView('LIST');
              }}
              className="text-sm text-textMuted hover:text-textPrimary transition"
            >
              ← Back to List
            </button>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 pb-4 border-b border-borderDefault">
                <div>
                  <h1 className="text-2xl font-bold text-textPrimary leading-tight">
                    {selectedArticle.title}
                  </h1>
                  
                  {/* Meta tag listings */}
                  <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-textMuted">
                    <span>
                      By <strong className="text-textSecondary">{selectedArticle.author?.name}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      {new Date(selectedArticle.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                    <span>•</span>
                    <span className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-primary uppercase text-[10px] font-semibold">
                      {selectedArticle.category}
                    </span>
                    {selectedArticle.isFaq && (
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 uppercase text-[10px] font-semibold">
                        FAQ
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 self-start">
                  {user?.role === 'ADMIN' && (
                    <>
                      <button
                        onClick={() => setView('EDIT')}
                        className="py-1.5 px-3 rounded-lg bg-indigo-600/10 hover:bg-indigo-600 border border-indigo-500/20 text-primary-hover hover:text-textPrimary font-semibold text-xs transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={handleDeleteArticle}
                        className="py-1.5 px-3 rounded-lg bg-red-600/10 hover:bg-red-600 border border-red-500/20 text-red-300 hover:text-textPrimary font-semibold text-xs transition"
                      >
                        Delete
                      </button>
                    </>
                  )}
                  <span className="text-xs text-textDisabled">
                    👁 {selectedArticle.viewCount} views
                  </span>
                </div>
              </div>

              {/* Content body */}
              <div 
                className="text-sm text-textSecondary leading-relaxed bg-bgSecondary p-6 rounded-2xl border border-borderDefault font-sans whitespace-pre-wrap"
              >
                {selectedArticle.content}
              </div>

              {/* Tags footer */}
              {selectedArticle.tags && selectedArticle.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-4">
                  <span className="text-xs text-textDisabled self-center">Tags:</span>
                  {selectedArticle.tags.map((tag, idx) => (
                    <span key={idx} className="text-xs bg-bgSecondary text-textSecondary px-3 py-1 rounded-xl">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* -------------------- 3. CREATE VIEW -------------------- */}
        {view === 'CREATE' && (
          <ArticleForm 
            loading={formLoading} 
            onSubmit={handleCreateArticle} 
            onCancel={() => setView('LIST')} 
          />
        )}

        {/* -------------------- 4. EDIT VIEW -------------------- */}
        {view === 'EDIT' && selectedArticle && (
          <ArticleForm 
            article={selectedArticle}
            loading={formLoading}
            onSubmit={handleUpdateArticle}
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
