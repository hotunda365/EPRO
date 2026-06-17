const express = require('express');
const pool = require('../db/connection');

const router = express.Router();

// Get all services
router.get('/', async (req, res) => {
  try {
    const status = req.query.status || 'active';
    const result = await pool.query(
      'SELECT * FROM services WHERE status = $1 ORDER BY order_index ASC',
      [status]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get service by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM services WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create service
router.post('/', async (req, res) => {
  try {
    const { name, description, icon_url, features, pricing, status, order_index } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Service name is required' });
    }

    const result = await pool.query(
      `INSERT INTO services (name, description, icon_url, features, pricing, status, order_index)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [name, description || null, icon_url || null, features || null, pricing || null, status || 'active', order_index || 0]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update service
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, icon_url, features, pricing, status, order_index } = req.body;

    const result = await pool.query(
      `UPDATE services SET 
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        icon_url = COALESCE($3, icon_url),
        features = COALESCE($4, features),
        pricing = COALESCE($5, pricing),
        status = COALESCE($6, status),
        order_index = COALESCE($7, order_index),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *`,
      [name, description, icon_url, features, pricing, status, order_index, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete service
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM services WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
