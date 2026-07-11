/**
 * Prompt builder for AI Agent Assignment Recommendation.
 * @param {object} ticket - Ticket details.
 * @param {string} ticket.title - Ticket title.
 * @param {string} ticket.description - Ticket description.
 * @param {string} ticket.category - Ticket category name.
 * @param {string} ticket.priority - Ticket priority level.
 * @param {object[]} agents - List of available agents.
 * @returns {string} Fully constructed prompt string for Gemini.
 */
const buildAgentAssignmentPrompt = (ticket, agents) => {
  const formattedAgents = agents
    .map(
      a =>
        `- Agent ID: ${a.id}
  Name: ${a.name}
  Current Workload: ${a.workload} active tickets
  Resolved Category Experience: ${
    a.expertise.length > 0 ? a.expertise.map(e => `${e.name} (${e.count} resolved)`).join(', ') : 'None'
  }`
    )
    .join('\n\n');

  return `
You are an expert Helpdesk Routing Dispatcher.
Your task is to recommend the best support agent to assign to an incoming ticket from a list of active agents.

Incoming Ticket Details:
- Title: ${ticket.title}
- Description: ${ticket.description}
- Category: ${ticket.category || 'Uncategorized'}
- Priority: ${ticket.priority}

Available Support Agents:
${formattedAgents || 'No active support agents available.'}

Instructions:
1. Select the recommended agent based on:
   - Category Expertise: Match the agent's historical resolved categories to the ticket's category.
   - Workload Balance: Prefer agents with lower current workloads (fewer active tickets).
2. If no agents are listed or available, return recommendedAgentId as null, recommendedAgentName as null, confidence as 0, and reason stating no agents are available.
3. You must output a structured JSON object ONLY. Do not wrap in markdown or backticks.

Expected JSON Output Schema:
{
  "recommendedAgentId": "uuid-agent-id",
  "recommendedAgentName": "Jane Agent",
  "confidence": 92,
  "reason": "Jane has resolved 8 IT Support tickets previously and has a low current workload of 2 active tickets."
}
`;
};

module.exports = {
  buildAgentAssignmentPrompt
};
