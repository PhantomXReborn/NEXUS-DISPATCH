const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// ── DB ──────────────────────────────────────────────────────
const db = require('./models/database');

// ── Validation helpers ──────────────────────────────────────
const VALID_PRIORITIES = ['high', 'medium', 'low'];
const VALID_STATUSES   = ['available', 'enroute', 'onscene', 'outofservice'];

function validate(schema) {
  return (req, res, next) => {
    for (const [field, rule] of Object.entries(schema)) {
      const val = req.body[field];
      if (rule.required && (val === undefined || val === null || val === '')) {
        return res.status(400).json({ error: `Field '${field}' is required` });
      }
      if (val !== undefined && rule.enum && !rule.enum.includes(val)) {
        return res.status(400).json({ error: `Field '${field}' must be one of: ${rule.enum.join(', ')}` });
      }
    }
    next();
  };
}

// ── Helper: generate CAD id ─────────────────────────────────
async function generateIncidentId() {
  const result = await db.query(
    "SELECT id FROM incidents ORDER BY created_at DESC LIMIT 1"
  );
  if (!result.rows.length) return 'CAD-100';
  const last = parseInt(result.rows[0].id.split('-')[1], 10);
  return `CAD-${isNaN(last) ? 100 : last + 1}`;
}

// ── Helper: log action ──────────────────────────────────────
async function logAction(incidentId, dispatcher, action) {
  try {
    await db.query(
      'INSERT INTO dispatch_logs (incident_id, dispatcher_id, action) VALUES ($1, $2, $3)',
      [incidentId || null, dispatcher || 'system', action]
    );
  } catch (err) {
    console.warn('Log write failed:', err.message);
  }
}

// ═══════════════════════════════════════════════════════════
// UNITS
// ═══════════════════════════════════════════════════════════

