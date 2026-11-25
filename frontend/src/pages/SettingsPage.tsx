import React, { useState } from 'react';
import { Shield, Calculator } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function SettingsPage() {
  const { user, organization } = useAuth();
  const [monthlyCalls, setMonthlyCalls] = useState(5000);
  const [avgMinutes, setAvgMinutes] = useState(4);

  // Illustrative operational cost assumptions (USD/month)
  const totalMinutes = monthlyCalls * avgMinutes;
  const geminiTokenCost = Number((monthlyCalls * 0.012).toFixed(2)); // ~8k tokens/call
  const sttTtsCost = Number((totalMinutes * 0.015).toFixed(2)); // Web Speech = $0; Cloud STT/TTS = ~$0.015/min
  const infraBase = monthlyCalls > 25000 ? 320 : monthlyCalls > 5000 ? 110 : 45;
  const totalEstimatedMonthlyCost = Number((geminiTokenCost + sttTtsCost + infraBase).toFixed(2));
  const costPerInteraction = Number((totalEstimatedMonthlyCost / Math.max(monthlyCalls, 1)).toFixed(3));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings & Commercial Feasibility</h1>
        <p className="text-sm text-[#94A3B8]">
          Account security, data retention controls, and interactive SaaS unit economics calculator.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Profile & Security */}
        <div className="enterprise-card p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Shield className="w-4 h-4 text-[#22C55E]" />
            <span>Workspace & Privacy Controls</span>
          </div>
          <dl className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-800/70">
              <dt className="text-[#94A3B8]">Signed-in User</dt>
              <dd className="font-medium">{user?.fullName} ({user?.email})</dd>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/70">
              <dt className="text-[#94A3B8]">Role (RBAC)</dt>
              <dd className="font-mono text-[#6366F1]">{user?.role}</dd>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/70">
              <dt className="text-[#94A3B8]">Organization</dt>
              <dd className="font-medium">{organization?.name} ({organization?.plan})</dd>
            </div>
            <div className="flex justify-between py-1.5">
              <dt className="text-[#94A3B8]">Voice Recording Policy</dt>
              <dd className="text-[#22C55E]">Explicit Opt-in Only (90-day retention)</dd>
            </div>
          </dl>
        </div>

        {/* Illustrative Commercial Cost Calculator */}
        <div className="enterprise-card p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Calculator className="w-4 h-4 text-[#06B6D4]" />
            <span>Illustrative Monthly Cost & Unit Economics Estimator</span>
          </div>
          <p className="text-[11px] text-[#94A3B8]">
            Estimates assume Gemini Flash token pricing, managed Postgres/Redis, and optional Cloud STT/TTS (Browser Web Speech API is $0).
          </p>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[#94A3B8] mb-1">Monthly AI Calls</label>
              <input
                type="number"
                min={100}
                step={500}
                value={monthlyCalls}
                onChange={(e) => setMonthlyCalls(Math.max(100, Number(e.target.value)))}
                className="w-full px-3 py-2 rounded-lg bg-[#090D16] border border-slate-800"
              />
            </div>
            <div>
              <label className="block text-[#94A3B8] mb-1">Avg Call Duration (min)</label>
              <input
                type="number"
                min={1}
                max={30}
                value={avgMinutes}
                onChange={(e) => setAvgMinutes(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 rounded-lg bg-[#090D16] border border-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs pt-2">
            <div className="p-3 rounded-lg bg-[#090D16] border border-slate-800">
              <div className="text-[#94A3B8]">Est. LLM + Cloud Voice</div>
              <div className="text-base font-bold mt-0.5">${(geminiTokenCost + sttTtsCost).toFixed(2)}/mo</div>
            </div>
            <div className="p-3 rounded-lg bg-[#090D16] border border-slate-800">
              <div className="text-[#94A3B8]">Est. Total Operating Cost</div>
              <div className="text-base font-bold text-[#06B6D4] mt-0.5">
                ${totalEstimatedMonthlyCost}/mo (${costPerInteraction}/call)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
