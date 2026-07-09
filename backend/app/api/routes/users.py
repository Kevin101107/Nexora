from datetime import date, timezone, datetime, timedelta
from fastapi import APIRouter, HTTPException, Header
from app.models.user import UserProfile, UserUpdate
from app.core.supabase import get_supabase
from app.core.auth import get_user_id

router = APIRouter(prefix="/users", tags=["users"])

BADGES = {
    "first_note": "Created your first note",
    "streak_3": "3-day streak",
    "streak_7": "7-day streak",
    "streak_30": "30-day streak",
    "level_5": "Reached level 5",
    "level_10": "Reached level 10",
    "focus_60": "Completed a 60-minute focus session",
    "flashcard_master": "Reviewed 50 flashcards",
}


def _upsert_streak_and_badges(user_id: str, supabase) -> None:
    try:
        row = supabase.table("users").select("streak, last_active, badges, xp, level").eq("id", user_id).single().execute().data
        if not row:
            return
        today = date.today().isoformat()
        last = row.get("last_active")
        streak = row.get("streak", 0) or 0
        if last == today:
            return
        yesterday = (date.today() - timedelta(days=1)).isoformat()
        if last == yesterday:
            streak += 1
        elif last is None or last < yesterday:
            streak = 1
        badges = list(row.get("badges") or [])
        for threshold, name in [(3, "streak_3"), (7, "streak_7"), (30, "streak_30")]:
            if streak >= threshold and name not in badges:
                badges.append(name)
        level = row.get("level", 1) or 1
        for threshold, name in [(5, "level_5"), (10, "level_10")]:
            if level >= threshold and name not in badges:
                badges.append(name)
        supabase.table("users").update({"streak": streak, "last_active": today, "badges": badges}).eq("id", user_id).execute()
    except Exception:
        pass


@router.get("/me", response_model=UserProfile)
async def get_profile(authorization: str = Header(...)):
    user_id = await get_user_id(authorization)
    supabase = get_supabase()
    _upsert_streak_and_badges(user_id, supabase)
    row = supabase.table("users").select("*").eq("id", user_id).single().execute().data
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    auth_user = supabase.auth.admin.get_user_by_id(user_id).user
    return UserProfile(
        id=user_id,
        email=auth_user.email or "",
        display_name=row.get("display_name"),
        avatar_url=row.get("avatar_url"),
        xp=row.get("xp", 0) or 0,
        level=row.get("level", 1) or 1,
        streak=row.get("streak", 0) or 0,
        badges=row.get("badges") or [],
        favourite_subjects=row.get("favourite_subjects") or [],
        daily_goal_minutes=row.get("daily_goal_minutes", 60) or 60,
    )


@router.put("/me")
async def update_profile(update: UserUpdate, authorization: str = Header(...)):
    user_id = await get_user_id(authorization)
    body = update.model_dump(exclude_none=True)
    if not body:
        raise HTTPException(status_code=422, detail="No fields to update")
    supabase = get_supabase()
    res = supabase.table("users").update(body).eq("id", user_id).execute()
    return res.data[0] if res.data else {}
