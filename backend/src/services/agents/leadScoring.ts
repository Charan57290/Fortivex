import { LeadClassification, ScoreBreakdown } from '../../types/domain';

export interface LeadScoringInput {
  companySize?: number | null;
  budgetMonthlyInr?: number | null;
  budgetText?: string | null;
  requirements?: string | null;
  purchasingTimeline?: string | null;
  decisionAuthority?: string | null;
  requestedDemo?: boolean;
  askedPricing?: boolean;
  hotThreshold?: number;
  warmThreshold?: number;
}

/**
 * Deterministic, explainable Lead Qualification Scoring Engine (0–100).
 * Conservative by design: unknown fields receive minimal baseline points rather than guessed scores.
 */
export function calculateLeadScore(input: LeadScoringInput): ScoreBreakdown {
  const hotThreshold = input.hotThreshold ?? 75;
  const warmThreshold = input.warmThreshold ?? 40;

  // 1. Purchase Intent (max 30)
  let intentScore = 6;
  let intentReason = 'Initial inquiry; purchase intent not yet confirmed.';
  if (input.requestedDemo) {
    intentScore = 28;
    intentReason = 'Customer confirmed or requested a product demonstration (strong buying signal).';
  } else if (input.askedPricing && input.requirements) {
    intentScore = 22;
    intentReason = 'Asked specific pricing/plan questions alongside concrete requirements.';
  } else if (input.requirements || input.askedPricing) {
    intentScore = 15;
    intentReason = 'Shared product interest or requirements; evaluating options.';
  }

  // 2. Budget Fit (max 20)
  let budgetScore = 4;
  let budgetReason = 'Budget unknown (scored conservatively).';
  if (typeof input.budgetMonthlyInr === 'number' && input.budgetMonthlyInr > 0) {
    if (input.budgetMonthlyInr >= 15000) {
      budgetScore = 19;
      budgetReason = `Confirmed monthly budget (₹${input.budgetMonthlyInr.toLocaleString('en-IN')}) fits Growth/Enterprise plans.`;
    } else if (input.budgetMonthlyInr >= 5000) {
      budgetScore = 14;
      budgetReason = `Monthly budget (₹${input.budgetMonthlyInr.toLocaleString('en-IN')}) fits Starter/Growth tiers.`;
    } else {
      budgetScore = 8;
      budgetReason = `Limited monthly budget (₹${input.budgetMonthlyInr.toLocaleString('en-IN')}); suitable for Starter plan.`;
    }
  } else if (input.budgetText && input.budgetText.trim().length > 0) {
    budgetScore = 10;
    budgetReason = `Budget mentioned (${input.budgetText}); exact monthly figure pending.`;
  }

  // 3. Urgency / Timeline (max 20)
  let urgencyScore = 4;
  let urgencyReason = 'Purchasing timeline unknown (scored conservatively).';
  const tl = (input.purchasingTimeline || '').toLowerCase();
  if (tl.includes('immediate') || tl.includes('this week') || tl.includes('this month') || tl.includes('asap') || tl.includes('tomorrow')) {
    urgencyScore = 18;
    urgencyReason = `Immediate timeline (${input.purchasingTimeline}).`;
  } else if (tl.includes('next month') || tl.includes('quarter') || tl.includes('week')) {
    urgencyScore = 12;
    urgencyReason = `Near-term timeline (${input.purchasingTimeline}).`;
  } else if (input.requestedDemo) {
    urgencyScore = 15;
    urgencyReason = 'Booking an active demo indicates near-term evaluation urgency.';
  }

  // 4. Business Requirement Fit (max 15)
  let reqScore = 3;
  let reqReason = 'Specific business requirements not yet captured.';
  if (input.requirements && input.companySize && input.companySize >= 20) {
    reqScore = 14;
    reqReason = `Strong mid-market/enterprise fit (${input.companySize} employees) with clear software requirements.`;
  } else if (input.requirements || (input.companySize && input.companySize >= 10)) {
    reqScore = 10;
    reqReason = 'Moderate requirement fit for FlowStack project management.';
  }

  // 5. Decision-Making Authority (max 15)
  let authScore = 4;
  let authReason = 'Decision-making authority unknown (scored conservatively).';
  const auth = (input.decisionAuthority || '').toLowerCase();
  if (
    auth.includes('ceo') ||
    auth.includes('founder') ||
    auth.includes('vp') ||
    auth.includes('director') ||
    auth.includes('head') ||
    auth.includes('decision maker') ||
    auth.includes('cto')
  ) {
    authScore = 14;
    authReason = `Confirmed key decision maker (${input.decisionAuthority}).`;
  } else if (auth.includes('manager') || auth.includes('lead') || auth.includes('influencer')) {
    authScore = 10;
    authReason = `Team lead / evaluator (${input.decisionAuthority}).`;
  }

  const total = Math.min(100, intentScore + budgetScore + urgencyScore + reqScore + authScore);
  let classification: LeadClassification = 'COLD';
  if (total >= hotThreshold) classification = 'HOT';
  else if (total >= warmThreshold) classification = 'WARM';

  return {
    purchaseIntent: { score: intentScore, max: 30, reason: intentReason },
    budgetFit: { score: budgetScore, max: 20, reason: budgetReason },
    urgency: { score: urgencyScore, max: 20, reason: urgencyReason },
    requirementFit: { score: reqScore, max: 15, reason: reqReason },
    decisionAuthority: { score: authScore, max: 15, reason: authReason },
    total,
    classification,
    summary: `Scored ${total}/100 (${classification}): ${intentReason} ${budgetReason}`,
  };
}

export function recommendPlanForLead(companySize?: number | null, budgetMonthlyInr?: number | null): string {
  if (companySize && companySize > 100) {
    return 'Enterprise Plan (₹899/user/month or custom 100+ seat volume bundle)';
  }
  if ((companySize && companySize >= 20) || (budgetMonthlyInr && budgetMonthlyInr >= 12000)) {
    return 'Growth-50 Mid-Market Bundle (₹15,000/month flat up to 50 seats, annual billing)';
  }
  return 'Starter Plan (₹299/user/month, up to 15 users)';
}
