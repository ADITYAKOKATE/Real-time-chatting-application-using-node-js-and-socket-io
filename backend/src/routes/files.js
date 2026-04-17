const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { verifyToken } = require('../middleware/auth');
const { generateThumbnail, getVideoMetadata } = require('../utils/media');

const router = express.Router();

// Local disk storage (fallback when no S3 credentials)
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|mp4|mov|pdf|txt|zip|doc|docx|xlsx/;
    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    if (allowed.test(ext)) return cb(null, true);
    cb(new Error('Unsupported file type'));
  },
});

// POST /api/files/upload — upload file (local disk fallback)
router.post('/upload', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;

    let thumbnailUrl = null;
    let videoMeta = null;

    if (req.file.mimetype.startsWith('image/')) {
        const thumbLocal = await generateThumbnail(req.file.path);
        thumbnailUrl = thumbLocal ? `${baseUrl}${thumbLocal}` : null;
    } else if (req.file.mimetype.startsWith('video/')) {
        videoMeta = await getVideoMetadata(req.file.path);
    }

    res.json({
      file: {
        key: req.file.filename,
        url: fileUrl,
        thumbnailUrl,
        mimeType: req.file.mimetype,
        size: req.file.size,
        name: req.file.originalname,
        videoMeta,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Upload failed', error: err.message });
  }
});

module.exports = router;
