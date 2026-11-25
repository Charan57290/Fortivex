import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Search, Trash2, Info, Target } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { ClassificationBadge, SentimentBadge, StatusBadge } from '../components/ui/Badges';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../context/ToastContext';

interface LeadRow {
  id: string;
  title: string;
  customerName: string;
  customerEmail?: string;
  companyName?: string;
  companySize?: number;
  budgetText?: string;
  recommendedPlan?: string;
  score: number;
  classification: 'HOT' | 'WARM' | 'COLD';
  stage: string;
  sentiment: string;
  scoreBreakdown?: {
    purchaseIntent: { score: number; max: number; reason: string };
    budgetFit: { score: number; max: number; reason: string };
    urgency: { score: number; max: number; reason: string };
    requirementFit: { score: number; max: number; reason: string };
    decisionAuthority: { score: number; max: number; reason: string };
    summary: string;
  };
  createdAt: string;
}

export function LeadsPage() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [classification, setClassification] = useState('');
  const [selectedLead, setSelectedLead] = useState<LeadRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LeadRow | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['leads', search, classification],
    queryFn: () =>
      apiRequest<{ leads: LeadRow[] }>(
        `/leads?search=${encodeURIComponent(search)}&classification=${encodeURIComponent(classification)}`
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/leads/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({ title: 'Lead deleted', type: 'success' });
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast({
        title: 'Failed to delete lead',
        description: err instanceof Error ? err.message : 'Error',
        type: 'error',
      });
    },
  });

  const handleExportCsv = async () => {
    const token = localStorage.getItem('voxsales_token');
    const res = await fetch('/api/leads/export/csv', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const text = await res.text();
    const blob = new Blob([text], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'voxsales-leads.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const leads = data?.leads || [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lead Intelligence</h1>
          <p className="text-sm text-[#94A3B8]">
            Transparent 0–100 lead scoring, Hot/Warm/Cold classification, and qualification factors.
          </p>
        </div>
        <button
          onClick={handleExportCsv}
          className="px-3.5 py-2 rounded-lg bg-[#151D2C] border border-slate-800 hover:border-slate-700 text-xs font-medium inline-flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5 text-[#06B6D4]" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="enterprise-card p-3.5 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer, title, or company..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#090D16] border border-slate-800 text-xs focus:outline-none focus:border-[#6366F1]"
          />
        </div>
        <select
          value={classification}
          onChange={(e) => setClassification(e.target.value)}
          className="px-3 py-2 rounded-lg bg-[#090D16] border border-slate-800 text-xs"
        >
          <option value="">All Classifications</option>
          <option value="HOT">Hot (75–100)</option>
          <option value="WARM">Warm (40–74)</option>
          <option value="COLD">Cold (0–39)</option>
        </select>
      </div>

      {isLoading ? (
        <div className="enterprise-card p-8 text-center text-sm text-[#94A3B8]">Loading leads...</div>
      ) : leads.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No leads match your filters"
          description="Try clearing your search filter or start a new AI Voice Agent call to qualify a lead."
        />
      ) : (
        <div className="enterprise-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-[#090D16]/40 text-[#94A3B8]">
                  <th className="p-3.5 font-medium">Lead / Customer</th>
                  <th className="p-3.5 font-medium">Size & Budget</th>
                  <th className="p-3.5 font-medium">Score</th>
                  <th className="p-3.5 font-medium">Class</th>
                  <th className="p-3.5 font-medium">Stage</th>
                  <th className="p-3.5 font-medium">Sentiment</th>
                  <th className="p-3.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {leads.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-800/30">
                    <td className="p-3.5">
                      <div className="font-medium text-slate-100">{l.customerName}</div>
                      <div className="text-[11px] text-[#94A3B8]">{l.title}</div>
                    </td>
                    <td className="p-3.5 text-[#94A3B8]">
                      <div>{l.companySize ? `${l.companySize} seats` : 'Size unknown'}</div>
                      <div>{l.budgetText || 'Budget unknown'}</div>
                    </td>
                    <td className="p-3.5 font-mono font-semibold text-sm">{l.score}/100</td>
                    <td className="p-3.5">
                      <ClassificationBadge value={l.classification} />
                    </td>
                    <td className="p-3.5">
                      <StatusBadge value={l.stage} />
                    </td>
                    <td className="p-3.5">
                      <SentimentBadge value={l.sentiment} />
                    </td>
                    <td className="p-3.5 text-right space-x-2">
                      <button
                        onClick={() => setSelectedLead(l)}
                        className="p-1.5 rounded-lg bg-[#090D16] border border-slate-800 hover:border-[#6366F1] text-[#06B6D4]"
                        title="View score breakdown"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(l)}
                        className="p-1.5 rounded-lg bg-[#090D16] border border-slate-800 hover:border-[#EF4444] text-[#EF4444]"
                        title="Delete lead"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Score Breakdown Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="enterprise-card max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold">{selectedLead.customerName} — Score Breakdown</h3>
                <p className="text-xs text-[#94A3B8] mt-0.5">{selectedLead.recommendedPlan}</p>
              </div>
              <ClassificationBadge value={selectedLead.classification} />
            </div>

            {selectedLead.scoreBreakdown ? (
              <div className="space-y-2.5 text-xs">
                {[
                  { label: 'Purchase Intent', item: selectedLead.scoreBreakdown.purchaseIntent },
                  { label: 'Budget Fit', item: selectedLead.scoreBreakdown.budgetFit },
                  { label: 'Urgency / Timeline', item: selectedLead.scoreBreakdown.urgency },
                  { label: 'Requirement Fit', item: selectedLead.scoreBreakdown.requirementFit },
                  { label: 'Decision Authority', item: selectedLead.scoreBreakdown.decisionAuthority },
                ].map(({ label, item }) => (
                  <div key={label} className="p-2.5 rounded-lg bg-[#090D16] border border-slate-800">
                    <div className="flex justify-between font-medium">
                      <span>{label}</span>
                      <span className="font-mono text-[#6366F1]">
                        {item.score} / {item.max}
                      </span>
                    </div>
                    <p className="text-[#94A3B8] mt-1">{item.reason}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#94A3B8]">Detailed breakdown not recorded for this lead.</p>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLead(null)}
                className="px-4 py-2 rounded-lg bg-[#6366F1] text-white text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Lead"
        description={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmLabel="Delete Lead"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
