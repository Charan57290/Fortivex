import os
from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm

os.makedirs('docs', exist_ok=True)


def draw_box(draw, xy, title, lines, fill='#151D2C', outline='#6366F1', title_color='#F8FAFC'):
    x1, y1, x2, y2 = xy
    draw.rounded_rectangle([x1, y1, x2, y2], radius=12, fill=fill, outline=outline, width=2)
    draw.text((x1 + 14, y1 + 12), title, fill=title_color)
    y = y1 + 34
    for line in lines:
        draw.text((x1 + 14, y), line, fill='#94A3B8')
        y += 18


def generate_architecture_png():
    img = Image.new('RGB', (1200, 720), '#090D16')
    d = ImageDraw.Draw(img)

    d.text((36, 24), 'VoxSales AI — Production System Architecture', fill='#F8FAFC')
    d.text((36, 46), 'Modular Monolith (MVP) with Clean Boundaries for 100k-User Horizontal Scaling', fill='#06B6D4')

    # Client Tier
    draw_box(
        d, (40, 90, 340, 290),
        'Frontend SPA (React + Vite)',
        ['• Web Speech API (STT)', '• SpeechSynthesis (TTS)', '• TanStack Query & Recharts', '• Live / Demo Mode Switch'],
        outline='#06B6D4',
    )

    # API Gateway / Express
    draw_box(
        d, (410, 90, 790, 290),
        'API & Real-Time Layer (Express + Socket.IO)',
        ['• JWT Auth & RBAC Middleware', '• Organization Tenant Isolation', '• Zod Request Validation', '• Helmet, CORS & Rate Limiting'],
        outline='#6366F1',
    )

    # AI Orchestrator
    draw_box(
        d, (410, 340, 790, 560),
        'Central Agentic AI Orchestrator',
        ['• Customer Understanding & Memory', '• Bounded Tool Calling (Zod)', '• Lead Scoring Engine (0–100)', '• Sentiment & Call Summarizer', '• Human Handoff Escalation'],
        outline='#22C55E',
    )

    # External AI / Providers
    draw_box(
        d, (850, 90, 1160, 290),
        'AI & Voice Providers',
        ['• Google Gemini 2.0 Flash', '• Gemini text-embedding-004', '• LLMProvider Abstraction', '• Demo Simulation Provider'],
        outline='#F59E0B',
    )

    # Data & RAG Layer
    draw_box(
        d, (850, 340, 1160, 560),
        'Data & RAG Persistence',
        ['• PostgreSQL + Prisma ORM', '• pgvector (768-dim Embeddings)', '• Redis Session/Cache Adapter', '• Local JSON Store Fallback'],
        outline='#06B6D4',
    )

    # Security / Docs Box
    draw_box(
        d, (40, 340, 340, 560),
        'RAG Ingestion Pipeline',
        ['• PDF (pdf-parse) & TXT Upload', '• Prompt-Injection Sanitizer', '• Overlapping Text Chunker', '• Source-Attributed Retrieval'],
        outline='#6366F1',
    )

    # Footer banner
    d.rounded_rectangle([40, 600, 1160, 680], radius=10, fill='#111827', outline='#334155', width=1)
    d.text((60, 622), 'Future Scale Path: Load Balancer -> Stateless API Pods -> BullMQ Async Workers (PDF/Embedding/Summary) -> PgBouncer + Read Replicas', fill='#94A3B8')

    # Arrows
    d.line([(340, 190), (410, 190)], fill='#6366F1', width=3)
    d.line([(790, 190), (850, 190)], fill='#F59E0B', width=3)
    d.line([(600, 290), (600, 340)], fill='#22C55E', width=3)
    d.line([(340, 450), (410, 450)], fill='#6366F1', width=3)
    d.line([(790, 450), (850, 450)], fill='#06B6D4', width=3)

    img.save('docs/architecture.png')


def generate_erd_png():
    img = Image.new('RGB', (1200, 740), '#090D16')
    d = ImageDraw.Draw(img)

    d.text((36, 24), 'VoxSales AI — PostgreSQL + pgvector Entity Relationship Diagram', fill='#F8FAFC')
    d.text((36, 46), '19 Normalized Multi-Tenant Entities (Isolated by organizationId)', fill='#06B6D4')

    entities = [
        ((40, 90, 290, 230), 'Organization', ['PK id', 'name, slug, plan', '1:N Users, Leads, Docs']),
        ((330, 90, 580, 230), 'User', ['PK id | FK organizationId', 'email, passwordHash, role', 'ADMIN | MANAGER | AGENT']),
        ((620, 90, 880, 230), 'AgentConfiguration', ['PK id | FK organizationId', 'agentName, personality', 'hotThreshold, warmThreshold']),
        ((910, 90, 1160, 230), 'KnowledgeDocument', ['PK id | FK organizationId', 'title, fileType, status', '1:N KnowledgeChunk']),
        ((40, 275, 290, 435), 'Customer & Company', ['PK id | FK organizationId', 'fullName, email, phone', 'consentRecorded, notes']),
        ((330, 275, 580, 435), 'Lead', ['PK id | FK customerId', 'score (0-100), classification', 'stage, budgetMonthlyInr']),
        ((620, 275, 880, 435), 'Conversation & Message', ['PK id | FK customerId, leadId', 'status, mode, sessionMemory', '1:N Message (transcript)']),
        ((910, 275, 1160, 435), 'KnowledgeChunk', ['PK id | FK documentId', 'content, chunkIndex', 'embedding vector(768)']),
        ((40, 485, 290, 645), 'Appointment', ['PK id | FK customerId, leadId', 'startTime, endTime, status', 'Double-booking prevented']),
        ((330, 485, 580, 645), 'CallSummary & Sentiment', ['PK id | FK conversationId', 'category, score, concerns', 'followUpActions, nextStep']),
        ((620, 485, 880, 645), 'AgentToolExecution', ['PK id | FK conversationId', 'toolName, inputParams', 'status, durationMs']),
        ((910, 485, 1160, 645), 'HumanHandoff & AuditLog', ['PK id | FK organizationId', 'reason, priority, status', 'action, resource, userId']),
    ]

    for xy, title, lines in entities:
        draw_box(d, xy, title, lines, outline='#6366F1')

    img.save('docs/database-erd.png')


