# TeamForge AI — Supervisor Demonstration Guide

## Start

1. Configure the local environment variables using `.env.dummy` as the variable-name reference.
2. Run `docker compose up -d --build`.
3. Wait until the PostgreSQL and API containers are healthy.
4. Open the TeamForge AI UI on port 3000.

## Suggested demonstration

1. **Landing page** — explain the implemented DevOps MVP and its continuity with the Design Thinking prototype.
2. **Register** — create a demonstration user using a password with uppercase, lowercase and a number.
3. **Login** — authenticate and enter the dashboard.
4. **Dashboard** — show project statistics and recent projects.
5. **Projects** — create a project, edit its status and open its backlog.
6. **Backlog** — create tasks with priority and workflow status, then edit a task to move it between workflow columns.
7. **Security/ownership** — note that all project/task API calls use the authenticated JWT and ownership is enforced server-side.
8. **Logout** — end the authenticated browser session.

## Validation endpoints

- `/` — supervisor-facing frontend
- `/health` — application/database health
- `/api/auth/register` — registration
- `/api/auth/login` — authentication
- `/api/auth/me` — authenticated identity
- `/api/projects` — owned project collection
- `/api/projects/:projectId/tasks` — owned project backlog
- `/api/tasks/:id` — individual task operations

## CI/CD validation added for the frontend

The integration suite now checks that `/` returns HTML containing the TeamForge AI frontend. The staging and production smoke test also checks frontend availability before proceeding through registration, authentication, Project and Task API validation.
