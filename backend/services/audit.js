const pool = require('../db/connection');

const writeAudit = async ({
  client = pool,
  userId = null,
  action,
  resourceType = null,
  resourceId = null,
  beforeData = null,
  afterData = null,
  request = null
}) => {
  await client.query(
    `INSERT INTO cms_audit_logs
      (user_id, action, resource_type, resource_id, before_data, after_data, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      userId,
      action,
      resourceType,
      resourceId,
      beforeData ? JSON.stringify(beforeData) : null,
      afterData ? JSON.stringify(afterData) : null,
      request?.ip || null,
      request?.get('user-agent')?.slice(0, 1000) || null
    ]
  );
};

module.exports = { writeAudit };