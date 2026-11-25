import { Router } from 'express';
import { store } from '../db/store';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

router.get('/overview', (req: AuthenticatedRequest, res) => {
  const orgId = req.user!.organizationId;
  const days = req.query.days ? parseInt(String(req.query.days), 10) : 30;
  const cutoff = isNaN(days) ? 0 : Date.now() - days * 24 * 3600 * 1000;

  const conversations = store.db.conversations.filter(
    (c) => c.organizationId === orgId && new Date(c.createdAt).getTime() >= cutoff
  );
  const leads = store.db.leads.filter((l) => l.organizationId === orgId);
  const appointments = store.db.appointments.filter(
    (a) => a.organizationId === orgId && a.status !== 'CANCELLED'
  );
  const sentiments = store.db.sentimentAnalyses.filter((s) =>
    conversations.some((c) => c.id === s.conversationId)
  );
  const activities = store.db.salesActivities
    .filter((a) => a.organizationId === orgId)
    .slice(0, 12);

  const totalCalls = conversations.length;
  const completedCalls = conversations.filter((c) => c.status === 'COMPLETED').length;
  const totalLeads = leads.length;
  const qualifiedLeads = leads.filter((l) => l.classification === 'HOT' || l.classification === 'WARM').length;
  const wonLeads = leads.filter((l) => l.stage === 'WON').length;
  const conversionRate = totalLeads > 0 ? Math.round(((wonLeads + appointments.length) / Math.max(totalLeads, 1)) * 100) : 0;
  const avgDurationSec =
    totalCalls > 0
      ? Math.round(conversations.reduce((sum, c) => sum + (c.durationSeconds || 0), 0) / totalCalls)
      : 0;
  const positiveCount = sentiments.filter((s) => s.category === 'POSITIVE').length;
  const positiveSentimentPct = sentiments.length > 0 ? Math.round((positiveCount / sentiments.length) * 100) : 0;
  const aiSuccessRate = totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0;

  const leadDistribution = [
    { name: 'Hot', value: leads.filter((l) => l.classification === 'HOT').length, color: '#EF4444' },
    { name: 'Warm', value: leads.filter((l) => l.classification === 'WARM').length, color: '#F59E0B' },
    { name: 'Cold', value: leads.filter((l) => l.classification === 'COLD').length, color: '#06B6D4' },
  ];

  const pipelineStages = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'].map((stage) => ({
    stage,
    count: leads.filter((l) => l.stage === stage).length,
  }));

  res.json({
    metrics: {
      totalCalls,
      totalLeads,
      qualifiedLeads,
      conversionRate: Math.min(100, conversionRate),
      appointmentsBooked: appointments.length,
      avgCallDurationSeconds: avgDurationSec,
      positiveSentimentPct,
      aiSuccessRate,
    },
    leadDistribution,
    pipelineStages,
    recentActivities: activities,
    recentConversations: conversations.slice(0, 6).map((c) => {
      const cust = store.db.customers.find((cu) => cu.id === c.customerId);
      const sent = store.db.sentimentAnalyses.find((s) => s.conversationId === c.id);
      const lead = store.db.leads.find((l) => l.id === c.leadId);
      return {
        id: c.id,
        customerName: cust?.fullName || 'Anonymous Prospect',
        language: c.language,
        status: c.status,
        mode: c.mode,
        durationSeconds: c.durationSeconds,
        sentiment: sent?.category || 'NEUTRAL',
        leadScore: lead?.score ?? null,
        createdAt: c.createdAt,
      };
    }),
  });
});

router.get('/analytics', (req: AuthenticatedRequest, res) => {
  const orgId = req.user!.organizationId;
  const conversations = store.db.conversations.filter((c) => c.organizationId === orgId);
  const leads = store.db.leads.filter((l) => l.organizationId === orgId);
  const sentiments = store.db.sentimentAnalyses.filter((s) =>
    conversations.some((c) => c.id === s.conversationId)
  );
  const appointments = store.db.appointments.filter((a) => a.organizationId === orgId);

  const byLanguageMap = new Map<string, number>();
  for (const c of conversations) {
    byLanguageMap.set(c.language, (byLanguageMap.get(c.language) || 0) + 1);
  }
  const callsByLanguage = Array.from(byLanguageMap.entries()).map(([language, count]) => ({
    language,
    count,
  }));

  const sentimentDistribution = [
    { name: 'Positive', value: sentiments.filter((s) => s.category === 'POSITIVE').length },
    { name: 'Neutral', value: sentiments.filter((s) => s.category === 'NEUTRAL').length },
    { name: 'Negative', value: sentiments.filter((s) => s.category === 'NEGATIVE').length },
  ];

  // Group calls by date
  const dateMap = new Map<string, { date: string; calls: number; appointments: number }>();
  for (const c of conversations) {
    const d = c.createdAt.slice(0, 10);
    const cur = dateMap.get(d) || { date: d, calls: 0, appointments: 0 };
    cur.calls += 1;
    dateMap.set(d, cur);
  }
  for (const a of appointments) {
    const d = a.createdAt.slice(0, 10);
    const cur = dateMap.get(d) || { date: d, calls: 0, appointments: 0 };
    cur.appointments += 1;
    dateMap.set(d, cur);
  }
  const callVolumeTrend = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  const avgLeadScore =
    leads.length > 0 ? Math.round(leads.reduce((s, l) => s + l.score, 0) / leads.length) : 0;

  res.json({
    callsByLanguage,
    sentimentDistribution,
    callVolumeTrend,
    avgLeadScore,
    appointmentBookingRate:
      conversations.length > 0 ? Math.round((appointments.length / conversations.length) * 100) : 0,
    totalToolExecutions: store.db.toolExecutions.length,
    toolSuccessRate:
      store.db.toolExecutions.length > 0
        ? Math.round(
            (store.db.toolExecutions.filter((t) => t.status === 'SUCCESS').length /
              store.db.toolExecutions.length) *
              100
          )
        : 100,
  });
});

export default router;
