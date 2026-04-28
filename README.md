# Nexus Dispatch — Police CAD Simulator

A professional-grade, full-stack **Computer-Aided Dispatch (CAD)** simulation system demonstrating real-time incident management, unit tracking, and database-driven operations. Built for educational demonstration of dispatch workflows and full-stack web architecture.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Stack](https://img.shields.io/badge/stack-HTML%2FCSS%2FJS%2FSQL-orange)

---

## Overview

Nexus Dispatch simulates a real-world police dispatch center where operators manage emergency incidents, track patrol units in real-time, and leverage intelligent closest-unit recommendations. The system demonstrates modern CAD principles with a **SQL database backend** for persistent storage of incidents, unit logs, and audit trails.

> **⚠️ Educational Purpose Only** — This is a simulation. Not for actual emergency response deployment.

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | HTML5, CSS3 (Flexbox/Grid), JavaScript (ES6+) | Responsive dashboard, real-time UI updates |
| **Backend Logic** | Node.js / Express (simulated in demo) | RESTful API endpoints, WebSocket for live updates |
| **Database** | SQL (PostgreSQL / MySQL compatible) | Persistent storage for incidents, units, dispatcher logs |
| **Real-time** | Server-Sent Events / WebSockets | Live unit status synchronization |
| **Authentication** | Session-based + RBAC (demo-ready schema) | Role-based access (Dispatcher, Supervisor, Admin) |

---

## Database Schema (SQL)

The system uses a relational SQL database with the following core tables:

### `incidents`
```sql
CREATE TABLE incidents (
    id VARCHAR(10) PRIMARY KEY,
    location VARCHAR(255) NOT NULL,
    priority ENUM('high', 'medium', 'low') NOT NULL,
    assigned_unit_id VARCHAR(10),
    status ENUM('pending', 'assigned', 'closed') DEFAULT 'pending',
    lat DECIMAL(10,6),
    lng DECIMAL(10,6),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP NULL,
    FOREIGN KEY (assigned_unit_id) REFERENCES units(id)
);
```

### `units`
```sql
CREATE TABLE units (
    id VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    status ENUM('available', 'enroute', 'onscene', 'outofservice') DEFAULT 'available',
    lat DECIMAL(10,6),
    lng DECIMAL(10,6),
    beat VARCHAR(50),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### `dispatch_logs`
```sql
CREATE TABLE dispatch_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    incident_id VARCHAR(10),
    dispatcher_id VARCHAR(50),
    action VARCHAR(255),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (incident_id) REFERENCES incidents(id)
);
```

### `users (RBAC)`
```sql
CREATE TABLE users (
    username VARCHAR(50) PRIMARY KEY,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('dispatcher', 'supervisor', 'admin') DEFAULT 'dispatcher',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

# Features

| Feature | Description |
|---------|-------------|
| Real-time Unit Tracking | Live status updates (Available / En Route / On Scene / Out of Service) |
| Incident Management | Create, assign, and close incidents with priority levels (High/Medium/Low) |
| Closest-Unit Algorithm | GPS-based distance calculation recommends nearest available unit |
| SQL Persistence | All incidents, logs, and unit states stored in relational database |
| Audit Trail | Complete dispatch history with timestamps and operator attribution |
| Responsive Dashboard | Works on desktop and tablet dispatch consoles |

# Getting Started (Full-Stack Deployment)

## Prerequisites

- Node.js (v18+)
- PostgreSQL (v14+) or MySQL (v8+)
- Git

## Installation

```bash
# 1. Clone repository
git clone https://github.com/yourusername/nexus-dispatch.git
cd nexus-dispatch

# 2. Install backend dependencies
npm install

# 3. Configure database
cp .env.example .env
# Edit .env with your database credentials

# 4. Run migrations
npm run migrate

# 5. Seed initial data (units, demo users)
npm run seed

# 6. Start development server
npm run dev
```

## Database Connection Example (Node.js)

```javascript
const { Pool } = require('pg');
const pool = new Pool({
    host: process.env.DB_HOST,
    port: 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: 'nexus_dispatch'
});

// Fetch all available units
async function getAvailableUnits() {
    const result = await pool.query(
        "SELECT * FROM units WHERE status = 'available'"
    );
    return result.rows;
}
```

## Project Structure

nexus-dispatch/
├── public/
│   ├── index.html          # Main dashboard
│   ├── css/
│   │   └── styles.css      # Professional UI styling
│   └── js/
│       ├── app.js          # Frontend logic
│       └── websocket.js    # Real-time handlers
├── server/
│   ├── server.js           # Express backend
│   ├── routes/
│   │   ├── incidents.js    # Incident CRUD
│   │   └── units.js        # Unit management
│   └── models/
│       └── database.js     # SQL queries
├── migrations/             # SQL schema versioning
├── seeds/                  # Initial test data
├── .env                    # Environment variables
└── README.md

## API Endpoints (RESTful)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/incidents` | Fetch all active incidents |
| POST | `/api/incidents` | Create new incident (stores in SQL) |
| PUT | `/api/incidents/:id/assign` | Assign unit to incident |
| PATCH | `/api/units/:id/status` | Update unit status |
| GET | `/api/units/available` | List available units (SQL query) |
| GET | `/api/logs/:incidentId` | Retrieve dispatch audit trail |

## Example SQL Queries Used in System

```sql
-- Find closest available unit to incident location
SELECT *, 
    (ABS(lat - $1) * 105 + ABS(lng - $2) * 85) AS distance
FROM units 
WHERE status = 'available' 
ORDER BY distance ASC 
LIMIT 1;

-- Get dispatch statistics per shift
SELECT u.name, COUNT(i.id) as incidents_handled
FROM units u
LEFT JOIN incidents i ON u.id = i.assigned_unit_id
WHERE DATE(i.created_at) = CURRENT_DATE
GROUP BY u.id;

-- Audit log with join
SELECT dl.action, dl.timestamp, i.location, u.name as unit_name
FROM dispatch_logs dl
JOIN incidents i ON dl.incident_id = i.id
LEFT JOIN units u ON i.assigned_unit_id = u.id
ORDER BY dl.timestamp DESC;
```

# Live Demo Features (Frontend)

The included `index.html` demonstrates:

- Unit status board with click-to-change status buttons
- Incident queue with priority color coding
- Closest-unit suggestion using mock GPS distance algorithm
- Real-time clock and activity logging
- Form inputs to create new incidents (simulated POST to backend)

> **Note:** The standalone HTML file uses client-side mock data. For full SQL persistence, connect to the Node.js backend above.

## Screenshot Preview
<img width="2502" height="1313" alt="image" src="https://github.com/user-attachments/assets/8abe69e8-8035-4e1e-a93d-6a5d33f3aca5" />

# Future Enhancements

- WebSocket integration for multi-user real-time sync
- JWT authentication with refresh tokens
- Map (Leaflet/Google Maps) with live unit geolocation
- Historical incident analytics dashboard
- Export to CSV/PDF for reporting (NIBRS format)
- Two-factor authentication for dispatchers

# Contributing

This is an educational simulation. For feature suggestions or bug reports, please open an issue.

# License

MIT — Free for educational and demonstration use. Not certified for public safety deployment.

# Disclaimer

This software is provided "AS IS" for educational purposes only. Actual Computer-Aided Dispatch systems require compliance with local regulations, redundant infrastructure, and professional certification. The developer assumes no liability for misuse or operational deployment.

```text
This README presents your CAD simulation as a serious full-stack project while clearly marking it as educational. The SQL schemas and backend descriptions make it suitable for a portfolio piece demonstrating database integration with frontend visualization.
```
