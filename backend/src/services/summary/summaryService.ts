import { store } from '../../db/store';
import { CallSummary, Conversation, SentimentAnalysis } from '../../types/domain';

export function generateAndSaveCallSummary(params: {
  conversation: Conversation;
  sentiment: SentimentAnalysis;
}): CallSummary {
  const { conversation, sentiment } = params;
  const customer = conversation.customerId
    ? store.db.customers.find((c) => c.id === conversation.customerId)
    : undefined;
  const lead = conversation.leadId
    ? store.db.leads.find((l) => l.id === conversation.leadId)
    : undefined;
  const appointment = store.db.appointments.find(
    (a) =>
      a.organizationId === conversation.organizationId &&
      ((lead && a.leadId === lead.id) || (customer && a.customerId === customer.id)) &&
      a.status !== 'CANCELLED'
  );

  const mem = (conversation.sessionMemory || {}) as Record<string, unknown>;
  const reqList: string[] = [];
  if (lead?.requirements) reqList.push(lead.requirements);
  if (Array.isArray(mem.requirements)) {
    for (const r of mem.requirements) {
      if (typeof r === 'string' && !reqList.includes(r)) reqList.push(r);
    }
  }
  if (reqList.length === 0) reqList.push('General project management software evaluation');

  const productsDiscussed = [
    lead?.recommendedPlan || lead?.productInterest || 'FlowStack Project Management Platform',
  ];

  const followUpActions: string[] = [];
  if (appointment) {
    followUpActions.push(`Prepare tailored demo for ${new Date(appointment.startTime).toLocaleString('en-IN')}`);
  } else {
    followUpActions.push('Follow up with customer to schedule a 30-min product demo');
  }
  if (lead?.budgetMonthlyInr) {
    followUpActions.push(`Send commercial quote aligned with ₹${lead.budgetMonthlyInr.toLocaleString('en-IN')}/mo budget`);
  }

  const now = new Date().toISOString();
  const existingIdx = store.db.callSummaries.findIndex((s) => s.conversationId === conversation.id);

  const summary: CallSummary = {
    id: existingIdx >= 0 ? store.db.callSummaries[existingIdx].id : store.newId('sum'),
    conversationId: conversation.id,
    customerOverview: `${customer?.fullName || 'Prospective Customer'}${lead?.companySize ? ` (${lead.companySize} employees)` : ''} contacted FlowStack via AI Voice Agent.`,
    mainRequirements: reqList,
    productsDiscussed,
    budgetInfo: lead?.budgetText || (mem.budget as string) || 'Not disclosed',
    purchaseIntent:
      lead?.classification === 'HOT'
        ? 'High — ready for product demonstration and pricing review'
        : lead?.classification === 'WARM'
          ? 'Moderate — actively evaluating solution fit'
          : 'Early exploratory stage',
    objections: sentiment.concerns,
    sentiment: sentiment.category,
    leadScore: lead?.score ?? 25,
    qualificationStatus: lead?.classification ?? 'COLD',
    appointmentDetails: appointment
      ? `${appointment.title} (${appointment.status}) at ${new Date(appointment.startTime).toLocaleString('en-IN')}`
      : 'No appointment booked yet',
    followUpActions,
    recommendedNextStep: sentiment.recommendedNextAction,
    createdAt: existingIdx >= 0 ? store.db.callSummaries[existingIdx].createdAt : now,
    updatedAt: now,
  };

  if (existingIdx >= 0) {
    store.db.callSummaries[existingIdx] = summary;
  } else {
    store.db.callSummaries.unshift(summary);
  }

  store.db.salesActivities.unshift({
    id: store.newId('act'),
    organizationId: conversation.organizationId,
    customerId: conversation.customerId ?? null,
    leadId: conversation.leadId ?? null,
    activityType: 'CALL_COMPLETED',
    title: `Call completed with ${customer?.fullName || 'Prospect'}`,
    description: `Lead Score: ${summary.leadScore}/100 (${summary.qualificationStatus}) • Sentiment: ${summary.sentiment}`,
    createdAt: now,
  });

  store.save();
  return summary;
}
