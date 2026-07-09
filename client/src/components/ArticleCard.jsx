export default function ArticleCard({ article, onSelect }) {
  // Format creation date
  const formattedDate = new Date(article.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  // Extract snippet of content
  const snippet = article.content.length > 120 
    ? article.content.substring(0, 120) + '...' 
    : article.content;

  return (
    <div 
      onClick={() => onSelect(article)}
      className="bg-slate-900/40 hover:bg-slate-900/70 border border-white/5 hover:border-white/10 rounded-2xl p-5 shadow-lg transition duration-200 cursor-pointer group flex flex-col justify-between h-full relative"
    >
      <div>
        {/* Category & Status badges */}
        <div className="flex justify-between items-center mb-3">
          <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
            {article.category}
          </span>
          <div className="flex gap-2">
            {article.isFaq && (
              <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-amber-400 uppercase">
                FAQ
              </span>
            )}
            {article.status === 'DRAFT' && (
              <span className="px-2 py-0.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-[10px] font-bold text-yellow-500 uppercase">
                Draft
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition duration-150 line-clamp-2">
          {article.title}
        </h3>

        {/* Content Snippet */}
        <p className="text-xs text-gray-400 mt-2 line-clamp-3 leading-relaxed">
          {snippet}
        </p>
      </div>

      {/* Footer Info */}
      <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center text-[10px] text-gray-500">
        <div>
          By <span className="text-gray-300 font-medium">{article.author?.name}</span> • {formattedDate}
        </div>
        <div className="flex items-center gap-1.5 font-semibold text-gray-400">
          👁 {article.viewCount} views
        </div>
      </div>
      
      {/* Tag List */}
      {article.tags && article.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {article.tags.map((tag, idx) => (
            <span key={idx} className="text-[9px] bg-slate-800 text-gray-400 px-2 py-0.5 rounded-md">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
