const express = require('express');

const pool = require('../../db/connection');
const { getResource } = require('../../cms/resources');
const { streamFile } = require('../../services/storage');

const router = express.Router();
const PUBLIC_META_FIELDS = ['id', 'version', 'published_at', 'updated_at'];

router.use((req, res, next) => {
  res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  next();
});

const getSite = async (siteKey = 'eprotel') => {
  const result = await pool.query(
    `SELECT id, site_key, name, default_locale
     FROM cms_sites WHERE site_key = $1 AND is_active = TRUE`,
    [siteKey]
  );
  return result.rows[0] || null;
};

const publicRecord = (config, record) => {
  const allowed = new Set([...config.columns, ...PUBLIC_META_FIELDS]);
  return Object.fromEntries(Object.entries(record).filter(([key]) => allowed.has(key)));
};

const dateIsPublic = (record) => !record.published_at || new Date(record.published_at).getTime() <= Date.now();

const sortRecords = (resourceName, records) => {
  const text = (value) => value || '';
  return records.sort((left, right) => {
    if (resourceName === 'milestones') {
      return right.year - left.year || left.sort_order - right.sort_order || left.id - right.id;
    }
    if (resourceName === 'news') {
      return new Date(right.published_at || 0) - new Date(left.published_at || 0) || left.sort_order - right.sort_order;
    }
    if (resourceName === 'investor-documents') {
      return text(right.published_on).localeCompare(text(left.published_on)) || left.sort_order - right.sort_order;
    }
    return left.sort_order - right.sort_order || left.id - right.id;
  });
};

const getPublishedRecords = async ({ resourceName, site, locale, filters = {} }) => {
  const config = getResource(resourceName);
  if (!config) throw new Error(`Unknown public resource: ${resourceName}`);

  if (!config.hasVersion) {
    const params = [site.id, locale];
    const where = ['site_id = $1', 'locale = $2'];
    if (config.columns.includes('status')) where.push("status = 'published'");
    if (resourceName === 'settings') where.push('is_public = TRUE');
    const result = await pool.query(
      `SELECT * FROM ${config.table} WHERE ${where.join(' AND ')} ORDER BY ${config.orderBy}`,
      params
    );
    return result.rows.map((record) => publicRecord(config, record));
  }

  const result = await pool.query(
    `SELECT current_record.*,
            published_revision.snapshot AS published_snapshot
     FROM ${config.table} current_record
     LEFT JOIN LATERAL (
       SELECT snapshot
       FROM cms_content_revisions
       WHERE resource_type = $3
         AND resource_id = current_record.id
         AND action = 'publish'
       ORDER BY version DESC
       LIMIT 1
     ) published_revision ON TRUE
     WHERE current_record.site_id = $1
       AND current_record.locale = $2
       AND current_record.status <> 'archived'`,
    [site.id, locale, resourceName]
  );

  const records = result.rows
    .map((row) => {
      const { published_snapshot: snapshot, ...current } = row;
      if (current.status === 'published' && dateIsPublic(current)) return current;
      if (snapshot && snapshot.status === 'published' && dateIsPublic(snapshot)) return snapshot;
      return null;
    })
    .filter(Boolean)
    .filter((record) => Object.entries(filters).every(([field, value]) => !value || record[field] === value))
    .map((record) => publicRecord(config, record));

  return sortRecords(resourceName, records);
};

const withSite = (handler) => async (req, res, next) => {
  try {
    const site = await getSite(req.query.site || 'eprotel');
    if (!site) return res.status(404).json({ error: 'Site not found' });
    const locale = req.query.locale || site.default_locale;
    return await handler(req, res, next, site, locale);
  } catch (error) {
    next(error);
  }
};

router.get('/sites', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT site_key, name, default_locale FROM cms_sites WHERE is_active = TRUE ORDER BY id ASC'
    );
    res.json({ data: result.rows });
  } catch (error) {
    next(error);
  }
});

