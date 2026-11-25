import { Router } from 'express';
import { z } from 'zod';
import { store } from '../db/store';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { createAppointmentRecord, getAvailableSlots } from '../services/appointments/appointmentService';

const router = Router();
router.use(requireAuth);

const createAptSchema = z.object({
  customerId: z.string(),
  leadId: z.string().optional().nullable(),
  title: z.string().min(3),
  type: z.enum(['PRODUCT_DEMO', 'SALES_CONSULTATION', 'FOLLOW_UP_CALL', 'TECHNICAL_DISCUSSION']).optional(),
  startTime: z.string(),
  endTime: z.string().optional(),
  notes: z.string().optional(),
});

const updateAptSchema = z.object({
  status: z.enum(['SCHEDULED', 'CONFIRMED', 'RESCHEDULED', 'CANCELLED', 'COMPLETED']).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  notes: z.string().optional(),
  title: z.string().optional(),
});

router.get('/available-slots', (req: AuthenticatedRequest, res, next) => {
  try {
    const dateStr = typeof req.query.date === 'string' ? req.query.date : undefined;
    const slots = getAvailableSlots(req.user!.organizationId, dateStr);
    res.json({ slots });
  } catch (err) {
    next(err);
  }
});

router.get('/', (req: AuthenticatedRequest, res) => {
  const orgId = req.user!.organizationId;
  const appointments = store.db.appointments
    .filter((a) => a.organizationId === orgId)
    .map((a) => {
      const customer = store.db.customers.find((c) => c.id === a.customerId);
      const rep = store.db.users.find((u) => u.id === a.assignedToId);
      return {
        ...a,
        customerName: customer?.fullName || 'Unknown',
        customerEmail: customer?.email || null,
        assignedToName: rep?.fullName || 'Sales Specialist',
      };
    });
  res.json({ appointments });
});

router.post('/', (req: AuthenticatedRequest, res, next) => {
  try {
    const data = createAptSchema.parse(req.body);
    const appointment = createAppointmentRecord({
      organizationId: req.user!.organizationId,
      customerId: data.customerId,
      leadId: data.leadId ?? null,
      assignedToId: req.user!.userId,
      title: data.title,
      type: data.type,
      startTime: data.startTime,
      endTime: data.endTime,
      notes: data.notes,
    });
    res.status(201).json({ appointment });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', (req: AuthenticatedRequest, res, next) => {
  try {
    const orgId = req.user!.organizationId;
    const apt = store.db.appointments.find((a) => a.id === req.params.id && a.organizationId === orgId);
    if (!apt) throw new AppError('Appointment not found.', 404);

    const data = updateAptSchema.parse(req.body);
    Object.assign(apt, data, { updatedAt: new Date().toISOString() });
    store.save();
    res.json({ appointment: apt });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', (req: AuthenticatedRequest, res, next) => {
  try {
    const orgId = req.user!.organizationId;
    const idx = store.db.appointments.findIndex((a) => a.id === req.params.id && a.organizationId === orgId);
    if (idx === -1) throw new AppError('Appointment not found.', 404);
    store.db.appointments.splice(idx, 1);
    store.save();
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

export default router;
