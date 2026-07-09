export default function CategoryCard({ category, onEdit, onToggleStatus, isAdmin = false }) {
  return (
    <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 shadow-lg flex flex-col justify-between h-full relative group">
      <div>
        <div className="flex justify-between items-center mb-3">
          <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
            Category
          </span>
          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border ${
            category.isActive 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            {category.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        <h3 className="text-base font-bold text-white mb-2">
          {category.name}
        </h3>
        
        <p className="text-xs text-gray-400 leading-relaxed line-clamp-3">
          {category.description || 'No description provided.'}
        </p>
      </div>

      {isAdmin && (
        <div className="mt-5 pt-3 border-t border-white/5 flex justify-end gap-2">
          <button
            onClick={() => onEdit(category)}
            className="py-1 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-gray-200 text-[10px] font-semibold transition border border-white/5"
          >
            Edit Details
          </button>
          <button
            onClick={() => onToggleStatus(category)}
            className={`py-1 px-3 rounded-lg text-[10px] font-semibold transition border ${
              category.isActive
                ? 'bg-red-500/10 hover:bg-red-600 border-red-500/20 text-red-400 hover:text-white'
                : 'bg-emerald-500/10 hover:bg-emerald-600 border-emerald-500/20 text-emerald-400 hover:text-white'
            }`}
          >
            {category.isActive ? 'Deactivate' : 'Reactivate'}
          </button>
        </div>
      )}
    </div>
  );
}
