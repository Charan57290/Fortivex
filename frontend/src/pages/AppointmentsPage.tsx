import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, Plus, Clock, Video } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { StatusBadge } from '../components/ui/Badges';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../context/ToastContext';

interface AppointmentRow {
  id: string;
  title: string;
  customerName: string;
  assignedToName: string;
  type: string;
  status: string;
  startTime: string;
  endTime: string;
  meetingLink?: string;
}

export function AppointmentsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [title, setTitle] = useState('Product Demonstration');
  const [type, setType] = useState('PRODUCT_DEMO');
  const [selectedSlot, setSelectedSlot] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => apiRequest<{ appointments: AppointmentRow[] }>('/appointments'),
  });

  const { data: slotsData } = useQuery({
    queryKey: ['available-slots'],
    queryFn: () =>
      apiRequest<{ slots: Array<{ startTime: string; label: string }> }>('/appointments/available-slots'),
  });

  const { data: custData } = useQuery({
    queryKey: ['customers-for-apt'],
    queryFn: () => apiRequest<{ customers: Array<{ id: string; fullName: string }> }>('/customers'),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiRequest('/appointments', {
        method: 'POST',
        body: JSON.stringify({
          customerId,
          title,
          type,
          startTime: selectedSlot,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['available-slots'] });
      toast({ title: 'Appointment scheduled', type: 'success' });
      setModalOpen(false);
    },
    onError: (err) => {
      toast({
        title: 'Booking failed',
        description: err instanceof Error ? err.message : 'Unable to book slot',
        type: 'error',
      });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest(`/appointments/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast({ title: 'Appointment updated', type: 'success' });
    },
  });

  const appointments = data?.appointments || [];
  const slots = slotsData?.slots || [];
  const customers = custData?.customers || [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Appointments</h1>
          <p className="text-sm text-[#94A3B8]">
            Manage product demos & consultations with automated double-booking prevention.
          </p>
        </div>
        <button
          onClick={() => {
            if (customers[0] && !customerId) setCustomerId(customers[0].id);
            if (slots[0] && !selectedSlot) setSelectedSlot(slots[0].startTime);
            setModalOpen(true);
          }}
          className="px-3.5 py-2 rounded-lg bg-[#6366F1] hover:bg-indigo-500 text-white text-xs font-medium inline-flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Schedule Appointment
        </button>
      </div>

      {/* Available Slots Strip */}
      <div className="enterprise-card p-4">
        <div className="flex items-center gap-2 text-xs font-semibold mb-2.5">
          <Clock className="w-3.5 h-3.5 text-[#06B6D4]" />
          <span>Next Available Demo Slots</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {slots.map((s) => (
            <span
              key={s.startTime}
              className="px-2.5 py-1 rounded-md bg-[#090D16] border border-slate-800 text-xs text-slate-300"
            >
              {s.label}
            </span>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="enterprise-card p-8 text-center text-sm text-[#94A3B8]">Loading appointments...</div>
      ) : appointments.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No appointments scheduled"
          description="Book a demo manually or let the AI Voice Agent schedule one during a call."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {appointments.map((apt) => (
            <div key={apt.id} className="enterprise-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold">{apt.title}</h3>
                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    {apt.customerName} • Rep: {apt.assignedToName}
                  </p>
                </div>
                <StatusBadge value={apt.status} />
              </div>

              <div className="text-xs text-slate-300 flex items-center gap-4">
                <span>{new Date(apt.startTime).toLocaleString('en-IN')}</span>
                <span className="text-[#94A3B8]">{apt.type.replace(/_/g, ' ')}</span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/70 text-xs">
                {apt.meetingLink ? (
                  <span className="inline-flex items-center gap-1 text-[#06B6D4] font-mono text-[11px]">
                    <Video className="w-3.5 h-3.5" />
                    {apt.meetingLink}
                  </span>
                ) : (
                  <span />
                )}
                <div className="flex gap-2">
                  {apt.status !== 'CANCELLED' && apt.status !== 'COMPLETED' && (
                    <>
                      <button
                        onClick={() => statusMutation.mutate({ id: apt.id, status: 'COMPLETED' })}
                        className="px-2.5 py-1 rounded bg-[#22C55E]/15 text-[#22C55E] hover:bg-[#22C55E]/25"
                      >
                        Complete
                      </button>
                      <button
                        onClick={() => statusMutation.mutate({ id: apt.id, status: 'CANCELLED' })}
                        className="px-2.5 py-1 rounded bg-[#EF4444]/15 text-[#EF4444] hover:bg-[#EF4444]/25"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="enterprise-card max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-semibold">Schedule Appointment</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate();
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-[#94A3B8] mb-1">Customer</label>
                <select
                  required
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#090D16] border border-slate-800"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[#94A3B8] mb-1">Title</label>
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#090D16] border border-slate-800"
                />
              </div>
              <div>
                <label className="block text-[#94A3B8] mb-1">Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#090D16] border border-slate-800"
                >
                  <option value="PRODUCT_DEMO">Product Demonstration</option>
                  <option value="SALES_CONSULTATION">Sales Consultation</option>
                  <option value="FOLLOW_UP_CALL">Follow-up Call</option>
                  <option value="TECHNICAL_DISCUSSION">Technical Discussion</option>
                </select>
              </div>
              <div>
                <label className="block text-[#94A3B8] mb-1">Available Slot</label>
                <select
                  required
                  value={selectedSlot}
                  onChange={(e) => setSelectedSlot(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#090D16] border border-slate-800"
                >
                  {slots.map((s) => (
                    <option key={s.startTime} value={s.startTime}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg border border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#6366F1] text-white font-medium"
                >
                  Confirm Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
