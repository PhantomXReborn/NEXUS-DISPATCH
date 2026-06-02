const { Pool } = require('pg');
const bcrypt   = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
  host:     process.env.DB_HOST || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  user:     process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS,
  database: process.env.DB_NAME || 'nexus_dispatch',
});

const SALT_ROUNDS = 10;

async function seedDatabase() {
  console.log('🌱 Seeding database...\n');

  // ── Clear in FK-safe order ──────────────────────────────
  await pool.query('DELETE FROM dispatch_logs');
  await pool.query('DELETE FROM incidents');
  await pool.query('DELETE FROM units');
  await pool.query('DELETE FROM users');

  // ── Units ───────────────────────────────────────────────
  const units = [
    ['E-241', 'Sgt. Vasquez',  'available',    37.7749, -122.4194, 'CENTRAL'],
    ['M-809', 'Ofc. Park',     'available',    37.7695, -122.4130, 'MISSION'],
    ['K-117', 'Ofc. Reyes',    'enroute',      37.7800, -122.4300, 'NOBE'],
    ['T-554', 'Ofc. Delgado',  'outofservice', 37.7660, -122.4250, 'SOMA'],
    ['R-972', 'Det. Chen',     'available',    37.7820, -122.4090, 'WHARF'],
    ['D-301', 'Ofc. Kowalski', 'available',    37.7712, -122.4410, 'WEST ADD'],
  ];
  for (const u of units) {
    await pool.query(
      'INSERT INTO units (id, name, status, lat, lng, beat) VALUES ($1,$2,$3,$4,$5,$6)',
      u
    );
  }
  console.log(`✅ ${units.length} units seeded`);

  // ── Incidents ────────────────────────────────────────────
  const incidents = [
    ['CAD-100', 'Market & 8th St',      'high',   'E-241', 'assigned', 37.7780, -122.4120, '10-50 Traffic collision with injuries — multiple vehicles'],
    ['CAD-101', 'Golden Gate Park',     'low',    null,    'pending',  37.7690, -122.4830, 'Suspicious person — refusing to leave'],
    ['CAD-102', 'Mission & 16th',       'medium', null,    'pending',  37.7650, -122.4190, '415 Noise complaint — large gathering'],
    ['CAD-103', 'Embarcadero Pier 39',  'medium', 'R-972', 'assigned', 37.8090, -122.4098, '10-31 Shoplifting in progress'],
  ];
  for (const inc of incidents) {
    await pool.query(
      `INSERT INTO incidents (id, location, priority, assigned_unit_id, status, lat, lng, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      inc
    );
  }
  console.log(`✅ ${incidents.length} incidents seeded`);

  // ── Users ────────────────────────────────────────────────
  const users = [
    ['dispatcher1', 'dispatch123', 'dispatcher'],
    ['supervisor1', 'super456',    'supervisor'],
  ];
  for (const [username, password, role] of users) {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES ($1,$2,$3)',
      [username, hash, role]
    );
    console.log(`✅ User seeded: ${username} / ${password} [${role}]`);
  }

  // ── Initial log entries ──────────────────────────────────
  const logs = [
    ['CAD-100', 'system', 'Incident CAD-100 created: Market & 8th St [high]'],
    ['CAD-100', 'system', 'Unit E-241 dispatched to CAD-100'],
    ['CAD-103', 'system', 'Incident CAD-103 created: Embarcadero Pier 39 [medium]'],
    ['CAD-103', 'system', 'Unit R-972 dispatched to CAD-103'],
  ];
  for (const [inc_id, dispatcher, action] of logs) {
    await pool.query(
      'INSERT INTO dispatch_logs (incident_id, dispatcher_id, action) VALUES ($1,$2,$3)',
      [inc_id, dispatcher, action]
    );
  }
  console.log(`✅ ${logs.length} dispatch log entries seeded`);

  console.log('\n✅ Database seeding complete.\n');
  await pool.end();
}

seedDatabase().catch(err => {
  console.error('Seeding failed:', err.message);
  process.exit(1);
});
