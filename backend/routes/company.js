const express = require('express');
const pool = require('../db/connection');

const router = express.Router();

// Get company info
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM company_info ORDER BY created_at DESC LIMIT 1');

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company info not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create or update company info
router.post('/', async (req, res) => {
  try {
    const { name, description, logo_url, website, phone, email, address, established_year } = req.body;

    // Check if company info exists
    const checkResult = await pool.query('SELECT id FROM company_info LIMIT 1');

    if (checkResult.rows.length > 0) {
      // Update existing
      const result = await pool.query(
        `UPDATE company_info SET 
          name = COALESCE($1, name),
          description = COALESCE($2, description),
          logo_url = COALESCE($3, logo_url),
          website = COALESCE($4, website),
          phone = COALESCE($5, phone),
          email = COALESCE($6, email),
          address = COALESCE($7, address),
          established_year = COALESCE($8, established_year),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $9
        RETURNING *`,
        [name, description, logo_url, website, phone, email, address, established_year, checkResult.rows[0].id]
      );
      res.json(result.rows[0]);
    } else {
      // Create new
      const result = await pool.query(
        `INSERT INTO company_info (name, description, logo_url, website, phone, email, address, established_year)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [name, description, logo_url, website, phone, email, address, established_year]
      );
      res.status(201).json(result.rows[0]);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
