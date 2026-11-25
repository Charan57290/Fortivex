import { Router } from 'express';
import { z } from 'zod';
import { store } from '../db/store';
import { AuthenticatedRequest, recordAudit, requireAuth, requireRole } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { executeAgentTool, ToolName } from '../services/agents/tools';

const router = Router();
router.use(requireAuth);

const configSchema = z.object({
  agentName: z.string().min(1).optional(),
  companyName: z.string().min(1).optional(),
  personality: z.string().min(3).optional(),
  greetingMessage: z.string().min(5).optional(),
  salesTone: z.string().min(2).optional(),
  supportedLanguages: z.array(z.string()).optional(),
  productSummary: z.string().optional(),
  businessHours: z.string().optional(),
  appointmentDurationMin: z.number().int().min(15).max(120).optional(),
  hotThreshold: z.number().int().min(50).max(95).optional(),
  warmThreshold: z.number().int().min(20).max(74).optional(),
  escalationRules: z.string().optional(),
  requireConsentForAudio: z.boolean().optional(),
  retentionDays: z.number().int().min(7).max(365).optional(),
});

router.get('/config', (req: AuthenticatedRequest, res) => {
  const orgId = req.user!.organizationId;
  const config = store.db.agentConfigurations.find((c) => c.organizationId === orgId);
  res.json({ config: config || null });
});

router.put('/config', requireRole('ADMIN', 'SALES_MANAGER'), (req: AuthenticatedRequest, res, next) => {
  try {
    const data = configSchema.parse(req.body);
    const orgId = req.user!.organizationId;
    const config = store.db.agentConfigurations.find((c) => c.organizationId === orgId);
    if (!config) throw new AppError('Agent configuration not found.', 404);

    Object.assign(config, data, { updatedAt: new Date().toISOString() });
    store.save();

    recordAudit({
      organizationId: orgId,
      userId: req.user!.userId,
      action: 'AGENT_CONFIG_UPDATED',
      resource: 'AgentConfiguration',
      resourceId: config.id,
      ipAddress: req.ip,
    });

    res.json({ config });
  } catch (err) {
    next(err);
  }
});

router.post('/tools/execute', async (req: AuthenticatedRequest, res, next) => {
  try {
    const schema = z.object({
      conversationId: z.string(),
      toolName: z.enum([
        'search_knowledge_base',
        'get_customer_details',
        'create_customer',
        'update_lead',
        'calculate_lead_score',
        'check_available_slots',
        'book_appointment',
        'generate_call_summary',
        'escalate_to_human',
      ]),
      input: z.record(z.unknown()),
    });
    const data = schema.parse(req.body);
    const result = await executeAgentTool({
      organizationId: req.user!.organizationId,
      conversationId: data.conversationId,
      toolName: data.toolName as ToolName,
      input: data.input,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/handoffs', (req: AuthenticatedRequest, res) => {
  const orgId = req.user!.organizationId;
  const handoffs = store.db.humanHandoffs
    .filter((h) => h.organizationId === orgId)
    .map((h) => {
      const customer = store.db.customers.find((c) => c.id === h.customerId);
      const assignee = store.db.users.find((u) => u.id === h.assignedToId);
      return {
        ...h,
        customerName: customer?.fullName || 'Unknown Prospect',
        assignedToName: assignee?.fullName || 'Unassigned',
      };
    });
  res.json({ handoffs });
});

router.put('/handoffs/:id', (req: AuthenticatedRequest, res, next) => {
  try {
    const orgId = req.user!.organizationId;
    const handoff = store.db.humanHandoffs.find((h) => h.id === req.params.id && h.organizationId === orgId);
    if (!handoff) throw new AppError('Handoff record not found.', 404);

    const schema = z.object({
      status: z.enum(['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED']).optional(),
      assignedToId: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
    });
    const data = schema.parse(req.body);
    Object.assign(handoff, data, { updatedAt: new Date().toISOString() });
    store.save();
    res.json({ handoff });
  } catch (err) {
    next(err);
  }
});

router.get('/tool-logs', (req: AuthenticatedRequest, res) => {
  const orgId = req.user!.organizationId;
  const orgConvIds = new Set(
    store.db.conversations.filter((c) => c.organizationId === orgId).map((c) => c.id)
  );
  const logs = store.db.toolExecutions.filter((t) => orgConvIds.has(t.conversationId)).slice(0, 50);
  res.json({ logs });
});

export default router;
