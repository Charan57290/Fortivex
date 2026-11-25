import { Router } from 'express';
import { z } from 'zod';
import { store } from '../db/store';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { geminiProvider } from '../services/ai/llmProvider';
import { processCustomerTurn } from '../services/agents/orchestrator';
import { calculateLeadScore } from '../services/agents/leadScoring';
import { analyzeConversationSentiment } from '../services/sentiment/sentimentService';
import { generateAndSaveCallSummary } from '../services/summary/summaryService';
import { searchKnowledgeBase } from '../services/rag/ragService';

const router = Router();
router.use(requireAuth);

router.get('/status', (_req, res) => {
  res.json({
    provider: geminiProvider.name,
    geminiConfigured: geminiProvider.isConfigured(),
    databaseBackend: store.backendType,
    modesSupported: ['DEMO', ...(geminiProvider.isConfigured() ? ['LIVE'] : [])],
  });
});

router.post('/chat', async (req: AuthenticatedRequest, res, next) => {
  try {
    const schema = z.object({
      conversationId: z.string(),
      message: z.string().min(1),
      language: z.string().optional(),
      mode: z.enum(['LIVE', 'DEMO']).optional(),
    });
    const data = schema.parse(req.body);
    const result = await processCustomerTurn({
      organizationId: req.user!.organizationId,
      conversationId: data.conversationId,
      customerText: data.message,
      language: data.language,
      mode: data.mode,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/qualify-lead', (req: AuthenticatedRequest, res, next) => {
  try {
    const schema = z.object({
      companySize: z.number().int().positive().optional().nullable(),
      budgetMonthlyInr: z.number().int().nonnegative().optional().nullable(),
      budgetText: z.string().optional().nullable(),
      requirements: z.string().optional().nullable(),
      purchasingTimeline: z.string().optional().nullable(),
      decisionAuthority: z.string().optional().nullable(),
      requestedDemo: z.boolean().optional(),
      askedPricing: z.boolean().optional(),
    });
    const data = schema.parse(req.body);
    const config = store.db.agentConfigurations.find((c) => c.organizationId === req.user!.organizationId);
    const breakdown = calculateLeadScore({
      ...data,
      hotThreshold: config?.hotThreshold ?? 75,
      warmThreshold: config?.warmThreshold ?? 40,
    });
    res.json({ breakdown });
  } catch (err) {
    next(err);
  }
});

router.post('/analyze-sentiment', async (req: AuthenticatedRequest, res, next) => {
  try {
    const schema = z.object({ conversationId: z.string() });
    const data = schema.parse(req.body);
    const conv = store.db.conversations.find(
      (c) => c.id === data.conversationId && c.organizationId === req.user!.organizationId
    );
    if (!conv) throw new AppError('Conversation not found.', 404);
    const msgs = store.db.messages.filter((m) => m.conversationId === conv.id);
    const sentiment = await analyzeConversationSentiment({
      conversationId: conv.id,
      messages: msgs,
      mode: conv.mode,
    });
    res.json({ sentiment });
  } catch (err) {
    next(err);
  }
});

router.post('/summarize', async (req: AuthenticatedRequest, res, next) => {
  try {
    const schema = z.object({ conversationId: z.string() });
    const data = schema.parse(req.body);
    const conv = store.db.conversations.find(
      (c) => c.id === data.conversationId && c.organizationId === req.user!.organizationId
    );
    if (!conv) throw new AppError('Conversation not found.', 404);
    const msgs = store.db.messages.filter((m) => m.conversationId === conv.id);
    const sentiment =
      store.db.sentimentAnalyses.find((s) => s.conversationId === conv.id) ||
      (await analyzeConversationSentiment({ conversationId: conv.id, messages: msgs, mode: conv.mode }));
    const summary = generateAndSaveCallSummary({ conversation: conv, sentiment });
    res.json({ summary, sentiment });
  } catch (err) {
    next(err);
  }
});

router.post('/search-knowledge', async (req: AuthenticatedRequest, res, next) => {
  try {
    const schema = z.object({ query: z.string().min(2), topK: z.number().int().min(1).max(10).optional() });
    const data = schema.parse(req.body);
    const results = await searchKnowledgeBase({
      organizationId: req.user!.organizationId,
      query: data.query,
      topK: data.topK ?? 4,
    });
    res.json({ results });
  } catch (err) {
    next(err);
  }
});

export default router;
