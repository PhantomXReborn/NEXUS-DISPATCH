const express = require('express');
const router  = express.Router();
const db      = require('../models/database');

const VALID_PRIORITIES = ['high', 'medium', 'low'];

// GET /  — active incidents
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM incidents
       WHERE status != 'closed'
       ORDER BY CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END,
                created_at DESC`
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /:id
router.get('/:id', async (req, res) => {
  try {
    const inc  = await db.query('SELECT * FROM incidents WHERE id = $1', [req.params.id]);
    if (!inc.rows.length) return res.status(404).json({ error: 'Incident not found' });
    const logs = await db.query(
      'SELECT * FROM dispatch_logs WHERE incident_id = $1 ORDER BY timestamp DESC LIMIT 30',
      [req.params.id]
    );
    res.json({ ...inc.rows[0], logs: logs.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /
router.post('/', async (req, res) => {
  const { location, priority, lat, lng, description, dispatcher } = req.body;
  if (!location)                             return res.status(400).json({ error: 'location is required' });
  if (!VALID_PRIORITIES.includes(priority))  return res.status(400).json({ error: 'Invalid priority' });

  try {
    const last = await db.query("SELECT id FROM incidents ORDER BY created_at DESC LIMIT 1");
    const num  = last.rows.length ? parseInt(last.rows[0].id.split('-')[1], 10) + 1 : 100;
    const id   = `CAD-${num}`;

    const result = await db.query(
      `INSERT INTO incidents (id, location, priority, lat, lng, description, status)
       VALUES ($1,$2,$3,$4,$5,$6,'pending') RETURNING *`,
      [id, location, priority, parseFloat(lat)||null, parseFloat(lng)||null, description||null]
    );
    await db.query(
      'INSERT INTO dispatch_logs (incident_id, dispatcher_id, action) VALUES ($1,$2,$3)',
      [id, dispatcher||'system', `Incident ${id} created: ${location} [${priority}]`]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /:id/assign
router.put('/:id/assign', async (req, res) => {
  const { id }               = req.params;
  const { unit_id, dispatcher } = req.body;
  if (!unit_id) return res.status(400).json({ error: 'unit_id is required' });

  try {
    const incCheck  = await db.query("SELECT status FROM incidents WHERE id = $1", [id]);
    if (!incCheck.rows.length)              return res.status(404).json({ error: 'Incident not found' });
    if (incCheck.rows[0].status === 'closed') return res.status(409).json({ error: 'Incident is closed' });

    const unitCheck = await db.query("SELECT status FROM units WHERE id = $1", [unit_id]);
    if (!unitCheck.rows.length)             return res.status(404).json({ error: 'Unit not found' });
    if (unitCheck.rows[0].status !== 'available') {
      return res.status(409).json({ error: `Unit is not available (${unitCheck.rows[0].status})` });
    }

    await db.query('BEGIN');
    const result = await db.query(
      "UPDATE incidents SET assigned_unit_id=$1, status='assigned' WHERE id=$2 RETURNING *",
      [unit_id, id]
    );
    await db.query(
      "UPDATE units SET status='enroute', last_updated=CURRENT_TIMESTAMP WHERE id=$1",
      [unit_id]
    );
    await db.query('COMMIT');

    await db.query(
      'INSERT INTO dispatch_logs (incident_id, dispatcher_id, action) VALUES ($1,$2,$3)',
      [id, dispatcher||'system', `Unit ${unit_id} dispatched to ${id}`]
    );
    res.json(result.rows[0]);
  } catch (err) {
    await db.query('ROLLBACK').catch(()=>{});
    res.status(500).json({ error: err.message });
  }
});

// PATCH /:id/close
router.patch('/:id/close', async (req, res) => {
  const { id } = req.params;
  try {
    const incCheck = await db.query("SELECT status, assigned_unit_id FROM incidents WHERE id=$1", [id]);
    if (!incCheck.rows.length)               return res.status(404).json({ error: 'Incident not found' });
    if (incCheck.rows[0].status === 'closed') return res.status(409).json({ error: 'Already closed' });

    const assignedUnitId = incCheck.rows[0].assigned_unit_id;
    await db.query('BEGIN');

    const result = await db.query(
      "UPDATE incidents SET status='closed', closed_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING *",
      [id]
    );
    if (assignedUnitId) {
      await db.query(
        "UPDATE units SET status='available', last_updated=CURRENT_TIMESTAMP WHERE id=$1",
        [assignedUnitId]
      );
    }
    await db.query('COMMIT');
    await db.query(
      'INSERT INTO dispatch_logs (incident_id, dispatcher_id, action) VALUES ($1,$2,$3)',
      [id, req.body?.dispatcher||'system', `Incident ${id} closed`]
    );
    res.json(result.rows[0]);
  } catch (err) {
    await db.query('ROLLBACK').catch(()=>{});
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
