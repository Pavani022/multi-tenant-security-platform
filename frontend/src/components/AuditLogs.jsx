import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  FileText, 
  ShieldAlert, 
  Lock, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Code,
  Globe
} from 'lucide-react';

export default function AuditLogs() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, totalRecords: 0 });
  const [selectedDetails, setSelectedDetails] = useState(null);

  const isAuthorized = user?.role_name === 'ADMIN' || user?.role_name === 'MANAGER';

  const fetchLogs = async () => {
    if (!isAuthorized) return;
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: 10 };
      if (actionFilter) params.action_type = actionFilter;

      const res = await api.auditLogs.list(params);
      setLogs(res.data.audit_logs);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.message || 'Failed to fetch audit records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter]);

  if (!isAuthorized) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center max-w-lg mx-auto mt-12">
        <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Access Denied: Restricted Module</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          System compliance audit trails contain sensitive administrative metadata and are restricted to users with <span className="text-purple-300 font-semibold">ADMIN</span> or <span className="text-blue-300 font-semibold">MANAGER</span> roles.
        </p>
      </div>
    );
  }

  const getActionBadge = (action) => {
    if (action.includes('LOGIN')) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    if (action.includes('DELETE')) return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    if (action.includes('CREATED') || action.includes('ASSIGNED')) return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <span>Compliance & Security Audit Trail</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Immutable log of all administrative actions and security modifications
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center space-x-2">
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Action Types</option>
            <option value="USER_LOGIN">USER_LOGIN</option>
            <option value="CAMPAIGN_CREATED">CAMPAIGN_CREATED</option>
            <option value="CAMPAIGN_UPDATED">CAMPAIGN_UPDATED</option>
            <option value="CAMPAIGN_DELETED">CAMPAIGN_DELETED</option>
            <option value="USER_ASSIGNED_TO_CAMPAIGN">USER_ASSIGNED_TO_CAMPAIGN</option>
            <option value="USER_REMOVED_FROM_CAMPAIGN">USER_REMOVED_FROM_CAMPAIGN</option>
            <option value="SECURITY_EVENT_TRIAGED">SECURITY_EVENT_TRIAGED</option>
            <option value="USER_CREATED">USER_CREATED</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Audit Log Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Resource</th>
                <th className="py-3 px-4">Executed By</th>
                <th className="py-3 px-4">Source IP</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 text-right">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500">
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500">
                    No audit records found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.audit_log_id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${getActionBadge(log.action_type)}`}>
                        {log.action_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-300">
                      {log.target_resource_type} #{log.target_resource_id || '-'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-medium text-white">{log.performed_by_name || 'System'}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{log.performed_by_role || '-'}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-400 text-[11px]">
                      {log.client_ip_address || '127.0.0.1'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-500 text-[11px]">
                      {new Date(log.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-right">
                      {log.action_details_json ? (
                        <button
                          onClick={() => setSelectedDetails(log)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center space-x-1 ml-auto text-[11px]"
                        >
                          <Code className="w-3 h-3" />
                          <span>View Details</span>
                        </button>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 text-xs text-slate-400">
          <span>Page {pagination.currentPage} of {pagination.totalPages}</span>
          <div className="flex items-center space-x-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="p-1.5 rounded bg-slate-900 border border-slate-800 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              className="p-1.5 rounded bg-slate-900 border border-slate-800 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* JSON Details Inspector Modal */}
      {selectedDetails && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Code className="w-4 h-4 text-emerald-400" />
                <span>Audit Context Payload (ID #{selectedDetails.audit_log_id})</span>
              </h3>
              <button
                onClick={() => setSelectedDetails(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto">
              {JSON.stringify(
                typeof selectedDetails.action_details_json === 'string'
                  ? JSON.parse(selectedDetails.action_details_json)
                  : selectedDetails.action_details_json,
                null,
                2
              )}
            </pre>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setSelectedDetails(null)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
