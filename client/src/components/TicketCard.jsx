export default function TicketCard({ ticket, onSelect }) {
  // Format sequential human-readable ticket number (e.g. HD-000042)
  const ticketRef = `HD-${ticket.ticketNumber.toString().padStart(6, '0')}`;

  const formattedDate = new Date(ticket.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const snippet = ticket.description.length > 100
    ? ticket.description.substring(0, 100) + '...'
    : ticket.description;

  // Priority badge styling
  const priorityStyles = {
    LOW: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    MEDIUM: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    HIGH: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    URGENT: 'bg-red-500/10 border-red-500/20 text-red-400'
  };

  // Status badge styling
  const statusStyles = {
    OPEN: 'bg-slate-500/20 border-slate-500/30 text-textSecondary',
    IN_PROGRESS: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    PENDING: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    RESOLVED: 'bg-indigo-500/10 border-indigo-500/20 text-primary',
    CLOSED: 'bg-bgSecondary border-borderDefault text-textDisabled'
  };

  return (
    <div
      onClick={() => onSelect(ticket)}
      className="bg-bgSurface border border-slate-200/40 hover:bg-bgSurface border border-slate-200/70 border border-borderDefault hover:border-borderDefault rounded-2xl p-5 shadow-lg transition duration-200 cursor-pointer group flex flex-col justify-between h-full relative"
    >
      <div>
        {/* Header containing ticket reference and status */}
        <div className="flex justify-between items-center mb-3">
          <div className="flex gap-2 items-center">
            <span className="text-xs font-mono font-bold text-primary">
              {ticketRef}
            </span>
            <span className={`px-2 py-0.5 rounded-lg border text-[9px] font-bold uppercase tracking-wider ${priorityStyles[ticket.priority] || priorityStyles.MEDIUM}`}>
              {ticket.priority}
            </span>
          </div>
          <span className={`px-2 py-0.5 rounded-lg border text-[9px] font-bold uppercase tracking-wider ${statusStyles[ticket.status] || statusStyles.OPEN}`}>
            {ticket.status}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-textPrimary group-hover:text-primary transition duration-150 line-clamp-2">
          {ticket.title}
        </h3>

        {/* Description Snippet */}
        <p className="text-xs text-textMuted mt-2 line-clamp-3 leading-relaxed">
          {snippet}
        </p>
      </div>

      {/* Meta Footer */}
      <div className="mt-4 pt-3 border-t border-borderDefault space-y-2">
        {/* Category badge (fallback to Uncategorized if null) */}
        <div className="flex justify-between items-center text-[10px]">
          <span className="text-textDisabled">Category:</span>
          <span className="px-2 py-0.5 rounded bg-bgSecondary text-textSecondary font-semibold border border-borderDefault uppercase">
            {ticket.category ? ticket.category.name : 'Uncategorized'}
          </span>
        </div>

        <div className="flex justify-between items-center text-[10px] text-textDisabled">
          <div>
            By <span className="text-textSecondary font-medium">{ticket.customer?.name}</span>
          </div>
          <div>
            {formattedDate}
          </div>
        </div>

        {/* Assignee Info */}
        <div className="flex justify-between items-center text-[10px] pt-1.5 border-t border-borderDefault">
          <span className="text-textDisabled">Assignment:</span>
          <span className={`font-semibold ${ticket.agent ? 'text-primary' : 'text-amber-500/80'}`}>
            {ticket.agent ? `Assigned to: ${ticket.agent.name}` : 'Unassigned'}
          </span>
        </div>
      </div>
    </div>
  );
}
