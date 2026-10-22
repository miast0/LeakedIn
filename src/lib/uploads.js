const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadRoot = path.join(__dirname, '..', '..', 'uploads');
const avatarDir = path.join(uploadRoot, 'avatars');
const postDir = path.join(uploadRoot, 'posts');
fs.mkdirSync(avatarDir, { recursive: true });
fs.mkdirSync(postDir, { recursive: true });

const imageStorage = folder => multer.diskStorage({
  destination: folder,
  filename: (_req, file, cb) => {
    const extensions = { 'image/png': '.png', 'image/jpeg': '.jpg', 'video/mp4': '.mp4', 'video/webm': '.webm', 'video/quicktime': '.mov' };
    cb(null, `${Date.now()}-${crypto.randomBytes(10).toString('hex')}${extensions[file.mimetype] || ''}`);
  }
});

const imageFilter = (_req, file, cb) => {
  const valid = ['image/png', 'image/jpeg'].includes(file.mimetype);
  cb(valid ? null : new Error('Only PNG and JPG images are allowed.'), valid);
};

const postMediaFilter = (_req, file, cb) => {
  const valid = ['image/png', 'image/jpeg', 'video/mp4', 'video/webm', 'video/quicktime'].includes(file.mimetype);
  cb(valid ? null : new Error('Only PNG, JPG, MP4, WebM and MOV files are allowed.'), valid);
};

const options = { limits: { fileSize: 5 * 1024 * 1024 } };
const avatarUpload = multer({ ...options, storage: imageStorage(avatarDir), fileFilter: imageFilter });
const postUpload = multer({ ...options, storage: imageStorage(postDir), fileFilter: imageFilter });
const postMediaUpload = multer({ ...options, storage: imageStorage(postDir), fileFilter: postMediaFilter });

function deleteUploaded(file) {
  if (file?.path) fs.unlink(file.path, () => {});
}

async function validateUpload(file, allowed) {
  if (!file) return true;
  const { fileTypeFromFile } = await import('file-type');
  const detected = await fileTypeFromFile(file.path);
  return Boolean(detected && allowed.includes(detected.mime));
}

const validateUploadedImage = file => validateUpload(file, ['image/png', 'image/jpeg']);
const validateUploadedMedia = file => validateUpload(file, ['image/png', 'image/jpeg', 'video/mp4', 'video/webm', 'video/quicktime']);

module.exports = { uploadRoot, avatarUpload, postUpload, postMediaUpload, deleteUploaded, validateUploadedImage, validateUploadedMedia };
