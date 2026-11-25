import { Router } from 'express';
import { z } from 'zod';
import { store } from '../db/store';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { Conversation, Message } from '../types/domain';
import { processCustomerTurn } from '../services/agents/orchestrator';
import { analyzeConversationSentiment } from '../services/sentiment/sentimentService';
import { generateAndSaveCallSummary } from '../services/summary/summaryService';

const router = Router();
router.use(requireAuth);

const createConvSchema = z.object({
  language: z.string().default('en-IN'),
  mode: z.enum(['LIVE', 'DEMO']).default('DEMO'),
  audioConsent: z.boolean().default(false),
  customerId: z.string().optional().nullable(),
});

router.get('/', (req: AuthenticatedRequest, res) => {
  const orgId = req.user!.organizationId;
  const search = typeof req.query.search === 'string' ? req.query.search.toLowerCase() : '';

  const conversations = store.db.conversations
    .filter((c) => c.organizationId === orgId)
    .map((c) => {
      const customer = store.db.customers.find((cu) => cu.id === c.customerId);
      const lead = store.db.leads.find((l) => l.id === c.leadId);
      const sentiment = store.db.sentimentAnalyses.find((s) => s.conversationId === c.id);
      const summary = store.db.callSummaries.find((s) => s.conversationId === c.id);
      const appointment = store.db.appointments.find(
        (a) => a.organizationId === orgId && (a.leadId === c.leadId || a.customerId === c.customerId) && c.customerId
      );
      return {
        ...c,
        customerName: customer?.fullName || 'Prospect',
        leadScore: lead?.score ?? null,
        leadClassification: lead?.classification ?? null,
        sentiment: sentiment?.category ?? null,
        hasSummary: Boolean(summary),
        appointmentStatus: appointment?.status ?? null,
      };
    })
    .filter(
      (c) =>
        !search ||
        c.customerName.toLowerCase().includes(search) ||
        c.id.toLowerCase().includes(search) ||
        c.language.toLowerCase().includes(search)
    );

  res.json({ conversations });
});

router.post('/', (req: AuthenticatedRequest, res, next) => {
  try {
    const data = createConvSchema.parse(req.body);
    const orgId = req.user!.organizationId;
    const config = store.db.agentConfigurations.find((c) => c.organizationId === orgId);
    const now = new Date().toISOString();

    const conv: Conversation = {
      id: store.newId('conv'),
      organizationId: orgId,
      customerId: data.customerId ?? null,
      leadId: null,
      language: data.language,
      status: 'LISTENING',
      mode: data.mode,
      startedAt: now,
      durationSeconds: 0,
      audioConsent: data.audioConsent,
      sessionMemory: {},
      isDemo: data.mode === 'DEMO',
      createdAt: now,
      updatedAt: now,
    };

    const greeting =
      config?.greetingMessage ||
      "Hello! Welcome to FlowStack. I'm Aria, your AI sales specialist. How can I help your team streamline project management today?";

    const welcomeMsg: Message = {
      id: store.newId('msg'),
      conversationId: conv.id,
      sender: 'AI_AGENT',
      content: greeting,
      language: data.language,
      createdAt: now,
    };

    store.db.conversations.unshift(conv);
    store.db.messages.push(welcomeMsg);
    store.save();

    res.status(201).json({ conversation: conv, greetingMessage: welcomeMsg });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', (req: AuthenticatedRequest, res, next) => {
  try {
    const orgId = req.user!.organizationId;
    const conv = store.db.conversations.find((c) => c.id === req.params.id && c.organizationId === orgId);
    if (!conv) throw new AppError('Conversation not found.', 404);

    const messages = store.db.messages.filter((m) => m.conversationId === conv.id);
    const customer = conv.customerId ? store.db.customers.find((c) => c.id === conv.customerId) || null : null;
    const lead = conv.leadId ? store.db.leads.find((l) => l.id === conv.leadId) || null : null;
    const sentiment = store.db.sentimentAnalyses.find((s) => s.conversationId === conv.id) || null;
    const summary = store.db.callSummaries.find((s) => s.conversationId === conv.id) || null;
    const toolExecutions = store.db.toolExecutions.filter((t) => t.conversationId === conv.id);
    const appointments = customer
      ? store.db.appointments.filter((a) => a.customerId === customer.id)
      : [];

    res.json({
      conversation: conv,
      messages,
      customer,
      lead,
      sentiment,
      summary,
      toolExecutions,
      appointments,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/messages', async (req: AuthenticatedRequest, res, next) => {
  try {
    const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
    if (!content) {
      throw new AppError('Message content cannot be empty.', 400);
    }
    const language = typeof req.body?.language === 'string' ? req.body.language : undefined;
    const mode = req.body?.mode === 'LIVE' || req.body?.mode === 'DEMO' ? req.body.mode : undefined;

    const result = await processCustomerTurn({
      organizationId: req.user!.organizationId,
      conversationId: String(req.params.id),
      customerText: content,
      language,
      mode,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/complete', async (req: AuthenticatedRequest, res, next) => {
  try {
    const orgId = req.user!.organizationId;
    const conv = store.db.conversations.find((c) => c.id === req.params.id && c.organizationId === orgId);
    if (!conv) throw new AppError('Conversation not found.', 404);

    const now = new Date();
    conv.status = 'COMPLETED';
    conv.endedAt = now.toISOString();
    const durationOverride = typeof req.body?.durationSeconds === 'number' ? req.body.durationSeconds : null;
    conv.durationSeconds =
      durationOverride ??
      Math.max(15, Math.round((now.getTime() - new Date(conv.startedAt).getTime()) / 1000));
    conv.updatedAt = now.toISOString();

    const messages = store.db.messages.filter((m) => m.conversationId === conv.id);
    const sentiment = await analyzeConversationSentiment({
      conversationId: conv.id,
      messages,
      mode: conv.mode,
    });
    const summary = generateAndSaveCallSummary({ conversation: conv, sentiment });
    store.save();

    res.json({ conversation: conv, sentiment, summary });
  } catch (err) {
    next(err);
  }
});

export default router;
