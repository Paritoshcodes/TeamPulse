import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { upload, uploadFileHandler } from '../controllers/upload.controller.js';

const router = Router();

router.use(requireAuth);
router.post('/', upload.single('file'), uploadFileHandler);

export default router;
