import re
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Header, Query
from app.models.user import UserProfileRead, PublicUserProfile, UserUpdate
from app.models.contribution import ContributionProfileResponse
from app.services.contribution import calculate_user_contributions
from app.core.database import get_database
from app.core.identity import get_user_id

router = APIRouter(prefix="/users", tags=["users"])

USERNAME_REGEX = re.compile(r"^[a-zA-Z0-9_]{3,30}$")


def _row_to_public_profile(
    row: dict,
    tasks_completed: Optional[int] = None,
    completed_projects: Optional[int] = None,
) -> PublicUserProfile:
    return PublicUserProfile(
        id=str(row.get("id")),
        display_name=row.get("display_name"),
        avatar_url=row.get("avatar_url"),
        username=row.get("username"),
        headline=row.get("headline"),
        bio=row.get("bio"),
        skills=row.get("skills") or [],
        roles=row.get("roles") or [],
        interests=row.get("interests") or [],
        github_url=row.get("github_url"),
        linkedin_url=row.get("linkedin_url"),
        college=row.get("college"),
        department=row.get("department"),
        year=row.get("year"),
        portfolio_url=row.get("portfolio_url"),
        experience_level=row.get("experience_level") or "intermediate",
        availability=row.get("availability") or "open",
        tasks_completed_count=tasks_completed if tasks_completed is not None else row.get("tasks_completed_count"),
        completed_projects_count=completed_projects if completed_projects is not None else row.get("completed_projects_count"),
        created_at=row.get("created_at"),
    )


def _row_to_user_profile(
    row: dict,
    fallback_email: str = "",
    tasks_completed: Optional[int] = None,
    completed_projects: Optional[int] = None,
) -> UserProfileRead:
    email = row.get("email") or fallback_email
    return UserProfileRead(
        id=str(row.get("id")),
        email=email,
        display_name=row.get("display_name"),
        avatar_url=row.get("avatar_url"),
        username=row.get("username"),
        headline=row.get("headline"),
        bio=row.get("bio"),
        skills=row.get("skills") or [],
        roles=row.get("roles") or [],
        interests=row.get("interests") or [],
        github_url=row.get("github_url"),
        linkedin_url=row.get("linkedin_url"),
        college=row.get("college"),
        department=row.get("department"),
        year=row.get("year"),
        portfolio_url=row.get("portfolio_url"),
        experience_level=row.get("experience_level") or "intermediate",
        availability=row.get("availability") or "open",
        tasks_completed_count=tasks_completed if tasks_completed is not None else row.get("tasks_completed_count"),
        completed_projects_count=completed_projects if completed_projects is not None else row.get("completed_projects_count"),
        created_at=row.get("created_at"),
        updated_at=row.get("updated_at"),
    )


def _compute_user_stats(user_ids: List[str], database):
    """
    Computes completed tasks count and completed projects count for users across public projects.
    """
    try:
        projs_res = database.table("projects").select("id, visibility, status").execute()
        all_projs = projs_res.data or []
    except Exception:
        all_projs = []
    public_proj_ids = {p["id"] for p in all_projs if p.get("visibility") != "private"}
    completed_proj_ids = {p["id"] for p in all_projs if p.get("visibility") != "private" and p.get("status") == "completed"}

    user_task_counts = {uid: 0 for uid in user_ids}
    try:
        tasks_res = database.table("tasks").select("id, project_id, assignee_id, completed_by, status").execute()
        for t in (tasks_res.data or []):
            if t.get("project_id") in public_proj_ids and t.get("status") == "done":
                c_by = t.get("completed_by") or t.get("assignee_id")
                if c_by in user_task_counts:
                    user_task_counts[c_by] += 1
    except Exception:
        pass

    user_completed_proj_sets = {uid: set() for uid in user_ids}
    try:
        pm_res = database.table("project_members").select("project_id, user_id").execute()
        for m in (pm_res.data or []):
            pid = m.get("project_id")
            uid = m.get("user_id")
            if uid in user_completed_proj_sets and pid in completed_proj_ids:
                user_completed_proj_sets[uid].add(pid)
    except Exception:
        pass

    user_proj_counts = {uid: len(user_completed_proj_sets[uid]) for uid in user_ids}
    return user_task_counts, user_proj_counts


