/**
 * Prompt builder for Ticket Sentiment Analysis.
 * @param {object} ticket - Ticket details.
 * @param {string} ticket.title - Ticket title.
 * @param {string} ticket.description - Ticket description.
 * @param {object[]} customerComments - List of recent chronological comments made by the customer.
 * @returns {string} Fully constructed prompt string for Gemini.
 */
const buildTicketSentimentPrompt = (ticket, customerComments) => {
  const formattedComments = customerComments
    .map(c => `Customer: ${c.content}`)
    .join('\n');

  return `
You are an expert IT Helpdesk Assistant.
Your task is to analyze the support ticket details and the recent comment dialogue from the customer, and determine the customer's overall emotional state and sentiment.

Ticket Context:
- Title: ${ticket.title}
- Description: ${ticket.description}

Customer Dialogue Comments (Chronological):
${formattedComments || '(No customer comments in thread yet)'}

Instructions:
1. Determine the customer's overall sentiment: POSITIVE, NEUTRAL, or NEGATIVE.
2. Estimate your confidence score from 0 to 100 representing the sentiment analysis accuracy.
3. Identify the customer's dominant emotion (e.g. Frustrated, Happy, Anxious, Impatient, Satisfied, Neutral).
4. Provide a one-sentence summary explaining why the customer feels this way.
5. Provide a recommendation on the best approach for the support agent to respond.
6. You must output a structured JSON object ONLY. Do not wrap in markdown or backticks.

Expected JSON Output Schema:
{
  "sentiment": "POSITIVE | NEUTRAL | NEGATIVE",
  "confidence": 95,
  "emotion": "Frustrated",
  "summary": "Customer is frustrated because the login issue remains unresolved.",
  "agentAdvice": "Respond empathetically, acknowledge the inconvenience, explain the next step clearly, and provide an expected timeline."
}
`;
};

module.exports = {
  buildTicketSentimentPrompt
};
