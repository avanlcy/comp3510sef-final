const express  = require('express');
const router   = express.Router();
const db       = require('../db');

// GET /api/products?category=electronics
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    let query = `
      SELECT p.id, p.name, p.description, p.price, p.emoji, p.badge,
             p.image_key, p.image_url, p.stock,
             c.slug AS category, c.name AS category_name
      FROM products p
      JOIN categories c ON c.id = p.category_id
    `;
    const params = [];
    if (category && category !== 'all') {
      params.push(category);
      query += ` WHERE c.slug = $1`;
    }
    query += ` ORDER BY p.id ASC`;

    const { rows } = await db.query(query, params);
    res.json({ data: rows });
  } catch (err) {
    console.error('[GET /products]', err.message);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT p.id, p.name, p.description, p.price, p.emoji, p.badge,
              p.image_key, p.image_url, p.stock,
              c.slug AS category, c.name AS category_name
       FROM products p
       JOIN categories c ON c.id = p.category_id
       WHERE p.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Product not found' });
    res.json({ data: rows[0] });
  } catch (err) {
    console.error('[GET /products/:id]', err.message);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

module.exports = router;
