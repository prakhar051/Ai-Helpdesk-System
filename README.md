# AI Helpdesk System

An enterprise-grade, SaaS-ready support ticket ticketing platform combining a robust relational stack with natural language processing models.

## Technology Stack
* **Frontend**: React.js, Tailwind CSS, Axios, React Router.
* **Backend**: Node.js, Express.js, Winston Logger, express-rate-limit, Helmet, CORS.
* **Database Layer**: PostgreSQL, Prisma ORM.
* **AI Service Layer**: Google Gemini API, sentence embeddings.
* **Storage**: Cloudinary API.

## Monorepo Layout
* `/client`: React frontend client application.
* `/server`: Node/Express backend server and database migrations configuration.

## Key Features
* **AI Ticket Deflection**: Semantic recommendations from Knowledge Base articles and resolved cases.
* **AI Sentiment Categorization**: Sentiment extraction (Frustrated, Urgent, Neutral, Negative, Positive) on ticket updates.
* **AI Classification Assistance**: Auto-prioritization and auto-categorization.
* **Agent Augmentation Tools**: Canned draft suggestions and timeline summaries.
* **Knowledge Base Manager**: Structured publishing documentation workflows.
* **Secure Access**: JWT authorization mapping and role-based permissions (Admin, Agent, Customer).
* **Audit Trail logs**: Permanent activity logs.
