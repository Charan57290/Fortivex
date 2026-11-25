import { z } from 'zod';
import { store } from '../../db/store';
import { searchKnowledgeBase } from '../rag/ragService';
import { calculateLeadScore, recommendPlanForLead } from './leadScoring';
import { createAppointmentRecord, getAvailableSlots } from '../appointments/appointmentService';
import { analyzeConversationSentiment } from '../sentiment/sentimentService';
import { generateAndSaveCallSummary } from '../summary/summaryService';
import { AgentToolExecution, Customer, Lead, PipelineStage } from '../../types/domain';

export type ToolName =
  | 'search_knowledge_base'
  | 'get_customer_details'
  | 'create_customer'
  | 'update_lead'
  | 'calculate_lead_score'
  | 'check_available_slots'
  | 'book_appointment'
  | 'generate_call_summary'
  | 'escalate_to_human';

const toolSchemas: Record<ToolName, z.ZodTypeAny> = {
  search_knowledge_base: z.object({ query: z.string().min(2), topK: z.number().int().min(1).max(8).optional() }),
  get_customer_details: z.object({ email: z.string().optional(), phone: z.string().optional(), fullName: z.string().optional() }),
  create_customer: z.object({
    fullName: z.string().min(1),
    email: z.string().email().optional().nullable(),
    phone: z.string().optional().nullable(),
    companyName: z.string().optional().nullable(),
    preferredLang: z.string().optional(),
  }),
  update_lead: z.object({
    leadId: z.string().optional(),
    customerId: z.string(),
    companySize: z.number().int().positive().optional().nullable(),
    budgetMonthlyInr: z.number().int().nonnegative().optional().nullable(),
    budgetText: z.string().optional().nullable(),
    requirements: z.string().optional().nullable(),
    purchasingTimeline: z.string().optional().nullable(),
    decisionAuthority: z.string().optional().nullable(),
    stage: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']).optional(),
  }),
  calculate_lead_score: z.object({
    leadId: z.string(),
    requestedDemo: z.boolean().optional(),
    askedPricing: z.boolean().optional(),
  }),
  check_available_slots: z.object({ dateStr: z.string().optional() }),
  book_appointment: z.object({
    customerId: z.string(),
    leadId: z.string().optional().nullable(),
    title: z.string().min(3),
    type: z.enum(['PRODUCT_DEMO', 'SALES_CONSULTATION', 'FOLLOW_UP_CALL', 'TECHNICAL_DISCUSSION']).optional(),
    startTime: z.string(),
    notes: z.string().optional(),
    confirmedByCustomer: z.boolean(),
  }),
  generate_call_summary: z.object({ conversationId: z.string() }),
  escalate_to_human: z.object({
    conversationId: z.string(),
    customerId: z.string().optional().nullable(),
    reason: z.string().min(3),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  }),
};

