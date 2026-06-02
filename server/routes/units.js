const express = require('express');
const router  = express.Router();
const db      = require('../models/database');

const VALID_STATUSES = ['available', 'enroute', 'onscene', 'outofservice'];

// GET /
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM units ORDER BY id');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /available
router.get('/available', async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM units WHERE status = 'available' ORDER BY id");
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /closest/:lat/:lng
router.get('/closest/:lat/:lng', async (req, res) => {
  const lat = parseFloat(req.params.lat);
  const lng = parseFloat(req.params.lng);
  if (isNaN(lat) || isNaN(lng)) return res.status(400).json({ error: 'Invalid coordinates' });

  try {
    const result = await db.query(
      `SELECT *,
          SQRT(POWER((lat - $1) * 111.0, 2) + POWER((lng - $2) * 85.0, 2)) AS dist_km
       FROM units
       WHERE status = 'available' AND lat IS NOT NULL AND lng IS NOT NULL
       ORDER BY dist_km ASC LIMIT 1`,
      [lat, lng]
    );
    res.json(result.rows[0] || null);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /:id/status
router.patch('/:id/status', async (req, res) => {
  const { id }     = req.params;
  const { status } = req.body;
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
  }
  try {
    const result = await db.query(
      'UPDATE units SET status=$1, last_updated=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *',
      [status, id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Unit not found' });
    await db.query(
      'INSERT INTO dispatch_logs (incident_id, dispatcher_id, action) VALUES ($1,$2,$3)',
      [null, req.body.dispatcher||'system', `Unit ${id} status → ${status}`]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /:id/position — update GPS coordinates
router.patch('/:id/position', async (req, res) => {
  const { id }      = req.params;
  const { lat, lng } = req.body;
  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);
  if (isNaN(parsedLat) || isNaN(parsedLng)) return res.status(400).json({ error: 'Invalid coordinates' });

  try {
    const result = await db.query(
      'UPDATE units SET lat=$1, lng=$2, last_updated=CURRENT_TIMESTAMP WHERE id=$3 RETURNING *',
      [parsedLat, parsedLng, id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Unit not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
