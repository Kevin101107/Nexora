from fastapi import APIRouter, Header, HTTPException
from app.models.focus import FocusSessionCreate
from app.core.supabase import get_supabase
from app.core.auth import get_user_id

router = APIRouter(prefix="/focus", tags=["focus"])


def _award_xp(user_id: str, minutes: int, supabase) -> None:
    try:
        row = supabase.table("users").select("xp, level, badges").eq("id", user_id).single().execute().data
        if not row:
            return
        new_xp = row["xp"] + minutes
        new_level = (new_xp // 100) + 1
        badges = list(row.get("badges") or [])
        if minutes >= 60 and "focus_60" not in badges:
            badges.append("focus_60")
        supabase.table("users").update({"xp": new_xp, "level": new_level, "badges": badges}).eq("id", user_id).execute()
    except Exception:
        pass


@router.post("/session", status_code=201)
async def log_session(session: FocusSessionCreate, authorization: str = Header(...)):
    user_id = await get_user_id(authorization)
    supabase = get_supabase()
    res = supabase.table("focus_sessions").insert({
        "user_id": user_id,
        "duration_minutes": session.duration_minutes,
        "mode": session.mode,
        "subject": session.subject,
    }).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to log session")
    _award_xp(user_id, session.duration_minutes, supabase)
    return res.data[0]


@router.get("/sessions")
async def get_sessions(authorization: str = Header(...)):
    user_id = await get_user_id(authorization)
    supabase = get_supabase()
    res = supabase.table("focus_sessions").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(20).execute()
    return res.data
