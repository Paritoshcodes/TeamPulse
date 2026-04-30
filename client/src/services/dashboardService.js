const API_URL = import.meta.env.VITE_PUBLIC_API_URL || import.meta.env.VITE_API_URL || '';

async function request(path, options = {}) {
  const url = path.startsWith('http') ? path : `${API_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || res.statusText || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export async function getDashboardOverview(workspaceId) {
  const params = new URLSearchParams();
  if (workspaceId) params.set('workspaceId', workspaceId);
  const query = params.toString();
  return request(`/api/dashboard/overview${query ? `?${query}` : ''}`);
}

export async function updateAvailabilityStatus(status) {
  return request('/api/dashboard/status', {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function togglePinnedConversation(kind, channelId, name) {
  return request('/api/dashboard/pins', {
    method: 'POST',
    body: JSON.stringify({ kind, channelId, name }),
  });
}
