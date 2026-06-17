const express = require('express');
const pool = require('../db/connection');

const router = express.Router();

// Get all case studies
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const featured = req.query.featured;

    let query = 'SELECT * FROM case_studies WHERE status = $1';
    const params = ['published'];

    if (featured === 'true') {
      query += ' AND featured = true';
    }

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get case study by slug
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const result = await pool.query(
      'SELECT * FROM case_studies WHERE slug = $1 AND status = $2',
      [slug, 'published']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Case study not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create case study
router.post('/', async (req, res) => {
  try {
    const { title, slug, client_name, industry, description, challenge, solution, result, image_url, featured, status } = req.body;

    if (!title || !slug) {
      return res.status(400).json({ error: 'Missing required fields: title, slug' });
    }

    const caseStudyResult = await pool.query(
      `INSERT INTO case_studies (title, slug, client_name, industry, description, challenge, solution, result, image_url, featured, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [title, slug, client_name || null, industry || null, description || null, challenge || null, solution || null, result || null, image_url || null, featured || false, status || 'published']
    );

    res.status(201).json(caseStudyResult.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      res.status(409).json({ error: 'Case study slug already exists' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Update case study
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, slug, client_name, industry, description, challenge, solution, result, image_url, featured, status } = req.body;

    const updateResult = await pool.query(
      `UPDATE case_studies SET 
        title = COALESCE($1, title),
        slug = COALESCE($2, slug),
        client_name = COALESCE($3, client_name),
        industry = COALESCE($4, industry),
        description = COALESCE($5, description),
        challenge = COALESCE($6, challenge),
        solution = COALESCE($7, solution),
        result = COALESCE($8, result),
        image_url = COALESCE($9, image_url),
        featured = COALESCE($10, featured),
        status = COALESCE($11, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $12
      RETURNING *`,
      [title, slug, client_name, industry, description, challenge, solution, result, image_url, featured, status, id]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Case study not found' });
    }

    res.json(updateResult.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete case study
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleteResult = await pool.query('DELETE FROM case_studies WHERE id = $1 RETURNING id', [id]);

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Case study not found' });
    }

    res.json({ message: 'Case study deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
