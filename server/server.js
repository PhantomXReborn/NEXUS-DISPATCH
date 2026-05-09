const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Database connection
const db = require('./models/database');

// API Routes
app.get('/api/units', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM units ORDER BY id');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.patch('/api/units/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    try {
        const result = await db.query(
            'UPDATE units SET status = $1, last_updated = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
            [status, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Unit not found' });
        }
        
        // Log the status change
        await db.query(
            'INSERT INTO dispatch_logs (incident_id, dispatcher_id, action) VALUES ($1, $2, $3)',
            [null, 'system', `Unit ${id} status changed to ${status}`]
        );
        
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/incidents', async (req, res) => {
    try {
        const result = await db.query(
            "SELECT * FROM incidents WHERE status != 'closed' ORDER BY CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END, created_at DESC"
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/incidents', async (req, res) => {
    const { location, priority, lat, lng, description } = req.body;
    const id = `CAD-${Math.floor(100 + Math.random() * 899)}`;
    
    try {
        const result = await db.query(
            `INSERT INTO incidents (id, location, priority, lat, lng, description, status) 
             VALUES ($1, $2, $3, $4, $5, $6, 'pending') RETURNING *`,
            [id, location, priority, parseFloat(lat) || 37.7700, parseFloat(lng) || -122.4200, description]
        );
        
        await db.query(
            'INSERT INTO dispatch_logs (incident_id, dispatcher_id, action) VALUES ($1, $2, $3)',
            [id, req.body.dispatcher || 'dispatcher1', `Incident ${id} created: ${location}`]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/incidents/:id/assign', async (req, res) => {
    const { id } = req.params;
    const { unit_id, dispatcher } = req.body;
    
    try {
        await db.query('BEGIN');
        
        const incidentResult = await db.query(
            "UPDATE incidents SET assigned_unit_id = $1, status = 'assigned' WHERE id = $2 RETURNING *",
            [unit_id, id]
        );
        
        await db.query(
            "UPDATE units SET status = 'enroute', last_updated = CURRENT_TIMESTAMP WHERE id = $1",
            [unit_id]
        );
        
        await db.query(
            "INSERT INTO dispatch_logs (incident_id, dispatcher_id, action) VALUES ($1, $2, $3)",
            [id, dispatcher || 'dispatcher1', `Unit ${unit_id} assigned to incident`]
        );
        
        await db.query('COMMIT');
        res.json(incidentResult.rows[0]);
    } catch (error) {
        await db.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    }
});

app.patch('/api/incidents/:id/close', async (req, res) => {
    const { id } = req.params;
    
    try {
        const incident = await db.query(
            "SELECT assigned_unit_id FROM incidents WHERE id = $1",
            [id]
        );
        
        const assignedUnitId = incident.rows[0]?.assigned_unit_id;
        
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
        res.json(result.rows[0]);
    } catch (error) {
        await db.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/units/closest/:lat/:lng', async (req, res) => {
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

app.get('/api/dispatch/stats', async (req, res) => {
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

// Serve your HTML file for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
    console.log(`🚨 Nexus Dispatch Server running on http://localhost:${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}/api`);
});