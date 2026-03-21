/**
 * Management Service - CRUD operations for workspaces, teams, channels
 */
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

// Workspace Management
export async function renameWorkspace(id, name) {
    return request(`/api/workspaces/${id}/rename`, {
        method: 'PATCH',
        body: JSON.stringify({ name }),
    });
}

export async function deleteWorkspace(id) {
    return request(`/api/workspaces/${id}`, {
        method: 'DELETE',
    });
}

// Team Management
export async function renameTeam(id, name) {
    return request(`/api/teams/${id}/rename`, {
        method: 'PATCH',
        body: JSON.stringify({ name }),
    });
}

export async function deleteTeam(id) {
    return request(`/api/teams/${id}`, {
        method: 'DELETE',
    });
}

// Channel Management
export async function renameChannel(id, name) {
    return request(`/api/channels/${id}/rename`, {
        method: 'PATCH',
        body: JSON.stringify({ name }),
    });
}

export async function deleteChannel(id) {
    return request(`/api/channels/${id}`, {
        method: 'DELETE',
    });
}

export async function getChannelMembers(channelId) {
    return request(`/api/channels/${channelId}/members`);
}

// User Search
export async function searchUsers(query) {
    return request(`/api/user/search?q=${encodeURIComponent(query)}`);
}

// Workspace Settings
export async function getWorkspaceSettings(id) {
    return request(`/api/workspaces/${id}/settings`);
}

export async function updateWorkspaceSettings(id, payload) {
    return request(`/api/workspaces/${id}/settings`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
    });
}

export async function updateWorkspaceMemberRole(workspaceId, memberId, role) {
    return request(`/api/workspaces/${workspaceId}/members/${memberId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
    });
}

export async function removeWorkspaceMember(workspaceId, memberId) {
    return request(`/api/workspaces/${workspaceId}/members/${memberId}`, {
        method: 'DELETE',
    });
}

export async function leaveWorkspace(workspaceId) {
    return request(`/api/workspaces/${workspaceId}/leave`, {
        method: 'DELETE',
    });
}

export async function transferWorkspaceOwner(workspaceId, newOwnerId) {
    return request(`/api/workspaces/${workspaceId}/transfer-owner`, {
        method: 'PATCH',
        body: JSON.stringify({ newOwnerId }),
    });
}
