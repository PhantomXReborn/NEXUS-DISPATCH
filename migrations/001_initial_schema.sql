-- Create incidents table
CREATE TABLE IF NOT EXISTS incidents (
    id VARCHAR(10) PRIMARY KEY,
    location VARCHAR(255) NOT NULL,
    priority VARCHAR(10) CHECK (priority IN ('high', 'medium', 'low')) NOT NULL,
    assigned_unit_id VARCHAR(10),
    status VARCHAR(10) DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'closed')),
    lat DECIMAL(10,6),
    lng DECIMAL(10,6),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP NULL
);

-- Create units table
CREATE TABLE IF NOT EXISTS units (
    id VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    status VARCHAR(15) DEFAULT 'available' CHECK (status IN ('available', 'enroute', 'onscene', 'outofservice')),
    lat DECIMAL(10,6),
    lng DECIMAL(10,6),
    beat VARCHAR(50),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create dispatch_logs table
CREATE TABLE IF NOT EXISTS dispatch_logs (
    log_id SERIAL PRIMARY KEY,
    incident_id VARCHAR(10),
    dispatcher_id VARCHAR(50),
    action VARCHAR(255),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    username VARCHAR(50) PRIMARY KEY,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(15) DEFAULT 'dispatcher' CHECK (role IN ('dispatcher', 'supervisor', 'admin')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better performance
CREATE INDEX idx_units_status ON units(status);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_created ON incidents(created_at);