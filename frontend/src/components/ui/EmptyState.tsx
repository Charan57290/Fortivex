import React from 'react';
import { LucideIcon } from 'lucide-react';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="enterprise-card p-10 flex flex-col items-center justify-center text-center">
      <div className="w-12 h-12 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/25 flex items-center justify-center text-[#6366F1] mb-4">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="text-sm text-[#94A3B8] max-w-md mt-1">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
