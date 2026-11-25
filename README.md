# VoxSales AI — Autonomous AI Sales Voice Agent

> **Technical Evaluation Project for FORTIVEX AI PRIVATE LIMITED**  
> Full-Stack AI SaaS Platform demonstrating Generative AI, Agentic AI, RAG, Real-Time Voice Interaction, Contextual Memory, Lead Intelligence, Sentiment Analysis, CRM Automation, and Appointment Scheduling.

---

## 1. Project Overview
**VoxSales AI** is an autonomous B2B AI sales representative platform. In the primary business scenario (**FlowStack SaaS** — a project management software company), a prospective customer contacts the company through the voice interface. The AI sales agent greets the customer, captures requirements, retrieves accurate product/pricing information from the RAG knowledge base, qualifies and scores the lead (Hot/Warm/Cold), analyzes sentiment, books a confirmed product demonstration without double-booking, updates CRM records, generates a structured call summary, and updates executive analytics.

## 2. Business Problem
- Manual inbound sales qualification is expensive, slow, and inconsistent outside business hours.
- Traditional chatbots cannot hold natural multi-turn voice conversations, retrieve grounded product pricing, score leads transparently, or execute validated CRM and scheduling actions.

## 3. Proposed Solution
A cohesive full-stack SaaS platform combining:
- **Real-Time Voice Studio** (Browser Web Speech API STT + SpeechSynthesis TTS with interruption, mute, language & voice controls, plus provider abstraction for Whisper/Cloud TTS).
- **Central Agentic AI Orchestrator** coordinating specialized sub-capabilities and validated backend tools (`search_knowledge_base`, `create_customer`, `update_lead`, `calculate_lead_score`, `check_available_slots`, `book_appointment`, `generate_call_summary`, `escalate_to_human`).
- **RAG Knowledge Base** with PDF/TXT ingestion, prompt-injection sanitization, chunking, vector embeddings, and source-attributed retrieval.
- **Live AI Mode & Demo Mode** clearly separated so evaluators can test with a real Google Gemini API key or offline without external dependencies.

## 4. Key Features
- JWT Authentication & RBAC (`ADMIN`, `SALES_MANAGER`, `SALES_AGENT`)
- Executive Overview Dashboard with database-driven KPIs and Recharts visualizations
- AI Voice Agent Studio (English, Hindi, Telugu selectors, live transcript, session memory, live lead score)
- Agent Studio (configurable persona, thresholds, escalation rules, tool execution logs)
- Lead Intelligence (0–100 explainable scoring, Hot/Warm/Cold, CSV export)
- CRM Pipeline (`NEW → CONTACTED → QUALIFIED → PROPOSAL → NEGOTIATION → WON → LOST`)
- Appointment Scheduling with double-booking prevention
- RAG Knowledge Base (PDF/TXT upload + interactive search tester)
- Call History, Transcript Export, AI Call Summarization & Sentiment Analysis
- Human Handoff Queue & Commercial Feasibility Cost Calculator

## 5. Technology Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide React, Recharts, React Router, TanStack Query, React Hook Form, Zod
- **Backend**: Node.js, Express.js, TypeScript, Socket.IO, JWT, bcryptjs, Multer, `pdf-parse`, Zod
- **Database**: PostgreSQL, Prisma ORM, `pgvector` (plus zero-config local JSON store fallback for offline evaluation), Redis (optional cache/session)
- **AI/LLM**: Google Gemini API (`@google/generative-ai`) via `LLMProvider` abstraction

## 6. System Architecture
See [`docs/system-design.md`](docs/system-design.md) and [`docs/architecture.png`](docs/architecture.png).

## 7. Database Architecture
See [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma) and [`docs/database-erd.png`](docs/database-erd.png) (19 normalized entities with `organizationId` tenant isolation and `vector(768)` embeddings).

## 8. Agentic AI Workflow
1. Customer speaks or types message -> 2. Entity & intent extraction -> 3. Validated backend tool execution (bounded to max 5 calls/turn) -> 4. RAG knowledge retrieval -> 5. Gemini/Demo response generation -> 6. Session memory & CRM persistence -> 7. Post-call Sentiment Analysis & Structured Summary.

## 9. RAG Workflow
`Document Upload (PDF/TXT) → Sanitization → Chunking → Embedding Generation → Vector Store (pgvector / cosine similarity) → Top-K Retrieval → Grounded Response with Source Attribution`.

## 10. API Documentation
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/dashboard/overview`, `GET /api/dashboard/analytics`
- `GET/POST /api/customers`, `GET/PUT /api/customers/:id`
- `GET/POST /api/leads`, `PUT/DELETE /api/leads/:id`, `GET /api/leads/:id/intelligence`, `GET /api/leads/export/csv`
- `POST/GET /api/conversations`, `GET /api/conversations/:id`, `POST /api/conversations/:id/messages`, `POST /api/conversations/:id/complete`
- `POST /api/knowledge/upload`, `GET /api/knowledge`, `DELETE /api/knowledge/:id`, `POST /api/knowledge/search`
- `GET/POST /api/appointments`, `PUT/DELETE /api/appointments/:id`, `GET /api/appointments/available-slots`
- `GET/PUT /api/agent/config`, `POST /api/agent/tools/execute`, `GET/PUT /api/agent/handoffs`, `GET /api/agent/tool-logs`
- `GET /api/ai/status`, `POST /api/ai/chat`, `POST /api/ai/qualify-lead`, `POST /api/ai/analyze-sentiment`, `POST /api/ai/summarize`, `POST /api/ai/search-knowledge`
- `GET /api/health`

## 11. Installation & Running Locally
```bash
# 1. Backend
cd backend
npm install
npm run dev

# 2. Frontend (new terminal)
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173`.

## 12. Environment Configuration
Copy `.env.example` to `backend/.env` and set `GEMINI_API_KEY` for Live Gemini Mode, and `DATABASE_URL` for PostgreSQL + pgvector (or run `docker-compose up -d postgres redis`).

## 13. Demo Credentials
- **Admin**: `admin@voxsales.ai` / `Demo@1234`
- **Sales Manager**: `manager@voxsales.ai` / `Demo@1234`
- **Sales Agent**: `agent@voxsales.ai` / `Demo@1234`

## 14. Testing
```bash
cd backend
npm test
```
Runs Vitest + Supertest covering health checks, auth, conservative lead scoring, RAG retrieval, double-booking prevention, and the full **Rahul Sharma** end-to-end acceptance workflow.

## 15. Scalability, Security & Commercial Feasibility
- **Scalability (100k Users)**: [`docs/scalability.md`](docs/scalability.md)
- **Security & Privacy**: [`docs/security.md`](docs/security.md)
- **One-Page Project Report**: [`docs/project-report.pdf`](docs/project-report.pdf)
- **Cost Calculator**: Built into the **Settings** page in the UI.

## 16. Deployment
- **Frontend**: Vercel (`frontend/`, build command `npm run build`, output `dist`)
- **Backend**: Render / Railway (`backend/`, build `npm run build`, start `npm start`)
- **Database**: Supabase PostgreSQL with `pgvector` enabled (`npx prisma db push`)
- **Redis**: Upstash / Managed Redis
