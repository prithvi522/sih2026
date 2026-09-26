# UrbanForma API

FastAPI service for persistent SIH 2026 problem 26114 project, proposal, manually recorded Autodesk Forma analysis, and walkthrough video planning data. It does not create site designs, render videos, or run Forma/Revit analysis.

## Stack and layout

- Python 3.10+, FastAPI, Pydantic 2, SQLAlchemy 2
- PostgreSQL via psycopg 3; Alembic migrations
- Pytest and an isolated in-memory SQLite database for automated API tests

```text
backend/
  app/main.py                 FastAPI application and CORS
  app/core/                   Environment settings and SQLAlchemy sessions
  app/models/project.py       Project, proposal, analysis, and video-plan tables
  app/schemas/                Pydantic request/response validation
  app/routers/                REST endpoints
  app/services/               Default walkthrough plan templates
  alembic/                    Versioned schema migration
  tests/                      API tests with isolated SQLite fixtures
  requirements.txt
  .env.example
```

## Windows prerequisites and local setup

Install Python 3.10 or newer and PostgreSQL 14 or newer. Open PowerShell in `E:\praniti\backend`:

```powershell
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Create a database and a non-superuser login in `psql` (choose a local development password and put the same value in `backend\.env`):

```sql
CREATE ROLE urbanforma LOGIN PASSWORD 'change-me';
CREATE DATABASE urbanforma OWNER urbanforma;
```

Set `DATABASE_URL` in `backend\.env`, for example:

```text
DATABASE_URL=postgresql+psycopg://urbanforma:change-me@localhost:5432/urbanforma
CORS_ORIGINS=http://localhost:5173
APP_ENV=development
```

Apply migrations and start the service from `backend`:

```powershell
alembic upgrade head
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Interactive API documentation: <http://127.0.0.1:8000/docs>. Health check: <http://127.0.0.1:8000/api/health>.

## Frontend connection

Create `frontend\.env.local` based on `frontend\.env.example`:

```text
VITE_API_BASE_URL=http://localhost:8000
```

From the repository root:

```powershell
npm --prefix frontend install
npm --prefix frontend run dev
npm --prefix frontend run build
npm --prefix frontend run lint
```

Vite reads the API URL when it starts; restart the dev server after changing the environment file.

## API endpoints

All routes use the `/api` prefix. Project lists accept `limit` (1–100) and `offset` query parameters.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Application and database connectivity |
| POST, GET | `/api/projects` | Create a project; list projects |
| GET, PUT, DELETE | `/api/projects/{project_id}` | Read, update, or delete a project |
| POST, GET | `/api/projects/{project_id}/proposals` | Create or list proposal records |
| GET, PUT, DELETE | `/api/proposals/{proposal_id}` | Read, update, or delete a proposal |
| POST, GET | `/api/proposals/{proposal_id}/analyses` | Create or list analysis results |
| PUT, DELETE | `/api/analyses/{analysis_id}` | Update or delete one analysis result |
| GET | `/api/projects/{project_id}/comparison` | Compare saved Proposal A and B |
| GET, PUT | `/api/projects/{project_id}/walkthrough-plan` | Read or save five editable scenes, checklist, and video status |
| POST | `/api/projects/{project_id}/walkthrough-plan/reset` | Reset the video plan scenes and checklist to defaults |

Example project and proposal requests:

```powershell
$project = Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/projects `
  -ContentType 'application/json' -Body '{"name":"UrbanForma SIH 2026","problem_statement_id":"26114"}'
$body = '{"label":"A","name":"Proposal A","design_summary":"Manual summary","site_location":"Enter site","site_area_km2":1.2,"building_count":0,"green_space_area_m2":0,"forma_board_reference":"Forma report reference"}'
Invoke-RestMethod -Method Post -Uri "http://localhost:8000/api/projects/$($project.id)/proposals" `
  -ContentType 'application/json' -Body $body
```

Example analysis request:

```json
{
  "category": "Sun Hours",
  "value": "5.4",
  "unit": "hours",
  "status": "analyzed",
  "data_source": "Forma report URL or report title",
  "scope": "Study boundary",
  "reporting_period": "Annual",
  "analysis_date": "2026-09-26T00:00:00Z",
  "notes": "Optional source notes"
}
```

The comparison response contains `proposal_a`, `proposal_b`, and `comparable_differences`. Difference entries are emitted only when both values are numeric and units, scope, and reporting period match. Site area, building count, and green space differences are included when both proposals contain values. Missing proposal data returns HTTP 422; duplicates return HTTP 409; request validation returns HTTP 422; missing resources return HTTP 404.

## Data and validation

- Project and proposal site areas are nullable while a project is being drafted. When supplied, each is validated as at least 1 km² in Pydantic and by a database constraint. Frontend proposal save requires the area before submission.
- Site and green-space areas use fixed-scale PostgreSQL `NUMERIC`; road network information is stored as source-entered text.
- Proposal labels A/B are unique within a project. Analysis categories are from the eight required categories and unique per proposal.
- Analysis values are stored as source-entered strings to support numeric and descriptive results. Numeric values are also stored in `NUMERIC` form for compatible comparisons. Units, source, scope, period, status, notes, and analysis date are persisted separately.
- Invalid Forma Board URL input is rejected as a URL; a report reference remains plain text.
- Project deletion cascades to its proposals and analysis records. Do not downgrade the initial migration on a database containing data: its downgrade removes these tables.
- Walkthrough plans are created with the five required scenes and eleven checklist items on first read. One plan is allowed per project; edits and checklist state are saved with the plan endpoint. Scene start/end times are derived from saved order and durations. The API permits a non-30-second plan so the frontend can show a duration warning.
- Migration `0002_walkthrough_video_plan` adds separate video-plan, scene, and checklist tables; existing project/proposal/analysis tables and records are retained.

## Tests

Run from `backend` after dependency installation:

```powershell
python -m pytest
```

Tests use an isolated in-memory SQLite database and do not connect to or modify the configured PostgreSQL database.

## Configuration and deployment

Configuration is read from environment variables or `backend\.env`: `DATABASE_URL`, `CORS_ORIGINS` (comma-separated exact origins), and `APP_ENV`. `.env` files and real credentials are not committed. Set production origins explicitly, use a managed PostgreSQL service and secret store, and run `alembic upgrade head` as a deployment step before starting Uvicorn. No authentication is added; do not expose the API to untrusted networks without an application-level access-control decision.

## Current integration limits

- The frontend saves project proposals and analysis records through this API. Analysis results are manually entered or imported from this app's JSON export; JSON import is validated before writes. Comparison CSV and project JSON exports are available.
- The API does not call Autodesk endpoints, ingest native Forma/Revit files, render/export video, run simulations, synchronize BIM models, or host image/video assets. Walkthrough image references are optional URLs only. Forma Board URLs are saved references and open in a separate tab only.
- The project's actual site, proposals, analyses, Revit model, renders, and walkthrough must be produced and verified by the team in the relevant tools, following SIH rules.