def _get_or_create_user_row(user_id: str, database) -> dict:
    try:
        res = database.table("users").select("*").eq("id", user_id).execute()
        if res.data and len(res.data) > 0:
            row = res.data[0]
            # Ensure username exists
            if not row.get("username"):
                uname = "builder_" + user_id[:8]
                try:
                    database.table("users").update({"username": uname}).eq("id", user_id).execute()
                    row["username"] = uname
                except Exception:
                    pass
            return row
    except Exception:
        pass

    default_username = "builder_" + user_id[:8]
    new_row = {
        "id": user_id,
        "email": f"{user_id}@localhost",
        "display_name": user_id.replace("-", " ").title(),
        "avatar_url": None,
        "username": default_username,
        "skills": [],
        "roles": [],
        "interests": [],
        "college": None,
        "department": None,
        "year": None,
        "portfolio_url": None,
        "experience_level": "intermediate",
        "availability": "open",
    }
    try:
        database.table("users").upsert(new_row).execute()
        res = database.table("users").select("*").eq("id", user_id).execute()
        if res.data:
            return res.data[0]
    except Exception:
        pass
    return new_row


@router.get("/me", response_model=UserProfileRead)
async def get_profile(authorization: str = Header(...)):
    user_id = await get_user_id(authorization)
    database = get_database()
    row = _get_or_create_user_row(user_id, database)
    task_counts, proj_counts = _compute_user_stats([user_id], database)
    return _row_to_user_profile(
        row,
        tasks_completed=task_counts.get(user_id, 0),
        completed_projects=proj_counts.get(user_id, 0),
    )


@router.patch("/me", response_model=UserProfileRead)
@router.put("/me", response_model=UserProfileRead)
async def update_profile(update: UserUpdate, authorization: str = Header(...)):
    user_id = await get_user_id(authorization)
    body = update.model_dump(exclude_unset=True)
    if not body:
        raise HTTPException(status_code=422, detail="No fields to update")

    database = get_database()
    _get_or_create_user_row(user_id, database)

    # Validate username if provided
    if "username" in body and body["username"] is not None:
        raw_username = body["username"].strip().lower()
        if not USERNAME_REGEX.match(raw_username):
            raise HTTPException(
                status_code=422,
                detail="Username must be 3-30 characters, alphanumeric and underscores only",
            )
        # Check uniqueness
        try:
            check_res = (
                database.table("users")
                .select("id")
                .eq("username", raw_username)
                .neq("id", user_id)
                .execute()
            )
            if check_res.data and len(check_res.data) > 0:
                raise HTTPException(status_code=409, detail="Username already taken")
        except HTTPException:
            raise
        except Exception:
            pass
        body["username"] = raw_username

    try:
        database.table("users").update(body).eq("id", user_id).execute()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update profile: {str(e)}")

    updated_row = _get_or_create_user_row(user_id, database)
    task_counts, proj_counts = _compute_user_stats([user_id], database)
    return _row_to_user_profile(
        updated_row,
        tasks_completed=task_counts.get(user_id, 0),
        completed_projects=proj_counts.get(user_id, 0),
    )


