const express = require('express');
const { z } = require('zod');

const pool = require('../../db/connection');
const { resources, getResource, sanitizeResourceData } = require('../../cms/resources');
const { authenticate, requireCsrf, requireRole } = require('../../middleware/auth');
const { hashPassword, normalizeEmail, passwordPolicyErrors } = require('../../lib/security');
const { writeAudit } = require('../../services/audit');

const router = express.Router();
const FILTER_FIELDS = {
  navigation: { location: 'location' },
  people: { group: 'person_group' },
  services: { group: 'service_group' },
  news: { category: 'category' },
  'investor-documents': { category: 'category' }
};

router.use(authenticate);
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

const validationError = (res, result) => res.status(400).json({
  error: 'Validation failed',
  details: result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }))
});

const parseId = (value) => {
  const id = Number.parseInt(value, 10);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

const configOr404 = (req, res) => {
  const config = getResource(req.params.resource);
  if (!config) res.status(404).json({ error: 'Unknown CMS resource' });
  return config;
};

const createRevision = async (client, resourceType, record, action, userId) => {
  if (!record.version) return;
  await client.query(
    `INSERT INTO cms_content_revisions
      (resource_type, resource_id, version, action, snapshot, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (resource_type, resource_id, version) DO NOTHING`,
    [resourceType, record.id, record.version, action, JSON.stringify(record), userId]
  );
};

const ensurePublishedSnapshot = async (client, resourceType, record, userId) => {
  if (record.status !== 'published' || !record.version) return;
  const existing = await client.query(
    `SELECT 1 FROM cms_content_revisions
     WHERE resource_type = $1 AND resource_id = $2 AND action = 'publish'
     LIMIT 1`,
    [resourceType, record.id]
  );
  if (existing.rows.length === 0) {
    await createRevision(client, resourceType, record, 'publish', userId);
  }
};

const withTransaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

router.get('/sites', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, site_key, name, default_locale, is_active FROM cms_sites ORDER BY id ASC'
    );
    res.json({ data: result.rows });
  } catch (error) {
    next(error);
  }
});

router.get('/resource-types', (req, res) => {
  res.json({
    data: Object.entries(resources).map(([key, config]) => ({
      key,
      label: config.label,
      supportsPublish: config.supportsPublish,
      hasVersion: config.hasVersion
    }))
  });
});

router.get('/dashboard', async (req, res, next) => {
  try {
    const siteId = Number.parseInt(req.query.site_id, 10);
    if (!Number.isSafeInteger(siteId) || siteId <= 0) {
      return res.status(400).json({ error: 'A valid site is required' });
    }
    const statusTables = Object.entries(resources).filter(([, config]) => config.columns.includes('status'));
    const counts = {};
    for (const [key, config] of statusTables) {
      const result = await pool.query(
        `SELECT status, COUNT(*)::int AS count FROM ${config.table}
         WHERE site_id = $1 GROUP BY status`,
        [siteId]
      );
      counts[key] = Object.fromEntries(result.rows.map((row) => [row.status, row.count]));
    }
    const recentAudit = await pool.query(
      `SELECT logs.id, logs.action, logs.resource_type, logs.resource_id, logs.created_at,
              users.display_name AS user_name
       FROM cms_audit_logs logs
       LEFT JOIN cms_admin_users users ON users.id = logs.user_id
       ORDER BY logs.created_at DESC LIMIT 12`
    );
    res.json({ counts, recentAudit: recentAudit.rows });
  } catch (error) {
    next(error);
  }
});

router.get('/audit', requireRole('publisher'), async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit || '30', 10)));
    const offset = (page - 1) * limit;
    const [rows, count] = await Promise.all([
      pool.query(
        `SELECT logs.*, users.display_name AS user_name, users.email AS user_email
         FROM cms_audit_logs logs
         LEFT JOIN cms_admin_users users ON users.id = logs.user_id
         ORDER BY logs.created_at DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      pool.query('SELECT COUNT(*)::int AS total FROM cms_audit_logs')
    ]);
    res.json({ data: rows.rows, pagination: { page, limit, total: count.rows[0].total } });
  } catch (error) {
    next(error);
  }
});

router.get('/users', requireRole('admin'), async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, email, display_name, role, is_active, last_login_at, created_at, updated_at
       FROM cms_admin_users ORDER BY display_name ASC`
    );
    res.json({ data: result.rows });
  } catch (error) {
    next(error);
  }
});

