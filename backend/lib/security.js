const crypto = require('crypto');
const { Algorithm, hash, verify } = require('@node-rs/argon2');

const PASSWORD_OPTIONS = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1,
  outputLen: 32
};

const hashPassword = (password) => hash(password, PASSWORD_OPTIONS);
const verifyPassword = (passwordHash, password) => verify(passwordHash, password);
const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const normalizeEmail = (email) => email.trim().toLowerCase();

const passwordPolicyErrors = (password) => {
  const errors = [];
  if (password.length < 12) errors.push('Password must contain at least 12 characters');
  if (!/[a-z]/.test(password)) errors.push('Password must contain a lowercase letter');
  if (!/[A-Z]/.test(password)) errors.push('Password must contain an uppercase letter');
  if (!/[0-9]/.test(password)) errors.push('Password must contain a number');
  return errors;
};

const safeTokenEqual = (left, right) => {
  const leftBuffer = Buffer.from(left || '', 'utf8');
  const rightBuffer = Buffer.from(right || '', 'utf8');
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

module.exports = {
  hashPassword,
  verifyPassword,
  randomToken,
  hashToken,
  normalizeEmail,
  passwordPolicyErrors,
  safeTokenEqual
};