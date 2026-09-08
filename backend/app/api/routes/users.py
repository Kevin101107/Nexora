import re
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Header, Query
from app.models.user import UserProfileRead, PublicUserProfile, UserUpdate
from app.core.supabase import get_supabase
from app.core.auth import get_user_id

router = APIRouter(prefix="/users", tags=["users"])

USERNAME_REGEX = re.compile(r"^[a-zA-Z0-9_]{3,30}$")


def _row_to_public_profile(row: dict) -> PublicUserProfile:
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
        availability=row.get("availability") or "open",
        created_at=row.get("created_at"),
    )


def _row_to_user_profile(row: dict, fallback_email: str = "") -> UserProfileRead:
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
        availability=row.get("availability") or "open",
        created_at=row.get("created_at"),
        updated_at=row.get("updated_at"),
    )


def _get_or_create_user_row(user_id: str, supabase) -> dict:
    try:
        res = supabase.table("users").select("*").eq("id", user_id).execute()
        if res.data and len(res.data) > 0:
            row = res.data[0]
            # Ensure username exists
            if not row.get("username"):
                uname = "builder_" + user_id[:8]
                try:
                    supabase.table("users").update({"username": uname}).eq("id", user_id).execute()
                    row["username"] = uname
                except Exception:
                    pass
            return row
    except Exception:
        pass

    auth_email = ""
    auth_name = None
    auth_avatar = None
    try:
        auth_user = supabase.auth.admin.get_user_by_id(user_id).user
        if auth_user:
            auth_email = auth_user.email or ""
            meta = auth_user.user_metadata or {}
            auth_name = meta.get("display_name") or meta.get("name")
            auth_avatar = meta.get("avatar_url")
    except Exception:
        pass

    default_username = "builder_" + user_id[:8]
    new_row = {
        "id": user_id,
        "email": auth_email,
        "display_name": auth_name,
        "avatar_url": auth_avatar,
        "username": default_username,
        "skills": [],
        "roles": [],
        "interests": [],
        "availability": "open",
    }
    try:
        supabase.table("users").upsert(new_row).execute()
        res = supabase.table("users").select("*").eq("id", user_id).execute()
        if res.data:
            return res.data[0]
    except Exception:
        pass
    return new_row


@router.get("/me", response_model=UserProfileRead)
async def get_profile(authorization: str = Header(...)):
    user_id = await get_user_id(authorization)
    supabase = get_supabase()
    row = _get_or_create_user_row(user_id, supabase)
    auth_email = row.get("email") or ""
    if not auth_email:
        try:
            auth_user = supabase.auth.admin.get_user_by_id(user_id).user
            auth_email = auth_user.email or ""
        except Exception:
            pass

    return _row_to_user_profile(row, fallback_email=auth_email)


@router.patch("/me", response_model=UserProfileRead)
@router.put("/me", response_model=UserProfileRead)
async def update_profile(update: UserUpdate, authorization: str = Header(...)):
    user_id = await get_user_id(authorization)
    body = update.model_dump(exclude_unset=True)
    if not body:
        raise HTTPException(status_code=422, detail="No fields to update")

    supabase = get_supabase()
    _get_or_create_user_row(user_id, supabase)

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
                supabase.table("users")
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
        supabase.table("users").update(body).eq("id", user_id).execute()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update profile: {str(e)}")

    updated_row = _get_or_create_user_row(user_id, supabase)
    return _row_to_user_profile(updated_row)


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
    supabase = get_supabase()
    try:
        query = supabase.table("users").select(
            "id, display_name, avatar_url, username, headline, bio, skills, roles, interests, github_url, linkedin_url, availability, created_at"
        )
        if availability and availability != "all":
            query = query.eq("availability", availability)
        res = query.execute()
        rows = res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch users: {str(e)}")

    profiles = [_row_to_public_profile(r) for r in rows]

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


@router.get("/{identifier}", response_model=PublicUserProfile)
async def get_public_profile(identifier: str):
    """
    Public builder profile lookup by username or UUID id.
    Strictly excludes private fields (email, auth tokens).
    """
    supabase = get_supabase()
    target_row = None

    # First try lookup by username
    try:
        res = (
            supabase.table("users")
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
                supabase.table("users")
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

    return _row_to_public_profile(target_row)
