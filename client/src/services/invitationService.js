/**
 * Invitation service – API calls for inviting users to workspaces
 */
const API_URL = import.meta.env.VITE_PUBLIC_API_URL || import.meta.env.VITE_API_URL || '';

export async function createInvitation({ inviteeEmail, scope = 'workspace', workspaceId, teamId, channelId, role = 'member' }) {
  const body = { inviteeEmail, scope, role };
  if (workspaceId) body.workspaceId = workspaceId;
  if (teamId) body.teamId = teamId;
  if (channelId) body.channelId = channelId;

  const response = await fetch(`${API_URL}/api/invitations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to create invitation');
  }
  return response.json();
}

export async function acceptInvitation(invitationId) {
  const response = await fetch(`${API_URL}/api/invitations/${invitationId}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to accept invitation');
  }
  return response.json();
}

export async function declineInvitation(invitationId) {
  const response = await fetch(`${API_URL}/api/invitations/${invitationId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to decline invitation');
  }
  return { success: true };
}

export async function getPendingInvitations() {
  const response = await fetch(`${API_URL}/api/invitations`, {
    method: 'GET',
    credentials: 'include',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch invitations');
  }
  return response.json();
}
