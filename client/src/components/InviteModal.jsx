import { useState, useEffect } from 'react';
import * as invitationService from '../services/invitationService.js';
import * as workspaceService from '../services/workspaceService.js';
import { Modal, Button, Input } from './ui';
import { Mail, UserPlus, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

const SelectWrapper = ({ label, value, onChange, options, disabled, placeholder = "Select..." }) => (
  <div className="space-y-1.5">
    {label && (
      <label className="block pl-0.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground select-none">
        {label}
      </label>
    )}
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="h-10 w-full appearance-none rounded-lg border border-input bg-background pl-3.5 pr-10 text-sm text-foreground transition-all hover:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="" disabled className="bg-background">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-background">
            {opt.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        <ChevronDown className="h-4 w-4" strokeWidth={2} />
      </div>
    </div>
  </div>
);

export default function InviteModal({ workspaceId, workspaceName, isOpen, onClose, onInviteSent }) {
  const [email, setEmail] = useState('');
  const [scope, setScope] = useState('workspace');
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [channels, setChannels] = useState([]);
  const [selectedChannelId, setSelectedChannelId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && (scope === 'team' || scope === 'channel') && workspaceId) {
      workspaceService.getTeams(workspaceId)
        .then(data => setTeams(data.teams || []))
        .catch(err => toast.error(err.message));
    }
  }, [isOpen, scope, workspaceId]);

  useEffect(() => {
    if (isOpen && scope === 'channel' && selectedTeamId) {
      workspaceService.getChannels(selectedTeamId)
        .then(data => setChannels(data.channels || []))
        .catch(err => toast.error(err.message));
    }
  }, [isOpen, scope, selectedTeamId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      const inviteData = {
        inviteeEmail: email,
        scope,
        workspaceId,
        teamId: (scope === 'team' || scope === 'channel') ? selectedTeamId : undefined,
        channelId: scope === 'channel' ? selectedChannelId : undefined,
      };

      await invitationService.createInvitation(inviteData);
      toast.success('Invitation sent successfully!');
      setEmail('');
      onInviteSent?.();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Invite Members"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="mb-6 rounded-xl border border-border bg-secondary/10 p-4">
          <h4 className="mb-1 text-sm font-semibold text-foreground">{workspaceName}</h4>
          <p className="text-xs text-muted-foreground">Invite new members to collaborate in this workspace.</p>
        </div>

        <SelectWrapper
          label="Access Level"
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          options={[
            { value: 'workspace', label: 'Workspace (Full Access)' },
            { value: 'team', label: 'Specific Team' },
            { value: 'channel', label: 'Specific Channel' },
          ]}
        />

        {(scope === 'team' || scope === 'channel') && (
          <SelectWrapper
            label="Team"
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            options={teams.map(t => ({ value: t._id, label: t.name }))}
            placeholder="Select a team"
          />
        )}

        {scope === 'channel' && (
          <SelectWrapper
            label="Channel"
            value={selectedChannelId}
            onChange={(e) => setSelectedChannelId(e.target.value)}
            options={channels.map(c => ({ value: c._id, label: c.name }))}
            disabled={!selectedTeamId}
            placeholder="Select a channel"
          />
        )}

        <Input
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="colleague@example.com"
          icon={Mail}
          required
        />

        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            disabled={
              loading ||
              (scope === 'team' && !selectedTeamId) ||
              (scope === 'channel' && (!selectedTeamId || !selectedChannelId))
            }
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Send Invite
          </Button>
        </div>
      </form>
    </Modal>
  );
}
