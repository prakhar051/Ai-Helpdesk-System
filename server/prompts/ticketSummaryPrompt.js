/**
 * Prompt builder for Ticket Summarization.
 * @param {object} ticket - Ticket details.
 * @param {string} ticket.title - Ticket title.
 * @param {string} ticket.description - Ticket description.
 * @param {string} ticket.status - Ticket status.
 * @param {string} ticket.priority - Ticket priority level.
 * @param {string} ticket.categoryName - Category name.
 * @param {string} ticket.agentName - Assigned agent name.
 * @param {object[]} comments - List of recent comments formatted for conversation.
 * @returns {string} Fully constructed prompt string for Gemini.
 */
const buildTicketSummaryPrompt = (ticket, comments) => {
  const formattedComments = comments
    .map(c => `${c.author.name}: ${c.content}`)
    .join('\n');

  return `
You are an expert IT Helpdesk Assistant.
Your task is to analyze the support ticket details and its comment thread conversation, and generate a concise, professional summary of the current issue, key events, and any action items resolved or pending.

Ticket Details:
- Title: ${ticket.title}
- Description: ${ticket.description}
- Status: ${ticket.status}
- Priority: ${ticket.priority}
- Category: ${ticket.categoryName || 'Uncategorized'}
- Assigned Agent: ${ticket.agentName || 'Unassigned'}

Ticket Discussion Conversation (Chronological):
${formattedComments || '(No comments in thread yet)'}

Generate a concise, professional summary of the ticket context to help support agents quickly understand the status.
You must output a structured JSON object ONLY. Do not wrap in markdown or backticks.
Expected JSON Output Schema:
{
  "summary": "A concise professional summary of the ticket."
}
`;
};

module.exports = {
  buildTicketSummaryPrompt
};