@router.get("", response_model=List[PublicUserProfile])
async def list_users(
    q: Optional[str] = Query(None, description="Search term for name, headline, or bio"),
    skill: Optional[str] = Query(None, description="Filter by skill"),
    role: Optional[str] = Query(None, description="Filter by role"),
    availability: Optional[str] = Query(None, description="Filter by availability"),
):
    """
    Teammate discovery query with search & filter.
    Returns public user profiles only (no private email or auth details).
    """
    database = get_database()
    try:
        query = database.table("users").select(
            "id, display_name, avatar_url, username, headline, bio, skills, roles, interests, github_url, linkedin_url, availability, created_at"
        )
        if availability and availability != "all":
            query = query.eq("availability", availability)
        res = query.execute()
        rows = res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch users: {str(e)}")

    u_ids = [str(r.get("id")) for r in rows]
    task_counts, proj_counts = _compute_user_stats(u_ids, database)
    profiles = [
        _row_to_public_profile(
            r,
            tasks_completed=task_counts.get(str(r.get("id")), 0),
            completed_projects=proj_counts.get(str(r.get("id")), 0),
        )
        for r in rows
    ]

    # In-memory filtering for query, skill, and role (robust across postgres/sqlite mocks)
    if q:
        q_lower = q.lower().strip()
        profiles = [
            p
            for p in profiles
            if (p.display_name and q_lower in p.display_name.lower())
            or (p.username and q_lower in p.username.lower())
            or (p.headline and q_lower in p.headline.lower())
            or (p.bio and q_lower in p.bio.lower())
            or any(q_lower in s.lower() for s in p.skills)
        ]

    if skill:
        skill_lower = skill.lower().strip()
        profiles = [
            p for p in profiles if any(skill_lower == s.lower() or skill_lower in s.lower() for s in p.skills)
        ]

    if role and role != "all":
        role_lower = role.lower().strip()
        profiles = [
            p for p in profiles if any(role_lower in r.lower() for r in p.roles)
        ]

    return profiles


@router.get("/{identifier}/contributions", response_model=ContributionProfileResponse)
async def get_user_contributions(
    identifier: str,
    authorization: Optional[str] = Header(None),
):
    """
    Retrieve deterministic, evidence-based contribution and reputation profile for a builder.
    Can be queried by username, user UUID, or 'me' (with Authorization header).
    """
    database = get_database()
    target_row = None

    if identifier.lower() == "me":
        if not authorization:
            raise HTTPException(status_code=401, detail="Authorization header required for 'me'")
        user_id = await get_user_id(authorization)
        target_row = _get_or_create_user_row(user_id, database)
    else:
        # First try lookup by username
        try:
            res = (
                database.table("users")
                .select("*")
                .eq("username", identifier.lower())
                .execute()
            )
            if res.data and len(res.data) > 0:
                target_row = res.data[0]
        except Exception:
            pass

        # Fallback to lookup by id
        if not target_row:
            try:
                res = (
                    database.table("users")
                    .select("*")
                    .eq("id", identifier)
                    .execute()
                )
                if res.data and len(res.data) > 0:
                    target_row = res.data[0]
            except Exception:
                pass

    if not target_row:
        raise HTTPException(status_code=404, detail="User not found")

    return calculate_user_contributions(target_row, database)


@router.get("/{identifier}", response_model=PublicUserProfile)
async def get_public_profile(identifier: str):
    """
    Public builder profile lookup by username or UUID id.
    Strictly excludes private fields (email, auth tokens).
    """
    database = get_database()
    target_row = None

    # First try lookup by username
    try:
        res = (
            database.table("users")
            .select(
                "id, display_name, avatar_url, username, headline, bio, skills, roles, interests, github_url, linkedin_url, availability, created_at"
            )
            .eq("username", identifier.lower())
            .execute()
        )
        if res.data and len(res.data) > 0:
            target_row = res.data[0]
    except Exception:
        pass

    # Fallback to lookup by id
    if not target_row:
        try:
            res = (
                database.table("users")
                .select(
                    "id, display_name, avatar_url, username, headline, bio, skills, roles, interests, github_url, linkedin_url, availability, created_at"
                )
                .eq("id", identifier)
                .execute()
            )
            if res.data and len(res.data) > 0:
                target_row = res.data[0]
        except Exception:
            pass

    if not target_row:
        raise HTTPException(status_code=404, detail="User not found")

    u_id = str(target_row.get("id"))
    task_counts, proj_counts = _compute_user_stats([u_id], database)
    return _row_to_public_profile(
        target_row,
        tasks_completed=task_counts.get(u_id, 0),
        completed_projects=proj_counts.get(u_id, 0),
    )
