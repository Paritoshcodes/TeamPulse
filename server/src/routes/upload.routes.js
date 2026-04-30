import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { upload, uploadFileHandler, getFileHandler } from '../controllers/upload.controller.js';

const router = Router();

router.use(requireAuth);
router.post('/', upload.single('file'), uploadFileHandler);
router.get('/:id', getFileHandler);

export default router;
