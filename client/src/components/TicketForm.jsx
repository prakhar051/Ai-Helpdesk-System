import { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';

export default function TicketForm({ ticket = null, onSubmit, onCancel, loading = false }) {
  const [title, setTitle] = useState(ticket?.title || '');
  const [description, setDescription] = useState(ticket?.description || '');
  const [priority, setPriority] = useState(ticket?.priority || 'MEDIUM');
  const [categoryId, setCategoryId] = useState(ticket?.categoryId || 'unassigned');
  
  // Dynamic categories list
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState(null);

  // Fetch categories from backend (only active ones)
  const fetchActiveCategories = async () => {
    try {
      const response = await apiClient.get('/categories', { params: { isActive: 'true' } });
      if (response.data?.status === 'success') {
        setCategories(response.data.data.categories);
      }
    } catch (err) {
      console.error('Failed to load active categories for form:', err);
    }
  };

  useEffect(() => {
    fetchActiveCategories();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    // Validation checks
    if (title.trim().length < 3) {
      setError('Title must be at least 3 characters long.');
      return;
    }
    if (description.trim().length < 10) {
      setError('Description must be at least 10 characters long.');
      return;
    }

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      priority,
      categoryId: categoryId === 'unassigned' ? null : categoryId
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <h2 className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
        {ticket ? 'Edit Ticket Content' : 'Create Support Ticket'}
      </h2>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          <strong>Validation Error:</strong> {error}
        </div>
      )}

      {/* Ticket Title */}
      <div className="space-y-1">
        <label className="text-xs text-gray-400 uppercase font-semibold block">Ticket Subject</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={loading}
          placeholder="Describe the issue briefly (e.g. Email sync failing)"
          className="w-full bg-[#161C2C] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition duration-150 disabled:opacity-50"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Priority Selector */}
        <div className="space-y-1">
          <label className="text-xs text-gray-400 uppercase font-semibold block">Priority Level</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            disabled={loading}
            className="w-full bg-[#161C2C] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-indigo-500/50 transition"
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>

        {/* Category Selector */}
        <div className="space-y-1">
          <label className="text-xs text-gray-400 uppercase font-semibold block">Category</label>
          <select
            value={categoryId || 'unassigned'}
            onChange={(e) => setCategoryId(e.target.value)}
            disabled={loading}
            className="w-full bg-[#161C2C] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-indigo-500/50 transition"
          >
            <option value="unassigned">Uncategorized</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Ticket Description */}
      <div className="space-y-1">
        <label className="text-xs text-gray-400 uppercase font-semibold block">Description Details</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={loading}
          placeholder="Please enter details of your issue. Include steps to reproduce if applicable."
          rows="8"
          className="w-full bg-[#161C2C] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition duration-150 disabled:opacity-50 resize-y leading-relaxed"
        />
      </div>

      {/* Action triggers */}
      <div className="flex gap-4 pt-4 border-t border-white/5">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="w-1/2 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-gray-200 font-semibold text-sm transition border border-white/5"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="w-1/2 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-semibold text-sm hover:opacity-90 transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Saving...
            </>
          ) : (
            'Save Ticket'
          )}
        </button>
      </div>
    </form>
  );
}
