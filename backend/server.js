const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { rateLimit } = require('express-rate-limit');
require('dotenv').config();

const pool = require('./db/connection');
const runMigrations = require('./db/migrations');
const runSeed = require('./db/seed');
const bootstrapAdminFromEnv = require('./services/bootstrap-admin');
const authRoutes = require('./routes/v1/auth');
const publicRoutes = require('./routes/v1/public');
const adminRoutes = require('./routes/v1/admin');
const mediaRoutes = require('./routes/v1/media');

const app = express();
const PORT = Number.parseInt(process.env.PORT || '3000', 10);
const configuredOrigins = (process.env.CORS_ORIGINS || 'http://localhost:8000,http://localhost:8080')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use((req, res, next) => cors({
  origin(origin, callback) {
    const requestOrigin = `${req.protocol}://${req.get('host')}`;
    if (!origin || origin === requestOrigin || configuredOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-CSRF-Token']
})(req, res, next));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: false }));
app.use(cookieParser());

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 180,
  standardHeaders: 'draft-8',
  legacyHeaders: false
});
app.use('/api/', apiLimiter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api/ready', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ready', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ status: 'unavailable' });
  }
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/public', publicRoutes);
app.use('/api/v1/admin/media', mediaRoutes);
app.use('/api/v1/admin', adminRoutes);

if (process.env.ENABLE_LEGACY_API === 'true') {
  app.use('/api/legacy/users', require('./routes/users'));
  app.use('/api/legacy/company', require('./routes/company'));
  app.use('/api/legacy/contact', require('./routes/contact'));
  app.use('/api/legacy/blog', require('./routes/blog'));
  app.use('/api/legacy/services', require('./routes/services'));
  app.use('/api/legacy/case-studies', require('./routes/caseStudies'));
}

if (process.env.ENABLE_CHAT === 'true') {
  const chatLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-8',
    legacyHeaders: false
  });
  app.use('/api/chat', chatLimiter, require('./routes/chat'));
}

app.use('/admin', express.static(path.join(__dirname, 'admin'), { index: 'index.html' }));

app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.path, method: req.method });
});

app.use((error, req, res, next) => {
  if (error.message === 'Origin is not allowed by CORS') {
    return res.status(403).json({ error: error.message });
  }
  console.error('Request error:', error);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? undefined : error.message
  });
});

const start = async () => {
  if (process.env.AUTO_MIGRATE !== 'false') await runMigrations();
  if (process.env.AUTO_SEED !== 'false') await runSeed();
  await bootstrapAdminFromEnv();

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`EPRO CMS API listening on port ${PORT}`);
  });

  const sessionCleanup = setInterval(() => {
    pool.query('DELETE FROM cms_admin_sessions WHERE expires_at <= CURRENT_TIMESTAMP')
      .catch((error) => console.error('Session cleanup failed:', error.message));
  }, 60 * 60 * 1000);
  sessionCleanup.unref();

  return server;
};

if (require.main === module) {
  start().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

module.exports = { app, start };
