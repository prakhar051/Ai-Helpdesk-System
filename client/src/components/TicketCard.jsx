export default function TicketCard({ ticket, onSelect }) {
  // Format sequential human-readable ticket number (e.g. HD-000042)
  const ticketRef = `HD-${ticket.ticketNumber.toString().padStart(6, '0')}`;

  const formattedDate = new Date(ticket.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  // Snippet description limit
  const snippet = ticket.description.length > 100
    ? ticket.description.substring(0, 100) + '...'
    : ticket.description;

  // Status styling colors
  const statusStyles = {
    OPEN: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    IN_PROGRESS: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    PENDING: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    RESOLVED: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
    CLOSED: 'bg-slate-500/10 border-slate-500/20 text-gray-400'
  };

  return (
    <div
      onClick={() => onSelect(ticket)}
      className="bg-slate-900/40 hover:bg-slate-900/70 border border-white/5 hover:border-white/10 rounded-2xl p-5 shadow-lg transition duration-200 cursor-pointer group flex flex-col justify-between h-full relative"
    >
      <div>
        {/* Header containing ticket reference and status */}
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-mono font-bold text-indigo-400">
            {ticketRef}
          </span>
          <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider ${statusStyles[ticket.status] || statusStyles.OPEN}`}>
            {ticket.status}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition duration-150 line-clamp-2">
          {ticket.title}
        </h3>

        {/* Description Snippet */}
        <p className="text-xs text-gray-400 mt-2 line-clamp-3 leading-relaxed">
          {snippet}
        </p>
      </div>

      {/* Meta Footer */}
      <div className="mt-4 pt-3 border-t border-white/5 space-y-2">
        <div className="flex justify-between items-center text-[10px] text-gray-500">
          <div>
            By <span className="text-gray-300 font-medium">{ticket.customer?.name}</span>
          </div>
          <div>
            {formattedDate}
          </div>
        </div>

        {/* Assignee Badge */}
        <div className="flex justify-between items-center text-[10px]">
          <span className="text-gray-500">Assignee:</span>
          <span className="text-gray-300 font-semibold">
            {ticket.agent ? ticket.agent.name : 'Unassigned'}
          </span>
        </div>
      </div>
    </div>
  );
}