const userCreateSchema = z.object({
  email: z.string().email().max(320),
  display_name: z.string().trim().min(2).max(160),
  password: z.string().min(12).max(1024),
  role: z.enum(['admin', 'editor', 'publisher', 'viewer']).default('editor')
});

router.post('/users', requireRole('admin'), requireCsrf, async (req, res, next) => {
  try {
    const parsed = userCreateSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed);
    const policyErrors = passwordPolicyErrors(parsed.data.password);
    if (policyErrors.length > 0) return res.status(400).json({ error: policyErrors[0], details: policyErrors });

    const passwordHash = await hashPassword(parsed.data.password);
    const user = await withTransaction(async (client) => {
      const result = await client.query(
        `INSERT INTO cms_admin_users (email, display_name, password_hash, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, display_name, role, is_active, created_at`,
        [normalizeEmail(parsed.data.email), parsed.data.display_name, passwordHash, parsed.data.role]
      );
      await writeAudit({
        client,
        userId: req.auth.user.id,
        action: 'admin_user.create',
        resourceType: 'users',
        resourceId: result.rows[0].id,
        afterData: result.rows[0],
        request: req
      });
      return result.rows[0];
    });
    res.status(201).json(user);
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'An administrator with this email already exists' });
    next(error);
  }
});

const userUpdateSchema = z.object({
  display_name: z.string().trim().min(2).max(160).optional(),
  role: z.enum(['admin', 'editor', 'publisher', 'viewer']).optional(),
  is_active: z.boolean().optional()
}).refine((data) => Object.keys(data).length > 0, 'No changes supplied');

router.patch('/users/:id', requireRole('admin'), requireCsrf, async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid user ID' });
    const parsed = userUpdateSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed);
    if (id === Number(req.auth.user.id) && parsed.data.is_active === false) {
      return res.status(400).json({ error: 'You cannot deactivate your own account' });
    }

    const updated = await withTransaction(async (client) => {
      const beforeResult = await client.query('SELECT * FROM cms_admin_users WHERE id = $1 FOR UPDATE', [id]);
      if (beforeResult.rows.length === 0) return null;
      const before = beforeResult.rows[0];

      if (before.role === 'admin' && (parsed.data.role && parsed.data.role !== 'admin' || parsed.data.is_active === false)) {
        const activeAdmins = await client.query(
          "SELECT COUNT(*)::int AS count FROM cms_admin_users WHERE role = 'admin' AND is_active = TRUE"
        );
        if (activeAdmins.rows[0].count <= 1) {
          const error = new Error('At least one active administrator is required');
          error.statusCode = 400;
          throw error;
        }
      }

      const fields = Object.keys(parsed.data);
      const values = fields.map((field) => parsed.data[field]);
      const assignments = fields.map((field, index) => `${field} = $${index + 1}`);
      values.push(id);
      const result = await client.query(
        `UPDATE cms_admin_users SET ${assignments.join(', ')} WHERE id = $${values.length}
         RETURNING id, email, display_name, role, is_active, last_login_at, created_at, updated_at`,
        values
      );
      await writeAudit({
        client,
        userId: req.auth.user.id,
        action: 'admin_user.update',
        resourceType: 'users',
        resourceId: id,
        beforeData: { email: before.email, display_name: before.display_name, role: before.role, is_active: before.is_active },
        afterData: result.rows[0],
        request: req
      });
      return result.rows[0];
    });
    if (!updated) return res.status(404).json({ error: 'Administrator not found' });
    res.json(updated);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    next(error);
  }
});

const passwordResetSchema = z.object({ password: z.string().min(12).max(1024) });

router.post('/users/:id/password', requireRole('admin'), requireCsrf, async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid user ID' });
    const parsed = passwordResetSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed);
    const policyErrors = passwordPolicyErrors(parsed.data.password);
    if (policyErrors.length > 0) return res.status(400).json({ error: policyErrors[0], details: policyErrors });
    const passwordHash = await hashPassword(parsed.data.password);

    const result = await withTransaction(async (client) => {
      const update = await client.query(
        `UPDATE cms_admin_users
         SET password_hash = $1, password_changed_at = CURRENT_TIMESTAMP
         WHERE id = $2 RETURNING id, email`,
        [passwordHash, id]
      );
      if (update.rows.length === 0) return null;
      await client.query('DELETE FROM cms_admin_sessions WHERE user_id = $1', [id]);
      await writeAudit({
        client,
        userId: req.auth.user.id,
        action: 'admin_user.password_reset',
        resourceType: 'users',
        resourceId: id,
        request: req
      });
      return update.rows[0];
    });
    if (!result) return res.status(404).json({ error: 'Administrator not found' });
    res.json({ message: 'Password reset and active sessions revoked' });
  } catch (error) {
    next(error);
  }
});

