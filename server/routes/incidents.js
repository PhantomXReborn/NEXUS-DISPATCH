const express = require('express');
const router = express.Router();
const db = require('../models/database');

// Get all active incidents (pending + assigned)
router.get('/', async (req, res) => {
    try {
        const result = await db.query(
            "SELECT * FROM incidents WHERE status != 'closed' ORDER BY FIELD(priority, 'high', 'medium', 'low')"
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create new incident
router.post('/', async (req, res) => {
    const { location, priority, lat, lng, description } = req.body;
    const id = `INC${Date.now()}`;
    
    try {
        const result = await db.query(
            `INSERT INTO incidents (id, location, priority, lat, lng, description, status) 
             VALUES ($1, $2, $3, $4, $5, $6, 'pending') RETURNING *`,
            [id, location, priority, parseFloat(lat), parseFloat(lng), description]
        );
        
        // Log the dispatch action
        await db.query(
            "INSERT INTO dispatch_logs (incident_id, dispatcher_id, action) VALUES ($1, $2, $3)",
            [id, req.body.dispatcher || 'system', `Incident ${id} created`]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Assign unit to incident
router.put('/:id/assign', async (req, res) => {
    const { id } = req.params;
    const { unit_id, dispatcher } = req.body;
    
    try {
        await db.query('BEGIN');
        
        // Update incident
        const incidentResult = await db.query(
            "UPDATE incidents SET assigned_unit_id = $1, status = 'assigned' WHERE id = $2 RETURNING *",
            [unit_id, id]
        );
        
        // Update unit status
        await db.query(
            "UPDATE units SET status = 'enroute', last_updated = CURRENT_TIMESTAMP WHERE id = $1",
            [unit_id]
        );
        
        // Log assignment
        await db.query(
            "INSERT INTO dispatch_logs (incident_id, dispatcher_id, action) VALUES ($1, $2, $3)",
            [id, dispatcher, `Unit ${unit_id} assigned to incident`]
        );
        
        await db.query('COMMIT');
        res.json(incidentResult.rows[0]);
    } catch (error) {
        await db.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    }
});

// Close incident
router.patch('/:id/close', async (req, res) => {
    const { id } = req.params;
    
    try {
        // First get the assigned unit
        const incident = await db.query(
            "SELECT assigned_unit_id FROM incidents WHERE id = $1",
            [id]
        );
        
        const assignedUnitId = incident.rows[0]?.assigned_unit_id;
        
        await db.query('BEGIN');
        
        // Close incident
        const result = await db.query(
            "UPDATE incidents SET status = 'closed', closed_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *",
            [id]
        );
        
        // Set unit back to available
        if (assignedUnitId) {
            await db.query(
                "UPDATE units SET status = 'available', last_updated = CURRENT_TIMESTAMP WHERE id = $1",
                [assignedUnitId]
            );
        }
        
        await db.query('COMMIT');
        res.json(result.rows[0]);
    } catch (error) {
        await db.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;