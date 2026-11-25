import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';
import { ClassificationBadge } from '../components/ui/Badges';
import { useToast } from '../context/ToastContext';

const STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'] as const;

interface PipelineLead {
  id: string;
  title: string;
  customerName: string;
  budgetText?: string;
  score: number;
  classification: string;
  stage: string;
}

export function PipelinePage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['leads-pipeline'],
    queryFn: () => apiRequest<{ leads: PipelineLead[] }>('/leads'),
  });

  const stageMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) =>
      apiRequest(`/leads/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ stage }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads-pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
      toast({ title: 'Pipeline stage updated', type: 'success' });
    },
  });

  const leads = data?.leads || [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">CRM Sales Pipeline</h1>
        <p className="text-sm text-[#94A3B8]">
          Track and advance deals from initial AI voice contact through Won/Lost.
        </p>
      </div>

      {isLoading ? (
        <div className="enterprise-card p-8 text-center text-sm text-[#94A3B8]">Loading pipeline...</div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const stageLeads = leads.filter((l) => l.stage === stage);
            return (
              <div
                key={stage}
                className="w-64 shrink-0 enterprise-card p-3 flex flex-col gap-3 bg-[#111827]"
              >
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-semibold tracking-wide text-slate-200">{stage}</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[11px] font-mono text-[#94A3B8]">
                    {stageLeads.length}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {stageLeads.length === 0 ? (
                    <div className="p-4 rounded-lg border border-dashed border-slate-800 text-center text-[11px] text-[#94A3B8]">
                      No leads
                    </div>
                  ) : (
                    stageLeads.map((l) => (
                      <div key={l.id} className="p-3 rounded-lg bg-[#151D2C] border border-slate-800 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-xs font-semibold text-slate-100 leading-snug">
                            {l.customerName}
                          </div>
                          <ClassificationBadge value={l.classification} />
                        </div>
                        <p className="text-[11px] text-[#94A3B8] line-clamp-2">{l.title}</p>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-[#06B6D4]">{l.budgetText || 'Budget TBD'}</span>
                          <span className="font-mono">{l.score}/100</span>
                        </div>
                        <select
                          value={l.stage}
                          onChange={(e) => stageMutation.mutate({ id: l.id, stage: e.target.value })}
                          className="w-full px-2 py-1 rounded bg-[#090D16] border border-slate-800 text-[11px] text-slate-300"
                        >
                          {STAGES.map((s) => (
                            <option key={s} value={s}>
                              Move to {s}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