router.get('/resources/:resource', async (req, res, next) => {
  try {
    const config = configOr404(req, res);
    if (!config) return;
    const page = Math.max(1, Number.parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit || '30', 10)));
    const offset = (page - 1) * limit;
    const where = [];
    const params = [];
    const addCondition = (condition, value) => {
      params.push(value);
      where.push(condition.replace('?', `$${params.length}`));
    };

    if (req.query.site_id) addCondition('site_id = ?', Number.parseInt(req.query.site_id, 10));
    if (req.query.locale) addCondition('locale = ?', req.query.locale);
    if (req.query.status && config.columns.includes('status')) addCondition('status = ?', req.query.status);

    const filterMap = FILTER_FIELDS[req.params.resource] || {};
    for (const [queryName, column] of Object.entries(filterMap)) {
      if (req.query[queryName]) addCondition(`${column} = ?`, req.query[queryName]);
    }

    if (req.query.q && config.searchFields.length > 0) {
      params.push(`%${req.query.q.slice(0, 200)}%`);
      const placeholder = `$${params.length}`;
      where.push(`(${config.searchFields.map((field) => `${field} ILIKE ${placeholder}`).join(' OR ')})`);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const count = await pool.query(`SELECT COUNT(*)::int AS total FROM ${config.table} ${whereSql}`, params);
    params.push(limit, offset);
    const rows = await pool.query(
      `SELECT * FROM ${config.table} ${whereSql}
       ORDER BY ${config.orderBy} LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json({ data: rows.rows, pagination: { page, limit, total: count.rows[0].total } });
  } catch (error) {
    next(error);
  }
});

router.get('/resources/:resource/:id', async (req, res, next) => {
  try {
    const config = configOr404(req, res);
    if (!config) return;
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid resource ID' });
    const result = await pool.query(`SELECT * FROM ${config.table} WHERE id = $1`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Content not found' });
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.post('/resources/:resource', requireRole('editor'), requireCsrf, async (req, res, next) => {
  try {
    const config = configOr404(req, res);
    if (!config) return;
    const parsed = config.createSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed);
    const data = sanitizeResourceData(config, parsed.data);
    if (config.columns.includes('status')) data.status = 'draft';

    const record = await withTransaction(async (client) => {
      const fields = config.columns.filter((field) => Object.hasOwn(data, field));
      const values = fields.map((field) => data[field]);
      if (config.hasAuthors) {
        fields.push('created_by', 'updated_by');
        values.push(req.auth.user.id, req.auth.user.id);
      }
      const placeholders = values.map((_, index) => `$${index + 1}`);
      const result = await client.query(
        `INSERT INTO ${config.table} (${fields.join(', ')})
         VALUES (${placeholders.join(', ')}) RETURNING *`,
        values
      );
      await createRevision(client, req.params.resource, result.rows[0], 'create', req.auth.user.id);
      await writeAudit({
        client,
        userId: req.auth.user.id,
        action: 'content.create',
        resourceType: req.params.resource,
        resourceId: result.rows[0].id,
        afterData: result.rows[0],
        request: req
      });
      return result.rows[0];
    });
    res.status(201).json(record);
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'A record with this key already exists' });
    next(error);
  }
});

router.patch('/resources/:resource/:id', requireRole('editor'), requireCsrf, async (req, res, next) => {
  try {
    const config = configOr404(req, res);
    if (!config) return;
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid resource ID' });

    let updateSchema = config.createSchema.partial();
    if (config.hasVersion) {
      updateSchema = updateSchema.extend({ expected_version: z.coerce.number().int().positive() });
    }
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed);
    if (parsed.data.status === 'published') {
      return res.status(400).json({ error: 'Use the publish action to publish content' });
    }

    const expectedVersion = parsed.data.expected_version;
    delete parsed.data.expected_version;
    const data = sanitizeResourceData(config, parsed.data);
    const fields = config.columns.filter((field) => Object.hasOwn(data, field));
    if (fields.length === 0) return res.status(400).json({ error: 'No changes supplied' });

    const record = await withTransaction(async (client) => {
      const beforeResult = await client.query(`SELECT * FROM ${config.table} WHERE id = $1 FOR UPDATE`, [id]);
      if (beforeResult.rows.length === 0) return null;
      const before = beforeResult.rows[0];
      if (config.hasVersion && before.version !== expectedVersion) {
        const error = new Error('This content was updated by another user. Reload and try again.');
        error.statusCode = 409;
        throw error;
      }

      await ensurePublishedSnapshot(client, req.params.resource, before, req.auth.user.id);
      if (config.hasVersion && before.status === 'published' && !Object.hasOwn(data, 'status')) {
        data.status = 'draft';
        fields.push('status');
      }
      const values = fields.map((field) => data[field]);
      const assignments = fields.map((field, index) => `${field} = $${index + 1}`);
      if (config.hasAuthors) {
        values.push(req.auth.user.id);
        assignments.push(`updated_by = $${values.length}`);
      }
      if (config.hasVersion) assignments.push('version = version + 1');
      values.push(id);
      const result = await client.query(
        `UPDATE ${config.table} SET ${assignments.join(', ')}
         WHERE id = $${values.length} RETURNING *`,
        values
      );
      await createRevision(client, req.params.resource, result.rows[0], 'update', req.auth.user.id);
      await writeAudit({
        client,
        userId: req.auth.user.id,
        action: 'content.update',
        resourceType: req.params.resource,
        resourceId: id,
        beforeData: before,
        afterData: result.rows[0],
        request: req
      });
      return result.rows[0];
    });
    if (!record) return res.status(404).json({ error: 'Content not found' });
    res.json(record);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    if (error.code === '23505') return res.status(409).json({ error: 'A record with this key already exists' });
    next(error);
  }
});

router.post('/resources/:resource/:id/publish', requireRole('publisher'), requireCsrf, async (req, res, next) => {
  try {
    const config = configOr404(req, res);
    if (!config) return;
    if (!config.supportsPublish) return res.status(400).json({ error: 'This resource does not use publishing' });
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid resource ID' });

    const record = await withTransaction(async (client) => {
      const beforeResult = await client.query(`SELECT * FROM ${config.table} WHERE id = $1 FOR UPDATE`, [id]);
      if (beforeResult.rows.length === 0) return null;
      const before = beforeResult.rows[0];
      const publishError = config.validatePublish?.(before);
      if (publishError) {
        const error = new Error(publishError);
        error.statusCode = 400;
        throw error;
      }
      const assignments = ["status = 'published'"];
      const params = [];
      if (config.hasVersion) assignments.push('published_at = CURRENT_TIMESTAMP');
      if (config.hasVersion) assignments.push('version = version + 1');
      if (config.hasAuthors) {
        params.push(req.auth.user.id);
        assignments.push(`updated_by = $${params.length}`);
      }
      params.push(id);
      const result = await client.query(
        `UPDATE ${config.table} SET ${assignments.join(', ')}
         WHERE id = $${params.length} RETURNING *`,
        params
      );
      await createRevision(client, req.params.resource, result.rows[0], 'publish', req.auth.user.id);
      await writeAudit({
        client,
        userId: req.auth.user.id,
        action: 'content.publish',
        resourceType: req.params.resource,
        resourceId: id,
        beforeData: before,
        afterData: result.rows[0],
        request: req
      });
      return result.rows[0];
    });
    if (!record) return res.status(404).json({ error: 'Content not found' });
    res.json(record);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    next(error);
  }
});

router.delete('/resources/:resource/:id', requireRole('publisher'), requireCsrf, async (req, res, next) => {
  try {
    const config = configOr404(req, res);
    if (!config) return;
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid resource ID' });

    const result = await withTransaction(async (client) => {
      const beforeResult = await client.query(`SELECT * FROM ${config.table} WHERE id = $1 FOR UPDATE`, [id]);
      if (beforeResult.rows.length === 0) return null;
      const before = beforeResult.rows[0];
      let after = null;

      if (config.softDelete) {
        const assignments = ["status = 'archived'"];
        const params = [];
        if (config.hasVersion) assignments.push('version = version + 1');
        if (config.hasAuthors) {
          params.push(req.auth.user.id);
          assignments.push(`updated_by = $${params.length}`);
        }
        params.push(id);
        const update = await client.query(
          `UPDATE ${config.table} SET ${assignments.join(', ')}
           WHERE id = $${params.length} RETURNING *`,
          params
        );
        after = update.rows[0];
        await createRevision(client, req.params.resource, after, 'archive', req.auth.user.id);
      } else {
        if (req.auth.user.role !== 'admin') {
          const error = new Error('Only administrators can permanently delete this resource');
          error.statusCode = 403;
          throw error;
        }
        await client.query(`DELETE FROM ${config.table} WHERE id = $1`, [id]);
      }

      await writeAudit({
        client,
        userId: req.auth.user.id,
        action: config.softDelete ? 'content.archive' : 'content.delete',
        resourceType: req.params.resource,
        resourceId: id,
        beforeData: before,
        afterData: after,
        request: req
      });
      return after || before;
    });
    if (!result) return res.status(404).json({ error: 'Content not found' });
    res.json({ message: config.softDelete ? 'Content archived' : 'Content deleted' });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    next(error);
  }
});

router.get('/resources/:resource/:id/revisions', async (req, res, next) => {
  try {
    const config = configOr404(req, res);
    if (!config) return;
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid resource ID' });
    const result = await pool.query(
      `SELECT revisions.id, revisions.version, revisions.action, revisions.snapshot,
              revisions.created_at, users.display_name AS user_name
       FROM cms_content_revisions revisions
       LEFT JOIN cms_admin_users users ON users.id = revisions.created_by
       WHERE revisions.resource_type = $1 AND revisions.resource_id = $2
       ORDER BY revisions.version DESC`,
      [req.params.resource, id]
    );
    res.json({ data: result.rows });
  } catch (error) {
    next(error);
  }
});

router.post('/resources/:resource/:id/restore/:version', requireRole('publisher'), requireCsrf, async (req, res, next) => {
  try {
    const config = configOr404(req, res);
    if (!config) return;
    if (!config.hasVersion) return res.status(400).json({ error: 'This resource does not keep revisions' });
    const id = parseId(req.params.id);
    const version = parseId(req.params.version);
    if (!id || !version) return res.status(400).json({ error: 'Invalid resource or version ID' });

    const record = await withTransaction(async (client) => {
      const [beforeResult, revisionResult] = await Promise.all([
        client.query(`SELECT * FROM ${config.table} WHERE id = $1 FOR UPDATE`, [id]),
        client.query(
          `SELECT snapshot FROM cms_content_revisions
           WHERE resource_type = $1 AND resource_id = $2 AND version = $3`,
          [req.params.resource, id, version]
        )
      ]);
      if (beforeResult.rows.length === 0 || revisionResult.rows.length === 0) return null;
      const before = beforeResult.rows[0];
      await ensurePublishedSnapshot(client, req.params.resource, before, req.auth.user.id);
      const snapshot = revisionResult.rows[0].snapshot;
      const data = Object.fromEntries(
        config.columns
          .filter((field) => Object.hasOwn(snapshot, field))
          .map((field) => [field, snapshot[field]])
      );
      data.status = 'draft';
      const fields = Object.keys(data);
      const values = fields.map((field) => data[field]);
      const assignments = fields.map((field, index) => `${field} = $${index + 1}`);
      values.push(req.auth.user.id);
      assignments.push(`updated_by = $${values.length}`, 'version = version + 1');
      values.push(id);
      const result = await client.query(
        `UPDATE ${config.table} SET ${assignments.join(', ')}
         WHERE id = $${values.length} RETURNING *`,
        values
      );
      await createRevision(client, req.params.resource, result.rows[0], 'restore', req.auth.user.id);
      await writeAudit({
        client,
        userId: req.auth.user.id,
        action: 'content.restore',
        resourceType: req.params.resource,
        resourceId: id,
        beforeData: before,
        afterData: result.rows[0],
        request: req
      });
      return result.rows[0];
    });
    if (!record) return res.status(404).json({ error: 'Content or revision not found' });
    res.json(record);
  } catch (error) {
    next(error);
  }
});

module.exports = router;