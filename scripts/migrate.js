const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host:     process.env.DB_HOST || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  user:     process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS,
  database: process.env.DB_NAME || 'nexus_dispatch',
});

const migrations = [
  {
    name: 'create_incidents',
    sql: `CREATE TABLE IF NOT EXISTS incidents (
      id               VARCHAR(10)   PRIMARY KEY,
      location         VARCHAR(255)  NOT NULL,
      priority         VARCHAR(10)   NOT NULL CHECK (priority IN ('high','medium','low')),
      assigned_unit_id VARCHAR(10),
      status           VARCHAR(10)   NOT NULL DEFAULT 'pending'
                                     CHECK (status IN ('pending','assigned','closed')),
      lat              DECIMAL(10,6),
      lng              DECIMAL(10,6),
      description      TEXT,
      created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      closed_at        TIMESTAMP
    )`
  },
  {
    name: 'create_units',
    sql: `CREATE TABLE IF NOT EXISTS units (
      id           VARCHAR(10)  PRIMARY KEY,
      name         VARCHAR(100) NOT NULL,
      status       VARCHAR(15)  NOT NULL DEFAULT 'available'
                                CHECK (status IN ('available','enroute','onscene','outofservice')),
      lat          DECIMAL(10,6),
      lng          DECIMAL(10,6),
      beat         VARCHAR(50),
      last_updated TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  },
  {
    name: 'create_dispatch_logs',
    sql: `CREATE TABLE IF NOT EXISTS dispatch_logs (
      log_id        SERIAL       PRIMARY KEY,
      incident_id   VARCHAR(10),
      dispatcher_id VARCHAR(50),
      action        VARCHAR(255),
      timestamp     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE SET NULL
    )`
  },
  {
    name: 'create_users',
    sql: `CREATE TABLE IF NOT EXISTS users (
      username      VARCHAR(50)  PRIMARY KEY,
      password_hash VARCHAR(255) NOT NULL,
      role          VARCHAR(15)  NOT NULL DEFAULT 'dispatcher'
                                 CHECK (role IN ('dispatcher','supervisor','admin')),
      created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  },
  { name: 'idx_units_status',       sql: `CREATE INDEX IF NOT EXISTS idx_units_status       ON units(status)` },
  { name: 'idx_incidents_status',   sql: `CREATE INDEX IF NOT EXISTS idx_incidents_status   ON incidents(status)` },
  { name: 'idx_incidents_created',  sql: `CREATE INDEX IF NOT EXISTS idx_incidents_created  ON incidents(created_at)` },
  { name: 'idx_dispatch_logs_inc',  sql: `CREATE INDEX IF NOT EXISTS idx_dispatch_logs_inc  ON dispatch_logs(incident_id)` },
];

async function runMigrations() {
  console.log('🔄 Starting migrations...\n');
  for (const m of migrations) {
    process.stdout.write(`  → ${m.name}... `);
    try {
      await pool.query(m.sql);
      console.log('✅');
    } catch (err) {
      console.log('❌');
      console.error(`     Error: ${err.message}`);
      process.exit(1);
    }
  }
  console.log('\n✅ All migrations completed.\n');
  await pool.end();
}

runMigrations();
