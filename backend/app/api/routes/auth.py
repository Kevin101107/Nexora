import re
import uuid
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, HTTPException, Header, status

from app.core.database import get_database
from app.core.identity import get_user_id
from app.core.auth import hash_password, verify_password, create_access_token
from app.models.auth import UserRegisterRequest, UserLoginRequest, AuthResponse, DemoUserItem
from app.models.user import UserProfileRead
from app.api.routes.users import _row_to_user_profile, _compute_user_stats

router = APIRouter(prefix="/auth", tags=["auth"])

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
USERNAME_REGEX = re.compile(r"^[a-zA-Z0-9_]{3,30}$")


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: UserRegisterRequest):
    email = payload.email.strip().lower()
    if not EMAIL_REGEX.match(email):
        raise HTTPException(status_code=422, detail="Invalid email address format")

    username = payload.username.strip().lower()
    if not USERNAME_REGEX.match(username):
        raise HTTPException(
            status_code=422,
            detail="Username must be 3-30 characters, alphanumeric and underscores only",
        )

    if len(payload.password) < 6:
        raise HTTPException(status_code=422, detail="Password must be at least 6 characters")

    database = get_database()

    # Check email uniqueness
    try:
        e_res = database.table("users").select("id").eq("email", email).execute()
        if e_res.data and len(e_res.data) > 0:
            raise HTTPException(status_code=409, detail="Email already registered")
    except HTTPException:
        raise
    except Exception:
        pass

    # Check username uniqueness
    try:
        u_res = database.table("users").select("id").eq("username", username).execute()
        if u_res.data and len(u_res.data) > 0:
            raise HTTPException(status_code=409, detail="Username already taken")
    except HTTPException:
        raise
    except Exception:
        pass

    user_id = f"user-{uuid.uuid4().hex[:12]}"
    now_iso = datetime.now(timezone.utc).isoformat()

    pwd_hash, salt = hash_password(payload.password)

    user_row = {
        "id": user_id,
        "email": email,
        "display_name": payload.display_name.strip(),
        "username": username,
        "headline": payload.headline or f"Student builder at {payload.college or 'University'}",
        "bio": payload.bio or "Passionate student ready to build and collaborate on innovative projects.",
        "skills": payload.skills,
        "roles": payload.roles,
        "interests": payload.interests or ["Hackathons", "Projects"],
        "college": payload.college,
        "department": payload.department,
        "year": payload.year,
        "portfolio_url": payload.portfolio_url,
        "experience_level": payload.experience_level or "intermediate",
        "github_url": f"https://github.com/{username}",
        "linkedin_url": None,
        "availability": payload.availability,
        "created_at": now_iso,
        "updated_at": now_iso,
    }

    try:
        database.table("users").insert(user_row).execute()
        database.table("auth_credentials").insert({
            "user_id": user_id,
            "password_hash": pwd_hash,
            "salt": salt,
            "created_at": now_iso,
            "updated_at": now_iso,
        }).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

    token = create_access_token(user_id=user_id, username=username)
    profile = _row_to_user_profile(user_row, tasks_completed=0, completed_projects=0)

    return AuthResponse(access_token=token, token_type="bearer", user=profile)


@router.post("/login", response_model=AuthResponse)
async def login(payload: UserLoginRequest):
    identifier = payload.username_or_email.strip().lower()
    database = get_database()

    user_row = None
    # Lookup by username
    try:
        u_res = database.table("users").select("*").eq("username", identifier).execute()
        if u_res.data and len(u_res.data) > 0:
            user_row = u_res.data[0]
    except Exception:
        pass

    # Lookup by email
    if not user_row:
        try:
            e_res = database.table("users").select("*").eq("email", identifier).execute()
            if e_res.data and len(e_res.data) > 0:
                user_row = e_res.data[0]
        except Exception:
            pass

    if not user_row:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    user_id = str(user_row["id"])

    # Verify credentials
    cred_res = database.table("auth_credentials").select("*").eq("user_id", user_id).execute()
    if not cred_res.data or len(cred_res.data) == 0:
        # Fallback for seed users without password or demo testing
        if payload.password == "password123":
            pass
        else:
            raise HTTPException(status_code=401, detail="Invalid username or password")
    else:
        cred = cred_res.data[0]
        if not verify_password(payload.password, cred["password_hash"], cred["salt"]):
            raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_access_token(user_id=user_id, username=user_row.get("username"))
    task_counts, proj_counts = _compute_user_stats([user_id], database)
    profile = _row_to_user_profile(
        user_row,
        tasks_completed=task_counts.get(user_id, 0),
        completed_projects=proj_counts.get(user_id, 0),
    )

    return AuthResponse(access_token=token, token_type="bearer", user=profile)


@router.get("/me", response_model=UserProfileRead)
async def get_current_user(authorization: str = Header(...)):
    user_id = await get_user_id(authorization)
    database = get_database()

    res = database.table("users").select("*").eq("id", user_id).execute()
    if not res.data or len(res.data) == 0:
        raise HTTPException(status_code=404, detail="User not found")

    user_row = res.data[0]
    task_counts, proj_counts = _compute_user_stats([user_id], database)
    return _row_to_user_profile(
        user_row,
        tasks_completed=task_counts.get(user_id, 0),
        completed_projects=proj_counts.get(user_id, 0),
    )


@router.post("/logout")
async def logout():
    return {"status": "ok", "message": "Successfully logged out"}


@router.get("/demo-users", response_model=List[DemoUserItem])
async def list_demo_users():
    """Returns available seed demo users for fast 1-click evaluation/testing."""
    from app.core.config import settings
    if not settings.demo_mode_enabled:
        return []
    return [
        DemoUserItem(
            id="user-alice",
            username="maya",
            display_name="Maya Iyer",
            headline="Full-stack builder crafting accessible AI products",
            role_summary="Frontend / Full-Stack Engineer",
            primary_skills=["React", "Next.js", "TypeScript", "FastAPI"],
        ),
        DemoUserItem(
            id="user-bob",
            username="arjun",
            display_name="Arjun Mehta",
            headline="Backend and cloud engineer who likes reliable systems",
            role_summary="Backend Engineer / DevOps",
            primary_skills=["Python", "Go", "Docker", "PostgreSQL"],
        ),
        DemoUserItem(
            id="user-cora",
            username="zoya",
            display_name="Zoya Khan",
            headline="Product designer focused on inclusive mobile experiences",
            role_summary="UI/UX Designer / Product",
            primary_skills=["Figma", "User Research", "Prototyping", "Design Systems"],
        ),
        DemoUserItem(
            id="user-diego",
            username="devpatel",
            display_name="Dev Patel",
            headline="ML engineer exploring useful, explainable AI",
            role_summary="AI / ML Engineer",
            primary_skills=["Python", "PyTorch", "NLP", "FastAPI"],
        ),
        DemoUserItem(
            id="user-erin",
            username="ananyarao",
            display_name="Ananya Rao",
            headline="Mobile developer building delightful cross-platform apps",
            role_summary="Mobile Developer",
            primary_skills=["React Native", "TypeScript", "Flutter", "Firebase"],
        ),
        DemoUserItem(
            id="user-finn",
            username="kabirshah",
            display_name="Kabir Shah",
            headline="Product strategist connecting user needs to shippable scopes",
            role_summary="Product Manager",
            primary_skills=["Product Strategy", "User Research", "Analytics"],
        ),
    ]
