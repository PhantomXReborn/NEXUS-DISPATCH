const express = require('express');
const router = express.Router();
const db = require('../models/database');

// Get all units
router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM units ORDER BY id');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get available units
router.get('/available', async (req, res) => {
    try {
        const result = await db.query(
            "SELECT * FROM units WHERE status = 'available'"
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update unit status
router.patch('/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    try {
        const result = await db.query(
            "UPDATE units SET status = $1, last_updated = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *",
            [status, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Unit not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Find closest available unit
router.get('/closest/:lat/:lng', async (req, res) => {
    const { lat, lng } = req.params;
    
    try {
        const result = await db.query(
            `SELECT *, 
                ABS(lat - $1) * 105 + ABS(lng - $2) * 85 AS distance
             FROM units 
             WHERE status = 'available' 
             ORDER BY distance ASC 
             LIMIT 1`,
            [parseFloat(lat), parseFloat(lng)]
        );
        
        res.json(result.rows[0] || null);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;