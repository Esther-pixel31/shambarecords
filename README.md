# SmartSeason Field Monitoring System

A web app to track crop progress across multiple fields during a growing season.

You can:

- Manage fields.
- Assign field agents.
- Track crop stages.
- Log updates and observations.

The app supports two roles:

- `Admin (Coordinator)` to create and manage fields, assign field agents, and monitor all progress
- `Field Agent` to view assigned fields, update stages, and submit field observations

## Features

### Users and Access
- JWT-based login
- Role-based access control
- Admin and Agent roles

### Field Management

- Create fields
- Assign fields to agents
- Track crop type and planting date

### Field Updates

- Agents update field stage
- Agents add notes
- Each update stored with timestamp

### Field Lifecycle

- Planted
- Growing
- Ready
- Harvested

### Field Status Logic

Each field has a computed status based on planting date, current stage, and update freshness:

- `Completed`: current stage is `Harvested`
- `At Risk`:
  - stage is `Planted` more than 14 days after planting
  - latest field update is older than 7 days
  - stage is `Ready` and the latest update is older than 10 days
- `Active`: everything else

This keeps the status logic simple while still surfacing stale or delayed fields on the dashboard.


## Tech Stack

### Backend

- Flask
- Flask-SQLAlchemy
- JWT authenication
- Flask-Migrate
- PostgreSQL driver: `psycopg2-binary`

### Frontend

- React
- Vite

### Infrastructure

- Docker
- Docker Compose
- PostgreSQL 16

## System Design

### Backend structure:

app/

- main.py
- models.py
- auth.py
- extensions.py
- config.py

Core models:

- User
- Field
- FieldUpdate

Design approach:

- routes handle requests
- models handle data
- logic kept simple and clear

## API Overview

- `POST /api/auth/login`
- `GET /api/me`
- `GET /api/dashboard`
- `GET /api/fields`
- `POST /api/fields` admin only
- `PUT /api/fields/:id` admin only
- `POST /api/fields/:id/updates` agent only
- `GET /api/users/agents` admin only

## Running the Project

1. Ensure Docker Desktop is installed and running.
2. From the project root run:

```bash
docker compose up --build
```

3. Open:

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend API: [http://localhost:5000/api/health](http://localhost:5000/api/health)

The backend seeds demo data automatically on startup.

## Demo Credentials

- Admin
  - Username: `admin`
  - Password: `admin123`
- Field Agent
  - Username: `agent.alice`
  - Password: `agent123`
- Field Agent
  - Username: `agent.brian`
  - Password: `agent123`


## Design Decisions

- Used a monorepo with separate `backend` and `frontend` folders for clear separation of concerns.
- Used JWT auth to keep the React frontend and Flask API decoupled.
- Seeded the database on backend startup so evaluators can log in immediately.
- Focused on a compact but readable API shape rather than over-engineering the domain model.

## Assumptions

- A field belongs to one agent at a time.
- Admins can edit existing fields but field agents only submit updates for their assigned fields.
- Notes are stored as a historical update trail instead of overwriting earlier observations.
- Docker is the primary runtime path for the assessment.

## Trade-offs
- Simple logic over complex rules
- No pagination to save time
- Basic UI to focus on core functionality

## Future Improvements
- Alerts for At Risk fields
- Multiple agents per field
- Image uploads for updates
- Analytics dashboard