const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
});

// Test connection
pool.connect((err, client, release) => {
    if (err) {
        console.error('Error connecting to database:', err.stack);
    } else {
        console.log('Connected to database successfully');
        release();
    }
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
};