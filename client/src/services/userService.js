/**
 * User API – profile and settings
 */
const API_URL = import.meta.env.VITE_PUBLIC_API_URL || '';

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

export async function updateSettings(settings) {
  return request('/api/user/settings', {
    method: 'PATCH',
    body: JSON.stringify(settings),
  });
}

export async function updateProfile({ name, avatar }) {
  return request('/api/user/profile', {
    method: 'PATCH',
    body: JSON.stringify({ name, avatar }),
  });
}

export async function changePassword({ currentPassword, newPassword }) {
  return request('/api/user/password', {
    method: 'PATCH',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function searchUsers(query, options = {}) {
  const params = new URLSearchParams({ q: query || '' });
  if (options.workspaceId) {
    params.set('workspaceId', options.workspaceId);
  }
  if (options.excludeWorkspaceMembers) {
    params.set('excludeWorkspaceMembers', 'true');
  }
  return request(`/api/user/search?${params.toString()}`);
}
