import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from 'recharts';
import { apiRequest } from '../lib/api';

interface AnalyticsData {
  callsByLanguage: Array<{ language: string; count: number }>;
  sentimentDistribution: Array<{ name: string; value: number }>;
  callVolumeTrend: Array<{ date: string; calls: number; appointments: number }>;
  avgLeadScore: number;
  appointmentBookingRate: number;
  totalToolExecutions: number;
  toolSuccessRate: number;
}

export function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-page'],
    queryFn: () => apiRequest<AnalyticsData>('/dashboard/analytics'),
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Business Intelligence & Analytics</h1>
        <p className="text-sm text-[#94A3B8]">
          Database-driven call volume trends, language breakdown, sentiment distribution, and agent tool reliability.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="enterprise-card p-4">
          <div className="text-xs text-[#94A3B8]">Average Lead Score</div>
          <div className="text-2xl font-bold mt-1">{isLoading ? '—' : `${data?.avgLeadScore ?? 0}/100`}</div>
        </div>
        <div className="enterprise-card p-4">
          <div className="text-xs text-[#94A3B8]">Appointment Booking Rate</div>
          <div className="text-2xl font-bold mt-1 text-[#22C55E]">
            {isLoading ? '—' : `${data?.appointmentBookingRate ?? 0}%`}
          </div>
        </div>
        <div className="enterprise-card p-4">
          <div className="text-xs text-[#94A3B8]">Agent Tool Executions</div>
          <div className="text-2xl font-bold mt-1">{isLoading ? '—' : data?.totalToolExecutions ?? 0}</div>
        </div>
        <div className="enterprise-card p-4">
          <div className="text-xs text-[#94A3B8]">Tool Success Rate</div>
          <div className="text-2xl font-bold mt-1 text-[#06B6D4]">
            {isLoading ? '—' : `${data?.toolSuccessRate ?? 100}%`}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="enterprise-card p-5">
          <h2 className="text-sm font-semibold mb-3">Calls & Appointments Over Time</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.callVolumeTrend || []}>
                <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111827',
                    border: '1px solid rgba(148,163,184,0.2)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Area type="monotone" dataKey="calls" stroke="#6366F1" fill="#6366F1" fillOpacity={0.2} />
                <Area type="monotone" dataKey="appointments" stroke="#22C55E" fill="#22C55E" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="enterprise-card p-5">
          <h2 className="text-sm font-semibold mb-3">Calls by Language & Sentiment</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.callsByLanguage || []}>
                <XAxis dataKey="language" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111827',
                    border: '1px solid rgba(148,163,184,0.2)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" fill="#06B6D4" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
