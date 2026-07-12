export default function CategoryCard({ category, onEdit, onToggleStatus, isAdmin = false }) {
  return (
    <div className="bg-bgSurface border border-slate-200/40 border border-borderDefault rounded-2xl p-5 shadow-lg flex flex-col justify-between h-full relative group">
      <div>
        <div className="flex justify-between items-center mb-3">
          <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-primary uppercase tracking-wider">
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

        <h3 className="text-base font-bold text-textPrimary mb-2">
          {category.name}
        </h3>
        
        <p className="text-xs text-textMuted leading-relaxed line-clamp-3">
          {category.description || 'No description provided.'}
        </p>
      </div>

      {isAdmin && (
        <div className="mt-5 pt-3 border-t border-borderDefault flex justify-end gap-2">
          <button
            onClick={() => onEdit(category)}
            className="py-1 px-3 rounded-lg bg-bgSecondary hover:bg-slate-700 text-textSecondary text-[10px] font-semibold transition border border-borderDefault"
          >
            Edit Details
          </button>
          <button
            onClick={() => onToggleStatus(category)}
            className={`py-1 px-3 rounded-lg text-[10px] font-semibold transition border ${
              category.isActive
                ? 'bg-red-500/10 hover:bg-red-600 border-red-500/20 text-red-400 hover:text-textPrimary'
                : 'bg-emerald-500/10 hover:bg-emerald-600 border-emerald-500/20 text-emerald-400 hover:text-textPrimary'
            }`}
          >
            {category.isActive ? 'Deactivate' : 'Reactivate'}
          </button>
        </div>
      )}
    </div>
  );
}
