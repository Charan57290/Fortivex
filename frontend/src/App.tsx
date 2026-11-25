import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Layout } from './components/Layout';
import { LoginPage, RegisterPage, ForgotPasswordPage } from './pages/AuthPages';
import { DashboardPage } from './pages/DashboardPage';
import { VoiceAgentPage } from './pages/VoiceAgentPage';
import { AgentStudioPage } from './pages/AgentStudioPage';
import { LeadsPage } from './pages/LeadsPage';
import { CustomersPage } from './pages/CustomersPage';
import { PipelinePage } from './pages/PipelinePage';
import { ConversationsPage, ConversationDetailPage } from './pages/ConversationsPage';
import { AppointmentsPage } from './pages/AppointmentsPage';
import { KnowledgeBasePage } from './pages/KnowledgeBasePage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { HandoffsPage } from './pages/HandoffsPage';
import { SettingsPage } from './pages/SettingsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-[#090D16] flex items-center justify-center text-sm text-[#94A3B8]">
        Loading VoxSales AI...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route path="voice-agent" element={<VoiceAgentPage />} />
                <Route path="agent-studio" element={<AgentStudioPage />} />
                <Route path="leads" element={<LeadsPage />} />
                <Route path="customers" element={<CustomersPage />} />
                <Route path="pipeline" element={<PipelinePage />} />
                <Route path="conversations" element={<ConversationsPage />} />
                <Route path="conversations/:id" element={<ConversationDetailPage />} />
                <Route path="appointments" element={<AppointmentsPage />} />
                <Route path="knowledge" element={<KnowledgeBasePage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="handoffs" element={<HandoffsPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;
