from fastapi import APIRouter, HTTPException, Header
from app.models.user import UserProfile, UserUpdate
from app.core.supabase import get_supabase
from app.core.auth import get_user_id

router = APIRouter(prefix="/users", tags=["users"])


def _get_or_create_user_row(user_id: str, supabase) -> dict:
    try:
        res = supabase.table("users").select("*").eq("id", user_id).execute()
        if res.data and len(res.data) > 0:
            return res.data[0]
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

    new_row = {
        "id": user_id,
        "email": auth_email,
        "display_name": auth_name,
        "avatar_url": auth_avatar,
    }
    try:
        supabase.table("users").upsert(new_row).execute()
        res = supabase.table("users").select("*").eq("id", user_id).execute()
        if res.data:
            return res.data[0]
    except Exception:
        pass
    return new_row


@router.get("/me", response_model=UserProfile)
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

    return UserProfile(
        id=user_id,
        email=auth_email,
        display_name=row.get("display_name"),
        avatar_url=row.get("avatar_url"),
        headline=row.get("headline"),
        bio=row.get("bio"),
        skills=row.get("skills") or [],
        roles=row.get("roles") or [],
        github_url=row.get("github_url"),
        linkedin_url=row.get("linkedin_url"),
        availability=row.get("availability") or "open",
    )


@router.put("/me")
async def update_profile(update: UserUpdate, authorization: str = Header(...)):
    user_id = await get_user_id(authorization)
    body = update.model_dump(exclude_unset=True)
    if not body:
        raise HTTPException(status_code=422, detail="No fields to update")
    supabase = get_supabase()
    _get_or_create_user_row(user_id, supabase)
    supabase.table("users").update(body).eq("id", user_id).execute()
    updated_row = _get_or_create_user_row(user_id, supabase)
    return updated_row
