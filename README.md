# Nexora — Find the right people to build with

Nexora is a web-first teammate-discovery and project-collaboration platform for student builders. It includes builder profiles, searchable discovery, project roles, applications, invitations, teams, and an explainable matching engine.

## Local-development architecture

- Frontend: Next.js 14, React 18, TypeScript, Tailwind CSS
- Backend: FastAPI, Pydantic, an in-memory development data store
- Identity: a configurable local user ID sent to the API; no sign-in service is required

The in-memory store is intentionally temporary. Data created through the API is reset whenever the backend restarts.

## Run locally

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8000
```

`backend/.env.example` supports:

```env
FRONTEND_URL=http://localhost:3000
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

`frontend/.env.example` supports:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_DEV_USER_ID=user-alice
```

Open `http://localhost:3000`. Legacy login, signup, and logout URLs redirect directly into the local demo experience.

## Verification

```bash
cd frontend
npm run build
npm run lint

cd ../backend
python -m pytest
```

## Main API areas

- `/api/users` — profiles and teammate discovery
- `/api/projects` — projects and roles
- `/api/applications` — project applications
- `/api/requests` — teammate invitations and requests
- `/api/teams` — team rosters
- `/api/matches` — role and builder recommendations
- `/health` — service health
