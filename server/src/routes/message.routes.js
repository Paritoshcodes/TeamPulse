/**
 * Message routes: GET /?channelId= (history)
 */
import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { requireAuth } from '../middleware/auth.middleware.js';
import { getMessages, updateMessage, deleteMessage, replyToMessage, getThreadMessages } from '../controllers/message.controller.js';
import { reactToMessage } from '../controllers/reaction.controller.js';

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

const listValidation = [
  query('channelId').notEmpty().withMessage('channelId is required').isMongoId().withMessage('Invalid channel id'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  query('before').optional().isMongoId().withMessage('Invalid before id'),
  query('includeReplies').optional().isBoolean().withMessage('includeReplies must be boolean').toBoolean(),
];

const replyValidation = [
  param('id').isMongoId().withMessage('Invalid parent message id'),
  body('content').trim().notEmpty().withMessage('Content is required').isLength({ max: 10000 }).withMessage('Message too long'),
];

const threadValidation = [
  param('id').isMongoId().withMessage('Invalid thread message id'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
];

const updateValidation = [
  param('id').isMongoId().withMessage('Invalid message id'),
  body('content').trim().notEmpty().withMessage('Content is required').isLength({ max: 10000 }).withMessage('Message too long'),
];

const deleteValidation = [
  param('id').isMongoId().withMessage('Invalid message id'),
];

router.get('/', listValidation, handleValidation, getMessages);
router.get('/thread/:id', threadValidation, handleValidation, getThreadMessages);
router.post('/:id/reply', replyValidation, handleValidation, replyToMessage);
router.post('/:id/react', reactToMessage);
router.patch('/:id', updateValidation, handleValidation, updateMessage);
router.delete('/:id', deleteValidation, handleValidation, deleteMessage);

export default router;
