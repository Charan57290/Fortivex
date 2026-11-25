import React from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserCheck, ArrowUpRight } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { StatusBadge } from '../components/ui/Badges';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../context/ToastContext';

interface HandoffRow {
  id: string;
  conversationId: string;
  customerName: string;
  assignedToName: string;
  reason: string;
  summary?: string;
  status: string;
  priority: string;
  createdAt: string;
}

export function HandoffsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['handoffs'],
    queryFn: () => apiRequest<{ handoffs: HandoffRow[] }>('/agent/handoffs'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest(`/agent/handoffs/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handoffs'] });
      toast({ title: 'Handoff status updated', type: 'success' });
    },
  });

  const handoffs = data?.handoffs || [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Human Handoff Queue</h1>
        <p className="text-sm text-[#94A3B8]">
          Escalations triggered when customers request a human rep, express frustration, or need custom legal/SLA terms.
        </p>
      </div>

      {isLoading ? (
        <div className="enterprise-card p-8 text-center text-sm text-[#94A3B8]">Loading handoff queue...</div>
      ) : handoffs.length === 0 ? (
        <EmptyState
          icon={UserCheck}
          title="No escalations in queue"
          description="The AI Voice Agent will automatically create a handoff record when human intervention is needed."
        />
      ) : (
        <div className="space-y-3">
          {handoffs.map((h) => (
            <div key={h.id} className="enterprise-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{h.customerName}</span>
                  <StatusBadge value={h.status} />
                  <span className="px-2 py-0.5 rounded bg-[#EF4444]/15 text-[#EF4444] text-[10px] font-semibold">
                    {h.priority}
                  </span>
                </div>
                <p className="text-xs text-slate-200">{h.reason}</p>
                {h.summary && <p className="text-xs text-[#94A3B8]">{h.summary}</p>}
                <div className="text-[11px] text-[#94A3B8] flex items-center gap-3 pt-1">
                  <span>Assigned: {h.assignedToName}</span>
                  <Link
                    to={`/conversations/${h.conversationId}`}
                    className="text-[#6366F1] hover:underline inline-flex items-center gap-0.5"
                  >
                    Inspect Call <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={h.status}
                  onChange={(e) => updateMutation.mutate({ id: h.id, status: e.target.value })}
                  className="px-3 py-1.5 rounded-lg bg-[#090D16] border border-slate-800 text-xs"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="ASSIGNED">ASSIGNED</option>
                  <option value="IN_PROGRESS">IN PROGRESS</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="DISMISSED">DISMISSED</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
