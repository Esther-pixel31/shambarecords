# SmartSeason Field Monitoring System

SmartSeason is a full-stack crop monitoring system built with the requested stack:

- `Flask` backend API
- `PostgreSQL` database
- `React` frontend
- `Docker` and `docker-compose` for local setup

The app supports two roles:

- `Admin (Coordinator)` to create and manage fields, assign field agents, and monitor all progress
- `Field Agent` to view assigned fields, update stages, and submit field observations

## Features

- JWT-based authentication
- Role-based API access
- Field CRUD flow for admins
- Field stage updates and notes for assigned field agents
- Dashboard summaries with totals, status breakdown, and risk highlights
- Seeded demo accounts and demo field data

## Tech Stack

### Backend

- Flask
- Flask-SQLAlchemy
- PyJWT
- PostgreSQL driver: `psycopg2-binary`

### Frontend

- React
- Vite

### Infrastructure

- Docker
- Docker Compose
- PostgreSQL 16

## Project Structure

- [backend](C:\Users\Queen\Desktop\Shamba records\backend) Flask API, models, auth, and seed data
- [frontend](C:\Users\Queen\Desktop\Shamba records\frontend) React application and UI
- [docker-compose.yml](C:\Users\Queen\Desktop\Shamba records\docker-compose.yml) full local stack orchestration

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

## API Overview

- `POST /api/auth/login`
- `GET /api/me`
- `GET /api/dashboard`
- `GET /api/fields`
- `POST /api/fields` admin only
- `PUT /api/fields/:id` admin only
- `POST /api/fields/:id/updates` agent only
- `GET /api/users/agents` admin only

## Field Status Logic

Each field has a computed status based on planting date, current stage, and update freshness:

- `Completed`: current stage is `Harvested`
- `At Risk`:
  - stage is `Planted` more than 14 days after planting
  - latest field update is older than 7 days
  - stage is `Ready` and the latest update is older than 10 days
- `Active`: everything else

This keeps the status logic simple while still surfacing stale or delayed fields on the dashboard.

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
