# UrbanForma

UrbanForma is a supporting project-management interface for SIH 2026 problem statement 26114. Site design and analysis are created manually by the team in Autodesk Forma; this application stores project records and verified results.

The repository contains:

- `frontend/`: React, Vite, TypeScript application.
- `backend/`: FastAPI, SQLAlchemy, PostgreSQL REST API and Alembic migrations.

## Start locally on Windows

Set up PostgreSQL and the Python API using [backend/README.md](backend/README.md). Configure `frontend/.env.local` with `VITE_API_BASE_URL=http://localhost:8000`, then run from the repository root:

```powershell
npm --prefix frontend install
npm --prefix frontend run dev
```

The API docs are available at <http://127.0.0.1:8000/docs> after the backend starts. Frontend production build and lint commands:

```powershell
npm --prefix frontend run build
npm --prefix frontend run lint
```
