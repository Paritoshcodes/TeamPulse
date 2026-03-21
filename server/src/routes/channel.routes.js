/**
 * Channel routes: POST /, GET /?teamId=
 */
import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import { requireAuth } from '../middleware/auth.middleware.js';
import { createChannel, getChannelsByTeam } from '../controllers/channel.controller.js';

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
  body('type').optional().isIn(['text', 'voice', 'video']).withMessage('Type must be text, voice, or video'),
  body('isPrivate').optional().isBoolean().withMessage('isPrivate must be boolean').toBoolean(),
  body('teamId').notEmpty().withMessage('teamId is required').isMongoId().withMessage('Invalid team id'),
];

const listValidation = [
  query('teamId').notEmpty().withMessage('teamId is required').isMongoId().withMessage('Invalid team id'),
];

router.post('/', createValidation, handleValidation, createChannel);
router.get('/', listValidation, handleValidation, getChannelsByTeam);

export default router;
