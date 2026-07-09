import { useState } from 'react';

export default function ArticleForm({ article = null, onSubmit, onCancel, loading = false }) {
  const [title, setTitle] = useState(article?.title || '');
  const [content, setContent] = useState(article?.content || '');
  const [category, setCategory] = useState(article?.category || '');
  const [tagsInput, setTagsInput] = useState(article?.tags ? article.tags.join(', ') : '');
  const [status, setStatus] = useState(article?.status || 'DRAFT');
  const [isFaq, setIsFaq] = useState(article?.isFaq || false);
  const [error, setError] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    // Validate inputs
    if (title.trim().length < 3) {
      setError('Title must be at least 3 characters long.');
      return;
    }
    if (content.trim().length < 5) {
      setError('Content must be at least 5 characters long.');
      return;
    }
    if (!category.trim()) {
      setError('Category is required.');
      return;
    }

    // Process tags (split by comma, trim whitespace)
    const tags = tagsInput
      .split(',')
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0);

    // Submit form payload
    onSubmit({
      title: title.trim(),
      content: content.trim(),
      category: category.trim(),
      tags,
      status,
      isFaq
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <h2 className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
        {article ? 'Edit Article Details' : 'Create Knowledge Article'}
      </h2>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          <strong>Validation Error:</strong> {error}
        </div>
      )}

      {/* Title */}
      <div className="space-y-1">
        <label className="text-xs text-gray-400 uppercase font-semibold block">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={loading}
          placeholder="e.g. How to reset your password"
          className="w-full bg-[#161C2C] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition duration-150 disabled:opacity-50"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Category */}
        <div className="space-y-1">
          <label className="text-xs text-gray-400 uppercase font-semibold block">Category</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={loading}
            placeholder="e.g. Account Security"
            className="w-full bg-[#161C2C] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition duration-150 disabled:opacity-50"
          />
        </div>

        {/* Tags */}
        <div className="space-y-1">
          <label className="text-xs text-gray-400 uppercase font-semibold block">Tags (Comma-separated)</label>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            disabled={loading}
            placeholder="e.g. password, reset, auth"
            className="w-full bg-[#161C2C] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition duration-150 disabled:opacity-50"
          />
        </div>
      </div>

      {/* Body Content */}
      <div className="space-y-1">
        <label className="text-xs text-gray-400 uppercase font-semibold block">Content Body</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={loading}
          placeholder="Write the guide instructions or FAQ answer details here..."
          rows="8"
          className="w-full bg-[#161C2C] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition duration-150 disabled:opacity-50 resize-y font-sans leading-relaxed"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-6 pt-2 border-t border-white/5">
        {/* Status selection */}
        <div className="flex items-center gap-3">
          <label className="text-xs text-gray-400 uppercase font-semibold">Publish Status:</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            disabled={loading}
            className="bg-[#161C2C] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-indigo-500/50 transition"
          >
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
          </select>
        </div>

        {/* FAQ Flag */}
        <div className="flex items-center gap-3">
          <label className="text-xs text-gray-400 uppercase font-semibold flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isFaq}
              onChange={(e) => setIsFaq(e.target.checked)}
              disabled={loading}
              className="rounded bg-[#161C2C] border-white/10 text-indigo-600 focus:ring-indigo-500/50"
            />
            Mark as FAQ Item
          </label>
        </div>
      </div>

      {/* Action buttons */}
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
            'Save Article'
          )}
        </button>
      </div>
    </form>
  );
}
