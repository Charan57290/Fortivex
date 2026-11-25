import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  PhoneCall,
  Users,
  Target,
  TrendingUp,
  CalendarCheck,
  Clock,
  Smile,
  Bot,
  Mic,
  BookOpen,
  ArrowUpRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { apiRequest } from '../lib/api';
import { SentimentBadge, StatusBadge } from '../components/ui/Badges';

interface DashboardOverview {
  metrics: {
    totalCalls: number;
    totalLeads: number;
    qualifiedLeads: number;
    conversionRate: number;
    appointmentsBooked: number;
    avgCallDurationSeconds: number;
    positiveSentimentPct: number;
    aiSuccessRate: number;
  };
  leadDistribution: Array<{ name: string; value: number; color: string }>;
  pipelineStages: Array<{ stage: string; count: number }>;
  recentActivities: Array<{ id: string; title: string; description?: string; activityType: string; createdAt: string }>;
  recentConversations: Array<{
    id: string;
    customerName: string;
    language: string;
    status: string;
    mode: string;
    durationSeconds: number;
    sentiment: string;
    leadScore: number | null;
    createdAt: string;
  }>;
}

export function DashboardPage() {
  const [days, setDays] = useState(30);

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-overview', days],
    queryFn: () => apiRequest<DashboardOverview>(`/dashboard/overview?days=${days}`),
  });

  const m = data?.metrics;

  const statCards = [
    { label: 'Total Calls', value: m?.totalCalls ?? 0, icon: PhoneCall, accent: 'text-[#6366F1]' },
    { label: 'Total Leads', value: m?.totalLeads ?? 0, icon: Users, accent: 'text-[#06B6D4]' },
    { label: 'Qualified Leads', value: m?.qualifiedLeads ?? 0, icon: Target, accent: 'text-[#22C55E]' },
    { label: 'Conversion Rate', value: `${m?.conversionRate ?? 0}%`, icon: TrendingUp, accent: 'text-[#6366F1]' },
    { label: 'Appointments Booked', value: m?.appointmentsBooked ?? 0, icon: CalendarCheck, accent: 'text-[#22C55E]' },
    { label: 'Avg Call Duration', value: `${m?.avgCallDurationSeconds ?? 0}s`, icon: Clock, accent: 'text-[#F59E0B]' },
    { label: 'Positive Sentiment', value: `${m?.positiveSentimentPct ?? 0}%`, icon: Smile, accent: 'text-[#22C55E]' },
    { label: 'AI Success Rate', value: `${m?.aiSuccessRate ?? 0}%`, icon: Bot, accent: 'text-[#06B6D4]' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Executive Overview</h1>
          <p className="text-sm text-[#94A3B8]">
            Real-time sales voice agent operations, lead intelligence, and CRM conversion metrics.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-3 py-2 rounded-lg bg-[#151D2C] border border-slate-800 text-xs font-medium"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <Link
            to="/knowledge"
            className="px-3 py-2 rounded-lg bg-[#151D2C] border border-slate-800 hover:border-slate-700 text-xs font-medium inline-flex items-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#06B6D4]" />
            Knowledge Base
          </Link>
          <Link
            to="/voice-agent"
            className="px-3.5 py-2 rounded-lg bg-[#6366F1] hover:bg-indigo-500 text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
          >
            <Mic className="w-3.5 h-3.5" />
            Launch Voice Agent
          </Link>
        </div>
      </div>

      {error && (
        <div className="enterprise-card p-4 border-[#EF4444]/40 text-sm text-[#EF4444]">
          Failed to load dashboard metrics: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="enterprise-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#94A3B8] font-medium">{card.label}</span>
              <card.icon className={`w-4 h-4 ${card.accent}`} />
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight">
              {isLoading ? (
                <div className="h-7 w-16 bg-slate-800 animate-pulse rounded" />
              ) : (
                card.value
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="enterprise-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold">Sales Pipeline Distribution</h2>
              <p className="text-xs text-[#94A3B8]">Live lead counts across CRM stages</p>
            </div>
            <Link to="/pipeline" className="text-xs text-[#6366F1] hover:underline inline-flex items-center gap-1">
              Open Pipeline <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.pipelineStages || []}>
                <XAxis dataKey="stage" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111827',
                    border: '1px solid rgba(148,163,184,0.2)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" fill="#6366F1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="enterprise-card p-5">
          <h2 className="text-sm font-semibold">Lead Quality Breakdown</h2>
          <p className="text-xs text-[#94A3B8] mb-3">Hot, Warm & Cold classification</p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.leadDistribution || []}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={48}
                  outerRadius={76}
                  paddingAngle={4}
                >
                  {(data?.leadDistribution || []).map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111827',
                    border: '1px solid rgba(148,163,184,0.2)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 text-xs mt-1">
            {(data?.leadDistribution || []).map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[#94A3B8]">
                  {item.name}: <strong className="text-slate-100">{item.value}</strong>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Interactions & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="enterprise-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Recent Customer Voice Interactions</h2>
            <Link to="/conversations" className="text-xs text-[#6366F1] hover:underline">
              View all
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[#94A3B8]">
                  <th className="pb-2.5 font-medium">Customer</th>
                  <th className="pb-2.5 font-medium">Mode</th>
                  <th className="pb-2.5 font-medium">Status</th>
                  <th className="pb-2.5 font-medium">Score</th>
                  <th className="pb-2.5 font-medium">Sentiment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {(data?.recentConversations || []).map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 font-medium">
                      <Link to={`/conversations/${c.id}`} className="hover:text-[#6366F1]">
                        {c.customerName}
                      </Link>
                    </td>
                    <td className="py-2.5 text-[#94A3B8]">{c.mode}</td>
                    <td className="py-2.5">
                      <StatusBadge value={c.status} />
                    </td>
                    <td className="py-2.5 font-mono">{c.leadScore !== null ? `${c.leadScore}/100` : '—'}</td>
                    <td className="py-2.5">
                      <SentimentBadge value={c.sentiment} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="enterprise-card p-5">
          <h2 className="text-sm font-semibold mb-4">Recent Sales Activity</h2>
          <div className="space-y-3">
            {(data?.recentActivities || []).slice(0, 6).map((act) => (
              <div key={act.id} className="flex gap-2.5 text-xs border-l-2 border-[#6366F1]/50 pl-3 py-0.5">
                <div className="min-w-0">
                  <p className="font-medium text-slate-200">{act.title}</p>
                  {act.description && <p className="text-[#94A3B8] truncate">{act.description}</p>}
                  <p className="text-[10px] text-[#94A3B8] mt-0.5">
                    {new Date(act.createdAt).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
