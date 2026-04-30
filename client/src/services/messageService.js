/**
 * Message API – history (REST). Real-time via useSocket.
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

export async function getMessages(channelId, options = {}) {
  const params = new URLSearchParams({ channelId });
  if (options.limit) params.set('limit', String(options.limit));
  if (options.before) params.set('before', options.before);
  return request(`/api/messages?${params}`);
}

export async function updateMessage(messageId, content) {
  return request(`/api/messages/${messageId}`, {
    method: 'PATCH',
    body: JSON.stringify({ content })
  });
}

export async function deleteMessage(messageId) {
  return request(`/api/messages/${messageId}`, {
    method: 'DELETE'
  });
}

export async function reactToMessage(messageId, emoji) {
  return request(`/api/messages/${messageId}/react`, {
    method: 'POST',
    body: JSON.stringify({ emoji })
  });
}

export async function getThreadMessages(messageId, options = {}) {
  const params = new URLSearchParams();
  if (options.limit) params.set('limit', String(options.limit));
  const query = params.toString();
  return request(`/api/messages/thread/${messageId}${query ? `?${query}` : ''}`);
}

export async function replyToMessage(messageId, content) {
  return request(`/api/messages/${messageId}/reply`, {
    method: 'POST',
    body: JSON.stringify({ content })
  });
}
