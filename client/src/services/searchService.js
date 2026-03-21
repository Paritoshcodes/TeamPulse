const API_URL = import.meta.env.VITE_API_URL || '';

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

export async function globalSearch({ q, workspaceId, filters = {} }) {
  const params = new URLSearchParams();
  params.set('q', q);
  if (workspaceId) params.set('workspaceId', workspaceId);
  if (filters && Object.keys(filters).length) {
    params.set('filters', JSON.stringify(filters));
  }
  return request(`/api/search?${params.toString()}`);
}
