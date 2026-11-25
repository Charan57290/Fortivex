# Scalability Strategy — Scaling to 100,000 Users

> **Note:** The current MVP has been functionally verified in local/unit/integration tests; it has **not** been load-tested at 100,000-user scale. This document outlines the target production architecture.

## 1. Registered vs. Active vs. Concurrent Voice Sessions
- **100,000 Registered Users**: Total accounts stored in PostgreSQL across tenant organizations.
- **~10,000–15,000 Daily Active Users (DAU)**: Sales reps, managers, and prospects interacting across the day.
- **~500–1,500 Concurrent Voice Sessions**: Peak simultaneous active voice streams requiring real-time STT/TTS, LLM inference, and vector search.

## 2. Evolution from Modular Monolith to Distributed Scale
1. **Frontend & Edge**: Deploy React SPA to Vercel/Cloudflare CDN with edge caching and static asset compression.
2. **API Gateway & Stateless Backend**: Run multiple stateless Node.js/Express instances behind an Application Load Balancer with sticky/Redis-backed Socket.IO adapter (`@socket.io/redis-adapter`).
3. **Database & Vector Scaling**:
   - Managed PostgreSQL (Supabase / AWS RDS) with **PgBouncer** connection pooling and read replicas for analytics queries.
   - `pgvector` HNSW indexes partitioned by `organizationId`, or migration to dedicated Qdrant/Pinecone clusters if chunk volume exceeds 50M vectors.
4. **Asynchronous Workers & Queues**:
   - Offload PDF parsing, chunking, embedding generation, and post-call summarization to **BullMQ / Redis** background workers.
5. **AI Rate Limiting & Quotas**:
   - Per-organization token/minute quotas, exponential backoff, and multi-region LLM failover.
