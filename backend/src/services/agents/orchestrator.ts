import { store } from '../../db/store';
import { Appointment, Conversation, HumanHandoff, Lead, Message } from '../../types/domain';
import { geminiProvider } from '../ai/llmProvider';
import { executeAgentTool } from './tools';
import { RetrievedChunk } from '../rag/ragService';
import { AppError } from '../../middleware/errorHandler';

interface ExtractedEntities {
  fullName?: string;
  companyName?: string;
  companySize?: number;
  budgetMonthlyInr?: number;
  budgetText?: string;
  requirements?: string;
  purchasingTimeline?: string;
  decisionAuthority?: string;
  wantsHuman?: boolean;
  wantsToEndCall?: boolean;
  askedPricingOrProduct?: boolean;
  wantsDemoOrAppointment?: boolean;
  confirmedAppointment?: boolean;
  selectedSlotIndex?: number;
}

export function extractEntitiesFromMessage(
  text: string,
  sessionMemory: Record<string, unknown>
): ExtractedEntities {
  const result: ExtractedEntities = {};
  const lower = text.toLowerCase();

  // Name extraction: "my name is X", "I am X", "I'm X", "this is X"
  const nameMatch =
    text.match(/(?:my name is|i am|i'm|this is|My name is|I am|I'm|This is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
  if (nameMatch && !['looking', 'interested', 'calling', 'from', 'here'].includes(nameMatch[1].toLowerCase().split(' ')[0])) {
    result.fullName = nameMatch[1].trim();
  }

  // Company extraction: "from <Company>", "at <Company>"
  const compMatch = text.match(/(?:from|at|company is|company called)\s+([A-Z][A-Za-z0-9&\s]{2,30})(?:[.,]|$|\s+and\s+|\s+with\s+)/);
  if (compMatch) {
    result.companyName = compMatch[1].trim();
  }

  // Employee / team size: "50 employees", "around 50 users", "team of 50"
  const sizeMatch = text.match(/(?:around|about|roughly)?\s*(\d{1,5})\s*(?:employees|people|users|seats|members|staff)/i)
    || text.match(/team of\s*(\d{1,5})/i);
  if (sizeMatch) {
    result.companySize = parseInt(sizeMatch[1], 10);
  }

  // Budget in INR: "₹15,000", "Rs 15000", "15,000 per month", "15k"
  const budgetKMatch = text.match(/(?:₹|rs\.?|inr)?\s*(\d{1,3})\s*k\s*(?:per\s*month|\/mo|monthly|a\s*month)?/i);
  const budgetNumMatch = text.match(/(?:₹|rs\.?|inr)\s*([\d,]{3,8})/i)
    || text.match(/budget\s*(?:is|of|around|approximately)?\s*(?:₹|rs\.?|inr)?\s*([\d,]{3,8})/i);
  if (budgetNumMatch) {
    const val = parseInt(budgetNumMatch[1].replace(/,/g, ''), 10);
    if (!isNaN(val) && val > 0) {
      result.budgetMonthlyInr = val;
      result.budgetText = `₹${val.toLocaleString('en-IN')}/month`;
    }
  } else if (budgetKMatch) {
    const val = parseInt(budgetKMatch[1], 10) * 1000;
    result.budgetMonthlyInr = val;
    result.budgetText = `₹${val.toLocaleString('en-IN')}/month`;
  }

  // Timeline
  if (lower.includes('this month') || lower.includes('immediately') || lower.includes('asap') || lower.includes('this week') || lower.includes('soon')) {
    result.purchasingTimeline = 'Immediate / This month';
  } else if (lower.includes('next month') || lower.includes('quarter')) {
    result.purchasingTimeline = 'Next 1-3 months';
  }

  // Authority
  for (const role of ['ceo', 'founder', 'vp', 'director', 'head', 'cto', 'manager', 'lead']) {
    if (new RegExp(`\\b${role}\\b`, 'i').test(text)) {
      result.decisionAuthority = role.toUpperCase();
      break;
    }
  }

  // Requirements
  if (lower.includes('project management') || lower.includes('kanban') || lower.includes('gantt') || lower.includes('sprint') || lower.includes('tracking') || lower.includes('software')) {
    result.requirements = text.slice(0, 200);
  }

  // Intents
  result.wantsHuman =
    lower.includes('speak to a human') ||
    lower.includes('talk to a human') ||
    lower.includes('human agent') ||
    lower.includes('real person') ||
    lower.includes('sales rep') ||
    lower.includes('escalate');

  result.wantsToEndCall =
    lower.includes('end this call') ||
    lower.includes('end the call') ||
    lower.includes('and this call') ||
    lower.includes('stop this call') ||
    lower.includes('close this call') ||
    lower.includes('hang up') ||
    lower.includes('goodbye') ||
    /\bbye\b/.test(lower) ||
    lower.includes('reach out to you') ||
    lower.includes('reach to you') ||
    lower.includes('talk later') ||
    lower.includes('get back to you');

  result.askedPricingOrProduct =
    lower.includes('price') ||
    lower.includes('pricing') ||
    lower.includes('plan') ||
    lower.includes('cost') ||
    lower.includes('feature') ||
    lower.includes('security') ||
    lower.includes('integration') ||
    lower.includes('project management') ||
    lower.includes('software');

  result.wantsDemoOrAppointment =
    lower.includes('demo') ||
    lower.includes('appointment') ||
    lower.includes('schedule') ||
    lower.includes('book') ||
    lower.includes('meeting') ||
    lower.includes('slot');

  // Confirmation if slots were previously offered
  const offeredSlots = Array.isArray(sessionMemory.offeredSlots) ? sessionMemory.offeredSlots : [];
  if (
    offeredSlots.length > 0 &&
    (lower.includes('yes') ||
      lower.includes('confirm') ||
      lower.includes('book') ||
      lower.includes('sure') ||
      lower.includes('sounds good') ||
      lower.includes('go ahead') ||
      lower.includes('first') ||
      lower.includes('10') ||
      lower.includes('11') ||
      lower.includes('tomorrow'))
  ) {
    result.confirmedAppointment = true;
    result.selectedSlotIndex = lower.includes('second') || lower.includes('11') ? Math.min(1, offeredSlots.length - 1) : 0;
  }

  return result;
}

export async function processCustomerTurn(params: {
  organizationId: string;
  conversationId: string;
  customerText: string;
  language?: string;
  mode?: 'LIVE' | 'DEMO';
}): Promise<{
  customerMessage: Message;
  aiMessage: Message;
  sources: Array<{ documentId: string; title: string; chunkIndex: number; score: number; snippet: string }>;
  lead: Lead | null;
  appointment: Appointment | null;
  handoff: HumanHandoff | null;
  sessionMemory: Record<string, unknown>;
  shouldEndCall: boolean;
}> {
  const conv: Conversation | undefined = store.db.conversations.find(
    (c) => c.id === params.conversationId && c.organizationId === params.organizationId
  );
  if (!conv) {
    throw new AppError('Conversation not found.', 404);
  }

  const effectiveMode = params.mode ?? conv.mode ?? 'DEMO';
  if (effectiveMode === 'LIVE' && !geminiProvider.isConfigured()) {
    throw new AppError(
      'Live AI Mode requires GEMINI_API_KEY to be configured on the server. Add your key in backend/.env or switch to Demo Mode.',
      400,
      'GEMINI_NOT_CONFIGURED'
    );
  }

  const lang = params.language || conv.language || 'en-IN';
  const now = new Date().toISOString();

  // Save customer message
  const customerMessage: Message = {
    id: store.newId('msg'),
    conversationId: conv.id,
    sender: 'CUSTOMER',
    content: params.customerText.trim(),
    language: lang,
    createdAt: now,
  };
  store.db.messages.push(customerMessage);

  const memory: Record<string, unknown> = { ...(conv.sessionMemory || {}) };
  const extracted = extractEntitiesFromMessage(params.customerText, memory);

  if (extracted.fullName) memory.customerName = extracted.fullName;
  if (extracted.companyName) memory.company = extracted.companyName;
  if (extracted.companySize) memory.companySize = extracted.companySize;
  if (extracted.budgetText) memory.budget = extracted.budgetText;
  if (extracted.budgetMonthlyInr) memory.budgetMonthlyInr = extracted.budgetMonthlyInr;
  if (extracted.purchasingTimeline) memory.purchasingTimeline = extracted.purchasingTimeline;
  if (extracted.decisionAuthority) memory.decisionAuthority = extracted.decisionAuthority;
  if (extracted.requirements) {
    const reqs = Array.isArray(memory.requirements) ? (memory.requirements as string[]) : [];
    reqs.push(extracted.requirements);
    memory.requirements = reqs.slice(-5);
  }

  // Safeguard: bounded tool execution per turn
  let toolCallsCount = 0;
  const MAX_TOOL_CALLS = 5;

  // 1. Customer & CRM Creation / Lookup
  if (!conv.customerId && memory.customerName && toolCallsCount < MAX_TOOL_CALLS) {
    toolCallsCount++;
    const custRes = await executeAgentTool({
      organizationId: params.organizationId,
      conversationId: conv.id,
      toolName: 'create_customer',
      input: {
        fullName: String(memory.customerName),
        companyName: memory.company ? String(memory.company) : null,
        preferredLang: lang,
      },
    });
    if (custRes.status === 'SUCCESS' && custRes.result?.customer) {
      const cust = custRes.result.customer as { id: string };
      conv.customerId = cust.id;
    }
  }

  // If customer exists, ensure lead is created/updated & scored
  let activeLead: Lead | null = conv.leadId
    ? store.db.leads.find((l) => l.id === conv.leadId) ?? null
    : null;

  if (conv.customerId && (extracted.companySize || extracted.budgetMonthlyInr || extracted.requirements || extracted.confirmedAppointment) && toolCallsCount < MAX_TOOL_CALLS) {
    toolCallsCount++;
    const leadRes = await executeAgentTool({
      organizationId: params.organizationId,
      conversationId: conv.id,
      toolName: 'update_lead',
      input: {
        leadId: conv.leadId ?? undefined,
        customerId: conv.customerId,
        companySize: typeof memory.companySize === 'number' ? memory.companySize : undefined,
        budgetMonthlyInr: typeof memory.budgetMonthlyInr === 'number' ? memory.budgetMonthlyInr : undefined,
        budgetText: memory.budget ? String(memory.budget) : undefined,
        requirements: Array.isArray(memory.requirements) ? (memory.requirements as string[]).join('; ') : undefined,
        purchasingTimeline: memory.purchasingTimeline ? String(memory.purchasingTimeline) : undefined,
        decisionAuthority: memory.decisionAuthority ? String(memory.decisionAuthority) : undefined,
      },
    });
    if (leadRes.status === 'SUCCESS' && leadRes.result?.lead) {
      activeLead = leadRes.result.lead as Lead;
      conv.leadId = activeLead.id;

      if (toolCallsCount < MAX_TOOL_CALLS) {
        toolCallsCount++;
        await executeAgentTool({
          organizationId: params.organizationId,
          conversationId: conv.id,
          toolName: 'calculate_lead_score',
          input: {
            leadId: activeLead.id,
            requestedDemo: Boolean(extracted.wantsDemoOrAppointment || extracted.confirmedAppointment),
            askedPricing: Boolean(extracted.askedPricingOrProduct),
          },
        });
        activeLead = store.db.leads.find((l) => l.id === activeLead!.id) ?? activeLead;
      }
    }
  }

  // 2. RAG Knowledge Retrieval
  let retrievedChunks: RetrievedChunk[] = [];
  if ((extracted.askedPricingOrProduct || extracted.companySize || extracted.budgetMonthlyInr) && toolCallsCount < MAX_TOOL_CALLS) {
    toolCallsCount++;
    const ragRes = await executeAgentTool({
      organizationId: params.organizationId,
      conversationId: conv.id,
      toolName: 'search_knowledge_base',
      input: { query: params.customerText, topK: 3 },
    });
    if (ragRes.status === 'SUCCESS' && Array.isArray(ragRes.result?.chunks)) {
      retrievedChunks = ragRes.result.chunks as RetrievedChunk[];
    }
  }

  // 3. Human Handoff check
  let createdHandoff: HumanHandoff | null = null;
  if (extracted.wantsHuman && toolCallsCount < MAX_TOOL_CALLS) {
    toolCallsCount++;
    const hofRes = await executeAgentTool({
      organizationId: params.organizationId,
      conversationId: conv.id,
      toolName: 'escalate_to_human',
      input: {
        conversationId: conv.id,
        customerId: conv.customerId ?? null,
        reason: 'Customer explicitly requested to speak with a human sales representative.',
        priority: 'HIGH',
      },
    });
    if (hofRes.status === 'SUCCESS' && hofRes.result?.handoff) {
      createdHandoff = hofRes.result.handoff as HumanHandoff;
    }
  }

  // 4. Appointment Slot Checking & Confirmed Booking
  let bookedAppointment: Appointment | null = null;
  let availableSlots: Array<{ startTime: string; endTime: string; label: string }> = [];

  if (extracted.confirmedAppointment && conv.customerId && toolCallsCount < MAX_TOOL_CALLS) {
    const offered = (memory.offeredSlots as Array<{ startTime: string; label: string }>) || [];
    const chosen = offered[extracted.selectedSlotIndex ?? 0];
    if (chosen) {
      toolCallsCount++;
      const bookRes = await executeAgentTool({
        organizationId: params.organizationId,
        conversationId: conv.id,
        toolName: 'book_appointment',
        input: {
          customerId: conv.customerId,
          leadId: conv.leadId ?? null,
          title: `FlowStack Product Demo — ${memory.customerName || 'Prospect'}`,
          type: 'PRODUCT_DEMO',
          startTime: chosen.startTime,
          notes: `Auto-booked via VoxSales AI Voice Agent. Budget: ${memory.budget || 'TBD'}, Size: ${memory.companySize || 'TBD'}`,
          confirmedByCustomer: true,
        },
      });
      if (bookRes.status === 'SUCCESS' && bookRes.result?.appointment) {
        bookedAppointment = bookRes.result.appointment as Appointment;
        memory.appointmentBooked = true;
        memory.offeredSlots = [];
      }
    }
  } else if ((extracted.wantsDemoOrAppointment || (activeLead && activeLead.score >= 45 && !memory.appointmentBooked)) && toolCallsCount < MAX_TOOL_CALLS) {
    toolCallsCount++;
    const slotRes = await executeAgentTool({
      organizationId: params.organizationId,
      conversationId: conv.id,
      toolName: 'check_available_slots',
      input: {},
    });
    if (slotRes.status === 'SUCCESS' && Array.isArray(slotRes.result?.slots)) {
      availableSlots = (slotRes.result.slots as Array<{ startTime: string; endTime: string; label: string }>).slice(0, 2);
      memory.offeredSlots = availableSlots;
    }
  }

  // 5. Generate Natural Response (Gemini Live OR Structured Demo Agent)
  const config = store.db.agentConfigurations.find((c) => c.organizationId === params.organizationId);
  const history = store.db.messages
    .filter((m) => m.conversationId === conv.id)
    .slice(-10);

  let aiText = '';
  if (effectiveMode === 'LIVE') {
    const langLabel = lang.startsWith('hi') ? 'Hindi (or Hinglish if natural)' : lang.startsWith('te') ? 'Telugu (or English-Telugu)' : 'English';
    const systemPrompt = `You are ${config?.agentName || 'Aria'}, an autonomous AI sales representative for ${config?.companyName || 'FlowStack'}.
Personality: ${config?.personality || 'Consultative and concise'}.
Sales tone: ${config?.salesTone || 'Professional & Consultative'}.
Respond in ${langLabel}. Keep responses concise (2-4 sentences, ideal for voice TTS).
Never fabricate product prices or features. Ground answers strictly in the Retrieved Knowledge Context below.
If an appointment was just booked, confirm the exact time clearly.
If slots were retrieved and no appointment is booked yet, offer the two available slots and ask for confirmation.
If the customer has not shared their name, company size, or timeline yet, ask one helpful follow-up question.

Session Memory: ${JSON.stringify(memory)}
Lead Status: ${activeLead ? `Score ${activeLead.score}/100 (${activeLead.classification}), Recommended: ${activeLead.recommendedPlan}` : 'Not scored yet'}
Booked Appointment: ${bookedAppointment ? `${bookedAppointment.title} at ${new Date(bookedAppointment.startTime).toLocaleString('en-IN')}` : 'None'}
Available Slots to Offer: ${availableSlots.map((s) => s.label).join(' or ')}
Human Handoff Created: ${createdHandoff ? 'Yes, escalated to a senior sales manager' : 'No'}
Retrieved Knowledge Context:
${retrievedChunks.map((c, i) => `[Source ${i + 1}: ${c.title}] ${c.content}`).join('\n') || 'None retrieved for this turn.'}`;

    aiText = await geminiProvider.generateText({
      systemPrompt,
      messages: history.map((m) => ({
        role: m.sender === 'CUSTOMER' ? 'user' : 'model',
        content: m.content,
      })),
      temperature: 0.4,
    });
  } else {
    aiText = buildDemoAgentReply({
      agentName: config?.agentName || 'Aria',
      customerText: params.customerText,
      lang,
      memory,
      activeLead,
      retrievedChunks,
      availableSlots,
      bookedAppointment,
      createdHandoff,
      wantsToEndCall: Boolean(extracted.wantsToEndCall),
    });
  }

  const sources = retrievedChunks.map((c) => ({
    documentId: c.documentId,
    title: c.title,
    chunkIndex: c.chunkIndex,
    score: c.score,
    snippet: c.snippet,
  }));

  const aiMessage: Message = {
    id: store.newId('msg'),
    conversationId: conv.id,
    sender: 'AI_AGENT',
    content: aiText,
    language: lang,
    sources: sources.length > 0 ? sources : null,
    createdAt: new Date().toISOString(),
  };

  store.db.messages.push(aiMessage);
  conv.sessionMemory = memory;
  conv.language = lang;
  conv.updatedAt = new Date().toISOString();
  store.save();

  return {
    customerMessage,
    aiMessage,
    sources,
    lead: activeLead,
    appointment: bookedAppointment,
    handoff: createdHandoff,
    sessionMemory: memory,
    shouldEndCall: Boolean(extracted.wantsToEndCall),
  };
}

function buildDemoAgentReply(ctx: {
  agentName: string;
  customerText: string;
  lang: string;
  memory: Record<string, unknown>;
  activeLead: Lead | null;
  retrievedChunks: RetrievedChunk[];
  availableSlots: Array<{ startTime: string; label: string }>;
  bookedAppointment: Appointment | null;
  createdHandoff: HumanHandoff | null;
  wantsToEndCall?: boolean;
}): string {
  const name = ctx.memory.customerName ? String(ctx.memory.customerName) : '';
  const greetingPrefix = name ? `${name}, ` : '';

  if (ctx.wantsToEndCall) {
    return `Of course${name ? `, ${name}` : ''}. Thank you for your time today! Feel free to reach out whenever you're ready, and I'll wrap up this call now. Have a great day!`;
  }

  if (ctx.createdHandoff) {
    return `Of course${name ? `, ${name}` : ''}. I have escalated your request to our Senior Sales Manager, Ananya Rao, along with your conversation context. Someone from our team will reach out shortly.`;
  }

  if (ctx.bookedAppointment) {
    const timeLabel = new Date(ctx.bookedAppointment.startTime).toLocaleString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return `Wonderful, ${greetingPrefix}your product demonstration is confirmed for ${timeLabel}. I have updated your profile in our CRM and generated a meeting link. Is there anything specific you would like our specialist to cover during the demo?`;
  }

  const parts: string[] = [];

  if (ctx.retrievedChunks.length > 0 && (ctx.memory.companySize || ctx.memory.budgetMonthlyInr)) {
    const plan = ctx.activeLead?.recommendedPlan || 'Growth-50 Mid-Market Bundle (₹15,000/month flat up to 50 seats)';
    parts.push(
      `Thank you${name ? `, ${name}` : ''}! Based on your team of ${ctx.memory.companySize || 'growing'} users and budget of ${ctx.memory.budget || 'around ₹15,000/month'}, our ${plan} from FlowStack is an ideal fit — it includes Kanban, Gantt timelines, Agile sprint planning, and workflow automation.`
    );
  } else if (ctx.retrievedChunks.length > 0) {
    parts.push(`Based on our FlowStack documentation: ${ctx.retrievedChunks[0].snippet}`);
  } else {
    parts.push(
      `Thanks for sharing that${name ? `, ${name}` : ''}! I'd love to help match you with the right FlowStack project management plan.`
    );
  }

  if (!ctx.memory.customerName) {
    parts.push('May I have your full name and company name so I can personalize a recommendation for you?');
  } else if (!ctx.memory.companySize || !ctx.memory.budgetMonthlyInr) {
    parts.push('Could you share your approximate team size and monthly budget so I can recommend the best plan?');
  } else if (ctx.availableSlots.length > 0) {
    parts.push(
      `Would you like to book a 30-minute live product demo? I have openings on ${ctx.availableSlots[0].label}${ctx.availableSlots[1] ? ` or ${ctx.availableSlots[1].label}` : ''}. Just confirm which time works for you!`
    );
  }

  return parts.join(' ');
}
