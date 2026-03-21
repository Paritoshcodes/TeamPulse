/**
 * Team routes: POST /, GET /?workspaceId=
 */
import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import { requireAuth } from '../middleware/auth.middleware.js';
import { createTeam, getTeamsByWorkspace } from '../controllers/team.controller.js';

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
  body('workspaceId').notEmpty().withMessage('workspaceId is required').isMongoId().withMessage('Invalid workspace id'),
];

const listValidation = [
  query('workspaceId').notEmpty().withMessage('workspaceId is required').isMongoId().withMessage('Invalid workspace id'),
];

router.post('/', createValidation, handleValidation, createTeam);
router.get('/', listValidation, handleValidation, getTeamsByWorkspace);

export default router;
