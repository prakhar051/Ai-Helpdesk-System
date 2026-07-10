/**
 * Prompt builder for Ticket Category and Priority prediction.
 * @param {string} title - Ticket title.
 * @param {string} description - Ticket description details.
 * @param {string[]} categoryNames - Array of active category names.
 * @returns {string} Fully constructed prompt string for Gemini.
 */
const buildCategoryPriorityPrompt = (title, description, categoryNames) => {
  return `
You are an expert IT Helpdesk Ticket Classifier.
Analyze the ticket details below and select the most appropriate Category and Priority.

Approved Category List:
${categoryNames.length > 0 ? categoryNames.join('\n') : 'General Support'}

Approved Priority List:
LOW
MEDIUM
HIGH
URGENT

You must output a structured JSON object ONLY. Do not wrap in markdown or backticks.
Expected JSON Output Schema:
{
  "category": "Exactly one of the approved categories listed above, or null if none fit",
  "priority": "Exactly one of: LOW, MEDIUM, HIGH, URGENT",
  "reason": "A brief one-sentence reason explaining why this category and priority were selected"
}

Ticket Title: ${title}
Ticket Description: ${description}
`;
};

module.exports = {
  buildCategoryPriorityPrompt
};
