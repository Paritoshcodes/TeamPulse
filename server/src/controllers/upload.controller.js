import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const getUploadDir = () => {
  const primary = path.join(process.cwd(), 'uploads');
  if (fs.existsSync(primary)) {
    return primary;
  }
  return path.join(__dirname, '../../uploads');
};

const sanitizeFilename = (originalname = '') => {
  const parsed = path.parse(originalname);
  const base = (parsed.name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
  const ext = (parsed.ext || '').replace(/[^a-zA-Z0-9.]/g, '');
  return `${base}${ext}`;
};

const isAllowedMimeType = (mimetype = '') => {
  if (mimetype.startsWith('image/')) return true;
  if (mimetype === 'application/pdf') return true;
  if (mimetype === 'application/msword') return true;
  if (mimetype.startsWith('application/vnd.openxmlformats')) return true;
  if (mimetype === 'text/plain') return true;
  return false;
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = getUploadDir();
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const safeOriginal = sanitizeFilename(file.originalname);
    cb(null, `${Date.now()}-${safeOriginal}`);
  },
});

const fileFilter = (_req, file, cb) => {
  if (isAllowedMimeType(file.mimetype)) {
    cb(null, true);
    return;
  }
  cb(new Error('Unsupported file type'));
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

export async function uploadFileHandler(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'No file' });
  }

  const url = `/uploads/${req.file.filename}`;
  return res.json({
    url,
    fileName: req.file.originalname,
    fileSize: req.file.size,
    mimeType: req.file.mimetype,
  });
}
