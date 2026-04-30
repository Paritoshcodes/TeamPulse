/**
 * Direct Message API
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

/**
 * Start a DM conversation (or get existing one)
 */
export async function startDM(userId) {
    return request('/api/dm/start', {
        method: 'POST',
        body: JSON.stringify({ userId }),
    });
}

/**
 * Get all DM conversations
 */
export async function getDMs() {
    return request('/api/dm/list');
}
