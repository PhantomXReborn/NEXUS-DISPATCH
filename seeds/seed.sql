-- Insert demo units
INSERT INTO units (id, name, status, lat, lng, beat) VALUES
('U100', 'Patrol Alpha', 'available', 40.7580, -73.9855, 'Downtown'),
('U101', 'Patrol Bravo', 'available', 40.7489, -73.9680, 'Midtown'),
('U102', 'Patrol Charlie', 'enroute', 40.7549, -73.9840, 'East Side'),
('U103', 'K9 Unit', 'outofservice', 40.7650, -73.9800, 'Reserve');

-- Insert demo incidents
INSERT INTO incidents (id, location, priority, status, lat, lng, description) VALUES
('INC001', '123 Main St', 'high', 'pending', 40.7589, -73.9835, '10-50 (Traffic Collision)'),
('INC002', '456 Oak Ave', 'medium', 'assigned', 40.7500, -73.9700, 'Suspicious Person'),
('INC003', '789 Pine Rd', 'low', 'pending', 40.7600, -73.9900, 'Noise Complaint');

-- Insert demo user (password: dispatch123)
-- bcrypt hash for 'dispatch123' - you'll need to generate this properly in code
INSERT INTO users (username, password_hash, role) VALUES
('dispatcher1', '$2b$10$YourGeneratedHashHere', 'dispatcher');