import asyncio
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from app.core.supabase import get_supabase

router = APIRouter(prefix="/auth", tags=["auth"])


class AuthCredentials(BaseModel):
    email: str
    password: str


@router.post("/verify-token")
async def verify_token(authorization: str = Header(...)):
    token = authorization.removeprefix("Bearer ").strip()
    supabase = get_supabase()
    try:
        user = await asyncio.to_thread(supabase.auth.get_user, token)
        return {"valid": True, "user_id": user.user.id}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
