/**
 * Connection Service - Handles social connection requests and status
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

const connectionService = {
    /**
     * Send connection request to a user
     */
    sendRequest: (userId) => request('/api/connections/request', {
        method: 'POST',
        body: JSON.stringify({ userId })
    }),

    /**
     * Accept a connection request
     */
    acceptRequest: (userId) => request(`/api/connections/accept/${userId}`, {
        method: 'POST'
    }),

    /**
     * Reject a connection request
     */
    rejectRequest: (userId) => request(`/api/connections/reject/${userId}`, {
        method: 'POST'
    }),

    /**
     * Cancel a sent request
     */
    cancelRequest: (userId) => request(`/api/connections/cancel/${userId}`, {
        method: 'POST'
    }),

    /**
     * Check connection status between current user and another
     */
    getStatus: (userId) => request(`/api/connections/status/${userId}`)
};

export default connectionService;
