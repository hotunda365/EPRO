const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const request = require('supertest');

process.env.COOKIE_SECURE = 'false';

const { app } = require('../server');
const pool = require('../db/connection');
const runMigrations = require('../db/migrations');
const { hashPassword, verifyPassword } = require('../lib/security');
const { deleteFile } = require('../services/storage');

const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const email = `cms-test-${suffix}@example.test`;
const password = 'IntegrationPassword123';
const slug = `integration-${suffix}`;
let userId;
let siteId;
let pageId;
let navigationId;
let mediaId;
let agent;
let csrfToken;

before(async () => {
  await runMigrations();
  const passwordHash = await hashPassword(password);
  const user = await pool.query(
    `INSERT INTO cms_admin_users (email, display_name, password_hash, role)
     VALUES ($1, 'CMS Integration Test', $2, 'admin') RETURNING id`,
    [email, passwordHash]
  );
  userId = user.rows[0].id;
  const site = await pool.query("SELECT id FROM cms_sites WHERE site_key = 'ets-group'");
  siteId = site.rows[0].id;
  agent = request.agent(app);
});

after(async () => {
  if (pageId) {
    await pool.query("DELETE FROM cms_content_revisions WHERE resource_type = 'pages' AND resource_id = $1", [pageId]);
    await pool.query('DELETE FROM cms_pages WHERE id = $1', [pageId]);
  }
  if (navigationId) await pool.query('DELETE FROM cms_navigation_items WHERE id = $1', [navigationId]);
  if (mediaId) {
    const media = await pool.query('SELECT * FROM cms_media_assets WHERE id = $1', [mediaId]);
    if (media.rows[0]) {
      await deleteFile(media.rows[0]);
      await pool.query('DELETE FROM cms_media_assets WHERE id = $1', [mediaId]);
    }
  }
  if (userId) {
    await pool.query('DELETE FROM cms_admin_sessions WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM cms_audit_logs WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM cms_admin_users WHERE id = $1', [userId]);
  }
  await pool.end();
});

