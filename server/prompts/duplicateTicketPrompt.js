/**
 * Prompt builder for Duplicate Ticket Detection.
 * @param {object} newTicket - Newly entered ticket details.
 * @param {string} newTicket.title - Ticket title.
 * @param {string} newTicket.description - Ticket description.
 * @param {object[]} existingTickets - List of pre-filtered unresolved tickets.
 * @returns {string} Fully constructed prompt string for Gemini.
 */
const buildDuplicateTicketPrompt = (newTicket, existingTickets) => {
  const formattedExisting = existingTickets
    .map(t => `- ID: ${t.id}
  Number: HD-${t.ticketNumber.toString().padStart(6, '0')}
  Title: ${t.title}
  Description: ${t.description}`)
    .join('\n\n');

  return `
You are an expert IT Helpdesk Assistant.
Your task is to analyze the newly entered support ticket and compare it against the list of unresolved existing tickets to identify potential duplicates.

New Ticket Details:
- Title: ${newTicket.title}
- Description: ${newTicket.description}

Unresolved Existing Tickets:
${formattedExisting || '(No unresolved tickets matching pre-filter)'}

Instructions:
1. Compare the Title and Description of the new ticket against the list of unresolved existing tickets.
2. Identify up to 3 most similar tickets that cover the same core issue.
3. For each similar ticket, provide a concise explanation of why it is flagged as similar.
4. If there are no similar tickets, return an empty array.
5. You must output a structured JSON array ONLY. Do not wrap in markdown or backticks.

Expected JSON Output Schema:
[
  {
    "ticketId": "The ID of the matching ticket",
    "ticketNumber": "The HD-XXXXXX number of the matching ticket (e.g. HD-000001)",
    "title": "The Title of the matching ticket",
    "explanation": "A one-sentence explanation of why it is similar"
  }
]
`;
};

module.exports = {
  buildDuplicateTicketPrompt
};
