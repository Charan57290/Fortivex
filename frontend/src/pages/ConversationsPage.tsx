import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Download, Search, MessageSquare, ArrowLeft, Cpu, ShieldAlert } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { SentimentBadge, StatusBadge, ClassificationBadge } from '../components/ui/Badges';
import { EmptyState } from '../components/ui/EmptyState';

interface ConversationRow {
  id: string;
  customerName: string;
  language: string;
  status: string;
  mode: string;
  durationSeconds: number;
  leadScore: number | null;
  sentiment: string | null;
  appointmentStatus: string | null;
  createdAt: string;
}

export function ConversationsPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['conversations', search],
    queryFn: () =>
      apiRequest<{ conversations: ConversationRow[] }>(
        `/conversations?search=${encodeURIComponent(search)}`
      ),
  });

  const rows = data?.conversations || [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Call History & Transcripts</h1>
        <p className="text-sm text-[#94A3B8]">
          Inspect every AI sales call, transcript, sentiment analysis, call summary, and tool execution trace.
        </p>
      </div>

      <div className="enterprise-card p-3.5">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by call ID, customer, or language..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#090D16] border border-slate-800 text-xs focus:outline-none focus:border-[#6366F1]"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="enterprise-card p-8 text-center text-sm text-[#94A3B8]">Loading call history...</div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No conversations recorded yet"
          description="Launch the AI Voice Agent to run your first sales call."
        />
      ) : (
        <div className="enterprise-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-[#090D16]/40 text-[#94A3B8]">
                  <th className="p-3.5 font-medium">Call ID</th>
                  <th className="p-3.5 font-medium">Customer</th>
                  <th className="p-3.5 font-medium">Date</th>
                  <th className="p-3.5 font-medium">Duration</th>
                  <th className="p-3.5 font-medium">Language</th>
                  <th className="p-3.5 font-medium">Status</th>
                  <th className="p-3.5 font-medium">Lead Score</th>
                  <th className="p-3.5 font-medium">Sentiment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {rows.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/30">
                    <td className="p-3.5 font-mono text-[#6366F1]">
                      <Link to={`/conversations/${c.id}`} className="hover:underline">
                        {c.id}
                      </Link>
                    </td>
                    <td className="p-3.5 font-medium text-slate-100">{c.customerName}</td>
                    <td className="p-3.5 text-[#94A3B8]">{new Date(c.createdAt).toLocaleString('en-IN')}</td>
                    <td className="p-3.5 font-mono">{c.durationSeconds}s</td>
                    <td className="p-3.5 font-mono">{c.language}</td>
                    <td className="p-3.5">
                      <StatusBadge value={c.status} />
                    </td>
                    <td className="p-3.5 font-mono">{c.leadScore !== null ? `${c.leadScore}/100` : '—'}</td>
                    <td className="p-3.5">
                      {c.sentiment ? <SentimentBadge value={c.sentiment} /> : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export function ConversationDetailPage() {
  const { id } = useParams();

  const { data, isLoading } = useQuery({
    queryKey: ['conversation-detail', id],
    queryFn: () =>
      apiRequest<{
        conversation: { id: string; language: string; status: string; mode: string; durationSeconds: number; createdAt: string };
        messages: Array<{ id: string; sender: string; content: string; createdAt: string }>;
        customer: { fullName: string; email?: string; phone?: string } | null;
        lead: { score: number; classification: string; recommendedPlan?: string } | null;
        sentiment: {
          category: string;
          score: number;
          buyingSignals: string[];
          concerns: string[];
          recommendedNextAction: string;
          explanation: string;
          isAiGenerated: boolean;
        } | null;
        summary: {
          customerOverview: string;
          mainRequirements: string[];
          budgetInfo?: string;
          purchaseIntent: string;
          appointmentDetails?: string;
          followUpActions: string[];
          recommendedNextStep: string;
        } | null;
        toolExecutions: Array<{ id: string; toolName: string; status: string; durationMs: number; executedAt: string }>;
      }>(`/conversations/${id}`),
    enabled: Boolean(id),
  });

  const exportTranscript = () => {
    if (!data) return;
    const text = data.messages
      .map((m) => `[${new Date(m.createdAt).toISOString()}] ${m.sender}: ${m.content}`)
      .join('\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${data.conversation.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <div className="enterprise-card p-8 text-center text-sm text-[#94A3B8]">Loading call details...</div>;
  }

  if (!data) {
    return <div className="enterprise-card p-8 text-center text-sm text-[#EF4444]">Conversation not found.</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/conversations" className="p-2 rounded-lg bg-[#151D2C] border border-slate-800 hover:border-slate-700">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              Call Details — {data.customer?.fullName || 'Prospect'}
            </h1>
            <p className="text-xs text-[#94A3B8] font-mono">
              {data.conversation.id} • {data.conversation.language} • {data.conversation.durationSeconds}s
            </p>
          </div>
        </div>
        <button
          onClick={exportTranscript}
          className="px-3.5 py-2 rounded-lg bg-[#151D2C] border border-slate-800 hover:border-slate-700 text-xs font-medium inline-flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5 text-[#06B6D4]" />
          Export Transcript
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Transcript */}
        <div className="enterprise-card p-5 lg:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold">Full Conversation Transcript</h2>
          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            {data.messages.map((m) => (
              <div
                key={m.id}
                className={`p-3 rounded-lg text-xs ${
                  m.sender === 'CUSTOMER'
                    ? 'bg-[#6366F1]/15 border border-[#6366F1]/30 ml-8'
                    : 'bg-[#090D16] border border-slate-800 mr-8'
                }`}
              >
                <div className="flex justify-between text-[10px] text-[#94A3B8] mb-1">
                  <span className="font-semibold">{m.sender}</span>
                  <span>{new Date(m.createdAt).toLocaleTimeString('en-IN')}</span>
                </div>
                <p className="text-slate-100 leading-relaxed">{m.content}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Summary, Sentiment & Tool Executions */}
        <div className="space-y-4">
          {data.lead && (
            <div className="enterprise-card p-4 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">Lead Qualification</span>
                <ClassificationBadge value={data.lead.classification} />
              </div>
              <div className="font-mono text-lg font-bold">{data.lead.score}/100</div>
              {data.lead.recommendedPlan && (
                <p className="text-[#94A3B8]">{data.lead.recommendedPlan}</p>
              )}
            </div>
          )}

          {data.summary && (
            <div className="enterprise-card p-4 text-xs space-y-2.5">
              <h3 className="text-sm font-semibold">AI Call Summary</h3>
              <p className="text-slate-200">{data.summary.customerOverview}</p>
              <div>
                <span className="text-[#94A3B8]">Budget:</span>{' '}
                <strong className="text-slate-100">{data.summary.budgetInfo || 'Not disclosed'}</strong>
              </div>
              <div>
                <span className="text-[#94A3B8]">Appointment:</span>{' '}
                <span className="text-slate-200">{data.summary.appointmentDetails}</span>
              </div>
              <div>
                <div className="text-[#94A3B8] mb-1">Follow-up Actions:</div>
                <ul className="list-disc pl-4 space-y-0.5 text-slate-200">
                  {data.summary.followUpActions.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {data.sentiment && (
            <div className="enterprise-card p-4 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Sentiment Analysis</h3>
                <SentimentBadge value={data.sentiment.category} />
              </div>
              <p className="text-[#94A3B8]">{data.sentiment.explanation}</p>
              <div className="p-2 rounded bg-[#090D16] border border-slate-800 flex items-center gap-1.5 text-[10px] text-[#94A3B8]">
                <ShieldAlert className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
                <span>AI-generated analysis, not a guaranteed psychological assessment.</span>
              </div>
            </div>
          )}

          <div className="enterprise-card p-4 text-xs space-y-2">
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              <Cpu className="w-4 h-4 text-[#06B6D4]" />
              <span>Agent Tool Execution Trace</span>
            </div>
            {data.toolExecutions.length === 0 ? (
              <p className="text-[#94A3B8]">No backend tools invoked.</p>
            ) : (
              <div className="space-y-1.5">
                {data.toolExecutions.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-2 rounded bg-[#090D16] border border-slate-800">
                    <span className="font-mono text-[11px]">{t.toolName}</span>
                    <StatusBadge value={t.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
