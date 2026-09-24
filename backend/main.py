from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes import (
    auth,
    users,
    projects,
    applications,
    requests,
    teams,
    matches,
    workspace,
    notifications,
    resources,
)

app = FastAPI(title="Nexora API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Authentication & Identity
app.include_router(auth.router, prefix="/api")

# Users & Profiles
app.include_router(users.router, prefix="/api")
app.include_router(users.router, prefix="/api/profiles", tags=["profiles"])

# Projects & Roles
app.include_router(projects.router, prefix="/api")

# Workspace (Tasks, Milestones, Activity, Overview) & Resources
app.include_router(workspace.router, prefix="/api")
app.include_router(resources.router, prefix="/api")

# Notifications
app.include_router(notifications.router, prefix="/api")

# Applications (Join Requests)
app.include_router(applications.router, prefix="/api")
app.include_router(applications.router, prefix="/api/join-requests", tags=["join-requests"])

# Requests (Teammate Invitations)
app.include_router(requests.router, prefix="/api")
app.include_router(requests.router, prefix="/api/invitations", tags=["invitations"])

# Teams & Matching
app.include_router(teams.router, prefix="/api")
app.include_router(matches.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok", "app": "Nexora API", "version": "1.0.0"}
