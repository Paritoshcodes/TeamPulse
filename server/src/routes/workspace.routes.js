/**
 * Workspace routes: POST /, GET /, GET /:id, POST /:id/members
 */
import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireEmailVerified } from '../middleware/emailVerified.middleware.js';
import { requireWorkspaceMember, requireWorkspaceAdmin } from '../middleware/workspace.middleware.js';
import {
  createWorkspace,
  getMyWorkspaces,
  getWorkspaceById,
  addMember,
} from '../controllers/workspace.controller.js';

const router = Router();
router.use(requireAuth);

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const msg = errors.array().map((e) => e.msg).join(' ');
    return res.status(400).json({ success: false, message: msg });
  }
  next();
}

const createValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }).withMessage('Name too long'),
];

const addMemberValidation = [
  param('id').isMongoId().withMessage('Invalid workspace id'),
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Invalid email').normalizeEmail(),
  body('role').optional().isIn(['admin', 'member', 'guest']).withMessage('Role must be admin, member, or guest'),
];

router.post('/', createValidation, handleValidation, requireEmailVerified, createWorkspace);
router.get('/', getMyWorkspaces);
router.get('/:id', requireWorkspaceMember, getWorkspaceById);
router.post('/:id/members', requireWorkspaceMember, requireWorkspaceAdmin, addMemberValidation, handleValidation, addMember);

export default router;
