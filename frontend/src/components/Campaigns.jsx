import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Target, 
  Search, 
  Plus, 
  Trash2, 
  UserPlus, 
  UserMinus, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Play, 
  Clock, 
  Calendar,
  AlertCircle,
  Lock,
  ChevronLeft,
  ChevronRight,
  Shield
} from 'lucide-react';

export default function Campaigns() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, totalRecords: 0 });

  // Modals state
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [tenantUsers, setTenantUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');

  // New Campaign Form
  const [newCampaign, setNewCampaign] = useState({
    campaign_name: '',
    campaign_description: '',
    start_date: '',
    end_date: '',
    campaign_status: 'DRAFT'
  });

  const canManageCampaigns = user?.role_name === 'ADMIN' || user?.role_name === 'MANAGER';
  const canDeleteCampaigns = user?.role_name === 'ADMIN';

  const fetchCampaigns = async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: 6 };
      if (statusFilter) params.status = statusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.campaigns.list(params);
      setCampaigns(res.data.campaigns);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.message || 'Failed to fetch campaigns');
    } finally {
      setLoading(false);
    }
  };

  const fetchTenantUsers = async () => {
    try {
      const res = await api.users.list();
      setTenantUsers(res.data);
    } catch (err) {
      console.error('Failed to load users for assignment:', err);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchCampaigns();
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.campaigns.create(newCampaign);
      setShowCreateModal(false);
      setNewCampaign({
        campaign_name: '',
        campaign_description: '',
        start_date: '',
        end_date: '',
        campaign_status: 'DRAFT'
      });
      fetchCampaigns();
    } catch (err) {
      alert(`Error creating campaign: ${err.message}`);
    }
  };

  const handleStatusTransition = async (campaignId, targetStatus) => {
    try {
      await api.campaigns.update(campaignId, { campaign_status: targetStatus });
      fetchCampaigns();
      if (selectedCampaign && selectedCampaign.campaign_id === campaignId) {
        openCampaignDetails(campaignId);
      }
    } catch (err) {
      alert(`Status transition error: ${err.message}`);
    }
  };

  const handleDelete = async (campaignId, campaignName) => {
    if (!window.confirm(`Are you sure you want to permanently delete campaign '${campaignName}'?`)) return;
    try {
      await api.campaigns.delete(campaignId);
      fetchCampaigns();
      if (selectedCampaign?.campaign_id === campaignId) setSelectedCampaign(null);
    } catch (err) {
      alert(`Delete error: ${err.message}`);
    }
  };

  const openCampaignDetails = async (campaignId) => {
    try {
      const res = await api.campaigns.getById(campaignId);
      setSelectedCampaign(res.data);
    } catch (err) {
      alert(`Failed to load campaign: ${err.message}`);
    }
  };

  const openAssignModal = async (campaign) => {
    setSelectedCampaign(campaign);
    await fetchTenantUsers();
    setShowAssignModal(true);
  };

  const handleAssignUser = async (e) => {
    e.preventDefault();
    if (!selectedUserId) return;
    try {
      await api.campaigns.assignUser(selectedCampaign.campaign_id, selectedUserId);
      setShowAssignModal(false);
      setSelectedUserId('');
      fetchCampaigns();
      openCampaignDetails(selectedCampaign.campaign_id);
    } catch (err) {
      alert(`Assignment failed: ${err.message}`);
    }
  };

  const handleRemoveAssignment = async (campaignId, userId) => {
    try {
      await api.campaigns.removeUser(campaignId, userId);
      openCampaignDetails(campaignId);
      fetchCampaigns();
    } catch (err) {
      alert(`Failed to remove assignment: ${err.message}`);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'DRAFT':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'COMPLETED':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'CANCELLED':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <Target className="w-5 h-5 text-emerald-400" />
            <span>Campaign Management</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Create, track, and assign security simulations within your tenant organization
          </p>
        </div>

        {canManageCampaigns ? (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-400 text-slate-950 hover:bg-emerald-300 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Campaign</span>
          </button>
        ) : (
          <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs bg-slate-900 border border-slate-800 text-slate-500">
            <Lock className="w-3.5 h-3.5" />
            <span>Role USER: View Only</span>
          </div>
        )}
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        
        {/* Status Pills */}
        <div className="flex flex-wrap gap-1.5">
          {['', 'ACTIVE', 'DRAFT', 'COMPLETED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => { setStatusFilter(st); setPage(1); }}
              className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                statusFilter === st
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {st || 'All Campaigns'}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative min-w-[260px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search campaigns..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-700/80 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </form>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Campaigns Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">Loading campaigns...</div>
      ) : campaigns.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-xl">
          <Target className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No campaigns found matching criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map((camp) => (
            <div
              key={camp.campaign_id}
              className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-xl p-5 flex flex-col justify-between transition group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-semibold ${getStatusBadge(camp.campaign_status)}`}>
                    {camp.campaign_status}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    ID #{camp.campaign_id}
                  </span>
                </div>

                <h3 className="text-base font-semibold text-white tracking-tight line-clamp-1 mb-1.5 group-hover:text-emerald-400 transition">
                  {camp.campaign_name}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-2 mb-4">
                  {camp.campaign_description || 'No description provided.'}
                </p>
              </div>

              <div>
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500 font-mono mb-4">
                  <span>Assigned: {camp.assigned_users_count} users</span>
                  <span>{camp.start_date || 'No Date'}</span>
                </div>

                {/* Actions Toolbar */}
                <div className="flex items-center justify-between gap-1.5">
                  <button
                    onClick={() => openCampaignDetails(camp.campaign_id)}
                    className="flex-1 py-1.5 px-2 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center space-x-1.5 transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Details</span>
                  </button>

                  {canManageCampaigns && (
                    <button
                      onClick={() => openAssignModal(camp)}
                      title="Assign Users"
                      className="p-1.5 rounded-md text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-blue-400" />
                    </button>
                  )}

                  {canDeleteCampaigns && (
                    <button
                      onClick={() => handleDelete(camp.campaign_id, camp.campaign_name)}
                      title="Delete Campaign (Admin Only)"
                      className="p-1.5 rounded-md text-xs bg-slate-800 hover:bg-rose-500/20 text-rose-400 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xs text-slate-400">
          <span>Showing Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalRecords} total)</span>
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

      {/* ========================================================================= */}
      {/* MODAL 1: Create Campaign */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Create New Campaign</h3>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Campaign Title *</label>
                <input
                  type="text"
                  required
                  value={newCampaign.campaign_name}
                  onChange={(e) => setNewCampaign({ ...newCampaign, campaign_name: e.target.value })}
                  placeholder="e.g. Q4 Executive Spear Phishing Drill"
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description & Scope</label>
                <textarea
                  rows="3"
                  value={newCampaign.campaign_description}
                  onChange={(e) => setNewCampaign({ ...newCampaign, campaign_description: e.target.value })}
                  placeholder="Outline objectives, methodology, and targets..."
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={newCampaign.start_date}
                    onChange={(e) => setNewCampaign({ ...newCampaign, start_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">End Date</label>
                  <input
                    type="date"
                    value={newCampaign.end_date}
                    onChange={(e) => setNewCampaign({ ...newCampaign, end_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                >
                  Create Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Campaign Details & Status Transitions */}
      {/* ========================================================================= */}
      {selectedCampaign && !showAssignModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-semibold ${getStatusBadge(selectedCampaign.campaign_status)}`}>
                    {selectedCampaign.campaign_status}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">ID #{selectedCampaign.campaign_id}</span>
                </div>
                <h3 className="text-lg font-bold text-white">{selectedCampaign.campaign_name}</h3>
              </div>
              <button
                onClick={() => setSelectedCampaign(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              {selectedCampaign.campaign_description || 'No description.'}
            </p>

            {/* Campaign State Machine Transitions */}
            {canManageCampaigns && (
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Status Transition Controls (State Machine)
                </span>
                <div className="flex flex-wrap gap-2">
                  {selectedCampaign.campaign_status === 'DRAFT' && (
                    <>
                      <button
                        onClick={() => handleStatusTransition(selectedCampaign.campaign_id, 'ACTIVE')}
                        className="px-3 py-1.5 rounded-md text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 flex items-center space-x-1"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Launch (Set ACTIVE)</span>
                      </button>
                      <button
                        onClick={() => handleStatusTransition(selectedCampaign.campaign_id, 'CANCELLED')}
                        className="px-3 py-1.5 rounded-md text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30 flex items-center space-x-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Cancel Campaign</span>
                      </button>
                    </>
                  )}

                  {selectedCampaign.campaign_status === 'ACTIVE' && (
                    <>
                      <button
                        onClick={() => handleStatusTransition(selectedCampaign.campaign_id, 'COMPLETED')}
                        className="px-3 py-1.5 rounded-md text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 flex items-center space-x-1"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Mark as COMPLETED</span>
                      </button>
                      <button
                        onClick={() => handleStatusTransition(selectedCampaign.campaign_id, 'CANCELLED')}
                        className="px-3 py-1.5 rounded-md text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30 flex items-center space-x-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Cancel Campaign</span>
                      </button>
                    </>
                  )}

                  {['COMPLETED', 'CANCELLED'].includes(selectedCampaign.campaign_status) && (
                    <span className="text-xs text-slate-500 font-mono italic">
                      Terminal state reached ({selectedCampaign.campaign_status}). No further transitions allowed.
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Assigned Users Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-white uppercase tracking-wider">
                  Assigned Team Members ({selectedCampaign.assigned_users?.length || 0})
                </span>
                {canManageCampaigns && (
                  <button
                    onClick={() => { setShowAssignModal(true); fetchTenantUsers(); }}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Assign Member</span>
                  </button>
                )}
              </div>

              <div className="divide-y divide-slate-800 border border-slate-800 rounded-lg overflow-hidden bg-slate-950/40">
                {(!selectedCampaign.assigned_users || selectedCampaign.assigned_users.length === 0) ? (
                  <p className="p-4 text-xs text-slate-500 text-center">No team members assigned yet.</p>
                ) : (
                  selectedCampaign.assigned_users.map((u) => (
                    <div key={u.user_id} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-200 font-medium">{u.full_name}</span>
                        <span className="text-slate-500 font-mono ml-2">({u.email_address})</span>
                      </div>

                      {canManageCampaigns && (
                        <button
                          onClick={() => handleRemoveAssignment(selectedCampaign.campaign_id, u.user_id)}
                          className="text-rose-400 hover:text-rose-300 p-1"
                          title="Unassign user"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: Assign User to Campaign */}
      {/* ========================================================================= */}
      {showAssignModal && selectedCampaign && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">Assign User to Campaign</h3>
            <p className="text-xs text-slate-400 mb-4">
              Campaign: <span className="text-slate-200 font-semibold">{selectedCampaign.campaign_name}</span>
            </p>

            <form onSubmit={handleAssignUser} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Select Tenant Team Member</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  required
                >
                  <option value="">-- Choose a user --</option>
                  {tenantUsers.map((u) => (
                    <option key={u.user_id} value={u.user_id}>
                      {u.full_name} ({u.role_name} - {u.email_address})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
