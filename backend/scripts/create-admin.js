const { z } = require('zod');

const pool = require('../db/connection');
const runMigrations = require('../db/migrations');
const { hashPassword, normalizeEmail, passwordPolicyErrors } = require('../lib/security');

const inputSchema = z.object({
  email: z.string().email().max(320),
  displayName: z.string().trim().min(2).max(160),
  password: z.string().min(12).max(1024)
});

const createAdmin = async () => {
  const parsed = inputSchema.safeParse({
    email: process.env.ADMIN_EMAIL,
    displayName: process.env.ADMIN_DISPLAY_NAME || 'Website Administrator',
    password: process.env.ADMIN_PASSWORD
  });

  if (!parsed.success) {
    throw new Error('Set valid ADMIN_EMAIL, ADMIN_DISPLAY_NAME, and ADMIN_PASSWORD environment variables');
  }

  const policyErrors = passwordPolicyErrors(parsed.data.password);
  if (policyErrors.length > 0) throw new Error(policyErrors.join('. '));

  await runMigrations();
  const passwordHash = await hashPassword(parsed.data.password);
  const email = normalizeEmail(parsed.data.email);
  const existing = await pool.query(
    'SELECT id FROM cms_admin_users WHERE LOWER(email) = $1 LIMIT 1',
    [email]
  );
  const result = existing.rows.length > 0
    ? await pool.query(
      `UPDATE cms_admin_users SET
         display_name = $1,
         password_hash = $2,
         role = 'admin',
         is_active = TRUE,
         password_changed_at = CURRENT_TIMESTAMP
       WHERE id = $3 RETURNING id, email, display_name, role`,
      [parsed.data.displayName, passwordHash, existing.rows[0].id]
    )
    : await pool.query(
      `INSERT INTO cms_admin_users (email, display_name, password_hash, role)
       VALUES ($1, $2, $3, 'admin')
       RETURNING id, email, display_name, role`,
      [email, parsed.data.displayName, passwordHash]
    );

  console.log(`Administrator ready: ${result.rows[0].email}`);
};

createAdmin()
  .then(async () => pool.end())
  .catch(async (error) => {
    console.error(`Unable to create administrator: ${error.message}`);
    await pool.end();
    process.exit(1);
  });