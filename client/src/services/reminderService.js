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

export async function getReminders() {
  return request('/api/reminders');
}

export async function createReminder(payload) {
  return request('/api/reminders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function createFollowUpReminder(payload) {
  return request('/api/reminders/follow-up', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function scheduleMessage(payload) {
  return request('/api/reminders/schedule-message', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function snoozeChannel(channelId, minutes, forever = false) {
  return request('/api/reminders/snooze-channel', {
    method: 'POST',
    body: JSON.stringify({ channelId, minutes, forever }),
  });
}

export async function unsnoozeChannel(channelId) {
  return request(`/api/reminders/snooze-channel/${encodeURIComponent(channelId)}`, {
    method: 'DELETE',
  });
}

export async function getChannelSnoozeState(channelId) {
  return request(`/api/reminders/snooze-channel/${encodeURIComponent(channelId)}`);
}

export async function cancelReminder(id) {
  return request(`/api/reminders/${id}/cancel`, {
    method: 'PATCH',
  });
}
