import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, Cpu, Bot } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { StatusBadge } from '../components/ui/Badges';
import { useToast } from '../context/ToastContext';

interface AgentConfig {
  agentName: string;
  companyName: string;
  personality: string;
  greetingMessage: string;
  salesTone: string;
  businessHours: string;
  hotThreshold: number;
  warmThreshold: number;
  escalationRules: string;
}

export function AgentStudioPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['agent-config'],
    queryFn: () => apiRequest<{ config: AgentConfig | null }>('/agent/config'),
  });

  const { data: logsData } = useQuery({
    queryKey: ['agent-tool-logs'],
    queryFn: () =>
      apiRequest<{
        logs: Array<{
          id: string;
          toolName: string;
          status: string;
          durationMs: number;
          executedAt: string;
        }>;
      }>('/agent/tool-logs'),
  });

  const [form, setForm] = useState<AgentConfig>({
    agentName: 'Aria',
    companyName: 'FlowStack',
    personality: '',
    greetingMessage: '',
    salesTone: 'Professional & Consultative',
    businessHours: 'Mon-Fri 09:00 AM - 07:00 PM IST',
    hotThreshold: 75,
    warmThreshold: 40,
    escalationRules: '',
  });

  useEffect(() => {
    if (data?.config) setForm(data.config);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiRequest('/agent/config', {
        method: 'PUT',
        body: JSON.stringify(form),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-config'] });
      toast({ title: 'Agent configuration saved', description: 'Changes apply to new conversations immediately.', type: 'success' });
    },
    onError: (err) => {
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Admin or Manager role required',
        type: 'error',
      });
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agent Studio</h1>
          <p className="text-sm text-[#94A3B8]">
            Configure AI persona, lead qualification thresholds, escalation rules, and inspect tool execution logs.
          </p>
        </div>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="px-4 py-2 rounded-lg bg-[#6366F1] hover:bg-indigo-500 text-white text-xs font-medium inline-flex items-center gap-1.5"
        >
          <Save className="w-3.5 h-3.5" />
          {saveMutation.isPending ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="enterprise-card p-5 lg:col-span-2 space-y-4 text-xs">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Bot className="w-4 h-4 text-[#6366F1]" />
            <span>Autonomous Agent Behavior</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#94A3B8] mb-1">Agent Name</label>
              <input
                value={form.agentName}
                onChange={(e) => setForm({ ...form, agentName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[#090D16] border border-slate-800"
              />
            </div>
            <div>
              <label className="block text-[#94A3B8] mb-1">Company Name</label>
              <input
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[#090D16] border border-slate-800"
              />
            </div>
            <div>
              <label className="block text-[#94A3B8] mb-1">Sales Tone</label>
              <input
                value={form.salesTone}
                onChange={(e) => setForm({ ...form, salesTone: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[#090D16] border border-slate-800"
              />
            </div>
            <div>
              <label className="block text-[#94A3B8] mb-1">Business Hours</label>
              <input
                value={form.businessHours}
                onChange={(e) => setForm({ ...form, businessHours: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[#090D16] border border-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-[#94A3B8] mb-1">Greeting Message</label>
            <textarea
              rows={2}
              value={form.greetingMessage}
              onChange={(e) => setForm({ ...form, greetingMessage: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-[#090D16] border border-slate-800"
            />
          </div>

          <div>
            <label className="block text-[#94A3B8] mb-1">Agent Personality</label>
            <textarea
              rows={2}
              value={form.personality}
              onChange={(e) => setForm({ ...form, personality: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-[#090D16] border border-slate-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[#94A3B8] mb-1">Hot Lead Threshold (0–100)</label>
              <input
                type="number"
                value={form.hotThreshold}
                onChange={(e) => setForm({ ...form, hotThreshold: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg bg-[#090D16] border border-slate-800"
              />
            </div>
            <div>
              <label className="block text-[#94A3B8] mb-1">Warm Lead Threshold (0–100)</label>
              <input
                type="number"
                value={form.warmThreshold}
                onChange={(e) => setForm({ ...form, warmThreshold: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg bg-[#090D16] border border-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-[#94A3B8] mb-1">Human Escalation Rules</label>
            <textarea
              rows={2}
              value={form.escalationRules}
              onChange={(e) => setForm({ ...form, escalationRules: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-[#090D16] border border-slate-800"
            />
          </div>
        </div>

        {/* Tool Execution Log */}
        <div className="enterprise-card p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Cpu className="w-4 h-4 text-[#06B6D4]" />
            <span>Recent Tool Executions</span>
          </div>
          <div className="space-y-2 max-h-[460px] overflow-y-auto text-xs">
            {(logsData?.logs || []).map((log) => (
              <div key={log.id} className="p-2.5 rounded-lg bg-[#090D16] border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-slate-200">{log.toolName}</span>
                  <StatusBadge value={log.status} />
                </div>
                <div className="text-[11px] text-[#94A3B8] mt-1 flex justify-between">
                  <span>{log.durationMs}ms</span>
                  <span>{new Date(log.executedAt).toLocaleTimeString('en-IN')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
