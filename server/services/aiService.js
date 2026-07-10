const prisma = require('../config/prisma');
const logger = require('../utils/logger');
const { buildCategoryPriorityPrompt } = require('../prompts/categoryPriorityPrompt');
const { buildKBRecommendationPrompt } = require('../prompts/knowledgeBaseRecommendationPrompt');

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
      const prompt = buildCategoryPriorityPrompt(title, description, categoryNames);

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

  /**
   * Recommend relevant Knowledge Base articles for a ticket.
   * @param {string} title - Ticket title.
   * @param {string} description - Ticket description.
   * @param {string} categoryId - Optional category ID.
   * @returns {Promise<object[]>} Array of recommendations with explanations.
   */
  async recommendKnowledgeBase(title, description, categoryId) {
    try {
      // 1. Sourcing published articles
      const dbArticles = await prisma.article.findMany({
        where: { status: 'PUBLISHED' }
      });

      // 2. Rule: If no published KB articles exist, return empty array immediately without calling Gemini
      if (dbArticles.length === 0) {
        return [];
      }

      // Map to small properties, keeping prompt fast and cheap
      const articles = dbArticles.map(art => ({
        id: art.id,
        title: art.title,
        categoryName: art.category,
        slug: art.slug,
        summary: art.content.length > 150 ? art.content.substring(0, 150) + '...' : art.content
      }));

      // Find the name of the category if categoryId was specified
      let categoryName = 'Uncategorized';
      if (categoryId) {
        const cat = await prisma.category.findUnique({ where: { id: categoryId } });
        if (cat) categoryName = cat.name;
      }

      // 3. Fallback check for API key
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        logger.warn('Gemini API key is missing. Returning empty recommendations fallback.');
        return [];
      }

      // 4. Construct prompt using prompt builder
      const prompt = buildKBRecommendationPrompt({ title, description, categoryName }, articles);

      // 5. Query Gemini REST API
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
        return [];
      }

      // 6. Handle malformed response gracefully: if JSON parsing fails, return empty list
      let parsed;
      try {
        parsed = JSON.parse(rawText.trim());
      } catch (parseErr) {
        logger.error(`Failed to parse Gemini recommendation output: ${parseErr.message}`);
        return [];
      }

      if (!Array.isArray(parsed)) {
        return [];
      }

      // 7. Map recommendations to database details
      const recommendations = [];
      for (const rec of parsed) {
        const article = articles.find(art => art.id === rec.articleId);
        if (article) {
          recommendations.push({
            id: article.id,
            title: article.title,
            slug: article.slug,
            categoryName: article.categoryName || 'General',
            summary: article.summary,
            explanation: rec.explanation || 'Recommended matching solution.'
          });
        }
      }

      return recommendations;

    } catch (err) {
      logger.error(`AI KB recommendation failed: ${err.message}`);
      return [];
    }
  }
}

module.exports = new AIService();
