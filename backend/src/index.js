// ============================================================
// BAZAAR — Express API entry point
// ============================================================
'use strict';

const express    = require('express');
const cors       = require('cors');
const db         = require('./db');
const { ensureBucket } = require('./minio');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/products',   require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/orders',     require('./routes/orders'));

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// 404
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// ── Startup ──────────────────────────────────────────────────
async function start() {
  // Wait for postgres to be ready (retry up to 15 times)
  for (let i = 1; i <= 15; i++) {
    try {
      await db.query('SELECT 1');
      console.log('[pg] Connected');
      break;
    } catch (err) {
      console.log(`[pg] Not ready yet (attempt ${i}/15): ${err.message}`);
      if (i === 15) { console.error('[pg] Could not connect. Exiting.'); process.exit(1); }
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // Ensure MinIO bucket exists
  try {
    await ensureBucket();
  } catch (err) {
    console.error('[minio] Bucket setup failed:', err.message);
  }

  app.listen(PORT, () => {
    console.log(`[api] Listening on http://0.0.0.0:${PORT}`);
  });
}

start();
