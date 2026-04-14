const express = require('express');
const router  = express.Router();
const db      = require('../db');

// GET /api/categories
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT slug, name FROM categories ORDER BY id ASC`
    );
    res.json({ data: rows });
  } catch (err) {
    console.error('[GET /categories]', err.message);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

module.exports = router;
