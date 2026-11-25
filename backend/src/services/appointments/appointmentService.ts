import { store } from '../../db/store';
import { Appointment, AppointmentStatus, AppointmentType } from '../../types/domain';
import { AppError } from '../../middleware/errorHandler';

export interface CalendarProviderAdapter {
  readonly name: string;
  syncAppointment(appointment: Appointment): Promise<{ externalEventId?: string }>;
}

export class InternalCalendarAdapter implements CalendarProviderAdapter {
  public readonly name = 'internal-calendar';
  async syncAppointment(): Promise<{ externalEventId?: string }> {
    return {};
  }
}

export function getAvailableSlots(organizationId: string, dateStr?: string): Array<{ startTime: string; endTime: string; label: string }> {
  const baseDate = dateStr ? new Date(dateStr) : new Date(Date.now() + 24 * 3600 * 1000);
  if (isNaN(baseDate.getTime())) {
    throw new AppError('Invalid date format for available slots.', 400);
  }

  const candidateHours = [10, 11, 14, 15, 16, 17];
  const existing = store.db.appointments.filter(
    (a) => a.organizationId === organizationId && a.status !== 'CANCELLED'
  );

  const slots: Array<{ startTime: string; endTime: string; label: string }> = [];
  for (const hour of candidateHours) {
    const start = new Date(baseDate);
    start.setHours(hour, 0, 0, 0);
    const end = new Date(start.getTime() + 30 * 60 * 1000);

    const hasConflict = existing.some((apt) => {
      const aStart = new Date(apt.startTime).getTime();
      const aEnd = new Date(apt.endTime).getTime();
      return start.getTime() < aEnd && end.getTime() > aStart;
    });

    if (!hasConflict) {
      slots.push({
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        label: start.toLocaleString('en-IN', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }),
      });
    }
  }
  return slots;
}

export function createAppointmentRecord(params: {
  organizationId: string;
  customerId: string;
  leadId?: string | null;
  assignedToId?: string | null;
  title: string;
  type?: AppointmentType;
  startTime: string;
  endTime?: string;
  notes?: string;
  isDemo?: boolean;
}): Appointment {
  const start = new Date(params.startTime);
  if (isNaN(start.getTime())) {
    throw new AppError('Invalid appointment start time.', 400);
  }
  const end = params.endTime
    ? new Date(params.endTime)
    : new Date(start.getTime() + 30 * 60 * 1000);

  if (end <= start) {
    throw new AppError('Appointment end time must be after start time.', 400);
  }

  // Prevent double booking within the organization
  const conflict = store.db.appointments.find((apt) => {
    if (apt.organizationId !== params.organizationId || apt.status === 'CANCELLED') return false;
    const aStart = new Date(apt.startTime).getTime();
    const aEnd = new Date(apt.endTime).getTime();
    return start.getTime() < aEnd && end.getTime() > aStart;
  });

  if (conflict) {
    throw new AppError(
      `Time slot conflicts with an existing appointment (${conflict.title}). Please choose another slot.`,
      409,
      'DOUBLE_BOOKING'
    );
  }

  const now = new Date().toISOString();
  const appointment: Appointment = {
    id: store.newId('apt'),
    organizationId: params.organizationId,
    customerId: params.customerId,
    leadId: params.leadId ?? null,
    assignedToId: params.assignedToId ?? 'usr_manager',
    title: params.title,
    type: params.type ?? 'PRODUCT_DEMO',
    status: 'CONFIRMED' as AppointmentStatus,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    notes: params.notes ?? null,
    meetingLink: `https://meet.voxsales.ai/${store.newId('room')}`,
    isDemo: params.isDemo ?? false,
    createdAt: now,
    updatedAt: now,
  };

  store.db.appointments.unshift(appointment);
  store.db.salesActivities.unshift({
    id: store.newId('act'),
    organizationId: params.organizationId,
    customerId: params.customerId,
    leadId: params.leadId ?? null,
    userId: params.assignedToId ?? null,
    activityType: 'APPOINTMENT_BOOKED',
    title: `Appointment booked: ${appointment.title}`,
    description: `Scheduled for ${start.toLocaleString('en-IN')}`,
    createdAt: now,
  });
  store.save();
  return appointment;
}