test('authenticated CMS publishing workflow', async () => {
  const anonymousStatus = await agent.get('/api/v1/auth/status');
  assert.equal(anonymousStatus.status, 200);
  assert.equal(anonymousStatus.body.user, null);

  const wrongLogin = await agent.post('/api/v1/auth/login')
    .set('Host', 'localhost:3000')
    .set('Origin', 'http://localhost:3000')
    .send({ email, password: 'WrongPassword123' });
  assert.equal(wrongLogin.status, 401);

  const storedUser = await pool.query(
    'SELECT password_hash, is_active FROM cms_admin_users WHERE id = $1',
    [userId]
  );
  assert.equal(storedUser.rows[0].is_active, true);
  assert.equal(await verifyPassword(storedUser.rows[0].password_hash, password), true);

  const login = await agent.post('/api/v1/auth/login')
    .set('Host', 'localhost:3000')
    .set('Origin', 'http://localhost:3000')
    .send({ email, password });
  assert.equal(login.status, 200, JSON.stringify(login.body));
  assert.equal(login.body.user.role, 'admin');
  csrfToken = login.body.csrfToken;
  const cookies = login.headers['set-cookie'].join(';');
  assert.match(cookies, /epro_admin_session=/);
  assert.match(cookies, /epro_admin_csrf=/);

  const me = await agent.get('/api/v1/auth/me');
  assert.equal(me.status, 200);
  assert.equal(me.body.user.email, email);
  const authenticatedStatus = await agent.get('/api/v1/auth/status');
  assert.equal(authenticatedStatus.status, 200);
  assert.equal(authenticatedStatus.body.user.email, email);

  const testPng = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
  const uploadedMedia = await agent
    .post('/api/v1/admin/media')
    .set('X-CSRF-Token', csrfToken)
    .field('site_id', String(siteId))
    .field('alt_text', 'Integration test image')
    .attach('file', testPng, { filename: 'integration.png', contentType: 'image/png' });
  assert.equal(uploadedMedia.status, 201);
  mediaId = uploadedMedia.body.id;
  const publicMedia = await request(app).get(`/api/v1/public/media/${mediaId}`);
  assert.equal(publicMedia.status, 200);
  assert.match(publicMedia.headers['content-type'], /image\/png/);
  const deletedMedia = await agent
    .delete(`/api/v1/admin/media/${mediaId}`)
    .set('X-CSRF-Token', csrfToken);
  assert.equal(deletedMedia.status, 200);
  mediaId = null;

  const created = await agent
    .post('/api/v1/admin/resources/pages')
    .set('X-CSRF-Token', csrfToken)
    .send({
      site_id: Number(siteId),
      slug,
      title: 'Original published title',
      content_html: '<p>Safe content</p><script>alert(1)</script>',
      status: 'published'
    });
  assert.equal(created.status, 201);
  assert.equal(created.body.status, 'draft');
  assert.doesNotMatch(created.body.content_html, /script/i);
  pageId = created.body.id;

  let publicPage = await request(app).get(`/api/v1/public/pages/${slug}?site=ets-group`);
  assert.equal(publicPage.status, 404);

  const firstPublish = await agent
    .post(`/api/v1/admin/resources/pages/${pageId}/publish`)
    .set('X-CSRF-Token', csrfToken);
  assert.equal(firstPublish.status, 200);
  assert.equal(firstPublish.body.status, 'published');

  publicPage = await request(app).get(`/api/v1/public/pages/${slug}?site=ets-group`);
  assert.equal(publicPage.status, 200);
  assert.equal(publicPage.body.title, 'Original published title');

  const missingCsrf = await agent
    .patch(`/api/v1/admin/resources/pages/${pageId}`)
    .send({ expected_version: firstPublish.body.version, title: 'Rejected update' });
  assert.equal(missingCsrf.status, 403);

  const draftUpdate = await agent
    .patch(`/api/v1/admin/resources/pages/${pageId}`)
    .set('X-CSRF-Token', csrfToken)
    .send({ expected_version: firstPublish.body.version, title: 'Approved updated title' });
  assert.equal(draftUpdate.status, 200);
  assert.equal(draftUpdate.body.status, 'draft');

  publicPage = await request(app).get(`/api/v1/public/pages/${slug}?site=ets-group`);
  assert.equal(publicPage.status, 200);
  assert.equal(publicPage.body.title, 'Original published title');

  const staleUpdate = await agent
    .patch(`/api/v1/admin/resources/pages/${pageId}`)
    .set('X-CSRF-Token', csrfToken)
    .send({ expected_version: firstPublish.body.version, title: 'Stale title' });
  assert.equal(staleUpdate.status, 409);

  const secondPublish = await agent
    .post(`/api/v1/admin/resources/pages/${pageId}/publish`)
    .set('X-CSRF-Token', csrfToken);
  assert.equal(secondPublish.status, 200);

  publicPage = await request(app).get(`/api/v1/public/pages/${slug}?site=ets-group`);
  assert.equal(publicPage.status, 200);
  assert.equal(publicPage.body.title, 'Approved updated title');

  const revisions = await agent.get(`/api/v1/admin/resources/pages/${pageId}/revisions`);
  assert.equal(revisions.status, 200);
  assert.ok(revisions.body.data.length >= 4);

  const restored = await agent
    .post(`/api/v1/admin/resources/pages/${pageId}/restore/${firstPublish.body.version}`)
    .set('X-CSRF-Token', csrfToken);
  assert.equal(restored.status, 200);
  assert.equal(restored.body.status, 'draft');
  assert.equal(restored.body.title, 'Original published title');

  publicPage = await request(app).get(`/api/v1/public/pages/${slug}?site=ets-group`);
  assert.equal(publicPage.body.title, 'Approved updated title');

  const audit = await agent.get('/api/v1/admin/audit?limit=20');
  assert.equal(audit.status, 200);
  assert.ok(audit.body.data.some((entry) => entry.action === 'content.publish'));

  const navigation = await agent
    .post('/api/v1/admin/resources/navigation')
    .set('X-CSRF-Token', csrfToken)
    .send({
      site_id: Number(siteId),
      item_key: `integration-${suffix}`,
      label: 'Integration navigation',
      url: '/integration-test',
      location: 'footer'
    });
  assert.equal(navigation.status, 201);
  navigationId = navigation.body.id;
  const publishedNavigation = await agent
    .post(`/api/v1/admin/resources/navigation/${navigationId}/publish`)
    .set('X-CSRF-Token', csrfToken);
  assert.equal(publishedNavigation.status, 200);
  assert.equal(publishedNavigation.body.status, 'published');

  const logout = await agent.post('/api/v1/auth/logout').set('X-CSRF-Token', csrfToken);
  assert.equal(logout.status, 204);
  const denied = await agent.get('/api/v1/admin/dashboard');
  assert.equal(denied.status, 401);
});