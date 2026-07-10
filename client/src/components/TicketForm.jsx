import { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';

export default function TicketForm({ ticket = null, onSubmit, onCancel, loading = false }) {
  const [title, setTitle] = useState(ticket?.title || '');
  const [description, setDescription] = useState(ticket?.description || '');
  const [priority, setPriority] = useState(ticket?.priority || 'MEDIUM');
  const [categoryId, setCategoryId] = useState(ticket?.categoryId || 'unassigned');
  const [aiReason, setAiReason] = useState(ticket?.aiReason || '');

  // AI suggestions state hooks
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  
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

  const handleAIAnalyze = async () => {
    if (title.trim().length < 3) {
      setError('Title must be at least 3 characters for AI analysis.');
      return;
    }
    if (description.trim().length < 10) {
      setError('Description must be at least 10 characters for AI analysis.');
      return;
    }
    setError(null);
    setAiLoading(true);
    setAiSuggestion(null);

    try {
      const response = await apiClient.post('/tickets/ai/analyze', {
        title: title.trim(),
        description: description.trim()
      });
      if (response.data?.status === 'success') {
        setAiSuggestion(response.data.data);
      }
    } catch (err) {
      console.error('AI analysis request failed:', err);
      setError(err.response?.data?.message || err.message || 'AI prediction service is offline.');
    } finally {
      setAiLoading(false);
    }
  };

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
      categoryId: categoryId === 'unassigned' ? null : categoryId,
      aiReason: aiReason || null
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

      {/* AI Intelligence Trigger & Suggestions Banner */}
      <div className="space-y-4">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleAIAnalyze}
            disabled={loading || aiLoading}
            className="py-1.5 px-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
          >
            {aiLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin"></div>
                Analyzing...
              </>
            ) : (
              '✨ Get AI Suggestions'
            )}
          </button>
        </div>

        {aiSuggestion && (
          <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <strong className="text-indigo-400 text-xs">✨ AI Recommendations Found:</strong>
              <span className="text-[10px] text-gray-500 font-medium">Gemini Intelligence</span>
            </div>
            <p className="text-gray-300">
              Suggested Category: <span className="text-white font-bold">{aiSuggestion.categoryName}</span> • Predicted Priority: <span className="text-white font-bold">{aiSuggestion.priority}</span>
            </p>
            {aiSuggestion.reason && (
              <p className="text-gray-400 italic">"Reason: {aiSuggestion.reason}"</p>
            )}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  if (aiSuggestion.categoryId) {
                    setCategoryId(aiSuggestion.categoryId);
                  } else {
                    setCategoryId('unassigned');
                  }
                  setPriority(aiSuggestion.priority);
                  setAiReason(aiSuggestion.reason);
                  setAiSuggestion(null);
                }}
                className="py-1 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[10px] transition"
              >
                Apply Suggestions
              </button>
              <button
                type="button"
                onClick={() => setAiSuggestion(null)}
                className="py-1 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-gray-300 text-[10px] transition"
              >
                Ignore
              </button>
            </div>
          </div>
        )}
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
