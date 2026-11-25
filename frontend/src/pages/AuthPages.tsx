import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiRequest } from '../lib/api';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Minimum 6 characters'),
  organizationName: z.string().min(2, 'Company name is required'),
});

export function LoginPage() {
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    setSubmitting(true);
    try {
      await login(values.email, values.password);
      toast({ title: 'Signed in', description: 'Welcome back to VoxSales AI.', type: 'success' });
      navigate('/');
    } catch (err) {
      toast({
        title: 'Sign-in failed',
        description: err instanceof Error ? err.message : 'Invalid credentials',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (email: string) => {
    setValue('email', email);
    setValue('password', 'Demo@1234');
  };

  return (
    <div className="min-h-screen bg-[#090D16] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-[#6366F1] text-white mb-3">
            <Sparkles className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">VoxSales AI</h1>
          <p className="text-sm text-[#94A3B8] mt-1">Autonomous AI Sales Voice Agent Platform</p>
        </div>

        <div className="enterprise-card p-6 shadow-2xl">
          <h2 className="text-lg font-semibold mb-4">Sign in to your workspace</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1">Email</label>
              <input
                {...register('email')}
                type="email"
                placeholder="admin@voxsales.ai"
                className="w-full px-3 py-2 rounded-lg bg-[#090D16] border border-slate-800 text-sm focus:outline-none focus:border-[#6366F1]"
              />
              {errors.email && <p className="text-xs text-[#EF4444] mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-[#94A3B8]">Password</label>
                <Link to="/forgot-password" className="text-xs text-[#6366F1] hover:underline">
                  Forgot password?
                </Link>
              </div>
              <input
                {...register('password')}
                type="password"
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-lg bg-[#090D16] border border-slate-800 text-sm focus:outline-none focus:border-[#6366F1]"
              />
              {errors.password && <p className="text-xs text-[#EF4444] mt-1">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-lg bg-[#6366F1] hover:bg-indigo-500 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
            >
              {submitting ? 'Signing in...' : 'Sign In'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-medium text-[#94A3B8] mb-2.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#06B6D4]" />
              <span>Evaluation Demo Accounts (Password: Demo@1234)</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillDemo('admin@voxsales.ai')}
                className="px-2 py-1.5 rounded-lg bg-[#090D16] border border-slate-800 hover:border-[#6366F1] text-xs text-slate-300 transition-colors"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => fillDemo('manager@voxsales.ai')}
                className="px-2 py-1.5 rounded-lg bg-[#090D16] border border-slate-800 hover:border-[#6366F1] text-xs text-slate-300 transition-colors"
              >
                Manager
              </button>
              <button
                type="button"
                onClick={() => fillDemo('agent@voxsales.ai')}
                className="px-2 py-1.5 rounded-lg bg-[#090D16] border border-slate-800 hover:border-[#6366F1] text-xs text-slate-300 transition-colors"
              >
                Sales Agent
              </button>
            </div>
          </div>

          <p className="text-xs text-center text-[#94A3B8] mt-5">
            New organization?{' '}
            <Link to="/register" className="text-[#6366F1] hover:underline font-medium">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const { register: registerUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (values: z.infer<typeof registerSchema>) => {
    setSubmitting(true);
    try {
      await registerUser(values);
      toast({ title: 'Workspace created', description: 'Welcome to VoxSales AI!', type: 'success' });
      navigate('/');
    } catch (err) {
      toast({
        title: 'Registration failed',
        description: err instanceof Error ? err.message : 'Unable to register',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090D16] flex items-center justify-center p-4">
      <div className="w-full max-w-md enterprise-card p-6 shadow-2xl">
        <h1 className="text-xl font-bold mb-1">Create VoxSales AI Account</h1>
        <p className="text-xs text-[#94A3B8] mb-5">Set up your sales workspace in seconds.</p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-[#94A3B8] mb-1">Full Name</label>
            <input
              {...register('fullName')}
              className="w-full px-3 py-2 rounded-lg bg-[#090D16] border border-slate-800 text-sm focus:outline-none focus:border-[#6366F1]"
            />
            {errors.fullName && <p className="text-xs text-[#EF4444] mt-1">{errors.fullName.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-[#94A3B8] mb-1">Organization Name</label>
            <input
              {...register('organizationName')}
              placeholder="Acme SaaS Pvt Ltd"
              className="w-full px-3 py-2 rounded-lg bg-[#090D16] border border-slate-800 text-sm focus:outline-none focus:border-[#6366F1]"
            />
            {errors.organizationName && (
              <p className="text-xs text-[#EF4444] mt-1">{errors.organizationName.message}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-[#94A3B8] mb-1">Work Email</label>
            <input
              {...register('email')}
              type="email"
              className="w-full px-3 py-2 rounded-lg bg-[#090D16] border border-slate-800 text-sm focus:outline-none focus:border-[#6366F1]"
            />
            {errors.email && <p className="text-xs text-[#EF4444] mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-[#94A3B8] mb-1">Password</label>
            <input
              {...register('password')}
              type="password"
              className="w-full px-3 py-2 rounded-lg bg-[#090D16] border border-slate-800 text-sm focus:outline-none focus:border-[#6366F1]"
            />
            {errors.password && <p className="text-xs text-[#EF4444] mt-1">{errors.password.message}</p>}
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-lg bg-[#6366F1] hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
          >
            {submitting ? 'Creating workspace...' : 'Create Account'}
          </button>
        </form>
        <p className="text-xs text-center text-[#94A3B8] mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-[#6366F1] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export function ForgotPasswordPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    setSent(true);
    toast({ title: 'Reset link queued', description: 'Check your inbox for instructions.', type: 'info' });
  };

  return (
    <div className="min-h-screen bg-[#090D16] flex items-center justify-center p-4">
      <div className="w-full max-w-md enterprise-card p-6 shadow-2xl">
        <h1 className="text-xl font-bold mb-1">Reset Password</h1>
        <p className="text-xs text-[#94A3B8] mb-5">Enter your work email to receive reset instructions.</p>
        {sent ? (
          <div className="p-4 rounded-lg bg-[#22C55E]/10 border border-[#22C55E]/30 text-sm text-[#22C55E]">
            Reset instructions have been queued for {email || 'your email'}.
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full px-3 py-2 rounded-lg bg-[#090D16] border border-slate-800 text-sm focus:outline-none focus:border-[#6366F1]"
            />
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-[#6366F1] hover:bg-indigo-500 text-white text-sm font-medium"
            >
              Send Reset Instructions
            </button>
          </form>
        )}
        <p className="text-xs text-center text-[#94A3B8] mt-4">
          <Link to="/login" className="text-[#6366F1] hover:underline">
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
