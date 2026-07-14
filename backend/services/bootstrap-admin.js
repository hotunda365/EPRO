const { z } = require('zod');

const pool = require('../db/connection');
const { hashPassword, normalizeEmail, passwordPolicyErrors } = require('../lib/security');

const bootstrapAdminFromEnv = async () => {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email && !password) return false;
  if (!email || !password) throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set together');

  const parsedEmail = z.string().email().max(320).safeParse(email);
  const displayName = (process.env.ADMIN_DISPLAY_NAME || 'Website Administrator').trim();
  if (!parsedEmail.success || displayName.length < 2 || displayName.length > 160) {
    throw new Error('Invalid administrator bootstrap profile');
  }
  const policyErrors = passwordPolicyErrors(password);
  if (policyErrors.length > 0) throw new Error(policyErrors.join('. '));

  const count = await pool.query('SELECT COUNT(*)::int AS count FROM cms_admin_users');
  if (count.rows[0].count > 0) return false;

  const passwordHash = await hashPassword(password);
  await pool.query(
    `INSERT INTO cms_admin_users (email, display_name, password_hash, role)
     VALUES ($1, $2, $3, 'admin')`,
    [normalizeEmail(email), displayName, passwordHash]
  );
  console.log(`Initial CMS administrator created for ${normalizeEmail(email)}`);
  return true;
};

module.exports = bootstrapAdminFromEnv;