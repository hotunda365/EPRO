const pool = require('../db/connection');
const { hashToken, safeTokenEqual } = require('../lib/security');

const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME || 'epro_admin_session';
const CSRF_COOKIE = process.env.CSRF_COOKIE_NAME || 'epro_admin_csrf';
const ROLE_LEVEL = { viewer: 1, editor: 2, publisher: 3, admin: 4 };

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === undefined
    ? process.env.NODE_ENV === 'production'
    : process.env.COOKIE_SECURE === 'true',
  sameSite: 'lax',
  path: '/',
  maxAge: Number.parseInt(process.env.SESSION_TTL_HOURS || '12', 10) * 60 * 60 * 1000
});

const csrfCookieOptions = () => ({
  ...cookieOptions(),
  httpOnly: false
});

const clearOptions = (options) => {
  const { maxAge, ...rest } = options;
  return rest;
};

const clearCookieOptions = () => clearOptions(cookieOptions());
const clearCsrfCookieOptions = () => clearOptions(csrfCookieOptions());

const authenticate = async (req, res, next) => {
  try {
    const token = req.cookies?.[SESSION_COOKIE];
    if (!token) return res.status(401).json({ error: 'Authentication required' });

    const result = await pool.query(
      `SELECT
         sessions.id AS session_id,
         sessions.csrf_hash,
         sessions.last_seen_at,
         users.id AS user_id,
         users.email,
         users.display_name,
         users.role
       FROM cms_admin_sessions sessions
       JOIN cms_admin_users users ON users.id = sessions.user_id
       WHERE sessions.token_hash = $1
         AND sessions.expires_at > CURRENT_TIMESTAMP
         AND users.is_active = TRUE`,
      [hashToken(token)]
    );

    if (result.rows.length === 0) {
      res.clearCookie(SESSION_COOKIE, clearCookieOptions());
      return res.status(401).json({ error: 'Session expired' });
    }

    const session = result.rows[0];
    req.auth = {
      sessionId: session.session_id,
      csrfHash: session.csrf_hash,
      user: {
        id: session.user_id,
        email: session.email,
        displayName: session.display_name,
        role: session.role
      }
    };

    if (Date.now() - new Date(session.last_seen_at).getTime() > 5 * 60 * 1000) {
      pool.query(
        'UPDATE cms_admin_sessions SET last_seen_at = CURRENT_TIMESTAMP WHERE id = $1',
        [session.session_id]
      ).catch((error) => console.error('Unable to update session activity:', error.message));
    }

    next();
  } catch (error) {
    next(error);
  }
};

const requireCsrf = (req, res, next) => {
  const csrfToken = req.get('x-csrf-token');
  if (!csrfToken || !safeTokenEqual(hashToken(csrfToken), req.auth.csrfHash)) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  next();
};

const requireRole = (...roles) => (req, res, next) => {
  const requiredLevel = Math.min(...roles.map((role) => ROLE_LEVEL[role]));
  const userLevel = ROLE_LEVEL[req.auth.user.role] || 0;
  if (userLevel < requiredLevel) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};

module.exports = {
  SESSION_COOKIE,
  CSRF_COOKIE,
  ROLE_LEVEL,
  authenticate,
  requireCsrf,
  requireRole,
  cookieOptions,
  csrfCookieOptions,
  clearCookieOptions,
  clearCsrfCookieOptions
};