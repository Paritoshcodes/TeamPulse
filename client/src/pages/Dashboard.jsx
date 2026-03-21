import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { SocketProvider } from '../context/SocketContext.jsx';
import * as workspaceService from '../services/workspaceService.js';
import * as managementService from '../services/managementService.js';
import * as invitationService from '../services/invitationService.js';
import ChatWindow from '../components/chat/ChatWindow.jsx';
import VideoCallModal from '../components/chat/VideoCallModal.jsx';
import InviteModal from '../components/InviteModal.jsx';
import PendingInvitations from '../components/PendingInvitations.jsx';
import SettingsModal from '../components/SettingsModal.jsx';
import TopBar from '../components/app/TopBar.jsx';
import UsernameSetup from './UsernameSetup.jsx';
import ChannelMembersModal from '../components/ChannelMembersModal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Sidebar from '../components/layout/Sidebar.jsx';
import AppShell from '../components/layout/AppShell.jsx';
import WorkspaceRail from '../components/layout/WorkspaceRail.jsx';
import { OnlineStatusProvider } from '../context/OnlineStatusContext.jsx';
import * as dmService from '../services/dmService.js';
import * as dashboardService from '../services/dashboardService.js';
import * as notificationService from '../services/notificationService.js';
import connectionService from '../services/connectionService.js';
import { Button, ContextMenu, Input, Modal } from '../components/ui';
import SmartSearchModal from '../components/SmartSearchModal.jsx';
import DashboardHome from '../components/dashboard/DashboardHome.jsx';
import KeyboardShortcutsHelp from '../components/KeyboardShortcutsHelp.jsx';
import DmConnectModal from '../components/DmConnectModal.jsx';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import {
  Hash, Users,
  Lock,
  Edit2, Trash2, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('');
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [channels, setChannels] = useState([]);
  const [selectedChannelId, setSelectedChannelId] = useState('');
  const [selectedChannelName, setSelectedChannelName] = useState('');
  const [selectedChannelIsPrivate, setSelectedChannelIsPrivate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedDmId, setSelectedDmId] = useState('');
  const [selectedDmName, setSelectedDmName] = useState('');
  const [navMode, setNavMode] = useState('workspace');
  const [isWorkspaceSidebarOpen, setIsWorkspaceSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('profile');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [showUsernameSetup, setShowUsernameSetup] = useState(false);
  const [contextMenu, setContextMenu] = useState({ isOpen: false, position: { x: 0, y: 0 }, items: [] });
  const [channelMembersModal, setChannelMembersModal] = useState({ isOpen: false, channelId: null, channelName: '' });
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null, danger: false });
  const [actionLoading, setActionLoading] = useState(false);
  const [directMessages, setDirectMessages] = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [dashboardOverview, setDashboardOverview] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [smartSearchOpen, setSmartSearchOpen] = useState(false);
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [dmFinderOpen, setDmFinderOpen] = useState(false);
  const [videoCallState, setVideoCallState] = useState({
    isOpen: false,
    roomId: '',
    title: '',
    view: 'embedded',
  });
  const [createModal, setCreateModal] = useState({ isOpen: false, type: 'workspace' });
  const [createForm, setCreateForm] = useState({
    name: '',
    teamId: '',
    isPrivate: false,
    submitting: false,
  });
  const workspaceSwitchTimerRef = useRef(null);

  useKeyboardShortcuts({
    openSearch: () => setSmartSearchOpen(true),
    showHelp: () => setShortcutsHelpOpen(true),
    escape: () => {
      if (shortcutsHelpOpen) {
        setShortcutsHelpOpen(false);
        return;
      }
      if (smartSearchOpen) {
        setSmartSearchOpen(false);
      }
    },
  });

  const closeConfirmDialog = () => {
    setConfirmDialog((prev) => ({ ...prev, isOpen: false, onConfirm: null }));
  };

  useEffect(() => {
    let cancelled = false;
    workspaceService.getMyWorkspaces()
      .then((data) => {
        if (!cancelled) {
          const ws = data.workspaces || [];
          setWorkspaces(ws);
        }
      })
      .catch((err) => { if (!cancelled) toast.error(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    return () => {
      if (workspaceSwitchTimerRef.current) {
        clearTimeout(workspaceSwitchTimerRef.current);
      }
    };
  }, []);

  // Check if user needs to set username
  useEffect(() => {
    if (user && !user.username) {
      setShowUsernameSetup(true);
    }
    if (user) {
      loadDMs();
      loadDashboardOverview();
      loadNotifications();
    }
  }, [user]);

  const loadNotifications = async () => {
    setNotificationsLoading(true);
    try {
      const data = await notificationService.getNotifications();
      if (data?.success) {
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const markNotificationRead = async (notificationId) => {
    if (!notificationId) return;

    setNotifications((prev) =>
      prev.map((item) => (item?._id === notificationId ? { ...item, read: true } : item))
    );

    try {
      await notificationService.markNotificationRead(notificationId);
    } catch (err) {
      setNotifications((prev) =>
        prev.map((item) => (item?._id === notificationId ? { ...item, read: false } : item))
      );
      throw err;
    }
  };

  const markAllNotificationsRead = async () => {
    const previous = notifications;
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
    try {
      await notificationService.markAllNotificationsRead();
    } catch (err) {
      setNotifications(previous);
      throw err;
    }
  };

  const openNotification = async (notification) => {
    if (!notification) return;

    const getId = (value) => {
      if (!value) return '';
      if (typeof value === 'string') return value;
      if (typeof value === 'object' && value._id) return value._id;
      return '';
    };

    const relatedChannelId = getId(notification?.relatedChannel);
    const relatedWorkspaceId = getId(notification?.relatedWorkspace);

    if (notification?.type === 'invitation') {
      setNavMode('workspace');
      setSelectedDmId('');
      setSelectedDmName('');
      if (relatedWorkspaceId) {
        handleSelectWorkspace(relatedWorkspaceId);
      }
      return;
    }

    if (relatedChannelId) {
      const dmMatch = directMessages.find((dm) => dm?._id?.toString() === relatedChannelId?.toString());
      if (dmMatch) {
        handleSelectDm(dmMatch);
        return;
      }

      setNavMode('workspace');
      setSelectedDmId('');
      setSelectedDmName('');
      setSelectedTeamId('');
      if (relatedWorkspaceId) {
        setSelectedWorkspaceId(relatedWorkspaceId);
      }
      setSelectedChannelId(relatedChannelId);
      setSelectedChannelName(notification?.relatedChannel?.name || 'Channel');
      return;
    }

    if (notification?.actionUrl) {
      setNavMode('workspace');
      setSelectedDmId('');
      setSelectedDmName('');
    }
  };

  const acceptConnectionRequest = async (notification) => {
    const senderId = notification?.sender?._id;
    if (!senderId) return;
    await connectionService.acceptRequest(senderId);
    toast.success('Connection accepted');
    loadDMs();
  };

  const rejectConnectionRequest = async (notification) => {
    const senderId = notification?.sender?._id;
    if (!senderId) return;
    await connectionService.rejectRequest(senderId);
    toast.success('Connection request rejected');
  };

  const acceptInvitationNotification = async (notification) => {
    const invitationId =
      typeof notification?.relatedInvitation === 'object'
        ? notification?.relatedInvitation?._id
        : notification?.relatedInvitation;

    if (!invitationId) return;

    await invitationService.acceptInvitation(invitationId);
    toast.success('Invitation accepted');
    await refreshWorkspaces();
  };

  const declineInvitationNotification = async (notification) => {
    const invitationId =
      typeof notification?.relatedInvitation === 'object'
        ? notification?.relatedInvitation?._id
        : notification?.relatedInvitation;

    if (!invitationId) return;

    await invitationService.declineInvitation(invitationId);
    toast.success('Invitation declined');
  };

  const loadDMs = async () => {
    try {
      const data = await dmService.getDMs();
      if (data.success) {
        setDirectMessages(data.dms || []);
      }
    } catch (err) {
      console.error('Failed to load DMs:', err);
    }
  };

  const loadDashboardOverview = async (workspaceId = selectedWorkspaceId) => {
    setOverviewLoading(true);
    try {
      const data = await dashboardService.getDashboardOverview(workspaceId || undefined);
      if (data.success) {
        setDashboardOverview(data);
      }
    } catch (err) {
      console.error('Failed to load dashboard overview:', err);
    } finally {
      setOverviewLoading(false);
    }
  };

  const loadWorkspaceStructure = async (workspaceId) => {
    if (!workspaceId) {
      setTeams([]);
      setChannels([]);
      setSelectedTeamId('');
      setSelectedChannelId('');
      setSelectedChannelName('');
      setSelectedChannelIsPrivate(false);
      return;
    }

    const teamsData = await workspaceService.getTeams(workspaceId);
    const nextTeams = teamsData.teams || [];

    const teamWithChannels = await Promise.all(
      nextTeams.map(async (team) => {
        let channelsData = [];
        try {
          const data = await workspaceService.getChannels(team._id);
          channelsData = data.channels || [];
        } catch (err) {
          console.error('Failed to load channels for team:', team?._id, err);
        }
        const teamId = team._id?.toString();
        const channelsForTeam = channelsData.map((channel) => ({
          ...channel,
          team: teamId,
          _teamId: teamId,
          teamName: team.name,
        }));
        return {
          ...team,
          channels: channelsForTeam,
        };
      })
    );

    const nextChannels = teamWithChannels.flatMap((team) => team.channels || []);
    setTeams(teamWithChannels);
    setChannels(nextChannels);

    if (teamWithChannels.length > 0) {
      const stillValidTeam = teamWithChannels.some((team) => team._id?.toString() === selectedTeamId?.toString());
      if (!stillValidTeam) {
        const preferredTeam = teamWithChannels.find((team) => (team.channels || []).length > 0) || teamWithChannels[0];
        setSelectedTeamId(preferredTeam._id);
      }
    } else {
      setSelectedTeamId('');
    }
  };

  useEffect(() => {
    loadDashboardOverview(selectedWorkspaceId);
  }, [selectedWorkspaceId]);

  const refreshWorkspaces = async () => {
    try {
      const data = await workspaceService.getMyWorkspaces();
      setWorkspaces(data.workspaces || []);
      loadDashboardOverview(selectedWorkspaceId);
    } catch (err) {
      console.error('Failed to refresh workspaces:', err);
    }
  };

  useEffect(() => {
    if (!selectedWorkspaceId) {
      loadWorkspaceStructure('');
      return;
    }
    // Clear DM selection when workspace is selected
    if (selectedDmId) {
      setSelectedDmId('');
      setSelectedDmName('');
    }
    loadWorkspaceStructure(selectedWorkspaceId)
      .catch((err) => toast.error(err.message || 'Failed to load workspace structure'));
  }, [selectedWorkspaceId]);

  useEffect(() => {
    if (!selectedWorkspaceId) {
      setActiveWorkspace(null);
      return;
    }

    workspaceService
      .getWorkspaceById(selectedWorkspaceId)
      .then((data) => {
        setActiveWorkspace(data.workspace || null);
      })
      .catch(() => {
        setActiveWorkspace(workspaces.find((ws) => ws._id === selectedWorkspaceId) || null);
      });
  }, [selectedWorkspaceId, workspaces]);

  useEffect(() => {
    const selectedChannel = channels.find((channel) => channel._id === selectedChannelId);
    setSelectedChannelName(
      selectedChannel?.name
      || selectedChannel?.channelName
      || selectedChannel?.title
      || selectedChannel?.slug
      || ''
    );
    setSelectedChannelIsPrivate(Boolean(selectedChannel?.isPrivate));
  }, [channels, selectedChannelId]);

  const resetCreateForm = () => {
    setCreateForm({
      name: '',
      teamId: '',
      isPrivate: false,
      submitting: false,
    });
  };

  const closeCreateModal = () => {
    setCreateModal((prev) => ({ ...prev, isOpen: false }));
    resetCreateForm();
  };

  const openCreateWorkspaceModal = () => {
    setCreateModal({ isOpen: true, type: 'workspace' });
    setCreateForm((prev) => ({
      ...prev,
      name: '',
      teamId: '',
      isPrivate: false,
      submitting: false,
    }));
  };

  const openCreateTeamModal = () => {
    if (!selectedWorkspaceId) {
      toast.error('Select a workspace first');
      return;
    }

    setCreateModal({ isOpen: true, type: 'team' });
    setCreateForm((prev) => ({
      ...prev,
      name: '',
      teamId: '',
      isPrivate: false,
      submitting: false,
    }));
  };

  const openCreateChannelModal = (teamIdFromSidebar) => {
    if (!selectedWorkspaceId || teams.length === 0) {
      toast.error('Create a team first');
      return;
    }

    setCreateModal({ isOpen: true, type: 'channel' });
    setCreateForm((prev) => ({
      ...prev,
      name: '',
      teamId: teamIdFromSidebar || selectedTeamId || teams[0]?._id || '',
      isPrivate: false,
      submitting: false,
    }));
  };

  const handleSelectWorkspace = (workspaceId) => {
    if (workspaceSwitchTimerRef.current) {
      clearTimeout(workspaceSwitchTimerRef.current);
    }

    setNavMode('workspace');
    setIsWorkspaceSidebarOpen(false);
    setSelectedWorkspaceId(workspaceId);
    setSelectedTeamId('');
    setSelectedChannelId('');
    setSelectedChannelName('');
    setSelectedChannelIsPrivate(false);
    setSelectedDmId('');
    setSelectedDmName('');

    workspaceSwitchTimerRef.current = setTimeout(() => {
      setIsWorkspaceSidebarOpen(true);
      workspaceSwitchTimerRef.current = null;
    }, 220);
  };

  const submitCreateModal = async (event) => {
    event.preventDefault();

    const trimmedName = createForm.name.trim();
    if (!trimmedName) {
      toast.error('Name is required');
      return;
    }

    if (createModal.type === 'team' && !selectedWorkspaceId) {
      toast.error('Select a workspace first');
      return;
    }

    if (createModal.type === 'channel' && !createForm.teamId) {
      toast.error('Select a team for the channel');
      return;
    }

    setCreateForm((prev) => ({ ...prev, submitting: true }));
    try {
      if (createModal.type === 'workspace') {
        const data = await workspaceService.createWorkspace(trimmedName);
        const createdWorkspaceId = data?.workspace?._id;
        toast.success('Workspace created');
        await refreshWorkspaces();
        if (createdWorkspaceId) {
          handleSelectWorkspace(createdWorkspaceId);
        }
      }

      if (createModal.type === 'team') {
        const data = await workspaceService.createTeam(trimmedName, selectedWorkspaceId);
        const createdTeamId = data?.team?._id;
        toast.success('Team created');
        await loadWorkspaceStructure(selectedWorkspaceId);
        if (createdTeamId) {
          setSelectedTeamId(createdTeamId);
        }
      }

      if (createModal.type === 'channel') {
        const teamId = createForm.teamId;
        await workspaceService.createChannel(trimmedName, teamId, 'text', createForm.isPrivate);
        toast.success('Channel created');
        setSelectedTeamId(teamId);
        await loadWorkspaceStructure(selectedWorkspaceId);
      }

      closeCreateModal();
    } catch (err) {
      toast.error(err.message || 'Failed to create item');
      setCreateForm((prev) => ({ ...prev, submitting: false }));
    }
  };

  // Management handlers
  const handleRenameWorkspace = async (id, currentName) => {
    const newName = prompt('Enter new workspace name:', currentName);
    if (!newName || newName === currentName) return;

    setActionLoading(true);
    try {
      await managementService.renameWorkspace(id, newName);
      toast.success('Workspace renamed');
      refreshWorkspaces();
    } catch (err) {
      toast.error(err.message || 'Failed to rename workspace');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteWorkspace = (id, name) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Workspace',
      message: `This will permanently delete "${name}" and all its teams, channels, and messages. This action cannot be undone.`,
      danger: true,
      requireTypedConfirmation: true,
      confirmationText: name,
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await managementService.deleteWorkspace(id);
          toast.success('Workspace deleted');
          closeConfirmDialog();
          if (selectedWorkspaceId === id) {
            setSelectedWorkspaceId('');
          }
          refreshWorkspaces();
        } catch (err) {
          toast.error(err.message || 'Failed to delete workspace');
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  const handleRenameTeam = async (id, currentName) => {
    const newName = prompt('Enter new team name:', currentName);
    if (!newName || newName === currentName) return;

    setActionLoading(true);
    try {
      await managementService.renameTeam(id, newName);
      toast.success('Team renamed');
      await loadWorkspaceStructure(selectedWorkspaceId);
    } catch (err) {
      toast.error(err.message || 'Failed to rename team');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTeam = (id, name) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Team',
      message: `This will permanently delete "${name}" and all its channels and messages. This action cannot be undone.`,
      danger: true,
      requireTypedConfirmation: true,
      confirmationText: name,
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await managementService.deleteTeam(id);
          toast.success('Team deleted');
          closeConfirmDialog();
          if (selectedTeamId === id) {
            setSelectedTeamId('');
          }
          await loadWorkspaceStructure(selectedWorkspaceId);
        } catch (err) {
          toast.error(err.message || 'Failed to delete team');
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  const handleRenameChannel = async (id, currentName) => {
    const newName = prompt('Enter new channel name:', currentName);
    if (!newName || newName === currentName) return;

    setActionLoading(true);
    try {
      await managementService.renameChannel(id, newName);
      toast.success('Channel renamed');
      await loadWorkspaceStructure(selectedWorkspaceId);
    } catch (err) {
      toast.error(err.message || 'Failed to rename channel');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteChannel = (id, name) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Channel',
      message: `This will permanently delete "#${name}" and all its messages. This action cannot be undone.`,
      danger: true,
      requireTypedConfirmation: true,
      confirmationText: name,
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await managementService.deleteChannel(id);
          toast.success('Channel deleted');
          closeConfirmDialog();
          if (selectedChannelId === id) {
            setSelectedChannelId('');
          }
          await loadWorkspaceStructure(selectedWorkspaceId);
        } catch (err) {
          toast.error(err.message || 'Failed to delete channel');
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  const handleViewMembers = (channelId, channelName) => {
    setChannelMembersModal({ isOpen: true, channelId, channelName });
  };

  const handleContextMenu = (e, type, item) => {
    e.preventDefault();
    e.stopPropagation();

    // Helper to safely get ID string from object or string
    const getSafeId = (obj) => {
      if (!obj) return null;
      if (typeof obj === 'string') return obj;
      if (obj._id) return obj._id;
      return null;
    };

    // Determine target workspace ID
    let targetWorkspaceId = selectedWorkspaceId;

    if (type === 'workspace') {
      targetWorkspaceId = getSafeId(item);
    } else if (type === 'team') {
      targetWorkspaceId = getSafeId(item.workspace);
    } else if (type === 'channel') {
      // For channels in the current view, they belong to the selected workspace context
      targetWorkspaceId = selectedWorkspaceId;
    }

    const targetWIdStr = targetWorkspaceId?.toString();
    const currentWorkspace = workspaces.find(w => w._id === targetWIdStr);

    // owner is populated object, so we need safe extraction
    const workspaceOwnerId = getSafeId(currentWorkspace?.owner);
    const currentUserId = getSafeId(user);

    const isOwner = workspaceOwnerId?.toString() === currentUserId?.toString();
    const userMember = currentWorkspace?.members?.find(m => getSafeId(m.user)?.toString() === currentUserId?.toString());
    const isAdmin = userMember?.role === 'admin';
    const canManage = isOwner || isAdmin;

    let items = [];

    if (type === 'workspace') {
      items = [
        { label: 'Rename', icon: Edit2, onClick: () => handleRenameWorkspace(item._id, item.name), disabled: !canManage },
        { label: 'Delete', icon: Trash2, onClick: () => handleDeleteWorkspace(item._id, item.name), disabled: !isOwner, danger: true },
      ];
    } else if (type === 'team') {
      items = [
        { label: 'Rename', icon: Edit2, onClick: () => handleRenameTeam(item._id, item.name), disabled: !canManage },
        { label: 'Delete', icon: Trash2, onClick: () => handleDeleteTeam(item._id, item.name), disabled: !canManage, danger: true },
      ];
    } else if (type === 'channel') {
      items = [
        { label: 'View Members', icon: Users, onClick: () => handleViewMembers(item._id, item.name) },
        { label: 'Rename', icon: Edit2, onClick: () => handleRenameChannel(item._id, item.name), disabled: !canManage },
        { label: 'Delete', icon: Trash2, onClick: () => handleDeleteChannel(item._id, item.name), disabled: !canManage, danger: true },
      ];
    }

    setContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
      items: items.filter(item => !item.hidden)
    });
  };

  const currentWorkspace = activeWorkspace || workspaces.find(w => w._id === selectedWorkspaceId);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          className="h-8 w-8 rounded-full border-2 border-foreground/25 border-t-foreground"
        />
      </div>
    );
  }

  const handleSelectDm = (dm) => {
    setNavMode('dm');
    setIsWorkspaceSidebarOpen(false);
    setSelectedDmId(dm._id);

    // Find the other participant to show their name as the chat title
    const otherParticipant = dm.dmParticipants?.find(p => p._id?.toString() !== user?._id?.toString());
    setSelectedDmName(otherParticipant ? otherParticipant.name : (dm.name || 'Direct Message'));

    // Clear workspace selection to hide channels/teams
    setSelectedWorkspaceId('');
    setSelectedTeamId('');
    setSelectedChannelId('');
    setSelectedChannelName('');
    setSelectedChannelIsPrivate(false);
  };

  const handleNavModeChange = (nextMode) => {
    if (nextMode === navMode) return;

    if (workspaceSwitchTimerRef.current) {
      clearTimeout(workspaceSwitchTimerRef.current);
      workspaceSwitchTimerRef.current = null;
    }

    setNavMode(nextMode);
    if (nextMode === 'dm') {
      setIsWorkspaceSidebarOpen(false);
      setSelectedWorkspaceId('');
      setSelectedTeamId('');
      setSelectedChannelId('');
      setSelectedChannelName('');
      setSelectedChannelIsPrivate(false);
      return;
    }

    setSelectedDmId('');
    setSelectedDmName('');
    if (selectedWorkspaceId) {
      workspaceSwitchTimerRef.current = setTimeout(() => {
        setIsWorkspaceSidebarOpen(true);
        workspaceSwitchTimerRef.current = null;
      }, 220);
    }
  };

  const handleStartDm = async (userId) => {
    try {
      const data = await dmService.startDM(userId);
      if (data.success && data.channel) {
        setNavMode('dm');
        handleSelectDm(data.channel);
        toast.success('Conversation started');
        setSmartSearchOpen(false);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to start conversation');
    }
  };

  // --- Redesign: Render Helpers ---

  const RailComponent = (
    <WorkspaceRail
      workspaces={workspaces}
      activeWorkspaceId={selectedWorkspaceId}
      unreadCounts={{}}
      navMode={navMode}
      onNavModeChange={handleNavModeChange}
      directMessages={directMessages}
      selectedDmId={selectedDmId}
      onSelectDm={handleSelectDm}
      onOpenDmFinder={() => setDmFinderOpen(true)}
      pendingConnectionRequests={notifications.filter(
        (item) => !item?.read && item?.type === 'connection_request'
      ).length}
      currentUser={user}
      onSelect={handleSelectWorkspace}
      onCreateWorkspace={openCreateWorkspaceModal}
    />
  );

  const SidebarComponent = (
    <AnimatePresence initial={false}>
      {navMode === 'workspace' && selectedWorkspaceId && isWorkspaceSidebarOpen && (
        <motion.div
          key={`workspace-sidebar-${selectedWorkspaceId}`}
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 240, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.24, ease: 'easeOut' }}
          className="h-full overflow-hidden"
        >
          <Sidebar
            currentUser={user}
            selectedWorkspaceName={currentWorkspace?.name || ''}
            selectedWorkspaceId={selectedWorkspaceId}
            teams={teams}
            selectedTeamId={selectedTeamId}
            setSelectedTeamId={setSelectedTeamId}
            channels={channels}
            selectedChannelId={selectedChannelId}
            onSelectChannel={(channelId) => {
              setSelectedChannelId(channelId);
              setSelectedDmId('');
              setSelectedDmName('');
            }}
            onOpenInviteModal={() => {
              if (!selectedWorkspaceId) {
                toast.error('Select a workspace to invite members');
                return;
              }
              setIsInviteModalOpen(true);
            }}
            onOpenWorkspaceSettings={() => {
              setSettingsTab('workspace');
              setSettingsOpen(true);
            }}
            onCreateTeam={openCreateTeamModal}
            onCreateChannel={openCreateChannelModal}
            unreadCounts={{}}
            onChannelAction={(action, channel) => {
              const channelData = typeof channel === 'string'
                ? channels.find((item) => item._id === channel) || { _id: channel, name: 'Channel' }
                : channel;

              if (action === 'rename') {
                handleRenameChannel(channelData._id, channelData.name);
                return;
              }
              if (action === 'delete') {
                handleDeleteChannel(channelData._id, channelData.name);
                return;
              }
              if (action === 'copy-link') {
                toast.success('Channel link copied');
              }
            }}
            availabilityStatus={dashboardOverview?.status || 'available'}
            onStatusChange={async (status) => {
              try {
                await dashboardService.updateAvailabilityStatus(status);
                setDashboardOverview((prev) => ({ ...prev, status }));
                toast.success(`Status updated to ${status}`);
              } catch (err) {
                toast.error(err.message || 'Failed to update status');
              }
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );

  const selectedChannel = channels.find((channel) => channel._id === selectedChannelId) || null;
  const selectedTeamName = selectedDmId
    ? 'Direct Message'
    : teams.find((team) => team._id === selectedTeamId)?.name || selectedChannel?.teamName || currentWorkspace?.name || '';
  const selectedDm = (() => {
    const activeDm = directMessages.find((dm) => dm._id === selectedDmId);
    if (!activeDm) return null;
    const participants = Array.isArray(activeDm.dmParticipants) ? activeDm.dmParticipants : [];
    const other = participants.find((participant) => participant?._id?.toString() !== user?._id?.toString()) || participants[0] || {};
    return {
      username: other?.name || activeDm.name || selectedDmName,
      status: other?.status || 'away',
    };
  })();

  const unreadNotificationCount = notifications.filter((item) => !item?.read).length;

  const handleStartVideoCall = ({ channelId, dmId, title }) => {
    const activeChannelId = channelId || selectedChannelId;
    const activeDmId = dmId || selectedDmId;

    if (activeChannelId) {
      setVideoCallState({
        isOpen: true,
        roomId: `channel:${activeChannelId}`,
        title: title || selectedChannelName || 'Channel',
        view: 'embedded',
      });
      return;
    }

    if (activeDmId) {
      setVideoCallState({
        isOpen: true,
        roomId: `dm:${activeDmId}`,
        title: title || selectedDmName || 'Direct Message',
        view: 'embedded',
      });
    }
  };

  const handleAcceptIncomingCall = (incomingCall) => {
    const roomId = incomingCall?.roomId || '';
    const [scope, id] = roomId.split(':');

    if (scope === 'channel' && id) {
      setNavMode('workspace');
      setSelectedDmId('');
      setSelectedDmName('');
      setSelectedChannelId(id);
      setSelectedChannelName(incomingCall?.title || 'Channel');
    }

    if (scope === 'dm' && id) {
      setNavMode('dm');
      setIsWorkspaceSidebarOpen(false);
      setSelectedChannelId('');
      setSelectedChannelName('');
      setSelectedWorkspaceId('');
      setSelectedTeamId('');
      setSelectedDmId(id);
      setSelectedDmName(incomingCall?.title || 'Direct Message');
    }

    setVideoCallState({
      isOpen: true,
      roomId,
      title: incomingCall?.title || 'Conversation',
      view: 'embedded',
    });
  };

  const HeaderComponent = (
    <TopBar
      selectedChannel={selectedChannel}
      selectedDm={selectedDm}
      selectedChannelId={selectedChannelId}
      selectedDmId={selectedDmId}
      selectedTeamName={selectedTeamName}
      unreadNotificationCount={unreadNotificationCount}
      notifications={notifications}
      notificationsLoading={notificationsLoading}
      navMode={navMode}
      currentUser={{
        ...user,
        status: dashboardOverview?.status || 'available',
      }}
      onOpenSearch={() => {
        setSmartSearchOpen(true);
      }}
      onToggleNotifications={setNotificationsOpen}
      onOpenSettings={(tab) => {
        setSettingsTab(tab || 'profile');
        setSettingsOpen(true);
      }}
      onUnreadIncrement={() => {
      }}
      onNotificationReceived={(payload) => {
        const next = payload?.notification || payload;
        if (!next?._id) return;
        setNotifications((prev) => {
          if (prev.some((item) => item?._id === next._id)) {
            return prev;
          }
          return [next, ...prev];
        });
      }}
      onMarkNotificationRead={markNotificationRead}
      onMarkAllNotificationsRead={markAllNotificationsRead}
      onAcceptConnectionRequest={acceptConnectionRequest}
      onRejectConnectionRequest={rejectConnectionRequest}
      onAcceptInvitation={acceptInvitationNotification}
      onDeclineInvitation={declineInvitationNotification}
      onOpenNotification={openNotification}
      onOpenDmFinder={() => setDmFinderOpen(true)}
      onStartVideoCall={handleStartVideoCall}
      onAcceptIncomingCall={handleAcceptIncomingCall}
    />
  );

  return (
    <SocketProvider>
      <OnlineStatusProvider>
        <AppShell
          rail={RailComponent}
          sidebar={SidebarComponent}
          header={HeaderComponent}
        >
          <div className="flex h-full min-h-0 flex-col bg-transparent">
            <div className={`w-full flex-shrink-0 ${navMode === 'dm' ? 'hidden' : 'block'}`}>
              <PendingInvitations onAccept={refreshWorkspaces} />
            </div>

            {navMode === 'dm' && !selectedDmId && (
              <div className="flex flex-1 items-center justify-center px-6">
                <div className="max-w-sm rounded-2xl border border-[var(--color-base-600)]/45 bg-[var(--color-base-800)]/85 p-6 text-center">
                  <p className="text-base font-semibold text-[var(--color-base-100)]">Select a conversation</p>
                  <p className="mt-1 text-sm text-[var(--color-base-400)]">Choose a person from the left DM list to start chatting.</p>
                </div>
              </div>
            )}

            {navMode === 'workspace' && !selectedChannelId && !selectedDmId && (
              <div className="flex-1 overflow-hidden relative">
                <DashboardHome
                  overview={dashboardOverview}
                  onSelectChannel={(channelId, channelName) => {
                    if (!channelId) return;
                    setNavMode('workspace');
                    setSelectedDmId('');
                    setSelectedDmName('');
                    setSelectedChannelId(channelId);
                    setSelectedChannelName(channelName || 'Channel');
                  }}
                  onSelectDm={(dmId, dmName) => {
                    if (!dmId) return;
                    setNavMode('dm');
                    setIsWorkspaceSidebarOpen(false);
                    setSelectedChannelId('');
                    setSelectedChannelName('');
                    setSelectedWorkspaceId('');
                    setSelectedTeamId('');
                    setSelectedDmId(dmId);
                    setSelectedDmName(dmName || 'Direct Message');
                  }}
                />
              </div>
            )}

            {(selectedChannelId || selectedDmId) && (
              <div className="flex-1 overflow-hidden relative">
                <ChatWindow channelId={selectedChannelId || selectedDmId} />
                {videoCallState.isOpen && (
                  <VideoCallModal
                    isOpen={videoCallState.isOpen}
                    roomId={videoCallState.roomId}
                    title={videoCallState.title}
                    currentUser={user}
                    view={videoCallState.view}
                    onToggleView={(view) => setVideoCallState((prev) => ({ ...prev, view }))}
                    onClose={() => setVideoCallState({ isOpen: false, roomId: '', title: '', view: 'embedded' })}
                  />
                )}
              </div>
            )}
          </div>
        </AppShell>

        {/* --- Modals & Global UI --- */}
        <InviteModal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          workspaceId={selectedWorkspaceId}
          workspaceName={currentWorkspace?.name}
          onInviteSent={refreshWorkspaces}
        />

        <Modal
          isOpen={createModal.isOpen}
          onClose={closeCreateModal}
          title={
            createModal.type === 'workspace'
              ? 'Create Workspace'
              : createModal.type === 'team'
                ? 'Create Team'
                : 'Create Channel'
          }
          size="sm"
        >
          <form onSubmit={submitCreateModal} className="space-y-3">
            <Input
              id="create-name"
              label={createModal.type === 'workspace' ? 'Workspace Name' : createModal.type === 'team' ? 'Team Name' : 'Channel Name'}
              value={createForm.name}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder={createModal.type === 'workspace' ? 'e.g. Product Org' : createModal.type === 'team' ? 'e.g. Platform' : 'e.g. general'}
              autoFocus
            />

            {createModal.type === 'channel' && (
              <>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Team
                  </label>
                  <select
                    value={createForm.teamId}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, teamId: event.target.value }))}
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {teams.map((team) => (
                      <option key={team._id} value={team._id}>{team.name}</option>
                    ))}
                  </select>
                </div>

                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={createForm.isPrivate}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, isPrivate: event.target.checked }))}
                  />
                  Private channel
                </label>
              </>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={closeCreateModal} disabled={createForm.submitting}>
                Cancel
              </Button>
              <Button type="submit" loading={createForm.submitting}>
                Create
              </Button>
            </div>
          </form>
        </Modal>

        <SettingsModal
          isOpen={settingsOpen}
          initialTab={settingsTab}
          onClose={() => setSettingsOpen(false)}
          user={user}
        />

        {showUsernameSetup && (
          <UsernameSetup onComplete={() => setShowUsernameSetup(false)} />
        )}

        <ChannelMembersModal
          isOpen={channelMembersModal.isOpen}
          onClose={() => setChannelMembersModal({ isOpen: false, channelId: null })}
          channelId={channelMembersModal.channelId}
          channelName={channelMembersModal.channelName}
        />

        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          onClose={closeConfirmDialog}
          onConfirm={confirmDialog.onConfirm}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText="Delete"
          confirmDanger={confirmDialog.danger}
          loading={actionLoading}
          requireTypedConfirmation={confirmDialog.requireTypedConfirmation}
          confirmationText={confirmDialog.confirmationText}
        />

        <SmartSearchModal
          isOpen={smartSearchOpen}
          onClose={() => setSmartSearchOpen(false)}
          workspaceId={selectedWorkspaceId}
          onStartDm={handleStartDm}
          onOpenChannel={(channelId, channelName) => {
            setNavMode('workspace');
            setSelectedDmId('');
            setSelectedDmName('');
            setSelectedChannelId(channelId);
            setSelectedChannelName(channelName || 'Channel');
            setSmartSearchOpen(false);
          }}
          onOpenDm={(dmId, dmName) => {
            setNavMode('dm');
            setIsWorkspaceSidebarOpen(false);
            setSelectedChannelId('');
            setSelectedChannelName('');
            setSelectedWorkspaceId('');
            setSelectedTeamId('');
            setSelectedDmId(dmId);
            setSelectedDmName(dmName || 'Direct Message');
            setSmartSearchOpen(false);
          }}
        />

        <DmConnectModal
          isOpen={dmFinderOpen}
          onClose={() => setDmFinderOpen(false)}
          currentUser={user}
          onDmStarted={(dmChannel) => {
            if (!dmChannel?._id) return;
            setNavMode('dm');
            setIsWorkspaceSidebarOpen(false);
            setSelectedChannelId('');
            setSelectedChannelName('');
            setSelectedWorkspaceId('');
            setSelectedTeamId('');
            handleSelectDm(dmChannel);
            loadDMs();
            toast.success('Conversation ready');
          }}
        />

        <KeyboardShortcutsHelp
          isOpen={shortcutsHelpOpen}
          onClose={() => setShortcutsHelpOpen(false)}
        />

        {/* Global Context Menu */}
        <AnimatePresence>
          {contextMenu.isOpen && (
            <ContextMenu
              isOpen={contextMenu.isOpen}
              onClose={() => setContextMenu({ ...contextMenu, isOpen: false })}
              position={contextMenu.position}
              items={contextMenu.items}
            />
          )}
        </AnimatePresence>

      </OnlineStatusProvider>
    </SocketProvider>
  );
}
