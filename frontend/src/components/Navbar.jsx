import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Shield, 
  LayoutDashboard, 
  Target, 
  AlertTriangle, 
  Users, 
  FileText, 
  LogOut, 
  Building2,
  Lock
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab }) {
  const { user, logout } = useAuth();

  const isAuditAccessible = user?.role_name === 'ADMIN' || user?.role_name === 'MANAGER';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'campaigns', label: 'Campaigns', icon: Target },
    { id: 'events', label: 'Security Events', icon: AlertTriangle },
    { id: 'users', label: 'Team Directory', icon: Users },
    { 
      id: 'audit-logs', 
      label: 'Audit Trail', 
      icon: FileText,
      restricted: !isAuditAccessible 
    },
  ];

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-900/60 text-purple-300 border-purple-700/60';
      case 'MANAGER':
        return 'bg-blue-900/60 text-blue-300 border-blue-700/60';
      case 'USER':
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <header className="bg-slate-900/90 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Tenant Context Badge */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Shield className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg tracking-tight text-white hidden sm:inline-block">
                DEEP<span className="text-emerald-400">TRACE</span>
              </span>
            </div>

            {/* Active Tenant Organization Indicator */}
            <div className="hidden md:flex items-center space-x-1.5 px-3 py-1 bg-slate-800/80 border border-slate-700/80 rounded-full text-xs text-slate-300">
              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold text-slate-200">{user?.tenant_name || 'Organization'}</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              if (item.restricted) {
                return (
                  <button
                    key={item.id}
                    disabled
                    title="Requires ADMIN or MANAGER privileges"
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-slate-600 cursor-not-allowed opacity-60"
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden lg:inline">{item.label}</span>
                    <Lock className="w-3 h-3 text-slate-600" />
                  </button>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden lg:inline">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User Info & Logout */}
          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-medium text-slate-200">{user?.full_name}</span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${getRoleBadgeColor(user?.role_name)}`}>
                {user?.role_name}
              </span>
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}
