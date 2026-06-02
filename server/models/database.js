const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASS,
  database: process.env.DB_NAME     || 'nexus_dispatch',
  // Connection pool settings
  max:             10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected DB pool error:', err.message);
});

// Test connection on startup
pool.connect()
  .then(client => {
    console.log('✅ Database connected');
    client.release();
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    console.error('   Check your .env DB_HOST / DB_USER / DB_PASS / DB_NAME settings.');
  });

module.exports = {
  query:       (text, params) => pool.query(text, params),
  transaction: async (fn) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
  pool,
};
