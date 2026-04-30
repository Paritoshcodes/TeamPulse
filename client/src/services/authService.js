/**
 * Auth API – register, login, guest, me, logout. All requests use credentials for httpOnly cookie.
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

export async function register({ name, email, password, username }) {
  return request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, username }),
  });
}

export async function login({ email, password }) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function guest() {
  return request('/api/auth/guest', { method: 'POST' });
}

export async function me() {
  return request('/api/auth/me');
}

/**
 * Get token for Socket.io (cookie is httpOnly so client needs this)
 */
export async function getSocketToken() {
  return request('/api/auth/socket-token');
}

export async function logout() {
  return request('/api/auth/logout', { method: 'POST' });
}

export async function sendOtp() {
  return request('/api/send-otp', { method: 'POST' });
}

export async function verifyEmail(otp) {
  return request('/api/auth/verify-email', { method: 'POST', body: JSON.stringify({ otp }) });
}

export async function requestPasswordReset(email) {
  return request('/api/auth/request-password-reset', {
    method: 'POST',
    body: JSON.stringify({ email })
  });
}

export async function resetPassword({ email, otp, password }) {
  return request('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, otp, password })
  });
}

/**
 * Check username availability (live validation)
 */
export async function checkUsername(username) {
  return request(`/api/username/check/${encodeURIComponent(username)}`);
}

/**
 * Set username for current user
 */
export async function setUsername(username) {
  return request('/api/username/set', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
}

/**
 * Redirect to backend Google OAuth. Cookie will be set on callback; use same API origin (VITE_PUBLIC_API_URL).
 */
export function getGoogleLoginUrl() {
  return `${API_URL}/api/auth/google`;
}
