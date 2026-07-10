/**
 * Prompt builder for Knowledge Base recommendations.
 * @param {object} ticket - Ticket details.
 * @param {string} ticket.title - Ticket title.
 * @param {string} ticket.description - Ticket description.
 * @param {string} ticket.categoryName - Ticket category name.
 * @param {object[]} articles - List of published articles with minimal info.
 * @returns {string} Fully constructed prompt string for Gemini.
 */
const buildKBRecommendationPrompt = (ticket, articles) => {
  const formattedArticles = articles.map(art => {
    return `- ID: ${art.id}
  Title: ${art.title}
  Category: ${art.categoryName || 'General'}
  Summary: ${art.summary || 'No summary available.'}`;
  }).join('\n\n');

  return `
You are an expert IT Helpdesk Assistant.
Your task is to analyze the support ticket details and recommend the most relevant Knowledge Base articles from the list of published articles.

Ticket details:
- Title: ${ticket.title}
- Description: ${ticket.description}
- Category: ${ticket.categoryName || 'Uncategorized'}

List of Published Articles:
${formattedArticles}

Identify up to 3 most relevant articles that could help resolve the ticket's issue.
Provide a short, one-sentence explanation of why each article was selected.

You must output a structured JSON array ONLY. Do not wrap in markdown or backticks.
Expected JSON Output Schema:
[
  {
    "articleId": "Exactly one of the article IDs from the list above",
    "explanation": "A one-sentence explanation of why this article is relevant"
  }
]
`;
};

module.exports = {
  buildKBRecommendationPrompt
};
