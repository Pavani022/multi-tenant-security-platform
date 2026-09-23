// Centralized API client handling requests and token injection

const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('deep_trace_token');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // If token expired, clear local session
    if (response.status === 401 && !endpoint.includes('/auth/login')) {
      localStorage.removeItem('deep_trace_token');
      localStorage.removeItem('deep_trace_user');
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    const error = new Error(data.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Authentication
  auth: {
    login: (email, password) => request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),
    getMe: () => request('/auth/me')
  },

  // Dashboard Metrics
  dashboard: {
    getMetrics: () => request('/dashboard/metrics')
  },

  // Campaigns
  campaigns: {
    list: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/campaigns${query ? `?${query}` : ''}`);
    },
    getById: (id) => request(`/campaigns/${id}`),
    create: (data) => request('/campaigns', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    update: (id, data) => request(`/campaigns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    delete: (id) => request(`/campaigns/${id}`, {
      method: 'DELETE'
    }),
    assignUser: (campaignId, userId) => request(`/campaigns/${campaignId}/assignments`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId })
    }),
    removeUser: (campaignId, userId) => request(`/campaigns/${campaignId}/assignments/${userId}`, {
      method: 'DELETE'
    })
  },

  // Security Events
  events: {
    list: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/events${query ? `?${query}` : ''}`);
    },
    updateStatus: (id, status, notes = '') => request(`/events/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes })
    })
  },

  // Audit Logs
  auditLogs: {
    list: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/audit-logs${query ? `?${query}` : ''}`);
    }
  },

  // Users Management
  users: {
    list: () => request('/users'),
    create: (data) => request('/users', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }
};