// GET /api/units — all units
app.get('/api/units', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM units ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/units/available — filter to available only
app.get('/api/units/available', async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM units WHERE status = 'available' ORDER BY id");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/units/closest/:lat/:lng — nearest available unit
// Uses Haversine-approximation in SQL (degree-to-km scaling)
app.get('/api/units/closest/:lat/:lng', async (req, res) => {
  const lat = parseFloat(req.params.lat);
  const lng = parseFloat(req.params.lng);
  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ error: 'Invalid coordinates' });
  }
  try {
    const result = await db.query(
      `SELECT *,
          SQRT(POWER((lat  - $1) * 111.0, 2) +
               POWER((lng  - $2) * 85.0, 2)) AS dist_km
       FROM units
       WHERE status = 'available' AND lat IS NOT NULL AND lng IS NOT NULL
       ORDER BY dist_km ASC
       LIMIT 1`,
      [lat, lng]
    );
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/units/:id/status — update unit status
app.patch(
  '/api/units/:id/status',
  validate({ status: { required: true, enum: VALID_STATUSES } }),
  async (req, res) => {
    const { id }     = req.params;
    const { status } = req.body;
    try {
      const result = await db.query(
        'UPDATE units SET status = $1, last_updated = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [status, id]
      );
      if (!result.rows.length) return res.status(404).json({ error: 'Unit not found' });
      await logAction(null, req.body.dispatcher || 'system', `Unit ${id} status → ${status}`);
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ═══════════════════════════════════════════════════════════
// INCIDENTS
// ═══════════════════════════════════════════════════════════

// GET /api/incidents — active incidents sorted by priority then age
app.get('/api/incidents', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM incidents
       WHERE status != 'closed'
       ORDER BY CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END,
                created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/incidents/:id — single incident with logs
app.get('/api/incidents/:id', async (req, res) => {
  try {
    const inc = await db.query('SELECT * FROM incidents WHERE id = $1', [req.params.id]);
    if (!inc.rows.length) return res.status(404).json({ error: 'Incident not found' });

    const logs = await db.query(
      'SELECT * FROM dispatch_logs WHERE incident_id = $1 ORDER BY timestamp DESC LIMIT 20',
      [req.params.id]
    );
    res.json({ ...inc.rows[0], logs: logs.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/incidents — create new incident
app.post(
  '/api/incidents',
  validate({
    location: { required: true },
    priority: { required: true, enum: VALID_PRIORITIES },
  }),
  async (req, res) => {
    const { location, priority, lat, lng, description, dispatcher } = req.body;
    try {
      const id = await generateIncidentId();
      const result = await db.query(
        `INSERT INTO incidents (id, location, priority, lat, lng, description, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending') RETURNING *`,
        [
          id, location, priority,
          parseFloat(lat)  || null,
          parseFloat(lng)  || null,
          description      || null
        ]
      );
      await logAction(id, dispatcher || 'system', `Incident ${id} created: ${location} [${priority}]`);
      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// PUT /api/incidents/:id/assign — assign unit, update both rows atomically
app.put(
  '/api/incidents/:id/assign',
  validate({ unit_id: { required: true } }),
  async (req, res) => {
    const { id }               = req.params;
    const { unit_id, dispatcher } = req.body;

    try {
      // Pre-checks before opening transaction
      const incCheck  = await db.query("SELECT status FROM incidents WHERE id = $1", [id]);
      if (!incCheck.rows.length)         return res.status(404).json({ error: 'Incident not found' });
      if (incCheck.rows[0].status === 'closed') return res.status(409).json({ error: 'Incident is already closed' });

      const unitCheck = await db.query("SELECT status FROM units WHERE id = $1", [unit_id]);
      if (!unitCheck.rows.length)        return res.status(404).json({ error: 'Unit not found' });
      if (unitCheck.rows[0].status !== 'available') {
        return res.status(409).json({ error: `Unit ${unit_id} is not available (status: ${unitCheck.rows[0].status})` });
      }

      await db.query('BEGIN');

      const incResult = await db.query(
        "UPDATE incidents SET assigned_unit_id = $1, status = 'assigned' WHERE id = $2 RETURNING *",
        [unit_id, id]
      );
      await db.query(
        "UPDATE units SET status = 'enroute', last_updated = CURRENT_TIMESTAMP WHERE id = $1",
        [unit_id]
      );

      await db.query('COMMIT');
      await logAction(id, dispatcher || 'system', `Unit ${unit_id} dispatched to ${id}`);
      res.json(incResult.rows[0]);
    } catch (err) {
      await db.query('ROLLBACK').catch(() => {});
      res.status(500).json({ error: err.message });
    }
  }
);

// PATCH /api/incidents/:id/close — close incident, return assigned unit to available
app.patch('/api/incidents/:id/close', async (req, res) => {
  const { id } = req.params;

  try {
    const incCheck = await db.query("SELECT status, assigned_unit_id FROM incidents WHERE id = $1", [id]);
    if (!incCheck.rows.length)           return res.status(404).json({ error: 'Incident not found' });
    if (incCheck.rows[0].status === 'closed') return res.status(409).json({ error: 'Incident is already closed' });

    const assignedUnitId = incCheck.rows[0].assigned_unit_id;

    await db.query('BEGIN');

    const result = await db.query(
      "UPDATE incidents SET status = 'closed', closed_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *",
      [id]
    );
    if (assignedUnitId) {
      await db.query(
        "UPDATE units SET status = 'available', last_updated = CURRENT_TIMESTAMP WHERE id = $1",
        [assignedUnitId]
      );
    }

    await db.query('COMMIT');
    await logAction(id, req.body?.dispatcher || 'system', `Incident ${id} closed`);
    res.json(result.rows[0]);
  } catch (err) {
    await db.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════
// DISPATCH / STATS
// ═══════════════════════════════════════════════════════════

// GET /api/dispatch/logs/:incidentId
app.get('/api/dispatch/logs/:incidentId', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT dl.*, u.name AS unit_name, i.location
       FROM dispatch_logs dl
       LEFT JOIN incidents i ON dl.incident_id = i.id
       LEFT JOIN units u ON i.assigned_unit_id = u.id
       WHERE dl.incident_id = $1
       ORDER BY dl.timestamp DESC`,
      [req.params.incidentId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dispatch/stats
app.get('/api/dispatch/stats', async (req, res) => {
  try {
    const [unitStats, incStats, todayStats] = await Promise.all([
      db.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'available')   AS available_units,
          COUNT(*) FILTER (WHERE status = 'enroute')     AS enroute_units,
          COUNT(*) FILTER (WHERE status = 'onscene')     AS onscene_units,
          COUNT(*) FILTER (WHERE status = 'outofservice')AS oos_units,
          COUNT(*)                                        AS total_units
        FROM units`),
      db.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'pending')  AS pending_incidents,
          COUNT(*) FILTER (WHERE status = 'assigned') AS assigned_incidents,
          COUNT(*) FILTER (WHERE status != 'closed')  AS active_incidents
        FROM incidents`),
      db.query(`
        SELECT COUNT(*) AS incidents_today
        FROM incidents
        WHERE created_at >= CURRENT_DATE`)
    ]);
    res.json({ ...unitStats.rows[0], ...incStats.rows[0], ...todayStats.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Auth routes ─────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  const bcrypt = require('bcrypt');
  const jwt    = require('jsonwebtoken');
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  try {
    const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    if (!result.rows.length) return res.status(401).json({ error: 'Invalid credentials' });

    const user  = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { username: user.username, role: user.role },
      process.env.JWT_SECRET || 'change_me_in_production',
      { expiresIn: '8h' }
    );
    res.json({ token, username: user.username, role: user.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Fallback ────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ── Start ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚨 Nexus Dispatch  — http://localhost:${PORT}`);
  console.log(`📡 API             — http://localhost:${PORT}/api`);
});
