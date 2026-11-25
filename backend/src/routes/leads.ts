import { Router } from 'express';
import { z } from 'zod';
import { store } from '../db/store';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { calculateLeadScore, recommendPlanForLead } from '../services/agents/leadScoring';
import { Lead, PipelineStage } from '../types/domain';

const router = Router();
router.use(requireAuth);

const leadSchema = z.object({
  customerId: z.string(),
  title: z.string().min(2),
  industry: z.string().optional().nullable(),
  companySize: z.number().int().positive().optional().nullable(),
  budgetText: z.string().optional().nullable(),
  budgetMonthlyInr: z.number().int().nonnegative().optional().nullable(),
  requirements: z.string().optional().nullable(),
  purchasingTimeline: z.string().optional().nullable(),
  decisionAuthority: z.string().optional().nullable(),
  stage: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']).optional(),
});

router.get('/', (req: AuthenticatedRequest, res) => {
  const orgId = req.user!.organizationId;
  const search = typeof req.query.search === 'string' ? req.query.search.toLowerCase() : '';
  const classification = typeof req.query.classification === 'string' ? req.query.classification : '';
  const stage = typeof req.query.stage === 'string' ? req.query.stage : '';

  const leads = store.db.leads
    .filter((l) => l.organizationId === orgId)
    .map((l) => {
      const customer = store.db.customers.find((c) => c.id === l.customerId);
      const company = store.db.companies.find((co) => co.id === l.companyId);
      const assignedTo = store.db.users.find((u) => u.id === l.assignedToId);
      return {
        ...l,
        customerName: customer?.fullName || 'Unknown',
        customerEmail: customer?.email || null,
        customerPhone: customer?.phone || null,
        companyName: company?.name || null,
        assignedToName: assignedTo?.fullName || 'Unassigned',
      };
    })
    .filter((l) => {
      if (classification && l.classification !== classification) return false;
      if (stage && l.stage !== stage) return false;
      if (
        search &&
        !l.title.toLowerCase().includes(search) &&
        !l.customerName.toLowerCase().includes(search) &&
        !(l.companyName && l.companyName.toLowerCase().includes(search))
      ) {
        return false;
      }
      return true;
    });

  res.json({ leads });
});

router.get('/export/csv', (req: AuthenticatedRequest, res) => {
  const orgId = req.user!.organizationId;
  const leads = store.db.leads.filter((l) => l.organizationId === orgId);
  const header = 'ID,Title,Customer,Score,Classification,Stage,Budget,CompanySize,Sentiment,CreatedAt';
  const rows = leads.map((l) => {
    const cust = store.db.customers.find((c) => c.id === l.customerId);
    return [
      l.id,
      `"${(l.title || '').replace(/"/g, '""')}"`,
      `"${(cust?.fullName || '').replace(/"/g, '""')}"`,
      l.score,
      l.classification,
      l.stage,
      `"${(l.budgetText || '').replace(/"/g, '""')}"`,
      l.companySize ?? '',
      l.sentiment,
      l.createdAt,
    ].join(',');
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="voxsales-leads.csv"');
  res.send([header, ...rows].join('\n'));
});

router.post('/', (req: AuthenticatedRequest, res, next) => {
  try {
    const data = leadSchema.parse(req.body);
    const orgId = req.user!.organizationId;
    const customer = store.db.customers.find((c) => c.id === data.customerId && c.organizationId === orgId);
    if (!customer) throw new AppError('Customer not found.', 404);

    const config = store.db.agentConfigurations.find((c) => c.organizationId === orgId);
    const breakdown = calculateLeadScore({
      companySize: data.companySize,
      budgetMonthlyInr: data.budgetMonthlyInr,
      budgetText: data.budgetText,
      requirements: data.requirements,
      purchasingTimeline: data.purchasingTimeline,
      decisionAuthority: data.decisionAuthority,
      hotThreshold: config?.hotThreshold ?? 75,
      warmThreshold: config?.warmThreshold ?? 40,
    });

    const now = new Date().toISOString();
    const lead: Lead = {
      id: store.newId('lead'),
      organizationId: orgId,
      customerId: customer.id,
      companyId: customer.companyId ?? null,
      assignedToId: req.user!.userId,
      title: data.title,
      industry: data.industry ?? null,
      companySize: data.companySize ?? null,
      budgetText: data.budgetText ?? null,
      budgetMonthlyInr: data.budgetMonthlyInr ?? null,
      requirements: data.requirements ?? null,
      recommendedPlan: recommendPlanForLead(data.companySize, data.budgetMonthlyInr),
      productInterest: recommendPlanForLead(data.companySize, data.budgetMonthlyInr),
      leadSource: 'Manual CRM',
      purchasingTimeline: data.purchasingTimeline ?? null,
      decisionAuthority: data.decisionAuthority ?? null,
      score: breakdown.total,
      scoreBreakdown: breakdown,
      classification: breakdown.classification,
      stage: (data.stage as PipelineStage) ?? 'NEW',
      sentiment: 'NEUTRAL',
      isDemo: false,
      createdAt: now,
      updatedAt: now,
    };

    store.db.leads.unshift(lead);
    store.save();
    res.status(201).json({ lead });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/intelligence', (req: AuthenticatedRequest, res, next) => {
  try {
    const orgId = req.user!.organizationId;
    const lead = store.db.leads.find((l) => l.id === req.params.id && l.organizationId === orgId);
    if (!lead) throw new AppError('Lead not found.', 404);

    const customer = store.db.customers.find((c) => c.id === lead.customerId) || null;
    const conversations = store.db.conversations.filter((c) => c.leadId === lead.id);
    const appointments = store.db.appointments.filter((a) => a.leadId === lead.id);
    const activities = store.db.salesActivities.filter((ac) => ac.leadId === lead.id);

    res.json({
      lead,
      customer,
      conversations,
      appointments,
      activities,
      scoreBreakdown: lead.scoreBreakdown,
    });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', (req: AuthenticatedRequest, res, next) => {
  try {
    const orgId = req.user!.organizationId;
    const lead = store.db.leads.find((l) => l.id === req.params.id && l.organizationId === orgId);
    if (!lead) throw new AppError('Lead not found.', 404);

    const prevStage = lead.stage;
    const data = leadSchema.partial().parse(req.body);
    Object.assign(lead, data, { updatedAt: new Date().toISOString() });

    if (data.stage && data.stage !== prevStage) {
      store.db.salesActivities.unshift({
        id: store.newId('act'),
        organizationId: orgId,
        customerId: lead.customerId,
        leadId: lead.id,
        userId: req.user!.userId,
        activityType: 'STAGE_CHANGED',
        title: `Lead moved from ${prevStage} to ${data.stage}`,
        description: lead.title,
        createdAt: new Date().toISOString(),
      });
    }

    store.save();
    res.json({ lead });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', (req: AuthenticatedRequest, res, next) => {
  try {
    const orgId = req.user!.organizationId;
    const idx = store.db.leads.findIndex((l) => l.id === req.params.id && l.organizationId === orgId);
    if (idx === -1) throw new AppError('Lead not found.', 404);
    store.db.leads.splice(idx, 1);
    store.save();
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

export default router;
