import multer from 'multer';
import path from 'path';
import File from '../models/File.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

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

const storage = multer.memoryStorage();

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

  try {
    const safeOriginal = sanitizeFilename(req.file.originalname);
    
    const newFile = await File.create({
      filename: safeOriginal,
      mimetype: req.file.mimetype,
      size: req.file.size,
      data: req.file.buffer
    });

    const url = `/api/upload/${newFile._id}`;
    return res.json({
      url,
      fileName: safeOriginal,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
    });
  } catch (error) {
    console.error('File upload error:', error);
    return res.status(500).json({ error: 'Failed to save file' });
  }
}

export async function getFileHandler(req, res) {
  try {
    const file = await File.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.set('Content-Type', file.mimetype);
    res.set('Content-Disposition', `inline; filename="${file.filename}"`);
    return res.send(file.data);
  } catch (error) {
    console.error('Get file error:', error);
    return res.status(500).json({ error: 'Failed to retrieve file' });
  }
}
