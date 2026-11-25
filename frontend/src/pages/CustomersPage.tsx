import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Users } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { EmptyState } from '../components/ui/EmptyState';

interface CustomerRow {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  preferredLang: string;
  jobTitle?: string;
  consentRecorded: boolean;
  company?: { name: string } | null;
  leadCount: number;
  conversationCount: number;
}

export function CustomersPage() {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['customers', search],
    queryFn: () =>
      apiRequest<{ customers: CustomerRow[] }>(`/customers?search=${encodeURIComponent(search)}`),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiRequest('/customers', {
        method: 'POST',
        body: JSON.stringify({
          fullName,
          email: email || null,
          phone: phone || null,
          companyName: companyName || null,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast({ title: 'Customer created', type: 'success' });
      setModalOpen(false);
      setFullName('');
      setEmail('');
      setPhone('');
      setCompanyName('');
    },
    onError: (err) => {
      toast({
        title: 'Failed to create customer',
        description: err instanceof Error ? err.message : 'Error',
        type: 'error',
      });
    },
  });

  const customers = data?.customers || [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-sm text-[#94A3B8]">
            Unified customer directory with persistent interaction memory and consent status.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="px-3.5 py-2 rounded-lg bg-[#6366F1] hover:bg-indigo-500 text-white text-xs font-medium inline-flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Customer
        </button>
      </div>

      <div className="enterprise-card p-3.5">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers by name, email, or phone..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#090D16] border border-slate-800 text-xs focus:outline-none focus:border-[#6366F1]"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="enterprise-card p-8 text-center text-sm text-[#94A3B8]">Loading customers...</div>
      ) : customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customers found"
          description="Add a customer manually or start an AI Voice Agent conversation."
        />
      ) : (
        <div className="enterprise-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-[#090D16]/40 text-[#94A3B8]">
                  <th className="p-3.5 font-medium">Name</th>
                  <th className="p-3.5 font-medium">Company</th>
                  <th className="p-3.5 font-medium">Contact</th>
                  <th className="p-3.5 font-medium">Language</th>
                  <th className="p-3.5 font-medium">Leads / Calls</th>
                  <th className="p-3.5 font-medium">Consent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/30">
                    <td className="p-3.5 font-medium text-slate-100">
                      <div>{c.fullName}</div>
                      {c.jobTitle && <div className="text-[11px] text-[#94A3B8]">{c.jobTitle}</div>}
                    </td>
                    <td className="p-3.5 text-[#94A3B8]">{c.company?.name || '—'}</td>
                    <td className="p-3.5 text-[#94A3B8]">
                      <div>{c.email || '—'}</div>
                      <div>{c.phone || ''}</div>
                    </td>
                    <td className="p-3.5 font-mono">{c.preferredLang}</td>
                    <td className="p-3.5">
                      {c.leadCount} leads • {c.conversationCount} calls
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] ${
                          c.consentRecorded
                            ? 'bg-[#22C55E]/15 text-[#22C55E]'
                            : 'bg-slate-800 text-[#94A3B8]'
                        }`}
                      >
                        {c.consentRecorded ? 'Opted-in' : 'Not recorded'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="enterprise-card max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-semibold">Add New Customer</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate();
              }}
              className="space-y-3 text-xs"
            >
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full Name *"
                className="w-full px-3 py-2 rounded-lg bg-[#090D16] border border-slate-800"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full px-3 py-2 rounded-lg bg-[#090D16] border border-slate-800"
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone number"
                className="w-full px-3 py-2 rounded-lg bg-[#090D16] border border-slate-800"
              />
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Company name"
                className="w-full px-3 py-2 rounded-lg bg-[#090D16] border border-slate-800"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg border border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#6366F1] text-white font-medium"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
