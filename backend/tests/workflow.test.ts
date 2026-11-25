import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { store } from '../src/db/store';
import { calculateLeadScore } from '../src/services/agents/leadScoring';

const app = createApp();

describe('VoxSales AI Backend & End-to-End Acceptance Tests', () => {
  let token = '';

  beforeEach(async () => {
    store.resetDemo();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@voxsales.ai', password: 'Demo@1234' });
    expect(res.status).toBe(200);
    token = res.body.token;
  });

  it('GET /api/health returns service status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('rejects unauthenticated access to protected routes', async () => {
    const res = await request(app).get('/api/leads');
    expect(res.status).toBe(401);
  });

  it('scores leads conservatively when fields are unknown', () => {
    const unknown = calculateLeadScore({});
    expect(unknown.total).toBeLessThan(40);
    expect(unknown.classification).toBe('COLD');

    const hot = calculateLeadScore({
      companySize: 50,
      budgetMonthlyInr: 15000,
      requirements: 'Project management with Gantt and Sprints',
      purchasingTimeline: 'This month',
      decisionAuthority: 'VP of Operations',
      requestedDemo: true,
      askedPricing: true,
    });
    expect(hot.total).toBeGreaterThanOrEqual(75);
    expect(hot.classification).toBe('HOT');
  });

  it('retrieves FlowStack pricing from RAG knowledge base', async () => {
    const res = await request(app)
      .post('/api/knowledge/search')
      .set('Authorization', `Bearer ${token}`)
      .send({ query: 'Growth-50 50 employees 15000 monthly price', topK: 3 });

    expect(res.status).toBe(200);
    expect(res.body.results.length).toBeGreaterThan(0);
    expect(res.body.results[0].title).toContain('FlowStack');
  });

  it('prevents double-booking of overlapping appointment slots', async () => {
    const slotsRes = await request(app)
      .get('/api/appointments/available-slots')
      .set('Authorization', `Bearer ${token}`);
    expect(slotsRes.status).toBe(200);
    const slot = slotsRes.body.slots[0];

    const first = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId: 'cust_priya',
        title: 'First Demo Booking',
        startTime: slot.startTime,
      });
    expect(first.status).toBe(201);

    const duplicate = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId: 'cust_arjun',
        title: 'Conflicting Demo Booking',
        startTime: slot.startTime,
      });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.code).toBe('DOUBLE_BOOKING');
  });

  it('executes full Rahul Sharma end-to-end sales voice workflow', async () => {
    // 1. Start conversation
    const startRes = await request(app)
      .post('/api/conversations')
      .set('Authorization', `Bearer ${token}`)
      .send({ language: 'en-IN', mode: 'DEMO', audioConsent: true });
    expect(startRes.status).toBe(201);
    const convId = startRes.body.conversation.id;

    // 2. Rahul states his requirements, team size, and budget
    const turn1 = await request(app)
      .post(`/api/conversations/${convId}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        content:
          "Hello, I'm Rahul Sharma and I'm looking for project management software for my company. We have around 50 employees and our budget is approximately ₹15,000 per month.",
        mode: 'DEMO',
      });

    expect(turn1.status).toBe(200);
    expect(turn1.body.lead).toBeTruthy();
    expect(turn1.body.lead.companySize).toBe(50);
    expect(turn1.body.lead.budgetMonthlyInr).toBe(15000);
    expect(turn1.body.sources.length).toBeGreaterThan(0);
    expect(turn1.body.sessionMemory.offeredSlots.length).toBeGreaterThan(0);

    // 3. Rahul confirms an available appointment
    const turn2 = await request(app)
      .post(`/api/conversations/${convId}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        content: 'Yes, please confirm the first slot for tomorrow. We want to roll out this month.',
        mode: 'DEMO',
      });

    expect(turn2.status).toBe(200);
    expect(turn2.body.appointment).toBeTruthy();
    expect(turn2.body.appointment.status).toBe('CONFIRMED');
    expect(turn2.body.lead.score).toBeGreaterThanOrEqual(70);

    // 4. Complete conversation -> triggers sentiment & call summary
    const completeRes = await request(app)
      .post(`/api/conversations/${convId}/complete`)
      .set('Authorization', `Bearer ${token}`)
      .send({ durationSeconds: 185 });

    expect(completeRes.status).toBe(200);
    expect(completeRes.body.sentiment.isAiGenerated).toBe(true);
    expect(completeRes.body.summary.customerOverview).toContain('Rahul Sharma');

    // 5. Verify CRM Lead, Conversation History, and Dashboard Metrics updated
    const leadsRes = await request(app)
      .get('/api/leads?search=Rahul')
      .set('Authorization', `Bearer ${token}`);
    expect(leadsRes.status).toBe(200);
    expect(leadsRes.body.leads.some((l: { customerName: string }) => l.customerName === 'Rahul Sharma')).toBe(true);

    const histRes = await request(app)
      .get(`/api/conversations/${convId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(histRes.status).toBe(200);
    expect(histRes.body.messages.length).toBeGreaterThanOrEqual(5);
    expect(histRes.body.toolExecutions.length).toBeGreaterThanOrEqual(4);
  });
});
