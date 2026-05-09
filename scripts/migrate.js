const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
});

const migrations = [
    `CREATE TABLE IF NOT EXISTS incidents (
        id VARCHAR(10) PRIMARY KEY,
        location VARCHAR(255) NOT NULL,
        priority VARCHAR(10) CHECK (priority IN ('high', 'medium', 'low')) NOT NULL,
        assigned_unit_id VARCHAR(10),
        status VARCHAR(10) DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'closed')),
        lat DECIMAL(10,6),
        lng DECIMAL(10,6),
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        closed_at TIMESTAMP NULL
    )`,
    
    `CREATE TABLE IF NOT EXISTS units (
        id VARCHAR(10) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        status VARCHAR(15) DEFAULT 'available' CHECK (status IN ('available', 'enroute', 'onscene', 'outofservice')),
        lat DECIMAL(10,6),
        lng DECIMAL(10,6),
        beat VARCHAR(50),
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS dispatch_logs (
        log_id SERIAL PRIMARY KEY,
        incident_id VARCHAR(10),
        dispatcher_id VARCHAR(50),
        action VARCHAR(255),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE
    )`,
    
    `CREATE TABLE IF NOT EXISTS users (
        username VARCHAR(50) PRIMARY KEY,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(15) DEFAULT 'dispatcher' CHECK (role IN ('dispatcher', 'supervisor', 'admin')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE INDEX IF NOT EXISTS idx_units_status ON units(status)`,
    `CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status)`,
    `CREATE INDEX IF NOT EXISTS idx_incidents_created ON incidents(created_at)`
];

async function runMigrations() {
    try {
        console.log('Starting migrations...');
        for (let i = 0; i < migrations.length; i++) {
            await pool.query(migrations[i]);
            console.log(`Migration ${i + 1}/${migrations.length} completed`);
        }
        console.log('All migrations completed successfully!');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await pool.end();
    }
}

runMigrations();