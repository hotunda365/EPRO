const express = require('express');
const multer = require('multer');
const { z } = require('zod');

const pool = require('../../db/connection');
const { authenticate, requireCsrf, requireRole } = require('../../middleware/auth');
const { storeFile, deleteFile, hasS3Configuration } = require('../../services/storage');
const { writeAudit } = require('../../services/audit');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 5 }
});

router.use(authenticate, (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit || '30', 10)));
    const offset = (page - 1) * limit;
    const params = [];
    const where = [];
    if (req.query.site_id) {
      params.push(Number.parseInt(req.query.site_id, 10));
      where.push(`assets.site_id = $${params.length}`);
    }
    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const count = await pool.query(`SELECT COUNT(*)::int AS total FROM cms_media_assets assets ${whereSql}`, params);
    params.push(limit, offset);
    const result = await pool.query(
      `SELECT assets.*, sites.site_key, users.display_name AS uploaded_by_name
       FROM cms_media_assets assets
       LEFT JOIN cms_sites sites ON sites.id = assets.site_id
       LEFT JOIN cms_admin_users users ON users.id = assets.uploaded_by
       ${whereSql}
       ORDER BY assets.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json({
      data: result.rows,
      storage: hasS3Configuration() ? 's3' : 'local-development',
      pagination: { page, limit, total: count.rows[0].total }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', requireRole('editor'), requireCsrf, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'A media file is required' });
    const siteId = Number.parseInt(req.body.site_id, 10);
    if (!Number.isSafeInteger(siteId) || siteId <= 0) return res.status(400).json({ error: 'A valid site is required' });
    const siteResult = await pool.query('SELECT site_key FROM cms_sites WHERE id = $1 AND is_active = TRUE', [siteId]);
    if (siteResult.rows.length === 0) return res.status(404).json({ error: 'Site not found' });

    const stored = await storeFile({ file: req.file, siteKey: siteResult.rows[0].site_key });
    let asset;
    try {
      const result = await pool.query(
        `INSERT INTO cms_media_assets
          (site_id, storage_provider, storage_key, original_name, mime_type, byte_size, public_url, alt_text, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, '', $7, $8)
         RETURNING *`,
        [siteId, stored.storageProvider, stored.storageKey, req.file.originalname.slice(0, 500), stored.mimeType, req.file.size, req.body.alt_text?.slice(0, 2000) || null, req.auth.user.id]
      );
      asset = result.rows[0];
      const publicUrl = `/api/v1/public/media/${asset.id}`;
      const update = await pool.query(
        'UPDATE cms_media_assets SET public_url = $1 WHERE id = $2 RETURNING *',
        [publicUrl, asset.id]
      );
      asset = update.rows[0];
    } catch (error) {
      await deleteFile({ storage_provider: stored.storageProvider, storage_key: stored.storageKey });
      throw error;
    }

    await writeAudit({
      userId: req.auth.user.id,
      action: 'media.upload',
      resourceType: 'media',
      resourceId: asset.id,
      afterData: asset,
      request: req
    });
    res.status(201).json(asset);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    if (error instanceof multer.MulterError) return res.status(400).json({ error: error.message });
    next(error);
  }
});

const externalSchema = z.object({
  site_id: z.coerce.number().int().positive(),
  url: z.string().url().max(2048).refine((value) => /^https:\/\//i.test(value), 'External media must use HTTPS'),
  original_name: z.string().trim().min(1).max(500),
  mime_type: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']),
  alt_text: z.string().trim().max(2000).nullable().optional()
});

router.post('/external', requireRole('editor'), requireCsrf, async (req, res, next) => {
  try {
    const parsed = externalSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({
      error: 'Validation failed',
      details: parsed.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }))
    });
    const result = await pool.query(
      `INSERT INTO cms_media_assets
        (site_id, storage_provider, original_name, mime_type, byte_size, public_url, alt_text, uploaded_by)
       VALUES ($1, 'external', $2, $3, 0, $4, $5, $6) RETURNING *`,
      [parsed.data.site_id, parsed.data.original_name, parsed.data.mime_type, parsed.data.url, parsed.data.alt_text || null, req.auth.user.id]
    );
    await writeAudit({
      userId: req.auth.user.id,
      action: 'media.external_create',
      resourceType: 'media',
      resourceId: result.rows[0].id,
      afterData: result.rows[0],
      request: req
    });
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', requireRole('publisher'), requireCsrf, async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid media ID' });
    const result = await pool.query('SELECT * FROM cms_media_assets WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Media not found' });
    const asset = result.rows[0];
    await deleteFile(asset);
    await pool.query('DELETE FROM cms_media_assets WHERE id = $1', [id]);
    await writeAudit({
      userId: req.auth.user.id,
      action: 'media.delete',
      resourceType: 'media',
      resourceId: id,
      beforeData: asset,
      request: req
    });
    res.json({ message: 'Media deleted' });
  } catch (error) {
    next(error);
  }
});

router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    const message = error.code === 'LIMIT_FILE_SIZE' ? 'Media files must not exceed 10 MB' : error.message;
    return res.status(400).json({ error: message });
  }
  next(error);
});

module.exports = router;