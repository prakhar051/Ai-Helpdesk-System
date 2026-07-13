/**
 * Prompt builder for AI Chatbot with RAG.
 * @param {string} message - Current user message.
 * @param {object[]} contextArticles - Array of relevant retrieved KB articles.
 * @param {object[]} history - Array of previous messages in the conversation (role: 'user' | 'assistant', content: '...').
 * @returns {string} Fully constructed prompt string.
 */
const buildChatbotPrompt = (message, contextArticles, history = []) => {
  const formattedArticles = contextArticles.map((art, idx) => {
    return `Article [${idx + 1}]:
ID: ${art.id}
Title: ${art.title}
Slug: ${art.slug}
Category: ${art.category}
Content: ${art.content}`;
  }).join('\n\n');

  const formattedHistory = history.map(h => {
    return `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`;
  }).join('\n');

  return `
You are an AI Helpdesk Assistant.
Your goal is to answer the user's question ONLY using the provided Knowledge Base context.
Never invent or hallucinate information. Do not mention facts or information not included in the Knowledge Base context.
If the answer is not contained in the context, clearly state that the knowledge base does not contain enough information.
Always recommend creating a support ticket if the user's issue cannot be resolved using the provided context.

Context:
${formattedArticles.length > 0 ? formattedArticles : 'No relevant knowledge base articles found.'}

Conversation History:
${formattedHistory.length > 0 ? formattedHistory : 'No previous history.'}

User's Question: ${message}

You must output a structured JSON object ONLY. Do not wrap in markdown or backticks.
Expected JSON Output Schema:
{
  "answer": "Your detailed answer based strictly on the context, or a statement that the knowledge base does not contain enough information and they should open a ticket.",
  "confidence": 0-100 score indicating your confidence that the answer is complete and correct (integer),
  "confidenceLevel": "HIGH", "MEDIUM", or "LOW" based on the confidence score,
  "usedArticles": [
    {
      "id": "ID of the article used, or null",
      "title": "Title of the article, or null",
      "slug": "Slug of the article, or null"
    }
  ]
}
`;
};

module.exports = {
  buildChatbotPrompt
};
