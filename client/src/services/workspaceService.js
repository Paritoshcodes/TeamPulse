/**
 * Workspace / Team / Channel API – all requests use credentials for cookie auth.
 */
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

export async function createWorkspace(name) {
  return request('/api/workspaces', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function getMyWorkspaces() {
  return request('/api/workspaces');
}

export async function getWorkspaceById(id) {
  return request(`/api/workspaces/${id}`);
}

export async function getTeams(workspaceId) {
  return request(`/api/teams?workspaceId=${encodeURIComponent(workspaceId)}`);
}

export async function createTeam(name, workspaceId) {
  return request('/api/teams', {
    method: 'POST',
    body: JSON.stringify({ name, workspaceId }),
  });
}

export async function getChannels(teamId) {
  return request(`/api/channels?teamId=${encodeURIComponent(teamId)}`);
}

export async function createChannel(name, teamId, type = 'text', isPrivate = false) {
  return request('/api/channels', {
    method: 'POST',
    body: JSON.stringify({ name, teamId, type, isPrivate }),
  });
}

export async function addWorkspaceMember(workspaceId, email, role = 'member') {
  return request(`/api/workspaces/${workspaceId}/members`, {
    method: 'POST',
    body: JSON.stringify({ email, role }),
  });
}
