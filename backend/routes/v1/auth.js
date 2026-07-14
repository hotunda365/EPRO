const express = require('express');
const { rateLimit } = require('express-rate-limit');
const { z } = require('zod');

const pool = require('../../db/connection');
const {
  hashPassword,
  verifyPassword,
  randomToken,
  hashToken,
  normalizeEmail,
  passwordPolicyErrors
} = require('../../lib/security');
const {
  SESSION_COOKIE,
  CSRF_COOKIE,
  authenticate,
  requireCsrf,
  cookieOptions,
  csrfCookieOptions,
  clearCookieOptions,
  clearCsrfCookieOptions
} = require('../../middleware/auth');
const { writeAudit } = require('../../services/audit');

const router = express.Router();
const dummyHashPromise = hashPassword(randomToken());

const loginSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(1024)
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1).max(1024),
  newPassword: z.string().min(12).max(1024)
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' }
});

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid email or password' });

    const email = normalizeEmail(parsed.data.email);
    const result = await pool.query(
      `SELECT id, email, display_name, password_hash, role, is_active
       FROM cms_admin_users WHERE LOWER(email) = $1 LIMIT 1`,
      [email]
    );
    const user = result.rows[0];
    const passwordHash = user?.password_hash || await dummyHashPromise;
    const passwordMatches = await verifyPassword(passwordHash, parsed.data.password);

    if (!user || !user.is_active || !passwordMatches) {
      await writeAudit({
        userId: user?.id || null,
        action: 'auth.login_failed',
        afterData: { email },
        request: req
      });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const sessionToken = randomToken();
    const csrfToken = randomToken();
    const ttlHours = Number.parseInt(process.env.SESSION_TTL_HOURS || '12', 10);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM cms_admin_sessions WHERE expires_at <= CURRENT_TIMESTAMP');
      await client.query(
        `INSERT INTO cms_admin_sessions
          (user_id, token_hash, csrf_hash, ip_address, user_agent, expires_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP + ($6 * INTERVAL '1 hour'))`,
        [user.id, hashToken(sessionToken), hashToken(csrfToken), req.ip, req.get('user-agent')?.slice(0, 1000), ttlHours]
      );
      await client.query(
        'UPDATE cms_admin_users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );
      await writeAudit({ client, userId: user.id, action: 'auth.login', request: req });
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    res.cookie(SESSION_COOKIE, sessionToken, cookieOptions());
    res.cookie(CSRF_COOKIE, csrfToken, csrfCookieOptions());
    res.set('Cache-Control', 'no-store');
    res.json({
      user: { id: user.id, email: user.email, displayName: user.display_name, role: user.role },
      csrfToken
    });
  } catch (error) {
    next(error);
  }
});

router.get('/status', async (req, res, next) => {
  try {
    const token = req.cookies?.[SESSION_COOKIE];
    if (!token) return res.json({ user: null });
    const result = await pool.query(
      `SELECT users.id, users.email, users.display_name, users.role
       FROM cms_admin_sessions sessions
       JOIN cms_admin_users users ON users.id = sessions.user_id
       WHERE sessions.token_hash = $1
         AND sessions.expires_at > CURRENT_TIMESTAMP
         AND users.is_active = TRUE`,
      [hashToken(token)]
    );
    if (result.rows.length === 0) {
      res.clearCookie(SESSION_COOKIE, clearCookieOptions());
      res.clearCookie(CSRF_COOKIE, clearCsrfCookieOptions());
      return res.json({ user: null });
    }
    const user = result.rows[0];
    res.set('Cache-Control', 'no-store');
    res.json({
      user: { id: user.id, email: user.email, displayName: user.display_name, role: user.role }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/me', authenticate, (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ user: req.auth.user });
});

router.post('/logout', authenticate, requireCsrf, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM cms_admin_sessions WHERE id = $1', [req.auth.sessionId]);
    await writeAudit({ userId: req.auth.user.id, action: 'auth.logout', request: req });
    res.clearCookie(SESSION_COOKIE, clearCookieOptions());
    res.clearCookie(CSRF_COOKIE, clearCsrfCookieOptions());
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

router.post('/password', authenticate, requireCsrf, async (req, res, next) => {
  try {
    const parsed = passwordSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid password request' });

    const policyErrors = passwordPolicyErrors(parsed.data.newPassword);
    if (policyErrors.length > 0) return res.status(400).json({ error: policyErrors[0], details: policyErrors });

    const result = await pool.query(
      'SELECT password_hash FROM cms_admin_users WHERE id = $1',
      [req.auth.user.id]
    );
    const matches = result.rows[0] && await verifyPassword(result.rows[0].password_hash, parsed.data.currentPassword);
    if (!matches) return res.status(400).json({ error: 'Current password is incorrect' });

    const newHash = await hashPassword(parsed.data.newPassword);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE cms_admin_users
         SET password_hash = $1, password_changed_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [newHash, req.auth.user.id]
      );
      await client.query(
        'DELETE FROM cms_admin_sessions WHERE user_id = $1 AND id <> $2',
        [req.auth.user.id, req.auth.sessionId]
      );
      await writeAudit({ client, userId: req.auth.user.id, action: 'auth.password_changed', request: req });
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    res.json({ message: 'Password updated' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;