export async function executeAgentTool(params: {
  organizationId: string;
  conversationId: string;
  toolName: ToolName;
  input: Record<string, unknown>;
}): Promise<{ status: 'SUCCESS' | 'FAILED' | 'BLOCKED'; result?: Record<string, unknown>; error?: string }> {
  const started = Date.now();
  const schema = toolSchemas[params.toolName];
  if (!schema) {
    return { status: 'BLOCKED', error: `Unknown tool: ${params.toolName}` };
  }

  let parsedInput: Record<string, unknown>;
  try {
    parsedInput = schema.parse(params.input) as Record<string, unknown>;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Invalid tool parameters';
    logToolExecution(params.conversationId, params.toolName, params.input, 'BLOCKED', undefined, errorMsg, Date.now() - started);
    return { status: 'BLOCKED', error: errorMsg };
  }

  try {
    let result: Record<string, unknown> = {};

    switch (params.toolName) {
      case 'search_knowledge_base': {
        const chunks = await searchKnowledgeBase({
          organizationId: params.organizationId,
          query: String(parsedInput.query),
          topK: typeof parsedInput.topK === 'number' ? parsedInput.topK : 3,
        });
        result = { chunks };
        break;
      }

      case 'get_customer_details': {
        const email = parsedInput.email ? String(parsedInput.email).toLowerCase() : null;
        const phone = parsedInput.phone ? String(parsedInput.phone) : null;
        const fullName = parsedInput.fullName ? String(parsedInput.fullName).toLowerCase() : null;

        const customer = store.db.customers.find(
          (c) =>
            c.organizationId === params.organizationId &&
            ((email && c.email?.toLowerCase() === email) ||
              (phone && c.phone === phone) ||
              (fullName && c.fullName.toLowerCase() === fullName))
        );
        if (!customer) {
          result = { found: false };
        } else {
          const pastLeads = store.db.leads.filter((l) => l.customerId === customer.id);
          const pastConvs = store.db.conversations.filter((c) => c.customerId === customer.id);
          const pastSummaries = store.db.callSummaries.filter((s) =>
            pastConvs.some((c) => c.id === s.conversationId)
          );
          const pastApts = store.db.appointments.filter((a) => a.customerId === customer.id);
          result = {
            found: true,
            customer,
            leads: pastLeads,
            previousSummaries: pastSummaries.slice(0, 3),
            appointments: pastApts.slice(0, 3),
          };
        }
        break;
      }

      case 'create_customer': {
        const fullName = String(parsedInput.fullName).trim();
        const email = parsedInput.email ? String(parsedInput.email).toLowerCase() : null;
        const phone = parsedInput.phone ? String(parsedInput.phone) : null;

        // Deduplicate by email, phone, or exact name in organization
        const existing = store.db.customers.find(
          (c) =>
            c.organizationId === params.organizationId &&
            ((email && c.email?.toLowerCase() === email) ||
              (phone && c.phone === phone) ||
              c.fullName.toLowerCase() === fullName.toLowerCase())
        );

        if (existing) {
          result = { customer: existing, created: false };
        } else {
          let companyId: string | null = null;
          if (parsedInput.companyName) {
            const compName = String(parsedInput.companyName).trim();
            let comp = store.db.companies.find(
              (co) => co.organizationId === params.organizationId && co.name.toLowerCase() === compName.toLowerCase()
            );
            if (!comp) {
              comp = {
                id: store.newId('comp'),
                organizationId: params.organizationId,
                name: compName,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              store.db.companies.unshift(comp);
            }
            companyId = comp.id;
          }

          const now = new Date().toISOString();
          const customer: Customer = {
            id: store.newId('cust'),
            organizationId: params.organizationId,
            companyId,
            fullName,
            email,
            phone,
            preferredLang: String(parsedInput.preferredLang || 'en-IN'),
            consentRecorded: false,
            createdAt: now,
            updatedAt: now,
          };
          store.db.customers.unshift(customer);
          store.save();
          result = { customer, created: true };
        }
        break;
      }

      case 'update_lead': {
        const customerId = String(parsedInput.customerId);
        const customer = store.db.customers.find(
          (c) => c.id === customerId && c.organizationId === params.organizationId
        );
        if (!customer) {
          throw new Error('Customer not found in organization.');
        }

        let lead: Lead | undefined;
        if (parsedInput.leadId) {
          lead = store.db.leads.find(
            (l) => l.id === String(parsedInput.leadId) && l.organizationId === params.organizationId
          );
        }
        if (!lead) {
          lead = store.db.leads.find(
            (l) => l.customerId === customerId && l.organizationId === params.organizationId
          );
        }

        const now = new Date().toISOString();
        if (!lead) {
          lead = {
            id: store.newId('lead'),
            organizationId: params.organizationId,
            customerId,
            companyId: customer.companyId ?? null,
            assignedToId: 'usr_agent',
            title: `${customer.fullName} — FlowStack Inquiry`,
            leadSource: 'AI Voice Agent',
            score: 20,
            classification: 'COLD',
            stage: 'CONTACTED',
            sentiment: 'NEUTRAL',
            isDemo: false,
            createdAt: now,
            updatedAt: now,
          };
          store.db.leads.unshift(lead);
        }

        if (typeof parsedInput.companySize === 'number') lead.companySize = parsedInput.companySize;
        if (typeof parsedInput.budgetMonthlyInr === 'number') lead.budgetMonthlyInr = parsedInput.budgetMonthlyInr;
        if (parsedInput.budgetText) lead.budgetText = String(parsedInput.budgetText);
        if (parsedInput.requirements) lead.requirements = String(parsedInput.requirements);
        if (parsedInput.purchasingTimeline) lead.purchasingTimeline = String(parsedInput.purchasingTimeline);
        if (parsedInput.decisionAuthority) lead.decisionAuthority = String(parsedInput.decisionAuthority);
        if (parsedInput.stage) lead.stage = parsedInput.stage as PipelineStage;

        lead.recommendedPlan = recommendPlanForLead(lead.companySize, lead.budgetMonthlyInr);
        lead.productInterest = lead.recommendedPlan;
        lead.updatedAt = now;
        store.save();
        result = { lead };
        break;
      }

      case 'calculate_lead_score': {
        const lead = store.db.leads.find(
          (l) => l.id === String(parsedInput.leadId) && l.organizationId === params.organizationId
        );
        if (!lead) throw new Error('Lead not found.');

        const config = store.db.agentConfigurations.find((c) => c.organizationId === params.organizationId);
        const breakdown = calculateLeadScore({
          companySize: lead.companySize,
          budgetMonthlyInr: lead.budgetMonthlyInr,
          budgetText: lead.budgetText,
          requirements: lead.requirements,
          purchasingTimeline: lead.purchasingTimeline,
          decisionAuthority: lead.decisionAuthority,
          requestedDemo: Boolean(parsedInput.requestedDemo),
          askedPricing: Boolean(parsedInput.askedPricing),
          hotThreshold: config?.hotThreshold ?? 75,
          warmThreshold: config?.warmThreshold ?? 40,
        });

        lead.score = breakdown.total;
        lead.classification = breakdown.classification;
        lead.scoreBreakdown = breakdown;
        if (lead.classification === 'HOT' && (lead.stage === 'NEW' || lead.stage === 'CONTACTED')) {
          lead.stage = 'QUALIFIED';
        }
        lead.updatedAt = new Date().toISOString();
        store.save();
        result = { leadId: lead.id, score: lead.score, classification: lead.classification, breakdown };
        break;
      }

      case 'check_available_slots': {
        const slots = getAvailableSlots(
          params.organizationId,
          parsedInput.dateStr ? String(parsedInput.dateStr) : undefined
        );
        result = { slots };
        break;
      }

      case 'book_appointment': {
        if (!parsedInput.confirmedByCustomer) {
          return {
            status: 'BLOCKED',
            error: 'Appointment booking requires explicit customer confirmation.',
          };
        }
        const apt = createAppointmentRecord({
          organizationId: params.organizationId,
          customerId: String(parsedInput.customerId),
          leadId: parsedInput.leadId ? String(parsedInput.leadId) : null,
          title: String(parsedInput.title),
          type: (parsedInput.type as 'PRODUCT_DEMO') || 'PRODUCT_DEMO',
          startTime: String(parsedInput.startTime),
          notes: parsedInput.notes ? String(parsedInput.notes) : undefined,
        });
        result = { appointment: apt };
        break;
      }

      case 'generate_call_summary': {
        const conv = store.db.conversations.find(
          (c) => c.id === String(parsedInput.conversationId) && c.organizationId === params.organizationId
        );
        if (!conv) throw new Error('Conversation not found.');
        const msgs = store.db.messages.filter((m) => m.conversationId === conv.id);
        const sentiment = await analyzeConversationSentiment({
          conversationId: conv.id,
          messages: msgs,
          mode: conv.mode,
        });
        const summary = generateAndSaveCallSummary({ conversation: conv, sentiment });
        result = { summary, sentiment };
        break;
      }

      case 'escalate_to_human': {
        const conv = store.db.conversations.find(
          (c) => c.id === String(parsedInput.conversationId) && c.organizationId === params.organizationId
        );
        if (!conv) throw new Error('Conversation not found.');

        const now = new Date().toISOString();
        const handoff = {
          id: store.newId('hof'),
          organizationId: params.organizationId,
          conversationId: conv.id,
          customerId: (parsedInput.customerId as string) || conv.customerId || null,
          assignedToId: 'usr_manager',
          reason: String(parsedInput.reason),
          summary: `Escalated from AI Voice Agent (${conv.language}).`,
          status: 'PENDING' as const,
          priority: String(parsedInput.priority || 'HIGH'),
          createdAt: now,
          updatedAt: now,
        };
        store.db.humanHandoffs.unshift(handoff);
        store.db.salesActivities.unshift({
          id: store.newId('act'),
          organizationId: params.organizationId,
          customerId: handoff.customerId,
          leadId: conv.leadId ?? null,
          activityType: 'HANDOFF_CREATED',
          title: 'Escalated to Human Sales Specialist',
          description: handoff.reason,
          createdAt: now,
        });
        store.save();
        result = { handoff };
        break;
      }
    }

    logToolExecution(params.conversationId, params.toolName, parsedInput, 'SUCCESS', result, undefined, Date.now() - started);
    return { status: 'SUCCESS', result };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Tool execution failed';
    logToolExecution(params.conversationId, params.toolName, parsedInput, 'FAILED', undefined, errorMsg, Date.now() - started);
    return { status: 'FAILED', error: errorMsg };
  }
}

function logToolExecution(
  conversationId: string,
  toolName: string,
  inputParams: Record<string, unknown>,
  status: 'SUCCESS' | 'FAILED' | 'BLOCKED',
  result?: Record<string, unknown>,
  errorDetails?: string,
  durationMs = 0
): void {
  const entry: AgentToolExecution = {
    id: store.newId('tex'),
    conversationId,
    toolName,
    inputParams,
    status,
    result: result ?? null,
    errorDetails: errorDetails ?? null,
    durationMs,
    executedAt: new Date().toISOString(),
  };
  store.db.toolExecutions.unshift(entry);
  store.save();
}
