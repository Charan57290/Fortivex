import { Router } from 'express';
import { z } from 'zod';
import { store } from '../db/store';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { Customer } from '../types/domain';

const router = Router();
router.use(requireAuth);

const customerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  companyName: z.string().optional().nullable(),
  preferredLang: z.string().default('en-IN'),
  jobTitle: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  consentRecorded: z.boolean().optional(),
});

router.get('/', (req: AuthenticatedRequest, res) => {
  const orgId = req.user!.organizationId;
  const search = typeof req.query.search === 'string' ? req.query.search.toLowerCase() : '';
  const customers = store.db.customers
    .filter((c) => c.organizationId === orgId)
    .filter(
      (c) =>
        !search ||
        c.fullName.toLowerCase().includes(search) ||
        (c.email && c.email.toLowerCase().includes(search)) ||
        (c.phone && c.phone.includes(search))
    )
    .map((c) => ({
      ...c,
      company: store.db.companies.find((co) => co.id === c.companyId) || null,
      leadCount: store.db.leads.filter((l) => l.customerId === c.id).length,
      conversationCount: store.db.conversations.filter((cv) => cv.customerId === c.id).length,
    }));

  res.json({ customers });
});

router.post('/', (req: AuthenticatedRequest, res, next) => {
  try {
    const data = customerSchema.parse(req.body);
    const orgId = req.user!.organizationId;
    const now = new Date().toISOString();

    let companyId: string | null = null;
    if (data.companyName) {
      let comp = store.db.companies.find(
        (co) => co.organizationId === orgId && co.name.toLowerCase() === data.companyName!.toLowerCase()
      );
      if (!comp) {
        comp = {
          id: store.newId('comp'),
          organizationId: orgId,
          name: data.companyName.trim(),
          createdAt: now,
          updatedAt: now,
        };
        store.db.companies.unshift(comp);
      }
      companyId = comp.id;
    }

    const customer: Customer = {
      id: store.newId('cust'),
      organizationId: orgId,
      companyId,
      fullName: data.fullName.trim(),
      email: data.email ?? null,
      phone: data.phone ?? null,
      preferredLang: data.preferredLang,
      jobTitle: data.jobTitle ?? null,
      notes: data.notes ?? null,
      consentRecorded: Boolean(data.consentRecorded),
      createdAt: now,
      updatedAt: now,
    };

    store.db.customers.unshift(customer);
    store.save();
    res.status(201).json({ customer });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', (req: AuthenticatedRequest, res, next) => {
  try {
    const orgId = req.user!.organizationId;
    const customer = store.db.customers.find((c) => c.id === req.params.id && c.organizationId === orgId);
    if (!customer) throw new AppError('Customer not found.', 404);

    res.json({
      customer,
      company: store.db.companies.find((co) => co.id === customer.companyId) || null,
      leads: store.db.leads.filter((l) => l.customerId === customer.id),
      conversations: store.db.conversations.filter((cv) => cv.customerId === customer.id),
      appointments: store.db.appointments.filter((a) => a.customerId === customer.id),
      activities: store.db.salesActivities.filter((ac) => ac.customerId === customer.id),
    });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', (req: AuthenticatedRequest, res, next) => {
  try {
    const orgId = req.user!.organizationId;
    const customer = store.db.customers.find((c) => c.id === req.params.id && c.organizationId === orgId);
    if (!customer) throw new AppError('Customer not found.', 404);

    const data = customerSchema.partial().parse(req.body);
    Object.assign(customer, data, { updatedAt: new Date().toISOString() });
    store.save();
    res.json({ customer });
  } catch (err) {
    next(err);
  }
});

export default router;
