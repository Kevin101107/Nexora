from fastapi import HTTPException
from app.core.auth import decode_access_token
from app.core.config import settings


async def get_user_id(authorization: str) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Unauthorized")

    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Unauthorized")

    # 1. Try decoding as JWT token
    payload = decode_access_token(token)
    if payload and payload.get("sub"):
        return str(payload["sub"])

    # 2. If token contains '.', it was formatted as a JWT but failed verification or expired
    if "." in token:
        raise HTTPException(status_code=401, detail="Invalid or expired authentication token")

    # 3. In production, unverified raw tokens / fallback strings MUST NOT be accepted
    if settings.is_production:
        raise HTTPException(status_code=401, detail="Invalid or expired authentication token")

    # 4. Fallback only allowed in development/test environments for fixture convenience
    return token
