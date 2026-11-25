# Security, Privacy & Data Handling

1. **Authentication & RBAC**: Passwords hashed with `bcrypt` (cost 10). Stateless JWT bearer tokens with expiration and role-based middleware (`ADMIN`, `SALES_MANAGER`, `SALES_AGENT`).
2. **Multi-Tenant Isolation**: Every database query and RAG vector search filters strictly by `organizationId` derived from the verified JWT payload—never from untrusted request body fields.
3. **Prompt Injection Defense**: Uploaded PDF/TXT documents pass through `sanitizeDocumentText()` to strip common instruction-override directives before chunking and indexing.
4. **Controlled Tool Execution**: The LLM never executes raw SQL. All backend tools (`create_customer`, `update_lead`, `book_appointment`, `escalate_to_human`, etc.) validate parameters via Zod schemas and log every invocation to `AgentToolExecution`.
5. **HTTP & Input Hardening**: `helmet` security headers, strict CORS origin allowlist, `express-rate-limit` (300 req / 15 min), Multer file-type & size limits (10 MB max), and sanitized error responses.
6. **Voice Consent & Retention**: Audio/transcript retention is opt-in (`audioConsent`), with configurable retention windows (`retentionDays`, default 90 days) in Agent Configuration.
