const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const pool = require('./connection');

const MIGRATION_LOCK = 'epro-cms-schema-migrations';
const migrationsDirectory = path.join(__dirname, 'migrations');

const checksum = (contents) => crypto.createHash('sha256').update(contents).digest('hex');

const runMigrations = async () => {
  const client = await pool.connect();

  try {
    await client.query('SELECT pg_advisory_lock(hashtext($1))', [MIGRATION_LOCK]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        checksum CHAR(64) NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const files = fs.readdirSync(migrationsDirectory)
      .filter((file) => /^\d+.*\.sql$/.test(file))
      .sort((left, right) => left.localeCompare(right));

    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDirectory, file), 'utf8');
      const migrationChecksum = checksum(sql);
      const applied = await client.query(
        'SELECT checksum FROM schema_migrations WHERE version = $1',
        [file]
      );

      if (applied.rows.length > 0) {
        if (applied.rows[0].checksum !== migrationChecksum) {
          throw new Error(`Migration checksum mismatch: ${file}`);
        }
        continue;
      }

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)',
          [file, migrationChecksum]
        );
        await client.query('COMMIT');
        console.log(`Applied migration ${file}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    try {
      await client.query('SELECT pg_advisory_unlock(hashtext($1))', [MIGRATION_LOCK]);
    } finally {
      client.release();
    }
  }
};

if (require.main === module) {
  runMigrations()
    .then(async () => {
      console.log('Database migrations complete');
      await pool.end();
    })
    .catch(async (error) => {
      console.error('Database migration failed:', error.message);
      await pool.end();
      process.exit(1);
    });
}

module.exports = runMigrations;