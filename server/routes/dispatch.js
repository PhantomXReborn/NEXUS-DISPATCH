const express = require('express');
const router = express.Router();
const db = require('../models/database');

// Get logs for specific incident
router.get('/logs/:incidentId', async (req, res) => {
    const { incidentId } = req.params;
    
    try {
        const result = await db.query(
            `SELECT dl.action, dl.timestamp, dl.dispatcher_id, i.location, u.name as unit_name
             FROM dispatch_logs dl
             JOIN incidents i ON dl.incident_id = i.id
             LEFT JOIN units u ON i.assigned_unit_id = u.id
             WHERE dl.incident_id = $1
             ORDER BY dl.timestamp DESC`,
            [incidentId]
        );
        
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get dispatch statistics
router.get('/stats', async (req, res) => {
    try {
        const stats = await db.query(
            `SELECT 
                COUNT(CASE WHEN status != 'closed' THEN 1 END) as active_incidents,
                COUNT(CASE WHEN status = 'available' THEN 1 END) as available_units,
                COUNT(*) as total_units
             FROM units`
        );
        
        const todayStats = await db.query(
            `SELECT COUNT(*) as incidents_today
             FROM incidents
             WHERE DATE(created_at) = CURRENT_DATE`
        );
        
        res.json({
            ...stats.rows[0],
            ...todayStats.rows[0]
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;