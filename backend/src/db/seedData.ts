import bcrypt from 'bcryptjs';
import {
  Organization,
  User,
  AgentConfiguration,
  Company,
  Customer,
  Lead,
  Conversation,
  Message,
  CallSummary,
  SentimentAnalysis,
  KnowledgeDocument,
  KnowledgeChunk,
  Appointment,
  FollowUpTask,
  SalesActivity,
  AgentToolExecution,
  HumanHandoff,
  AuditLog,
} from '../types/domain';
import { generateDeterministicEmbedding } from '../utils/embeddings';

export interface DatabaseState {
  organizations: Organization[];
  users: User[];
  agentConfigurations: AgentConfiguration[];
  companies: Company[];
  customers: Customer[];
  leads: Lead[];
  conversations: Conversation[];
  messages: Message[];
  callSummaries: CallSummary[];
  sentimentAnalyses: SentimentAnalysis[];
  knowledgeDocuments: KnowledgeDocument[];
  knowledgeChunks: KnowledgeChunk[];
  appointments: Appointment[];
  followUpTasks: FollowUpTask[];
  salesActivities: SalesActivity[];
  toolExecutions: AgentToolExecution[];
  humanHandoffs: HumanHandoff[];
  auditLogs: AuditLog[];
}

export function buildDemoState(): DatabaseState {
  const now = new Date();
  const iso = (offsetHours = 0) => new Date(now.getTime() + offsetHours * 3600 * 1000).toISOString();
  const demoPassHash = bcrypt.hashSync('Demo@1234', 10);

  const orgId = 'org_flowstack';

  const organizations: Organization[] = [
    {
      id: orgId,
      name: 'FlowStack SaaS Pvt Ltd',
      slug: 'flowstack-saas',
      industry: 'B2B Project Management Software',
      plan: 'ENTERPRISE',
      createdAt: iso(-720),
      updatedAt: iso(-24),
    },
  ];

  const users: User[] = [
    {
      id: 'usr_admin',
      organizationId: orgId,
      email: 'admin@voxsales.ai',
      passwordHash: demoPassHash,
      fullName: 'Thota kali charan',
      role: 'ADMIN',
      isActive: true,
      lastLoginAt: iso(-2),
      createdAt: iso(-720),
      updatedAt: iso(-2),
    },
    {
      id: 'usr_manager',
      organizationId: orgId,
      email: 'manager@voxsales.ai',
      passwordHash: demoPassHash,
      fullName: 'Ananya Rao',
      role: 'SALES_MANAGER',
      isActive: true,
      lastLoginAt: iso(-5),
      createdAt: iso(-700),
      updatedAt: iso(-5),
    },
    {
      id: 'usr_agent',
      organizationId: orgId,
      email: 'agent@voxsales.ai',
      passwordHash: demoPassHash,
      fullName: 'Karthik Nair',
      role: 'SALES_AGENT',
      isActive: true,
      lastLoginAt: iso(-12),
      createdAt: iso(-650),
      updatedAt: iso(-12),
    },
  ];

  const agentConfigurations: AgentConfiguration[] = [
    {
      id: 'cfg_flowstack',
      organizationId: orgId,
      agentName: 'Aria',
      companyName: 'FlowStack',
      personality: 'Consultative, empathetic, concise, knowledgeable, and solution-oriented.',
      greetingMessage:
        "Hello! Welcome to FlowStack. I'm Aria, your AI sales specialist. How can I help your team streamline project management today?",
      salesTone: 'Professional & Consultative',
      supportedLanguages: ['en-IN', 'hi-IN', 'te-IN'],
      productSummary:
        'FlowStack is a modern project management SaaS platform with Kanban boards, Gantt timelines, Agile sprint planning, automated workflows, time tracking, and enterprise security.',
      businessHours: 'Mon-Fri 09:00 AM - 07:00 PM IST',
      appointmentDurationMin: 30,
      hotThreshold: 75,
      warmThreshold: 40,
      escalationRules:
        'Escalate to a human sales specialist if the customer explicitly requests a human, expresses strong frustration, or needs custom legal/SLA terms.',
      requireConsentForAudio: true,
      retentionDays: 90,
      createdAt: iso(-720),
      updatedAt: iso(-24),
    },
  ];

  const companies: Company[] = [
    {
      id: 'comp_nexora',
      organizationId: orgId,
      name: 'Nexora Logistics',
      industry: 'Supply Chain & Logistics',
      sizeRange: '51-200',
      employeeCount: 120,
      website: 'https://nexoralogistics.example.com',
      createdAt: iso(-200),
      updatedAt: iso(-48),
    },
    {
      id: 'comp_finbridge',
      organizationId: orgId,
      name: 'FinBridge Advisory',
      industry: 'FinTech & Consulting',
      sizeRange: '11-50',
      employeeCount: 35,
      website: 'https://finbridge.example.com',
      createdAt: iso(-160),
      updatedAt: iso(-24),
    },
    {
      id: 'comp_pixelcraft',
      organizationId: orgId,
      name: 'PixelCraft Studios',
      industry: 'Digital Design Agency',
      sizeRange: '1-10',
      employeeCount: 9,
      website: 'https://pixelcraft.example.com',
      createdAt: iso(-120),
      updatedAt: iso(-72),
    },
  ];

  const customers: Customer[] = [
    {
      id: 'cust_priya',
      organizationId: orgId,
      companyId: 'comp_nexora',
      fullName: 'Priya Menon',
      email: 'priya.menon@nexoralogistics.example.com',
      phone: '+91-98450-11223',
      preferredLang: 'en-IN',
      jobTitle: 'VP of Operations',
      notes: 'Evaluating FlowStack to replace spreadsheets across 4 regional hubs.',
      consentRecorded: true,
      createdAt: iso(-190),
      updatedAt: iso(-48),
    },
    {
      id: 'cust_arjun',
      organizationId: orgId,
      companyId: 'comp_finbridge',
      fullName: 'Arjun Deshmukh',
      email: 'arjun@finbridge.example.com',
      phone: '+91-98200-44556',
      preferredLang: 'hi-IN',
      jobTitle: 'Engineering Lead',
      notes: 'Interested in Sprint Planning and Jira migration.',
      consentRecorded: true,
      createdAt: iso(-140),
      updatedAt: iso(-24),
    },
    {
      id: 'cust_sneha',
      organizationId: orgId,
      companyId: 'comp_pixelcraft',
      fullName: 'Sneha Reddy',
      email: 'sneha@pixelcraft.example.com',
      phone: '+91-97000-88990',
      preferredLang: 'te-IN',
      jobTitle: 'Founder',
      notes: 'Small creative team exploring Starter plan.',
      consentRecorded: false,
      createdAt: iso(-100),
      updatedAt: iso(-72),
    },
  ];

  const leads: Lead[] = [
    {
      id: 'lead_priya',
      organizationId: orgId,
      customerId: 'cust_priya',
      companyId: 'comp_nexora',
      assignedToId: 'usr_manager',
      title: 'Nexora Logistics - 120 Seat Rollout',
      industry: 'Supply Chain & Logistics',
      companySize: 120,
      budgetText: '₹55,000/month',
      budgetMonthlyInr: 55000,
      requirements: 'Cross-hub Gantt timelines, RBAC, SSO, automated status reporting',
      productInterest: 'FlowStack Enterprise Plan',
      recommendedPlan: 'Enterprise Plan (₹899/user/month or ₹55,000/mo custom 100+ seat bundle)',
      leadSource: 'AI Voice Agent',
      purchasingTimeline: 'This month',
      decisionAuthority: 'VP of Operations (Decision Maker)',
      score: 88,
      scoreBreakdown: {
        purchaseIntent: { score: 28, max: 30, reason: 'Actively replacing spreadsheets this month and requested demo' },
        budgetFit: { score: 18, max: 20, reason: '₹55,000/mo budget aligns with Enterprise/Growth bundle' },
        urgency: { score: 17, max: 20, reason: 'Target rollout within 3 weeks' },
        requirementFit: { score: 13, max: 15, reason: 'Needs Gantt, RBAC, and workflow automation' },
        decisionAuthority: { score: 12, max: 15, reason: 'VP of Operations with direct budget sign-off' },
        total: 88,
        classification: 'HOT',
        summary: 'High-intent enterprise buyer with immediate timeline and confirmed budget.',
      },
      classification: 'HOT',
      stage: 'PROPOSAL',
      sentiment: 'POSITIVE',
      isDemo: true,
      createdAt: iso(-180),
      updatedAt: iso(-48),
    },
    {
      id: 'lead_arjun',
      organizationId: orgId,
      customerId: 'cust_arjun',
      companyId: 'comp_finbridge',
      assignedToId: 'usr_agent',
      title: 'FinBridge Advisory - 35 Seat Sprint Setup',
      industry: 'FinTech & Consulting',
      companySize: 35,
      budgetText: '₹15,000/month',
      budgetMonthlyInr: 15000,
      requirements: 'Agile sprints, GitHub integration, SOC 2 compliance',
      productInterest: 'FlowStack Growth Plan',
      recommendedPlan: 'Growth Plan (Annual Startup Bundle)',
      leadSource: 'AI Voice Agent',
      purchasingTimeline: 'Next 4-6 weeks',
      decisionAuthority: 'Engineering Lead (Influencer, CTO approves)',
      score: 64,
      scoreBreakdown: {
        purchaseIntent: { score: 20, max: 30, reason: 'Comparing FlowStack against Jira' },
        budgetFit: { score: 14, max: 20, reason: '₹15,000/mo fits annual Growth bundle' },
        urgency: { score: 12, max: 20, reason: '4-6 week evaluation window' },
        requirementFit: { score: 11, max: 15, reason: 'Strong fit for Agile sprints & GitHub sync' },
        decisionAuthority: { score: 7, max: 15, reason: 'Technical evaluator; CTO holds final sign-off' },
        total: 64,
        classification: 'WARM',
        summary: 'Solid mid-market fit; requires technical security review with CTO.',
      },
      classification: 'WARM',
      stage: 'QUALIFIED',
      sentiment: 'NEUTRAL',
      isDemo: true,
      createdAt: iso(-130),
      updatedAt: iso(-24),
    },
    {
      id: 'lead_sneha',
      organizationId: orgId,
      customerId: 'cust_sneha',
      companyId: 'comp_pixelcraft',
      assignedToId: 'usr_agent',
      title: 'PixelCraft Studios - Starter Inquiry',
      industry: 'Digital Design Agency',
      companySize: 9,
      budgetText: '₹2,500/month',
      budgetMonthlyInr: 2500,
      requirements: 'Simple Kanban board for client deliverables',
      productInterest: 'FlowStack Starter Plan',
      recommendedPlan: 'Starter Plan (₹299/user/month)',
      leadSource: 'AI Voice Agent',
      purchasingTimeline: 'Exploring for next quarter',
      decisionAuthority: 'Founder',
      score: 34,
      scoreBreakdown: {
        purchaseIntent: { score: 10, max: 30, reason: 'Early exploratory call' },
        budgetFit: { score: 7, max: 20, reason: 'Tight budget for 9 seats' },
        urgency: { score: 5, max: 20, reason: 'Next quarter timeline' },
        requirementFit: { score: 7, max: 15, reason: 'Basic Kanban needs' },
        decisionAuthority: { score: 5, max: 15, reason: 'Founder, but no immediate purchase plan' },
        total: 34,
        classification: 'COLD',
        summary: 'Early-stage small agency; nurture with free trial.',
      },
      classification: 'COLD',
      stage: 'CONTACTED',
      sentiment: 'NEUTRAL',
      isDemo: true,
      createdAt: iso(-96),
      updatedAt: iso(-72),
    },
  ];

  const conversations: Conversation[] = [
    {
      id: 'conv_demo_1',
      organizationId: orgId,
      customerId: 'cust_priya',
      leadId: 'lead_priya',
      language: 'en-IN',
      status: 'COMPLETED',
      mode: 'DEMO',
      startedAt: iso(-50),
      endedAt: iso(-49.85),
      durationSeconds: 312,
      audioConsent: true,
      sessionMemory: {
        customerName: 'Priya Menon',
        company: 'Nexora Logistics',
        companySize: 120,
        budget: '₹55,000/month',
        requirements: ['Gantt timelines', 'RBAC', 'SSO'],
      },
      isDemo: true,
      createdAt: iso(-50),
      updatedAt: iso(-49.85),
    },
    {
      id: 'conv_demo_2',
      organizationId: orgId,
      customerId: 'cust_arjun',
      leadId: 'lead_arjun',
      language: 'hi-IN',
      status: 'COMPLETED',
      mode: 'DEMO',
      startedAt: iso(-26),
      endedAt: iso(-25.9),
      durationSeconds: 245,
      audioConsent: true,
      sessionMemory: {
        customerName: 'Arjun Deshmukh',
        company: 'FinBridge Advisory',
        companySize: 35,
        budget: '₹15,000/month',
        requirements: ['Agile sprints', 'GitHub integration', 'SOC 2'],
      },
      isDemo: true,
      createdAt: iso(-26),
      updatedAt: iso(-25.9),
    },
  ];

  const messages: Message[] = [
    {
      id: 'msg_1',
      conversationId: 'conv_demo_1',
      sender: 'AI_AGENT',
      content: "Hello! Welcome to FlowStack. I'm Aria, your AI sales specialist. How can I help your team streamline project management today?",
      language: 'en-IN',
      createdAt: iso(-50),
    },
    {
      id: 'msg_2',
      conversationId: 'conv_demo_1',
      sender: 'CUSTOMER',
      content: 'Hi Aria, I am Priya from Nexora Logistics. We have 120 employees across 4 hubs and need Gantt timelines with strict role-based access.',
      language: 'en-IN',
      createdAt: iso(-49.98),
    },
    {
      id: 'msg_3',
      conversationId: 'conv_demo_1',
      sender: 'AI_AGENT',
      content:
        'Nice to meet you, Priya! For 120 users needing Gantt timelines and custom RBAC/SSO, our Enterprise Plan or a custom Growth-Enterprise bundle is ideal. May I ask your approximate monthly budget and rollout timeline?',
      language: 'en-IN',
      sources: [
        {
          documentId: 'doc_pricing',
          title: 'FlowStack Product Overview & Pricing Guide 2026',
          chunkIndex: 0,
          score: 0.91,
          snippet: 'Enterprise Plan: ₹899/user/month — Unlimited users, SSO/SAML, Custom RBAC, 99.99% SLA...',
        },
      ],
      createdAt: iso(-49.95),
    },
    {
      id: 'msg_4',
      conversationId: 'conv_demo_1',
      sender: 'CUSTOMER',
      content: 'Our budget is around ₹55,000 per month and we want to go live this month. Can we book a demo tomorrow at 11 AM?',
      language: 'en-IN',
      createdAt: iso(-49.9),
    },
    {
      id: 'msg_5',
      conversationId: 'conv_demo_1',
      sender: 'AI_AGENT',
      content:
        'Your product demonstration has been scheduled for tomorrow at 11:00 AM IST with our Senior Solutions Specialist. I have also saved your requirements in our CRM.',
      language: 'en-IN',
      createdAt: iso(-49.86),
    },
  ];

  const callSummaries: CallSummary[] = [
    {
      id: 'sum_demo_1',
      conversationId: 'conv_demo_1',
      customerOverview: 'Priya Menon, VP of Operations at Nexora Logistics (120 employees across 4 hubs).',
      mainRequirements: ['Cross-hub Gantt timelines', 'Role-Based Access Control (RBAC)', 'SSO/SAML'],
      productsDiscussed: ['FlowStack Enterprise Plan', 'Automated Status Reporting'],
      budgetInfo: '₹55,000/month',
      purchaseIntent: 'High - actively replacing spreadsheets this month',
      objections: ['Needs custom volume pricing for 120 seats'],
      sentiment: 'POSITIVE',
      leadScore: 88,
      qualificationStatus: 'HOT',
      appointmentDetails: 'Product Demo scheduled with Ananya Rao',
      followUpActions: ['Send custom 120-seat Enterprise proposal', 'Prepare multi-hub Gantt demo environment'],
      recommendedNextStep: 'Conduct tailored Enterprise demo and share commercial quote.',
      createdAt: iso(-49.85),
      updatedAt: iso(-49.85),
    },
    {
      id: 'sum_demo_2',
      conversationId: 'conv_demo_2',
      customerOverview: 'Arjun Deshmukh, Engineering Lead at FinBridge Advisory (35 employees).',
      mainRequirements: ['Agile Sprint Planning', 'GitHub Integration', 'SOC 2 Type II documentation'],
      productsDiscussed: ['FlowStack Growth Plan', 'Jira Migration Toolkit'],
      budgetInfo: '₹15,000/month',
      purchaseIntent: 'Moderate - evaluating alongside Jira over 4-6 weeks',
      objections: ['CTO requires SOC 2 Type II report before approval'],
      sentiment: 'NEUTRAL',
      leadScore: 64,
      qualificationStatus: 'WARM',
      appointmentDetails: 'Technical Consultation pending CTO availability',
      followUpActions: ['Email SOC 2 Type II summary', 'Schedule technical walkthrough with CTO'],
      recommendedNextStep: 'Share security compliance pack and follow up in 3 days.',
      createdAt: iso(-25.9),
      updatedAt: iso(-25.9),
    },
  ];

  const sentimentAnalyses: SentimentAnalysis[] = [
    {
      id: 'sent_demo_1',
      conversationId: 'conv_demo_1',
      category: 'POSITIVE',
      score: 0.86,
      frustrationDetected: false,
      hesitationDetected: false,
      buyingSignals: ['Shared exact 120-seat count', 'Confirmed ₹55,000/month budget', 'Requested immediate demo'],
      keyPhrases: ['go live this month', 'book a demo tomorrow'],
      concerns: ['Volume discount for 120 seats'],
      interestLevel: 'High',
      urgency: 'High',
      satisfaction: 'High',
      recommendedNextAction: 'Send Enterprise proposal prior to demo',
      explanation: 'AI-generated analysis: Customer proactively shared budget, timeline, and requested a demo slot, indicating strong buying intent.',
      isAiGenerated: true,
      createdAt: iso(-49.85),
    },
    {
      id: 'sent_demo_2',
      conversationId: 'conv_demo_2',
      category: 'NEUTRAL',
      score: 0.54,
      frustrationDetected: false,
      hesitationDetected: true,
      buyingSignals: ['Shared team size (35) and budget (₹15,000/mo)'],
      keyPhrases: ['comparing with Jira', 'CTO approval needed'],
      concerns: ['Security compliance verification'],
      interestLevel: 'Medium',
      urgency: 'Medium',
      satisfaction: 'Neutral',
      recommendedNextAction: 'Send SOC 2 compliance pack to Engineering Lead',
      explanation: 'AI-generated analysis: Customer is analytical and cautious, requiring security validation before committing.',
      isAiGenerated: true,
      createdAt: iso(-25.9),
    },
  ];

  const doc1Text = [
    'FlowStack Product Overview & Pricing Guide (2026 Edition). FlowStack is an all-in-one B2B Project Management SaaS platform built for growing teams and enterprises. Key capabilities include Kanban Boards, Gantt Timelines, Agile Sprint Planning, Automated Workflow Rules, Time Tracking, and AI-powered Bottleneck Alerts.',
    'FlowStack Pricing Plans (INR): 1) Starter Plan: ₹299 per user per month (billed monthly) or ₹249 per user per month (billed annually). Includes up to 15 users, Kanban Boards, Task Checklists, 5 GB file storage, and Email Support.',
    '2) Growth Plan (Most Popular for 20-100 employees): Standard rate is ₹499 per user per month, or ₹399 per user per month on annual billing. For 30 to 50 employee teams, FlowStack offers the Growth-50 Startup & Mid-Market Bundle at ₹15,000 per month flat (up to 50 seats, ₹300/seat effective) on annual commitment. Includes Kanban + Gantt Timelines, Agile Sprint Planning, Time Tracking, Workflow Automation, Slack/GitHub/Jira/Zapier integrations, and Priority Support.',
    '3) Premium / Enterprise Plan: ₹899 per user per month (custom volume pricing available for 100+ seats, starting around ₹55,000/month). Includes Unlimited users, SAML SSO, Custom Role-Based Access Control (RBAC), Audit Logs, Dedicated Customer Success Manager, AI Copilot, and 99.99% Uptime SLA.',
  ];

  const doc2Text = [
    'FlowStack Security, Compliance & Onboarding FAQ. Security: FlowStack is SOC 2 Type II certified and ISO 27001 compliant. All data is encrypted at rest (AES-256) and in transit (TLS 1.3). We support Indian data residency options for DPDP Act compliance.',
    'Integrations & Migration: FlowStack provides one-click migration importers for Jira, Asana, Trello, ClickUp, and Excel/CSV spreadsheets. Native integrations include Slack, Microsoft Teams, GitHub, GitLab, Google Workspace, and Zapier.',
    'Trial & Onboarding: Every new workspace receives a 14-day full-featured free trial with no credit card required. Growth and Enterprise customers receive a dedicated 2-week guided onboarding program and live team training.',
  ];

  const knowledgeDocuments: KnowledgeDocument[] = [
    {
      id: 'doc_pricing',
      organizationId: orgId,
      uploadedById: 'usr_admin',
      title: 'FlowStack Product Overview & Pricing Guide 2026',
      fileName: 'flowstack-pricing-2026.txt',
      fileType: 'TXT',
      fileSizeBytes: 1620,
      status: 'INDEXED',
      chunkCount: doc1Text.length,
      isDemo: true,
      createdAt: iso(-500),
      updatedAt: iso(-500),
    },
    {
      id: 'doc_faq',
      organizationId: orgId,
      uploadedById: 'usr_admin',
      title: 'FlowStack Security, Integrations & Onboarding FAQ',
      fileName: 'flowstack-faq-2026.txt',
      fileType: 'TXT',
      fileSizeBytes: 980,
      status: 'INDEXED',
      chunkCount: doc2Text.length,
      isDemo: true,
      createdAt: iso(-480),
      updatedAt: iso(-480),
    },
  ];

  const knowledgeChunks: KnowledgeChunk[] = [
    ...doc1Text.map((content, idx) => ({
      id: `chk_pricing_${idx}`,
      organizationId: orgId,
      documentId: 'doc_pricing',
      chunkIndex: idx,
      content,
      tokenCount: content.split(/\s+/).length,
      metadata: { sourceTitle: 'FlowStack Product Overview & Pricing Guide 2026', isDemo: true },
      embedding: generateDeterministicEmbedding(content),
      createdAt: iso(-500),
    })),
    ...doc2Text.map((content, idx) => ({
      id: `chk_faq_${idx}`,
      organizationId: orgId,
      documentId: 'doc_faq',
      chunkIndex: idx,
      content,
      tokenCount: content.split(/\s+/).length,
      metadata: { sourceTitle: 'FlowStack Security, Integrations & Onboarding FAQ', isDemo: true },
      embedding: generateDeterministicEmbedding(content),
      createdAt: iso(-480),
    })),
  ];

  const tomorrow11 = new Date(now);
  tomorrow11.setDate(tomorrow11.getDate() + 1);
  tomorrow11.setHours(11, 0, 0, 0);
  const tomorrow1130 = new Date(tomorrow11.getTime() + 30 * 60 * 1000);

  const dayAfter15 = new Date(now);
  dayAfter15.setDate(dayAfter15.getDate() + 2);
  dayAfter15.setHours(15, 0, 0, 0);
  const dayAfter1530 = new Date(dayAfter15.getTime() + 30 * 60 * 1000);

  const appointments: Appointment[] = [
    {
      id: 'apt_demo_1',
      organizationId: orgId,
      customerId: 'cust_priya',
      leadId: 'lead_priya',
      assignedToId: 'usr_manager',
      title: 'Enterprise Product Demo — Nexora Logistics',
      type: 'PRODUCT_DEMO',
      status: 'CONFIRMED',
      startTime: tomorrow11.toISOString(),
      endTime: tomorrow1130.toISOString(),
      notes: 'Cover multi-hub Gantt timelines, SSO, and 120-seat commercial proposal.',
      meetingLink: 'https://meet.voxsales.ai/demo-nexora',
      isDemo: true,
      createdAt: iso(-49),
      updatedAt: iso(-49),
    },
    {
      id: 'apt_demo_2',
      organizationId: orgId,
      customerId: 'cust_arjun',
      leadId: 'lead_arjun',
      assignedToId: 'usr_agent',
      title: 'Technical Consultation — FinBridge Advisory',
      type: 'TECHNICAL_DISCUSSION',
      status: 'SCHEDULED',
      startTime: dayAfter15.toISOString(),
      endTime: dayAfter1530.toISOString(),
      notes: 'Walk through Jira importer and SOC 2 Type II security controls.',
      meetingLink: 'https://meet.voxsales.ai/tech-finbridge',
      isDemo: true,
      createdAt: iso(-25),
      updatedAt: iso(-25),
    },
  ];

  const followUpTasks: FollowUpTask[] = [
    {
      id: 'tsk_demo_1',
      organizationId: orgId,
      customerId: 'cust_priya',
      leadId: 'lead_priya',
      assignedToId: 'usr_manager',
      title: 'Send 120-seat Enterprise custom quote',
      description: 'Include annual discount and dedicated onboarding SLA.',
      dueDate: tomorrow11.toISOString(),
      status: 'PENDING',
      priority: 'HIGH',
      createdAt: iso(-48),
      updatedAt: iso(-48),
    },
    {
      id: 'tsk_demo_2',
      organizationId: orgId,
      customerId: 'cust_arjun',
      leadId: 'lead_arjun',
      assignedToId: 'usr_agent',
      title: 'Share SOC 2 Type II Compliance Summary',
      description: 'Send PDF security pack to Arjun before technical call.',
      dueDate: dayAfter15.toISOString(),
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      createdAt: iso(-24),
      updatedAt: iso(-24),
    },
  ];

  const salesActivities: SalesActivity[] = [
    {
      id: 'act_demo_1',
      organizationId: orgId,
      customerId: 'cust_priya',
      leadId: 'lead_priya',
      userId: 'usr_manager',
      activityType: 'APPOINTMENT_BOOKED',
      title: 'Product Demo booked for Priya Menon (Nexora Logistics)',
      description: 'AI Agent Aria booked a 30-min Enterprise Demo after customer confirmation.',
      createdAt: iso(-49),
    },
    {
      id: 'act_demo_2',
      organizationId: orgId,
      customerId: 'cust_arjun',
      leadId: 'lead_arjun',
      userId: 'usr_agent',
      activityType: 'CALL_COMPLETED',
      title: 'Qualification call completed with Arjun Deshmukh',
      description: 'Lead scored 64 (Warm). Technical consultation scheduled.',
      createdAt: iso(-25.9),
    },
  ];

  const toolExecutions: AgentToolExecution[] = [
    {
      id: 'tex_demo_1',
      conversationId: 'conv_demo_1',
      toolName: 'search_knowledge_base',
      inputParams: { query: 'Enterprise Plan Gantt RBAC pricing' },
      status: 'SUCCESS',
      result: { chunksFound: 2, topSource: 'FlowStack Product Overview & Pricing Guide 2026' },
      durationMs: 42,
      executedAt: iso(-49.96),
    },
    {
      id: 'tex_demo_2',
      conversationId: 'conv_demo_1',
      toolName: 'calculate_lead_score',
      inputParams: { companySize: 120, budgetMonthlyInr: 55000, urgency: 'This month' },
      status: 'SUCCESS',
      result: { score: 88, classification: 'HOT' },
      durationMs: 12,
      executedAt: iso(-49.89),
    },
    {
      id: 'tex_demo_3',
      conversationId: 'conv_demo_1',
      toolName: 'book_appointment',
      inputParams: { customerId: 'cust_priya', type: 'PRODUCT_DEMO' },
      status: 'SUCCESS',
      result: { appointmentId: 'apt_demo_1', status: 'CONFIRMED' },
      durationMs: 28,
      executedAt: iso(-49.86),
    },
  ];

  const humanHandoffs: HumanHandoff[] = [
    {
      id: 'hof_demo_1',
      organizationId: orgId,
      conversationId: 'conv_demo_2',
      customerId: 'cust_arjun',
      assignedToId: 'usr_manager',
      reason: 'Customer requested signed SOC 2 Type II NDA & custom legal addendum',
      summary: 'FinBridge Advisory (35 seats) needs legal sign-off on data residency addendum before CTO approval.',
      status: 'ASSIGNED',
      priority: 'HIGH',
      notes: 'Assigned to Ananya Rao for security & legal packet.',
      createdAt: iso(-25.8),
      updatedAt: iso(-24),
    },
  ];

  const auditLogs: AuditLog[] = [
    {
      id: 'aud_demo_1',
      organizationId: orgId,
      userId: 'usr_admin',
      action: 'DEMO_SEED_INITIALIZED',
      resource: 'Organization',
      resourceId: orgId,
      details: { note: 'Initial FlowStack SaaS demo dataset loaded' },
      createdAt: iso(-500),
    },
  ];

  return {
    organizations,
    users,
    agentConfigurations,
    companies,
    customers,
    leads,
    conversations,
    messages,
    callSummaries,
    sentimentAnalyses,
    knowledgeDocuments,
    knowledgeChunks,
    appointments,
    followUpTasks,
    salesActivities,
    toolExecutions,
    humanHandoffs,
    auditLogs,
  };
}
