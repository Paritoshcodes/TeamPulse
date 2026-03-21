/**
 * Workspace controller: create, list mine, get by id, add member
 */
import Workspace from '../models/Workspace.js';
import User from '../models/User.js';

function slugFromName(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 80) || 'workspace';
}

async function ensureUniqueSlug(baseSlug) {
  let slug = baseSlug;
  let n = 0;
  while (await Workspace.findOne({ slug })) {
    n += 1;
    slug = `${baseSlug}-${n}`;
  }
  return slug;
}

/**
 * POST /api/workspaces
 */
export async function createWorkspace(req, res, next) {
  try {
    const { name } = req.body;
    const baseSlug = slugFromName(name);
    const slug = await ensureUniqueSlug(baseSlug);
    const workspace = await Workspace.create({
      name: name?.trim(),
      description: '',
      avatar: '',
      slug,
      owner: req.user._id,
      members: [],
      settings: {
        allowMemberInvites: false,
        defaultMemberRole: 'member',
      },
    });
    const populated = await Workspace.findById(workspace._id)
      .populate('owner', 'name email')
      .lean();
    res.status(201).json({ success: true, workspace: populated });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors).map((e) => e.message).join(' ');
      return res.status(400).json({ success: false, message: msg || 'Validation failed' });
    }
    next(err);
  }
}

/**
 * GET /api/workspaces – workspaces where user is owner or member
 */
export async function getMyWorkspaces(req, res, next) {
  try {
    const userId = req.user._id;
    const workspaces = await Workspace.find({
      $or: [{ owner: userId }, { 'members.user': userId }],
    })
      .populate('owner', 'name email')
      .sort({ updatedAt: -1 })
      .lean();
    res.json({ success: true, workspaces });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/workspaces/:id – use after requireWorkspaceMember
 */
export async function getWorkspaceById(req, res) {
  const populated = await Workspace.findById(req.workspace._id)
    .populate('owner', 'name email avatar username')
    .populate('members.user', 'name email avatar username')
    .lean();
  res.json({ success: true, workspace: populated });
}

/**
 * POST /api/workspaces/:id/members – use after requireWorkspaceMember + requireWorkspaceAdmin
 */
export async function addMember(req, res, next) {
  try {
    const { email, role } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const userId = user._id.toString();
    if (req.workspace.owner.toString() === userId) {
      return res.status(400).json({ success: false, message: 'User is already the owner' });
    }
    const existing = req.workspace.members.find((m) => m.user.toString() === userId);
    if (existing) {
      return res.status(400).json({ success: false, message: 'User is already a member' });
    }
    const defaultRole = req.workspace?.settings?.defaultMemberRole || 'member';
    const normalizedRole = String(role || '').toLowerCase();
    const memberRole = ['admin', 'member', 'guest'].includes(normalizedRole)
      ? normalizedRole
      : defaultRole;
    req.workspace.members.push({ user: user._id, role: memberRole });
    await req.workspace.save();
    const populated = await Workspace.findById(req.workspace._id)
      .populate('owner', 'name email')
      .populate('members.user', 'name email')
      .lean();
    res.status(201).json({ success: true, workspace: populated });
  } catch (err) {
    next(err);
  }
}
