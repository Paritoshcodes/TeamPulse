// invitationRoutes.js (ESM)
import { Router } from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth.middleware.js';
import { requireEmailVerified } from '../middleware/emailVerified.middleware.js';
import { getMyInvitations, createInvitation, acceptInvitation, expireInvitation } from '../controllers/invitationController.js';

const router = Router();

router.get('/', requireAuth, getMyInvitations);
router.post('/', requireAuth, requireEmailVerified, createInvitation);
router.post('/:id/accept', requireAuth, requireEmailVerified, acceptInvitation);
router.delete('/:id', optionalAuth, expireInvitation);

export default router;