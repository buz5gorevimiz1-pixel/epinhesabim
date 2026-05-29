const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('./cloudinary');

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'itemci-products',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff', 'heic', 'heif'],
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 10,
  },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'image/bmp', 'image/tiff', 'image/heic', 'image/heif',
      'application/octet-stream', // some mobile browsers send this
    ];
    // Also check extension for HEIC/HEIF on mobile
    const ext = file.originalname?.toLowerCase?.() || '';
    const isHeic = ext.endsWith('.heic') || ext.endsWith('.heif');
    if (allowed.includes(file.mimetype) || isHeic) {
      cb(null, true);
    } else {
      cb(new Error('Sadece görsel dosyaları yüklenebilir.'), false);
    }
  },
});

module.exports = upload;