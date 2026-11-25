import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';

export interface AuthUser {
  id: string;
  organizationId: string;
  email: string;
  fullName: string;
  role: 'ADMIN' | 'SALES_MANAGER' | 'SALES_AGENT';
}

export interface OrganizationInfo {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  organization: OrganizationInfo | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { fullName: string; email: string; password: string; organizationName?: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [organization, setOrganization] = useState<OrganizationInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('voxsales_token');
    if (!token) {
      setLoading(false);
      return;
    }
    apiRequest<{ user: AuthUser | null; organization: OrganizationInfo | null }>('/auth/me')
      .then((res) => {
        setUser(res.user);
        setOrganization(res.organization);
      })
      .catch(() => {
        localStorage.removeItem('voxsales_token');
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apiRequest<{ token: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem('voxsales_token', res.token);
    setUser(res.user);
    const me = await apiRequest<{ organization: OrganizationInfo | null }>('/auth/me');
    setOrganization(me.organization);
  };

  const register = async (data: { fullName: string; email: string; password: string; organizationName?: string }) => {
    const res = await apiRequest<{ token: string; user: AuthUser }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    localStorage.setItem('voxsales_token', res.token);
    setUser(res.user);
    const me = await apiRequest<{ organization: OrganizationInfo | null }>('/auth/me');
    setOrganization(me.organization);
  };

  const logout = () => {
    localStorage.removeItem('voxsales_token');
    setUser(null);
    setOrganization(null);
  };

  return (
    <AuthContext.Provider value={{ user, organization, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
