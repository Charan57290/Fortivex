# VoxSales AI — System Design

## 1. Architectural Overview
VoxSales AI is structured as a **modular monolith** with clean service boundaries so it can run reliably as an MVP while scaling horizontally into distributed workers without rewriting domain logic.

### Core Layers
1. **Presentation Layer (React + TypeScript + Vite)**
   - Browser Web Speech API (`SpeechRecognition`) & `SpeechSynthesis` TTS with interruption support.
   - TanStack Query for server state synchronization and Recharts for executive analytics.
2. **API & Real-Time Layer (Express.js + Socket.IO)**
   - JWT authentication + RBAC (`ADMIN`, `SALES_MANAGER`, `SALES_AGENT`) + Organization-level tenant isolation.
   - Zod schema validation on all REST endpoints and agent tool inputs.
3. **Agentic AI Orchestrator (`backend/src/services/agents/orchestrator.ts`)**
   - Coordinates Customer Understanding, RAG Knowledge Retrieval, Lead Qualification, Sentiment Analysis, Appointment Scheduling, CRM updates, and Human Handoff.
   - Uses a provider abstraction (`LLMProvider`) so Google Gemini (`gemini-2.0-flash`) can be swapped or supplemented with other providers.
   - Enforces bounded tool execution (`MAX_TOOL_CALLS = 5` per turn) and explicit customer confirmation before booking appointments.
4. **RAG Pipeline (`backend/src/services/rag/ragService.ts`)**
   - Document Upload (PDF/TXT) -> Prompt-Injection Sanitization -> Paragraph/Window Chunking -> Embedding Generation (`text-embedding-004` / deterministic 768-dim fallback) -> Vector Similarity Search -> Grounded Response with Source Attribution.
5. **Data Persistence Layer (`backend/prisma/schema.prisma`)**
   - Normalized 19-entity PostgreSQL schema with `pgvector` (`vector(768)`).
   - Includes a zero-config local JSON store fallback (`STORAGE_MODE=auto`) for immediate offline evaluation.
