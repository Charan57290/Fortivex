import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Mic,
  Bot,
  Target,
  Users,
  Kanban,
  MessageSquare,
  Calendar,
  BookOpen,
  BarChart3,
  UserCheck,
  Settings,
  Search,
  Bell,
  Sun,
  Moon,
  LogOut,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';

const navItems = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/voice-agent', label: 'AI Voice Agent', icon: Mic },
  { to: '/agent-studio', label: 'Agent Studio', icon: Bot },
  { to: '/leads', label: 'Leads', icon: Target },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/pipeline', label: 'CRM Pipeline', icon: Kanban },
  { to: '/conversations', label: 'Conversations', icon: MessageSquare },
  { to: '/appointments', label: 'Appointments', icon: Calendar },
  { to: '/knowledge', label: 'Knowledge Base', icon: BookOpen },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/handoffs', label: 'Human Handoff', icon: UserCheck },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Layout() {
  const { user, organization, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [isDark, setIsDark] = useState(true);
  const [notifOpen, setNotifOpen] = useState(false);

  const { data: aiStatus } = useQuery({
    queryKey: ['ai-status'],
    queryFn: () =>
      apiRequest<{ geminiConfigured: boolean; databaseBackend: string }>('/ai/status'),
    staleTime: 60_000,
  });

  const toggleTheme = () => {
    const html = document.documentElement;
    if (isDark) {
      html.classList.remove('dark');
      html.classList.add('light');
      setIsDark(false);
    } else {
      html.classList.remove('light');
      html.classList.add('dark');
      setIsDark(true);
    }
  };

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!globalSearch.trim()) return;
    navigate(`/leads?search=${encodeURIComponent(globalSearch.trim())}`);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-4 py-4 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#6366F1] flex items-center justify-center text-white shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">VoxSales AI</div>
            <div className="text-[11px] text-[#94A3B8]">
              {organization?.name || 'FlowStack SaaS'}
            </div>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden text-[#94A3B8] hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-[#6366F1]/15 text-[#6366F1] font-medium border border-[#6366F1]/25'
                  : 'text-[#94A3B8] hover:text-white hover:bg-slate-800/50'
              }`
            }
          >
            <item.icon className="w-4 h-4 shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-800/80 space-y-2">
        <div className="px-3 py-2 rounded-lg bg-[#090D16] border border-slate-800/80 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[#94A3B8]">AI Engine</span>
            <span
              className={`inline-flex items-center gap-1 font-medium ${
                aiStatus?.geminiConfigured ? 'text-[#22C55E]' : 'text-[#06B6D4]'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {aiStatus?.geminiConfigured ? 'Gemini Live' : 'Demo Ready'}
            </span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[#94A3B8]">Storage</span>
            <span className="text-slate-300 font-mono text-[11px]">
              {aiStatus?.databaseBackend === 'postgresql' ? 'PostgreSQL' : 'Local Store'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between px-2 py-1.5">
          <div className="min-w-0">
            <p className="text-xs font-medium truncate">{user?.fullName}</p>
            <p className="text-[11px] text-[#94A3B8] truncate">{user?.role}</p>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#EF4444] hover:bg-slate-800/60 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-60 shrink-0 bg-[var(--bg-secondary)] border-r border-slate-800/80 sticky top-0 h-screen">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="w-64 bg-[var(--bg-secondary)] border-r border-slate-800 h-full">
            <SidebarContent />
          </div>
          <div className="flex-1 bg-black/60" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-slate-800/80 bg-[var(--bg-secondary)]/80 backdrop-blur-md sticky top-0 z-30 px-4 lg:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-1.5 rounded-lg text-[#94A3B8] hover:text-white"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <form onSubmit={handleGlobalSearch} className="relative flex-1">
              <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Search leads, companies, calls..."
                className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg bg-[#090D16]/70 border border-slate-800 focus:outline-none focus:border-[#6366F1] text-sm"
              />
            </form>
          </div>

          <div className="flex items-center gap-2 relative">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-[#94A3B8] hover:text-white hover:bg-slate-800/60 transition-colors"
              title="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setNotifOpen((v) => !v)}
              className="p-2 rounded-lg text-[#94A3B8] hover:text-white hover:bg-slate-800/60 transition-colors relative"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="w-2 h-2 rounded-full bg-[#6366F1] absolute top-1.5 right-1.5" />
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-12 w-72 enterprise-card p-3 shadow-2xl z-50">
                <p className="text-xs font-semibold mb-2">Notifications</p>
                <div className="space-y-2 text-xs text-[#94A3B8]">
                  <div className="p-2 rounded bg-[#090D16]/60 border border-slate-800">
                    Demo dataset loaded for FlowStack SaaS.
                  </div>
                  <div className="p-2 rounded bg-[#090D16]/60 border border-slate-800">
                    1 Human Handoff pending review in Human Handoff queue.
                  </div>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
