import { useEffect, useMemo, useState } from 'react';
import { Modal, Button, Input } from './ui';
import * as managementService from '../services/managementService.js';
import * as workspaceService from '../services/workspaceService.js';
import { Settings2, Users, UserPlus, Save } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';

export default function WorkspaceSettingsModal({
  isOpen,
  workspaceId,
  currentUserId,
  onClose,
  onUpdated,
  onLeft,
}) {
  const [tab, setTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workspace, setWorkspace] = useState(null);
  const [permissions, setPermissions] = useState({
    canManageWorkspace: false,
    canManageMembers: false,
    canTransferOwnership: false,
  });

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatar, setAvatar] = useState('');
  const [allowMemberInvites, setAllowMemberInvites] = useState(false);
  const [defaultMemberRole, setDefaultMemberRole] = useState('member');

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');

  const memberRows = useMemo(() => {
    if (!workspace) return [];
    const ownerId = workspace.owner?._id;
    const ownerRow = workspace.owner
      ? [{
          _id: ownerId,
          name: workspace.owner.name,
          email: workspace.owner.email,
          avatar: workspace.owner.avatar,
          role: 'owner',
        }]
      : [];

    const memberList = (workspace.members || []).map((item) => ({
      _id: item.user?._id,
      name: item.user?.name || 'Unknown',
      email: item.user?.email || '',
      avatar: item.user?.avatar,
      role: item.role || 'member',
    }));

    return [...ownerRow, ...memberList];
  }, [workspace]);

  const loadSettings = async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const data = await managementService.getWorkspaceSettings(workspaceId);
      if (data?.success) {
        setWorkspace(data.workspace);
        setPermissions(data.permissions || {});

        setName(data.workspace?.name || '');
        setDescription(data.workspace?.description || '');
        setAvatar(data.workspace?.avatar || '');
        setAllowMemberInvites(Boolean(data.workspace?.settings?.allowMemberInvites));
        setDefaultMemberRole(data.workspace?.settings?.defaultMemberRole || 'member');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load workspace settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && workspaceId) {
      setTab('general');
      loadSettings();
    }
  }, [isOpen, workspaceId]);

  const handleSaveGeneral = async () => {
    if (!permissions.canManageWorkspace) {
      toast.error('Only workspace admins can update settings');
      return;
    }

    setSaving(true);
    try {
      await managementService.updateWorkspaceSettings(workspaceId, {
        name,
        description,
        avatar,
        settings: {
          allowMemberInvites,
          defaultMemberRole,
        },
      });
      toast.success('Workspace settings updated');
      await loadSettings();
      onUpdated?.();
    } catch (err) {
      toast.error(err.message || 'Failed to update workspace settings');
    } finally {
      setSaving(false);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) return;
    setSaving(true);
    try {
      await workspaceService.addWorkspaceMember(workspaceId, inviteEmail.trim(), inviteRole);
      toast.success('Member added');
      setInviteEmail('');
      await loadSettings();
      onUpdated?.();
    } catch (err) {
      toast.error(err.message || 'Failed to add member');
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (memberId, role) => {
    setSaving(true);
    try {
      await managementService.updateWorkspaceMemberRole(workspaceId, memberId, role);
      toast.success('Member role updated');
      await loadSettings();
      onUpdated?.();
    } catch (err) {
      toast.error(err.message || 'Failed to update role');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Remove this member from workspace?')) return;
    setSaving(true);
    try {
      await managementService.removeWorkspaceMember(workspaceId, memberId);
      toast.success('Member removed');
      await loadSettings();
      onUpdated?.();
    } catch (err) {
      toast.error(err.message || 'Failed to remove member');
    } finally {
      setSaving(false);
    }
  };

  const handleTransferOwnership = async (memberId) => {
    if (!window.confirm('Transfer workspace ownership to this member?')) return;
    setSaving(true);
    try {
      await managementService.transferWorkspaceOwner(workspaceId, memberId);
      toast.success('Ownership transferred');
      await loadSettings();
      onUpdated?.();
    } catch (err) {
      toast.error(err.message || 'Failed to transfer ownership');
    } finally {
      setSaving(false);
    }
  };

  const handleLeaveWorkspace = async () => {
    if (!window.confirm('Leave this workspace?')) return;
    setSaving(true);
    try {
      await managementService.leaveWorkspace(workspaceId);
      toast.success('You left the workspace');
      onLeft?.();
      onClose?.();
    } catch (err) {
      toast.error(err.message || 'Failed to leave workspace');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Workspace Settings" size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-card/60 p-1">
          <button
            onClick={() => setTab('general')}
            className={`relative rounded-md px-3 py-2 text-sm font-semibold transition-colors ${tab === 'general' ? 'text-primary-foreground' : 'text-muted-foreground hover:bg-accent/20 hover:text-foreground'}`}
          >
            {tab === 'general' && (
              <motion.span
                layoutId="ws-settings-tab"
                transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.9 }}
                className="absolute inset-0 rounded-md bg-primary"
              />
            )}
            <span className="relative z-10 inline-flex items-center gap-1.5"><Settings2 size={14} />General</span>
          </button>
          <button
            onClick={() => setTab('members')}
            className={`relative rounded-md px-3 py-2 text-sm font-semibold transition-colors ${tab === 'members' ? 'text-primary-foreground' : 'text-muted-foreground hover:bg-accent/20 hover:text-foreground'}`}
          >
            {tab === 'members' && (
              <motion.span
                layoutId="ws-settings-tab"
                transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.9 }}
                className="absolute inset-0 rounded-md bg-primary"
              />
            )}
            <span className="relative z-10 inline-flex items-center gap-1.5"><Users size={14} />Members</span>
          </button>
        </div>

        {loading ? (
          <div className="rounded-lg border border-border bg-card/40 p-4 text-sm text-muted-foreground">Loading workspace settings...</div>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            {tab === 'general' && (
              <motion.div
                key="tab-general"
                initial={{ opacity: 0, y: 8, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.99 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="space-y-4 rounded-lg border border-border bg-card/40 p-4"
              >
                <Input label="Workspace Name" value={name} onChange={(e) => setName(e.target.value)} disabled={!permissions.canManageWorkspace} />
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={!permissions.canManageWorkspace}
                    rows={3}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                  />
                </div>
                <Input label="Avatar URL" value={avatar} onChange={(e) => setAvatar(e.target.value)} disabled={!permissions.canManageWorkspace} />

                <div className="grid grid-cols-2 gap-3">
                  <label className="rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Allow Member Invites</span>
                    <select
                      value={String(allowMemberInvites)}
                      onChange={(e) => setAllowMemberInvites(e.target.value === 'true')}
                      disabled={!permissions.canManageWorkspace}
                      className="w-full bg-transparent outline-none"
                    >
                      <option value="false">No</option>
                      <option value="true">Yes</option>
                    </select>
                  </label>

                  <label className="rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Default New Member Role</span>
                    <select
                      value={defaultMemberRole}
                      onChange={(e) => setDefaultMemberRole(e.target.value)}
                      disabled={!permissions.canManageWorkspace}
                      className="w-full bg-transparent outline-none"
                    >
                      <option value="member">Member</option>
                      <option value="guest">Guest</option>
                    </select>
                  </label>
                </div>

                <div className="flex justify-between gap-3 border-t border-border pt-3">
                  <Button type="button" variant="ghost" onClick={handleLeaveWorkspace} disabled={saving || !workspaceId}>Leave Workspace</Button>
                  <Button type="button" variant="primary" onClick={handleSaveGeneral} disabled={saving || !permissions.canManageWorkspace}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
                </div>
              </motion.div>
            )}

            {tab === 'members' && (
              <motion.div
                key="tab-members"
                initial={{ opacity: 0, y: 8, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.99 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="space-y-4 rounded-lg border border-border bg-card/40 p-4"
              >
                {permissions.canManageMembers && (
                  <div className="grid grid-cols-[1fr_120px_auto] gap-2">
                    <Input
                      label="Add member by email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="member@example.com"
                    />
                    <label className="rounded-lg border border-border bg-background/60 px-2 py-1 text-xs text-muted-foreground">
                      <span className="mb-1 block uppercase tracking-[0.08em]">Role</span>
                      <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="w-full bg-transparent text-sm text-foreground outline-none">
                        <option value="member">Member</option>
                        <option value="guest">Guest</option>
                        <option value="admin">Admin</option>
                      </select>
                    </label>
                    <div className="flex items-end">
                      <Button type="button" variant="secondary" onClick={handleInviteMember} disabled={saving || !inviteEmail.trim()}>
                        <UserPlus className="mr-1 h-4 w-4" />Add
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {memberRows.map((member) => {
                    const isSelf = member._id?.toString() === currentUserId?.toString();
                    const isOwner = member.role === 'owner';
                    return (
                      <div key={member._id} className="grid grid-cols-[1fr_130px_auto] items-center gap-2 rounded-lg border border-border bg-background/55 px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">{member.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                        </div>

                        <select
                          value={member.role}
                          disabled={!permissions.canManageMembers || isOwner}
                          onChange={(e) => handleRoleChange(member._id, e.target.value)}
                          className="rounded-md border border-border bg-card px-2 py-1.5 text-xs font-semibold capitalize text-foreground disabled:opacity-60"
                        >
                          <option value="owner">Owner</option>
                          <option value="admin">Admin</option>
                          <option value="member">Member</option>
                          <option value="guest">Guest</option>
                        </select>

                        <div className="flex justify-end gap-2">
                          {permissions.canTransferOwnership && !isOwner && (
                            <button
                              type="button"
                              onClick={() => handleTransferOwnership(member._id)}
                              className="rounded-md border border-border px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-accent/20 hover:text-foreground"
                            >
                              Make Owner
                            </button>
                          )}
                          {permissions.canManageMembers && !isOwner && !isSelf && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(member._id)}
                              className="rounded-md border border-destructive/40 px-2 py-1 text-xs font-semibold text-destructive hover:bg-destructive/10"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </Modal>
  );
}
