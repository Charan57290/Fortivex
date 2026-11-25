import React from 'react';

export function ClassificationBadge({ value }: { value: string }) {
  const styles: Record<string, string> = {
    HOT: 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30',
    WARM: 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30',
    COLD: 'bg-[#06B6D4]/15 text-[#06B6D4] border-[#06B6D4]/30',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[value] || styles.COLD}`}>
      {value}
    </span>
  );
}

export function SentimentBadge({ value }: { value: string }) {
  const styles: Record<string, string> = {
    POSITIVE: 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30',
    NEUTRAL: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
    NEGATIVE: 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[value] || styles.NEUTRAL}`}>
      {value}
    </span>
  );
}

export function StatusBadge({ value }: { value: string }) {
  const isGood = ['COMPLETED', 'CONFIRMED', 'INDEXED', 'WON', 'RESOLVED', 'SUCCESS'].includes(value);
  const isWarn = ['PENDING', 'PROCESSING', 'SCHEDULED', 'IN_PROGRESS', 'ASSIGNED', 'NEGOTIATION', 'PROPOSAL'].includes(value);
  const isBad = ['FAILED', 'CANCELLED', 'LOST', 'BLOCKED'].includes(value);

  const cls = isGood
    ? 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30'
    : isBad
      ? 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30'
      : isWarn
        ? 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30'
        : 'bg-[#6366F1]/15 text-[#6366F1] border-[#6366F1]/30';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {value.replace(/_/g, ' ')}
    </span>
  );
}
