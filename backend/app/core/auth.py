import asyncio
from fastapi import HTTPException
from app.core.supabase import get_supabase


async def get_user_id(authorization: str) -> str:
    token = authorization.removeprefix("Bearer ").strip()
    supabase = get_supabase()
    try:
        user = await asyncio.to_thread(supabase.auth.get_user, token)
        return user.user.id
    except Exception:
        raise HTTPException(status_code=401, detail="Unauthorized")
