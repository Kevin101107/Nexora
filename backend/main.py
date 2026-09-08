from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes import auth, users, projects, applications, requests, teams

app = FastAPI(title="Nexora API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(applications.router, prefix="/api")
app.include_router(requests.router, prefix="/api")
app.include_router(teams.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok", "app": "Nexora API", "version": "1.0.0"}
