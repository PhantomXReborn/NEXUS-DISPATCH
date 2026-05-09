const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
});

async function seedDatabase() {
    try {
        console.log('Seeding database...');
        
        // Clear existing data (optional)
        await pool.query('DELETE FROM dispatch_logs');
        await pool.query('DELETE FROM incidents');
        await pool.query('DELETE FROM units');
        await pool.query('DELETE FROM users');
        
        // Seed units
        const units = [
            ['E-241', 'Sgt. Vasquez', 'available', 37.7749, -122.4194, 'CENTRAL'],
            ['M-809', 'Ofc. Park', 'available', 37.7695, -122.4130, 'MISSION'],
            ['K-117', 'Ofc. Reyes', 'enroute', 37.7800, -122.4300, 'NOBE'],
            ['T-554', 'Ofc. Delgado', 'outofservice', 37.7660, -122.4250, 'SOMA'],
            ['R-972', 'Det. Chen', 'available', 37.7820, -122.4090, 'WHARF'],
            ['D-301', 'Ofc. Kowalski', 'available', 37.7712, -122.4410, 'WEST ADD']
        ];
        
        for (const unit of units) {
            await pool.query(
                'INSERT INTO units (id, name, status, lat, lng, beat) VALUES ($1, $2, $3, $4, $5, $6)',
                unit
            );
        }
        console.log(`✅ Seeded ${units.length} units`);
        
        // Seed incidents
        const incidents = [
            ['CAD-101', 'Market & 8th', 'high', null, 'pending', 37.7780, -122.4120, 'Traffic collision with injuries'],
            ['CAD-102', 'Golden Gate Park', 'low', 'E-241', 'assigned', 37.7690, -122.4830, 'Suspicious person reported']
        ];
        
        for (const incident of incidents) {
            await pool.query(
                'INSERT INTO incidents (id, location, priority, assigned_unit_id, status, lat, lng, description) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                incident
            );
        }
        console.log(`✅ Seeded ${incidents.length} incidents`);
        
        // Seed user (password: dispatch123)
        const hashedPassword = await bcrypt.hash('dispatch123', 10);
        await pool.query(
            'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)',
            ['dispatcher1', hashedPassword, 'dispatcher']
        );
        console.log('✅ Seeded user: dispatcher1 / password: dispatch123');
        
        console.log('Database seeding completed!');
    } catch (error) {
        console.error('Seeding failed:', error);
    } finally {
        await pool.end();
    }
}

seedDatabase();