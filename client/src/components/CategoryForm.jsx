import { useState } from 'react';

export default function CategoryForm({ category = null, onSubmit, onCancel, loading = false }) {
  const [name, setName] = useState(category?.name || '');
  const [description, setDescription] = useState(category?.description || '');
  const [error, setError] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 2) {
      setError('Category name must be at least 2 characters long.');
      return;
    }
    if (description.trim().length > 255) {
      setError('Description must not exceed 255 characters.');
      return;
    }

    onSubmit({
      name: name.trim(),
      description: description.trim() || null
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <h2 className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
        {category ? 'Edit Category Details' : 'Create Helpdesk Category'}
      </h2>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          <strong>Validation Error:</strong> {error}
        </div>
      )}

      {/* Category Name */}
      <div className="space-y-1">
        <label className="text-xs text-gray-400 uppercase font-semibold block">Category Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
          placeholder="e.g. Network Issues"
          className="w-full bg-[#161C2C] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition duration-150 disabled:opacity-50"
        />
      </div>

      {/* Category Description */}
      <div className="space-y-1">
        <label className="text-xs text-gray-400 uppercase font-semibold block">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={loading}
          placeholder="Describe what kind of tickets fit under this category..."
          rows="5"
          className="w-full bg-[#161C2C] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition duration-150 disabled:opacity-50 resize-y leading-relaxed"
        />
      </div>

      {/* Form Trigger Buttons */}
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
            'Save Category'
          )}
        </button>
      </div>
    </form>
  );
}
