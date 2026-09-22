import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  Target, 
  AlertTriangle, 
  ShieldAlert, 
  Activity, 
  ArrowUpRight, 
  Clock, 
  CheckCircle,
  Building,
  PlusCircle,
  ShieldCheck
} from 'lucide-react';

export default function Dashboard({ setActiveTab }) {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMetrics = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.dashboard.getMetrics();
      setMetrics(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center space-y-3 text-slate-400">
          <Activity className="w-8 h-8 animate-spin text-emerald-400" />
          <span className="text-sm">Aggregating tenant security metrics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-sm">
        {error}
      </div>
    );
  }

  const statCards = [
    {
      title: 'Active Campaigns',
      value: metrics?.campaigns?.active || 0,
      total: `${metrics?.campaigns?.total || 0} Total`,
      icon: Target,
      color: 'emerald',
      tab: 'campaigns'
    },
    {
      title: 'Critical Incidents',
      value: metrics?.security_events?.critical_unresolved || 0,
      total: `${metrics?.security_events?.open || 0} Open Events`,
      icon: ShieldAlert,
      color: 'rose',
      pulse: (metrics?.security_events?.critical_unresolved || 0) > 0,
      tab: 'events'
    },
    {
      title: 'Total Monitored Events',
      value: metrics?.security_events?.total || 0,
      total: `${metrics?.security_events?.investigating || 0} In Triage`,
      icon: Activity,
      color: 'blue',
      tab: 'events'
    },
    {
      title: 'Assigned Team Members',
      value: metrics?.users?.total || 0,
      total: 'Active Staff',
      icon: Users,
      color: 'purple',
      tab: 'users'
    }
  ];

  return (
    <div className="space-y-6">
      
      {/* Organization Header & Status */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5 mb-1.5">
            <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              TENANT ISOLATED ENVIRONMENT
            </span>
            <span className="text-xs text-slate-400 font-mono">
              ID: {user?.tenant_id}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {user?.tenant_name}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Active session logged in as <span className="text-slate-200 font-medium">{user?.full_name}</span> ({user?.role_name})
          </p>
        </div>

        {/* Quick Launch Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {(user?.role_name === 'ADMIN' || user?.role_name === 'MANAGER') && (
            <button
              onClick={() => setActiveTab('campaigns')}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-400 text-slate-950 hover:bg-emerald-300 transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Launch Campaign</span>
            </button>
          )}
          <button
            onClick={() => setActiveTab('events')}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Triage Incidents</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={() => setActiveTab(card.tab)}
              className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-xl p-5 cursor-pointer transition group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-400 group-hover:text-slate-200 transition">
                  {card.title}
                </span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  card.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-400' :
                  card.color === 'rose' ? 'bg-rose-500/10 text-rose-400' :
                  card.color === 'purple' ? 'bg-purple-500/10 text-purple-400' :
                  'bg-blue-500/10 text-blue-400'
                }`}>
                  <Icon className={`w-4 h-4 ${card.pulse ? 'animate-pulse' : ''}`} />
                </div>
              </div>

              <div>
                <div className="text-3xl font-bold text-white tracking-tight">
                  {card.value}
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-xs text-slate-400 font-mono">
                    {card.total}
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity Feed */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              Tenant Live Activity Feed
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Latest 5 Audit Records
          </span>
        </div>

        <div className="divide-y divide-slate-800/80">
          {(!metrics?.recent_activity || metrics.recent_activity.length === 0) ? (
            <p className="py-4 text-center text-xs text-slate-500">No recent activity recorded yet.</p>
          ) : (
            metrics.recent_activity.map((item, idx) => (
              <div key={idx} className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <div>
                    <span className="font-semibold text-slate-200">
                      {item.action_type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-slate-400 ml-1.5">
                      on {item.target_resource_type} #{item.target_resource_id}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-4 text-slate-400">
                  <span className="text-slate-300 font-medium">
                    {item.performed_by_name || 'System'}
                  </span>
                  <span className="font-mono text-[11px] text-slate-500">
                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
