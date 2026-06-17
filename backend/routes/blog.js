const express = require('express');
const pool = require('../db/connection');

const router = express.Router();

// Get all blog posts
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const status = req.query.status || 'published';

    const result = await pool.query(
      `SELECT id, title, slug, content, author_id, featured_image, category, status, published_at, created_at, updated_at 
      FROM blog_posts WHERE status = $1 ORDER BY published_at DESC LIMIT $2 OFFSET $3`,
      [status, limit, offset]
    );

    const countResult = await pool.query('SELECT COUNT(*) as total FROM blog_posts WHERE status = $1', [status]);
    const total = parseInt(countResult.rows[0].total);

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

// Get single blog post by slug
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const result = await pool.query(
      'SELECT * FROM blog_posts WHERE slug = $1 AND status = $2',
      [slug, 'published']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create blog post
router.post('/', async (req, res) => {
  try {
    const { title, slug, content, author_id, featured_image, category, status, published_at } = req.body;

    if (!title || !slug || !content) {
      return res.status(400).json({ error: 'Missing required fields: title, slug, content' });
    }

    const result = await pool.query(
      `INSERT INTO blog_posts (title, slug, content, author_id, featured_image, category, status, published_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [title, slug, content, author_id || null, featured_image || null, category || null, status || 'draft', published_at || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      res.status(409).json({ error: 'Blog post slug already exists' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Update blog post
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, slug, content, featured_image, category, status, published_at } = req.body;

    const result = await pool.query(
      `UPDATE blog_posts SET 
        title = COALESCE($1, title),
        slug = COALESCE($2, slug),
        content = COALESCE($3, content),
        featured_image = COALESCE($4, featured_image),
        category = COALESCE($5, category),
        status = COALESCE($6, status),
        published_at = COALESCE($7, published_at),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *`,
      [title, slug, content, featured_image, category, status, published_at, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete blog post
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM blog_posts WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    res.json({ message: 'Blog post deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
