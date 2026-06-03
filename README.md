# Nexus Dispatch — Police CAD System

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D18.0-brightgreen)
![PostgreSQL](https://img.shields.io/badge/postgresql-14+-blue)

A professional, production-ready Computer-Aided Dispatch (CAD) system for police, fire, and EMS operations. Nexus Dispatch provides real-time incident tracking, unit management, and intelligent dispatch recommendations with full database persistence and audit logging.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [System Architecture](#-system-architecture)
- [Database Schema](#-database-schema)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Running the Application](#-running-the-application)
- [API Endpoints](#-api-endpoints)
- [Project Structure](#-project-structure)
- [Authentication](#-authentication)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)
- [Disclaimer](#-disclaimer)

---

## 🎯 Overview

Nexus Dispatch is a full-stack Computer-Aided Dispatch simulation that mirrors real-world emergency response systems. It enables dispatchers to:

- Create and manage emergency incidents with priority levels (High/Medium/Low)
- Track field units with real-time status updates (Available/En Route/On Scene/Out of Service)
- Dispatch the closest available unit using GPS-based distance calculations
- Maintain a complete audit trail of all dispatch actions
- Support multiple users with role-based access control

> ⚠️ **IMPORTANT:** This software is for educational and demonstration purposes only. It is **NOT** certified for real emergency response deployment.

---

## ✨ Features

### Core Functionality

| Feature | Description |
|---|---|
| Incident Management | Create, assign, and close incidents with location tracking |
| Unit Tracking | Real-time status and GPS position monitoring |
| Closest-Unit Algorithm | SQL-powered distance calculation for optimal dispatch |
| Audit Logging | Complete history with timestamps and operator attribution |
| Dashboard | Real-time statistics and tactical map view |

### Technical Features

| Feature | Description |
|---|---|
| RESTful API | Full CRUD operations for incidents and units |
| Database Persistence | PostgreSQL with indexed queries for performance |
| JWT Authentication | Secure token-based authentication |
| Role-Based Access | Dispatcher, Supervisor, and Admin roles |
| Transaction Safety | Atomic operations for dispatch assignments |

---

## 🛠 Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Backend | Node.js / Express | v18+ / v4.18 |
| Database | PostgreSQL | v14+ |
| Authentication | JWT + bcrypt | v9+ / v5+ |
| Frontend | HTML5 / CSS3 / JavaScript | ES6+ |
| Styling | Custom CSS with Flexbox/Grid | — |

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Browser                          │
│                  (HTML/CSS/JS Dashboard)                     │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTPS / WebSocket
┌─────────────────────────▼───────────────────────────────────┐
│                    Express.js Server                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Incidents   │  │   Units     │  │   Dispatch Logs     │  │
│  │ Routes      │  │  Routes     │  │     Routes          │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────┬───────────────────────────────────┘
                          │ SQL Queries
┌─────────────────────────▼───────────────────────────────────┐
│                      PostgreSQL                              │
│  ┌──────────┐  ┌──────────┐  ┌─────────────┐  ┌──────────┐  │
│  │incidents │  │  units   │  │dispatch_logs│  │  users   │  │
│  └──────────┘  └──────────┘  └─────────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Database Schema

### `incidents` Table

```sql
id              VARCHAR(10)   PRIMARY KEY,
location        VARCHAR(255)  NOT NULL,
priority        VARCHAR(10)   CHECK (priority IN ('high','medium','low')),
assigned_unit_id VARCHAR(10)  REFERENCES units(id),
status          VARCHAR(10)   DEFAULT 'pending',
lat             DECIMAL(10,6),
lng             DECIMAL(10,6),
description     TEXT,
created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
closed_at       TIMESTAMP
```

### `units` Table

```sql
id              VARCHAR(10)   PRIMARY KEY,
name            VARCHAR(100)  NOT NULL,
status          VARCHAR(15)   DEFAULT 'available',
lat             DECIMAL(10,6),
lng             DECIMAL(10,6),
beat            VARCHAR(50),
last_updated    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
```

### `dispatch_logs` Table

```sql
log_id          SERIAL        PRIMARY KEY,
incident_id     VARCHAR(10)   REFERENCES incidents(id),
dispatcher_id   VARCHAR(50),
action          VARCHAR(255),
timestamp       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
```

### `users` Table (RBAC)

```sql
username        VARCHAR(50)   PRIMARY KEY,
password_hash   VARCHAR(255)  NOT NULL,
role            VARCHAR(15)   DEFAULT 'dispatcher',
created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
```

---

## 💻 Installation

### Prerequisites

- Node.js v18 or higher
- PostgreSQL v14 or higher
- npm or yarn package manager
- Git (optional, for cloning)

### Step-by-Step Setup

#### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/nexus-dispatch.git
cd nexus-dispatch
```

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Set Up PostgreSQL Database

```bash
# Log into PostgreSQL
sudo -u postgres psql

# Create database
CREATE DATABASE nexus_dispatch;

# Create user (optional)
CREATE USER nexus_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE nexus_dispatch TO nexus_user;

# Exit
\q
```

#### 4. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your database credentials:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=your_password
DB_NAME=nexus_dispatch
JWT_SECRET=your_super_secret_key_change_this
```

#### 5. Run Database Migrations

```bash
npm run migrate
```

#### 6. Seed Initial Data

```bash
npm run seed
```

This creates:
- 6 sample units
- 4 sample incidents
- Test user accounts (see [Authentication](#-authentication))

#### 7. Start the Application

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

#### 8. Access the Application

Open your browser to: [http://localhost:3000](http://localhost:3000)

---

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Server port |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USER` | `postgres` | Database username |
| `DB_PASS` | *(empty)* | Database password |
| `DB_NAME` | `nexus_dispatch` | Database name |
| `JWT_SECRET` | `change_me_in_production` | JWT signing secret |

> 🔒 **Security Note:** Always change `JWT_SECRET` and use strong database passwords in production.

---

## 🚀 Running the Application

### Development Mode

```bash
npm run dev
```

- Server auto-restarts on file changes via nodemon
- Console logging enabled
- Default port: 3000

### Production Mode

```bash
npm start
```

- Optimized for production
- No auto-restart
- Use with a process manager (PM2 recommended)

### Using PM2 (Production)

```bash
npm install -g pm2
pm2 start server/server.js --name nexus-dispatch
pm2 save
pm2 startup
```

---

## 📡 API Endpoints

### Units

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/units` | Get all units |
| `GET` | `/api/units/available` | Get available units only |
| `GET` | `/api/units/closest/:lat/:lng` | Find closest unit to coordinates |
| `PATCH` | `/api/units/:id/status` | Update unit status |

### Incidents

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/incidents` | Get active incidents |
| `GET` | `/api/incidents/:id` | Get incident by ID with logs |
| `POST` | `/api/incidents` | Create new incident |
| `PUT` | `/api/incidents/:id/assign` | Assign unit to incident |
| `PATCH` | `/api/incidents/:id/close` | Close incident |

### Dispatch & Stats

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/dispatch/logs/:incidentId` | Get logs for incident |
| `GET` | `/api/dispatch/stats` | Get system statistics |

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Authenticate user |

### Example API Calls

**Create an Incident**

```bash
curl -X POST http://localhost:3000/api/incidents \
  -H "Content-Type: application/json" \
  -d '{
    "location": "Main St & 5th Ave",
    "priority": "high",
    "lat": 37.7749,
    "lng": -122.4194,
    "description": "Armed robbery in progress"
  }'
```

**Assign Unit to Incident**

```bash
curl -X PUT http://localhost:3000/api/incidents/CAD-101/assign \
  -H "Content-Type: application/json" \
  -d '{"unit_id": "E-241", "dispatcher": "dispatcher1"}'
```

**Find Closest Unit**

```bash
curl http://localhost:3000/api/units/closest/37.7749/-122.4194
```

---

## 📁 Project Structure

```
nexus-dispatch/
├── server/
│   ├── server.js              # Express application entry point
│   ├── models/
│   │   └── database.js        # PostgreSQL connection pool
│   └── routes/                # (Optional modular routes)
├── migrations/
│   ├── migrate.js             # Database schema migration script
│   └── seed.js                # Seed data population script
├── public/
│   └── index.html             # Frontend dashboard
├── .env.example               # Environment variables template
├── package.json               # Dependencies and scripts
├── setup.bash                 # Automated setup script (Linux/macOS)
└── README.md                  # This file
```

> **Note:** The current version consolidates all routes in `server.js` for simplicity. Routes can be modularized into `server/routes/` as needed.

---

## 🔐 Authentication

### Default Test Credentials

| Username | Password | Role |
|---|---|---|
| `dispatcher1` | `dispatch123` | Dispatcher |
| `supervisor1` | `super456` | Supervisor |

### Authentication Flow

**1. Login Request**

```bash
POST /api/auth/login
{
  "username": "dispatcher1",
  "password": "dispatch123"
}
```

**2. Response**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "username": "dispatcher1",
  "role": "dispatcher"
}
```

**3. Authenticated Requests**

```http
Authorization: Bearer <token>
```

### Role-Based Access Control

| Role | Permissions |
|---|---|
| Dispatcher | Create incidents, assign units, close incidents, view logs |
| Supervisor | All dispatcher permissions + override capabilities |
| Admin | All permissions + user management |

---

## 🧪 Testing

### Manual Testing with cURL

```bash
# Test database connection
curl http://localhost:3000/api/units

# Test statistics endpoint
curl http://localhost:3000/api/dispatch/stats

# Test authentication
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"dispatcher1","password":"dispatch123"}'
```

### Database Query Testing

```sql
-- Check active incidents
SELECT id, location, priority, status FROM incidents WHERE status != 'closed';

-- Check unit availability
SELECT id, name, status, beat FROM units WHERE status = 'available';

-- View dispatch logs
SELECT * FROM dispatch_logs ORDER BY timestamp DESC LIMIT 10;
```

---

## 🚢 Deployment

### Deploy to Production Server

**1. Prepare Environment**

```bash
export NODE_ENV=production
export JWT_SECRET=$(openssl rand -base64 32)
```

**2. Build and Migrate**

```bash
npm install --production
npm run migrate
npm run seed
```

**3. Use Process Manager (PM2)**

```bash
npm install -g pm2
pm2 start server/server.js --name nexus-dispatch
pm2 startup
pm2 save
```

**4. Configure Reverse Proxy (Nginx)**

```nginx
server {
    listen 80;
    server_name dispatch.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Docker Deployment (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server/server.js"]
```

```bash
docker build -t nexus-dispatch .
docker run -p 3000:3000 --env-file .env nexus-dispatch
```

---

## 🗺 Roadmap

### Version 2.0 (Current)
- ✅ Full PostgreSQL integration
- ✅ JWT authentication with RBAC
- ✅ Closest-unit dispatch algorithm
- ✅ Complete audit logging

### Version 2.1 (Planned)
- 🔄 WebSocket for real-time updates
- 🔄 Map integration (Leaflet/OpenStreetMap)
- 🔄 Mobile-responsive design

### Version 3.0 (Future)
- 📅 Shift scheduling and reporting
- 📅 NIBRS-compliant export
- 📅 Multi-agency support
- 📅 SMS/email notifications

---

## 🤝 Contributing

This is an educational simulation project. For feature suggestions or bug reports:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## ⚠️ Disclaimer

> **IMPORTANT LEGAL NOTICE**
>
> This software is provided "AS IS" for educational and demonstration purposes only.
>
> ❌ NOT certified for real emergency response deployment  
> ❌ NOT compliant with PSAP or 911 regulatory requirements  
> ❌ NOT tested for reliability or fail-safety  
> ❌ NOT intended for production public safety use
>
> Real Computer-Aided Dispatch systems require redundant infrastructure and power systems, regulatory compliance (local, state, federal), professional certification and testing, and guaranteed reliability standards.
>
> The author assumes **NO LIABILITY** for any misuse, data loss, or harm resulting from the use of this software. Use at your own risk.

---

## 📞 Support

For questions or issues:
- Open a GitHub issue
- Check the FAQ *(coming soon)*
- Review API documentation in source code

---

*Built with ❤️ for educational purposes*

**Nexus Dispatch — Training the next generation of dispatchers**
