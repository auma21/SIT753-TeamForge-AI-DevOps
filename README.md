# TeamForge AI — DevSecOps MVP

TeamForge AI is an explainable AI-assisted Capstone collaboration concept implemented here as a secure project and Agile backlog management MVP. The repository includes an Express/PostgreSQL API, a supervisor-facing browser UI, Docker deployment, automated tests, SonarQube quality gates, Trivy security gates, staging/production promotion, and Jenkins evidence collection.

## Supervisor quick start

### Prerequisites
- Docker Desktop with Docker Compose
- Git (if cloning the repository)

### 1. Configure local environment
Create the local environment values required by `compose.yaml` using the supplied `.env.dummy` as the variable-name reference. Do not commit real secrets.

### 2. Start TeamForge AI

```bash
docker compose up -d --build
```

### 3. Open the application

- Web UI: `http://localhost:3000`
- Health endpoint: `http://localhost:3000/health`

### 4. Demonstration workflow

1. Create an account.
2. Sign in.
3. Create a Project.
4. Open the Project backlog.
5. Create Tasks and select priority/status.
6. Edit Tasks to move them through Backlog → To Do → In Progress → Review → Done.
7. Edit or delete Projects/Tasks as required.
8. Log out.

### 5. Stop the application

```bash
docker compose down
```

Do not add `-v` unless you intentionally want to remove the PostgreSQL data volume.

## Implemented MVP

- JWT registration, login and authenticated identity
- UUID-based users, projects and tasks
- Project CRUD with authenticated ownership
- Nested project/task CRUD
- Task priorities: low, medium, high, critical
- Task workflow: backlog, todo, in-progress, review, done
- PostgreSQL relational constraints and indexes
- Static browser UI served by the same Express application
- Dockerized API and PostgreSQL deployment
- Jest unit/integration/authorization/security/database-integrity tests
- SonarQube quality gate
- npm audit and Trivy security gates
- PostgreSQL non-root runtime verification
- Staging and production smoke tests
- Jenkins release evidence and fingerprinting

## Prototype continuity

The earlier high-fidelity Design Thinking prototype remains available at the project’s GitHub Pages site. It demonstrates future-facing Team Recommendation, Explainability, Team Balance, Alternative Teams and Responsible-AI/Data-Transparency concepts. The deployed DevOps MVP intentionally labels those as design/prototype capabilities rather than claiming recommendation APIs that are not implemented in this repository.

## Security notes

- Secrets are injected through environment variables/Jenkins Credentials and must not be committed.
- The browser stores the JWT in `sessionStorage`, so authentication is cleared when the browser session closes.
- Integration tests must use the dedicated test database; they must never target staging or production data.