def generate_one_page_pdf():
    doc = SimpleDocTemplate(
        'docs/project-report.pdf',
        pagesize=A4,
        leftMargin=14 * mm,
        rightMargin=14 * mm,
        topMargin=12 * mm,
        bottomMargin=10 * mm,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=15, leading=18, textColor=colors.HexColor('#1E1B4B'), spaceAfter=2)
    sub_style = ParagraphStyle('Sub', parent=styles['Normal'], fontSize=8.5, leading=11, textColor=colors.HexColor('#475569'), spaceAfter=6)
    h_style = ParagraphStyle('H', parent=styles['Heading2'], fontSize=9.5, leading=12, textColor=colors.HexColor('#4338CA'), spaceBefore=4, spaceAfter=2)
    body_style = ParagraphStyle('B', parent=styles['Normal'], fontSize=8, leading=10.5, textColor=colors.HexColor('#0F172A'))

    story = []
    story.append(Paragraph('VoxSales AI — Autonomous AI Sales Voice Agent (One-Page Project Report)', title_style))
    story.append(Paragraph('Technical Evaluation Project for FORTIVEX AI PRIVATE LIMITED | Candidate: [Your Name] | Role: Full-Stack & AI Engineer | Date: [Date]', sub_style))

    meta_table = Table(
        [
            ['Business Problem', 'Inbound B2B sales teams face slow lead qualification, inconsistent product answers, manual CRM entry, and missed after-hours demos.'],
            ['Proposed Solution', 'An autonomous AI voice sales platform combining Web Speech STT/TTS, Google Gemini, pgvector RAG, explainable lead scoring, CRM automation, and conflict-free scheduling.'],
            ['Tech Stack', 'React 18, TypeScript, Vite, Tailwind, Recharts, TanStack Query | Node.js, Express, Socket.IO, Zod, JWT | PostgreSQL, Prisma, pgvector, Redis | Google Gemini API.'],
        ],
        colWidths=[34 * mm, 148 * mm],
    )
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#EEF2FF')),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#312E81')),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 7.8),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#CBD5E1')),
        ('PADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 3))

    sections = [
        ('Main Features & System Architecture',
         'Modular monolith with 12 UI modules: Executive Overview, AI Voice Agent Studio (EN/HI/TE), Agent Studio, Lead Intelligence, Customers, Kanban CRM Pipeline, Call History, Appointments, RAG Knowledge Base, Analytics, Human Handoff, and Settings/Cost Calculator. Supports Live Gemini Mode and offline Demo Mode.'),
        ('End-to-End Workflow (Verified Acceptance Scenario)',
         '1) Customer Rahul Sharma initiates a voice/text call -> 2) States 50 employees & ₹15,000/mo budget -> 3) Orchestrator extracts entities, creates Customer & Lead, retrieves FlowStack Growth-50 pricing via RAG, and scores the lead -> 4) Offers available demo slots -> 5) Books confirmed slot without double-booking -> 6) Generates AI Sentiment & Call Summary -> 7) Updates CRM Pipeline and Dashboard KPIs.'),
        ('AI, Agentic Orchestration & RAG Implementation',
         'Provider-abstracted LLM layer (Google Gemini 2.0 Flash + text-embedding-004). Bounded tool execution (max 5 calls/turn) with Zod-validated tools logged to AgentToolExecution. RAG pipeline sanitizes uploaded PDF/TXT files against prompt injection, chunks text, indexes 768-dim vectors, and returns source-attributed chunks.'),
        ('Scalability (100k Users) & Security',
         'Distinguishes 100k registered users from ~15k DAU and ~500–1,500 concurrent voice sessions. Scales via CDN, stateless Express pods, Redis Socket.IO adapter, PgBouncer pooling, and BullMQ async workers. Security includes bcrypt, JWT RBAC, strict organizationId isolation, rate limiting, Helmet, and opt-in voice consent.'),
        ('Commercial Feasibility & Future Scope',
         'Estimated operating cost ~$0.015–$0.04/call using Gemini Flash & Browser Web Speech ($0 STT/TTS), enabling profitable Starter ($49/mo), Pro ($199/mo), and Enterprise ($799+/mo) tiers. Future scope: HubSpot/Salesforce sync, Google Calendar OAuth, SIP telephony, and streaming cloud STT/TTS.'),
    ]

    for heading, text in sections:
        story.append(Paragraph(heading, h_style))
        story.append(Paragraph(text, body_style))

    doc.build(story)


if __name__ == '__main__':
    generate_architecture_png()
    generate_erd_png()
    generate_one_page_pdf()
    print('Generated docs/architecture.png, docs/database-erd.png, docs/project-report.pdf')
