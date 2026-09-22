import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, Mail, ArrowRight, Building, KeyRound, AlertCircle } from 'lucide-react';

export default function Login() {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    if (!email || !password) {
      setErrorMessage('Please enter both email and password');
      return;
    }

    const res = await login(email, password);
    if (!res.success) {
      setErrorMessage(res.message);
    }
  };

  const handleQuickLogin = (quickEmail, quickPassword) => {
    setEmail(quickEmail);
    setPassword(quickPassword);
    setErrorMessage('');
    login(quickEmail, quickPassword);
  };

  const demoPersonas = [
    {
      tenant: 'Tenant 1 (Acme Cyber Corp)',
      role: 'ADMIN',
      name: 'Alice Admin',
      email: 'admin@acme.com',
      password: 'Admin@123',
      desc: 'Full administrative control over campaigns, events, and audit logs',
      badgeClass: 'bg-purple-900/60 text-purple-300 border-purple-700/60'
    },
    {
      tenant: 'Tenant 1 (Acme Cyber Corp)',
      role: 'MANAGER',
      name: 'Bob Manager',
      email: 'manager@acme.com',
      password: 'Password@123',
      desc: 'Campaign management, user assignments, and event triage',
      badgeClass: 'bg-blue-900/60 text-blue-300 border-blue-700/60'
    },
    {
      tenant: 'Tenant 1 (Acme Cyber Corp)',
      role: 'USER',
      name: 'Charlie User',
      email: 'user@acme.com',
      password: 'Password@123',
      desc: 'Standard employee (read-only campaigns, restricted from logs/admin)',
      badgeClass: 'bg-slate-800 text-slate-300 border-slate-700'
    },
    {
      tenant: 'Tenant 2 (Stark Defense Systems)',
      role: 'ADMIN',
      name: 'Tony Stark',
      email: 'admin@stark.com',
      password: 'Admin@123',
      desc: 'Demonstrates cross-tenant isolation (cannot see Acme data)',
      badgeClass: 'bg-amber-900/60 text-amber-300 border-amber-700/60'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient cybersecurity grid glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 blur-3xl pointer-events-none rounded-full" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-500/10 blur-3xl pointer-events-none rounded-full" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-4 shadow-lg shadow-emerald-500/5">
          <Shield className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Deep Trace Cybernetics
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Multi-Tenant Security Operations Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl relative z-10">
        {/* Main Login Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
          {errorMessage && (
            <div className="mb-6 p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-start space-x-3 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@acme.com"
                  className="block w-full pl-9 pr-3 py-2 text-sm bg-slate-950/70 border border-slate-700/80 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-9 pr-3 py-2 text-sm bg-slate-950/70 border border-slate-700/80 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 border border-transparent rounded-lg text-sm font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 focus:ring-offset-slate-900 transition disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick-Login Demo Personas */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                1-Click Quick Demo Accounts
              </span>
              <span className="text-[11px] text-emerald-400/80 font-mono">
                Auto-fill & Login
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {demoPersonas.map((persona, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleQuickLogin(persona.email, persona.password)}
                  className="text-left p-3 rounded-xl bg-slate-950/50 hover:bg-slate-800/60 border border-slate-800/80 hover:border-slate-700 transition group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-200 group-hover:text-emerald-400 transition">
                      {persona.name}
                    </span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${persona.badgeClass}`}>
                      {persona.role}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono truncate mb-1">
                    {persona.email}
                  </div>
                  <div className="text-[10px] text-slate-400 line-clamp-1">
                    {persona.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
