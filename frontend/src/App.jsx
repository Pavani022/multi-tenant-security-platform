import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Campaigns from './components/Campaigns';
import SecurityEvents from './components/SecurityEvents';
import Users from './components/Users';
import AuditLogs from './components/AuditLogs';
import { Shield, Building, UserCheck } from 'lucide-react';

function MainApp() {
  const { isAuthenticated, user, login } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);

  if (!isAuthenticated) {
    return <Login />;
  }

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard setActiveTab={setActiveTab} />;
      case 'campaigns':
        return <Campaigns />;
      case 'events':
        return <SecurityEvents />;
      case 'users':
        return <Users />;
      case 'audit-logs':
        return <AuditLogs />;
      default:
        return <Dashboard setActiveTab={setActiveTab} />;
    }
  };

  const handleQuickSwitch = (email, password) => {
    setShowPersonaMenu(false);
    login(email, password);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {renderActiveScreen()}
      </main>

      {/* Floating Demo Persona Quick Switcher (Convenient for video recording & evaluation) */}
      <div className="fixed bottom-4 right-4 z-50">
        <div className="relative">
          {showPersonaMenu && (
            <div className="absolute bottom-12 right-0 w-80 bg-slate-900 border border-slate-700/80 rounded-2xl p-4 shadow-2xl space-y-2 backdrop-blur-xl">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Switch Persona / Tenant
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">1-Click Test</span>
              </div>

              <div className="space-y-1.5 pt-1">
                <button
                  onClick={() => handleQuickSwitch('admin@acme.com', 'Admin@123')}
                  className="w-full text-left p-2 rounded-lg bg-slate-950/70 hover:bg-slate-800 border border-slate-800 flex items-center justify-between text-xs transition"
                >
                  <div>
                    <div className="font-semibold text-white">Acme Cyber Corp</div>
                    <div className="text-[11px] text-purple-400">Alice Admin (ADMIN)</div>
                  </div>
                  <UserCheck className="w-4 h-4 text-purple-400" />
                </button>

                <button
                  onClick={() => handleQuickSwitch('manager@acme.com', 'Password@123')}
                  className="w-full text-left p-2 rounded-lg bg-slate-950/70 hover:bg-slate-800 border border-slate-800 flex items-center justify-between text-xs transition"
                >
                  <div>
                    <div className="font-semibold text-white">Acme Cyber Corp</div>
                    <div className="text-[11px] text-blue-400">Bob Manager (MANAGER)</div>
                  </div>
                  <UserCheck className="w-4 h-4 text-blue-400" />
                </button>

                <button
                  onClick={() => handleQuickSwitch('user@acme.com', 'Password@123')}
                  className="w-full text-left p-2 rounded-lg bg-slate-950/70 hover:bg-slate-800 border border-slate-800 flex items-center justify-between text-xs transition"
                >
                  <div>
                    <div className="font-semibold text-white">Acme Cyber Corp</div>
                    <div className="text-[11px] text-slate-400">Charlie User (USER)</div>
                  </div>
                  <UserCheck className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  onClick={() => handleQuickSwitch('admin@stark.com', 'Admin@123')}
                  className="w-full text-left p-2 rounded-lg bg-slate-950/70 hover:bg-slate-800 border border-amber-900/40 flex items-center justify-between text-xs transition"
                >
                  <div>
                    <div className="font-semibold text-amber-300">Stark Defense Systems</div>
                    <div className="text-[11px] text-amber-400">Tony Stark (ADMIN)</div>
                  </div>
                  <Building className="w-4 h-4 text-amber-400" />
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => setShowPersonaMenu(!showPersonaMenu)}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 shadow-xl transition"
          >
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Switch Role / Tenant</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
