// PostgreSQL connection pool
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.PG_HOST     || 'localhost',
  port:     parseInt(process.env.PG_PORT || '5432'),
  database: process.env.PG_DB       || 'bazaar',
  user:     process.env.PG_USER     || 'bazaar',
  password: process.env.PG_PASSWORD || 'bazaarpass',
});

pool.on('error', (err) => {
  console.error('[pg] Unexpected client error', err.message);
});

module.exports = pool;
