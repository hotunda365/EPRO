const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand
} = require('@aws-sdk/client-s3');

const uploadsDirectory = path.join(__dirname, '..', 'uploads');
const extensionByMime = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf'
};

const hasS3Configuration = () => Boolean(
  process.env.S3_ENDPOINT &&
  process.env.S3_BUCKET &&
  process.env.S3_ACCESS_KEY_ID &&
  process.env.S3_SECRET_ACCESS_KEY
);

const s3Client = () => new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || 'auto',
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
  }
});

const detectedMime = (buffer) => {
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString('ascii') === '%PDF-') return 'application/pdf';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  if (buffer.length >= 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return 'image/jpeg';
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  if (buffer.length >= 6 && ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii'))) return 'image/gif';
  return null;
};

const validateFile = (file) => {
  const mimeType = detectedMime(file.buffer);
  if (!mimeType || !extensionByMime[mimeType]) {
    const error = new Error('Only JPEG, PNG, WebP, GIF, and PDF files are allowed');
    error.statusCode = 400;
    throw error;
  }
  if (mimeType !== file.mimetype) {
    const error = new Error('File contents do not match the declared media type');
    error.statusCode = 400;
    throw error;
  }
  return mimeType;
};

const createStorageKey = (siteKey, mimeType) => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${siteKey}/${year}/${month}/${crypto.randomUUID()}.${extensionByMime[mimeType]}`;
};

const storeFile = async ({ file, siteKey }) => {
  const mimeType = validateFile(file);
  const storageKey = createStorageKey(siteKey, mimeType);

  if (hasS3Configuration()) {
    const client = s3Client();
    await client.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: storageKey,
      Body: file.buffer,
      ContentType: mimeType,
      CacheControl: 'public, max-age=31536000, immutable'
    }));
    client.destroy();
    return { storageProvider: 's3', storageKey, mimeType };
  }

  const target = path.join(uploadsDirectory, ...storageKey.split('/'));
  await fs.promises.mkdir(path.dirname(target), { recursive: true });
  await fs.promises.writeFile(target, file.buffer, { flag: 'wx' });
  return { storageProvider: 'local', storageKey, mimeType };
};

const streamFile = async (asset, res) => {
  if (asset.storage_provider === 'external') {
    return res.redirect(302, asset.public_url);
  }

  res.set({
    'Content-Type': asset.mime_type,
    'Content-Length': String(asset.byte_size),
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff'
  });

  if (asset.storage_provider === 's3') {
    if (!hasS3Configuration()) throw new Error('S3 media storage is not configured');
    const client = s3Client();
    const object = await client.send(new GetObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: asset.storage_key
    }));
    object.Body.on('end', () => client.destroy());
    object.Body.on('error', () => client.destroy());
    return object.Body.pipe(res);
  }

  const target = path.resolve(uploadsDirectory, ...asset.storage_key.split('/'));
  if (!target.startsWith(path.resolve(uploadsDirectory) + path.sep)) {
    const error = new Error('Invalid media path');
    error.statusCode = 400;
    throw error;
  }
  return res.sendFile(target);
};

const deleteFile = async (asset) => {
  if (asset.storage_provider === 'external') return;
  if (asset.storage_provider === 's3') {
    if (!hasS3Configuration()) throw new Error('S3 media storage is not configured');
    const client = s3Client();
    await client.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: asset.storage_key }));
    client.destroy();
    return;
  }
  const target = path.resolve(uploadsDirectory, ...asset.storage_key.split('/'));
  if (target.startsWith(path.resolve(uploadsDirectory) + path.sep)) {
    await fs.promises.rm(target, { force: true });
  }
};

module.exports = {
  detectedMime,
  validateFile,
  storeFile,
  streamFile,
  deleteFile,
  hasS3Configuration
};