router.get('/media/:id', async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid media ID' });
    const result = await pool.query('SELECT * FROM cms_media_assets WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Media not found' });
    await streamFile(result.rows[0], res);
  } catch (error) {
    if (error.code === 'ENOENT') return res.status(404).json({ error: 'Media file not found' });
    next(error);
  }
});

router.get('/bootstrap', withSite(async (req, res, next, site, locale) => {
  const [settingsRows, navigation, contacts] = await Promise.all([
    getPublishedRecords({ resourceName: 'settings', site, locale }),
    getPublishedRecords({ resourceName: 'navigation', site, locale }),
    getPublishedRecords({ resourceName: 'contacts', site, locale })
  ]);
  const settings = Object.fromEntries(settingsRows.map((item) => [item.setting_key, item.setting_value]));
  res.json({ site, locale, settings, navigation, contacts });
}));

router.get('/pages/:slug', withSite(async (req, res, next, site, locale) => {
  const records = await getPublishedRecords({ resourceName: 'pages', site, locale });
  const page = records.find((record) => record.slug === req.params.slug);
  if (!page) return res.status(404).json({ error: 'Page not found' });
  res.json(page);
}));

router.get('/contacts', withSite(async (req, res, next, site, locale) => {
  const data = await getPublishedRecords({ resourceName: 'contacts', site, locale });
  res.json({ data });
}));

router.get('/milestones', withSite(async (req, res, next, site, locale) => {
  const data = await getPublishedRecords({ resourceName: 'milestones', site, locale });
  res.json({ data });
}));

router.get('/people', withSite(async (req, res, next, site, locale) => {
  const group = ['board', 'management'].includes(req.query.group) ? req.query.group : null;
  const data = await getPublishedRecords({
    resourceName: 'people',
    site,
    locale,
    filters: { person_group: group }
  });
  res.json({ data });
}));

router.get('/services', withSite(async (req, res, next, site, locale) => {
  const data = await getPublishedRecords({
    resourceName: 'services',
    site,
    locale,
    filters: { service_group: req.query.group || null }
  });
  res.json({ data });
}));

router.get('/case-studies', withSite(async (req, res, next, site, locale) => {
  let data = await getPublishedRecords({ resourceName: 'cases', site, locale });
  if (req.query.featured === 'true') data = data.filter((record) => record.featured);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit || '100', 10)));
  res.json({ data: data.slice(0, limit) });
}));

router.get('/case-studies/:slug', withSite(async (req, res, next, site, locale) => {
  const records = await getPublishedRecords({ resourceName: 'cases', site, locale });
  const record = records.find((item) => item.slug === req.params.slug);
  if (!record) return res.status(404).json({ error: 'Case study not found' });
  res.json(record);
}));

router.get('/news', withSite(async (req, res, next, site, locale) => {
  let data = await getPublishedRecords({
    resourceName: 'news',
    site,
    locale,
    filters: { category: req.query.category || null }
  });
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit || '20', 10)));
  data = data.slice(0, limit);
  res.json({ data });
}));

router.get('/news/:slug', withSite(async (req, res, next, site, locale) => {
  const records = await getPublishedRecords({ resourceName: 'news', site, locale });
  const record = records.find((item) => item.slug === req.params.slug);
  if (!record) return res.status(404).json({ error: 'News post not found' });
  res.json(record);
}));

router.get('/investor-documents', withSite(async (req, res, next, site, locale) => {
  let data = await getPublishedRecords({
    resourceName: 'investor-documents',
    site,
    locale,
    filters: { category: req.query.category || null }
  });
  const mediaIds = data.map((record) => record.media_id).filter(Boolean);
  let media = new Map();
  if (mediaIds.length > 0) {
    const result = await pool.query(
      'SELECT id, public_url FROM cms_media_assets WHERE id = ANY($1::bigint[])',
      [mediaIds]
    );
    media = new Map(result.rows.map((item) => [String(item.id), item.public_url]));
  }
  data = data
    .map((record) => ({
      ...record,
      document_url: record.document_url || media.get(String(record.media_id)) || null
    }))
    .filter((record) => record.document_url);
  res.json({ data });
}));

module.exports = router;