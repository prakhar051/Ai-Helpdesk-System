const prisma = require('../config/prisma');
const logger = require('../utils/logger');

// Gemini Model Configs
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

/**
 * AI Service for Gemini integration
 */
class AIService {
  /**
   * Predict Category and Priority based on Ticket Title and Description.
   * @param {string} title - Ticket subject line.
   * @param {string} description - Detailed description.
   * @returns {Promise<object>} JSON prediction output (category, priority, reason).
   */
  async predictCategoryPriority(title, description) {
    try {
      // 1. Fetch active database categories to inject as prompt constraints
      const categories = await prisma.category.findMany({
        where: { isActive: true }
      });
      const categoryNames = categories.map(cat => cat.name);

      // 2. Fallback check for API key
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        logger.warn('Gemini API key is missing. Falling back to default suggestions.');
        return this._getCategoryPriorityFallback('AI configuration error.');
      }

      // 3. Compile prompt
      const prompt = `
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

      // 4. Call Gemini endpoint
      const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            responseMimeType: 'application/json'
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Google API request failed with status: ${response.status}`);
      }

      const responseBody = await response.json();
      const rawText = responseBody?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new Error('Empty response received from Gemini API.');
      }

      // 5. Parse structured output
      const parsed = JSON.parse(rawText.trim());

      // Validate parsed structures
      const matchedCategory = categories.find(cat => cat.name.toLowerCase() === (parsed.category || '').toLowerCase());
      const categoryId = matchedCategory ? matchedCategory.id : null;
      const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
      const priority = validPriorities.includes(parsed.priority) ? parsed.priority : 'MEDIUM';

      return {
        categoryId,
        categoryName: matchedCategory ? matchedCategory.name : 'Uncategorized',
        priority,
        reason: parsed.reason || 'AI categorized ticket.'
      };

    } catch (err) {
      logger.error(`AI Category/Priority prediction failed: ${err.message}`);
      return this._getCategoryPriorityFallback(err.message);
    }
  }

  /**
   * Helper fallback data generator
   */
  _getCategoryPriorityFallback(errorMsg) {
    return {
      categoryId: null,
      categoryName: 'Uncategorized',
      priority: 'MEDIUM',
      reason: `AI prediction unavailable: ${errorMsg}`
    };
  }

  // ==========================================
  // FUTURE CAPABILITIES ABSTRACTIONS
  // ==========================================

  async generateSummary(ticketId) {
    throw new Error('Not implemented. Reserved for future AI phases.');
  }

  async suggestReply(ticketId) {
    throw new Error('Not implemented. Reserved for future AI phases.');
  }

  async detectDuplicate(ticketId) {
    throw new Error('Not implemented. Reserved for future AI phases.');
  }

  async recommendKnowledgeBase(ticketId) {
    throw new Error('Not implemented. Reserved for future AI phases.');
  }
}

module.exports = new AIService();
