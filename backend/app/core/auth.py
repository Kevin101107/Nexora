import base64
import hashlib
import hmac
import json
import secrets
import time
from typing import Optional, Dict, Any
from fastapi import HTTPException
from app.core.config import settings


def get_secret_key() -> str:
    return settings.jwt_secret_key


def get_token_expiry_seconds() -> int:
    return settings.jwt_expiry_seconds


def hash_password(password: str, salt: Optional[str] = None) -> tuple[str, str]:
    """Hashes password with PBKDF2-HMAC-SHA256 and unique salt."""
    if not salt:
        salt = secrets.token_hex(16)
    pwd_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        100_000,
    ).hex()
    return pwd_hash, salt


def verify_password(password: str, password_hash: str, salt: str) -> bool:
    """Verifies password using constant-time comparison."""
    computed_hash, _ = hash_password(password, salt)
    return hmac.compare_digest(computed_hash, password_hash)


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def _b64url_decode(data: str) -> bytes:
    padding = 4 - (len(data) % 4)
    if padding != 4:
        data += "=" * padding
    return base64.urlsafe_b64decode(data)


def create_access_token(user_id: str, username: Optional[str] = None, expires_in: Optional[int] = None) -> str:
    if expires_in is None:
        expires_in = get_token_expiry_seconds()
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": user_id,
        "username": username or "",
        "iat": int(time.time()),
        "exp": int(time.time() + expires_in),
    }

    hdr_bytes = json.dumps(header, separators=(",", ":")).encode("utf-8")
    payload_bytes = json.dumps(payload, separators=(",", ":")).encode("utf-8")

    part1 = _b64url_encode(hdr_bytes)
    part2 = _b64url_encode(payload_bytes)
    to_sign = f"{part1}.{part2}".encode("utf-8")

    sig = hmac.new(get_secret_key().encode("utf-8"), to_sign, hashlib.sha256).digest()
    part3 = _b64url_encode(sig)

    return f"{part1}.{part2}.{part3}"


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decodes and cryptographically verifies token."""
    parts = token.split(".")
    if len(parts) != 3:
        return None

    part1, part2, part3 = parts
    to_sign = f"{part1}.{part2}".encode("utf-8")
    expected_sig = hmac.new(get_secret_key().encode("utf-8"), to_sign, hashlib.sha256).digest()
    expected_part3 = _b64url_encode(expected_sig)

    if not hmac.compare_digest(part3, expected_part3):
        return None

    try:
        payload_bytes = _b64url_decode(part2)
        payload = json.loads(payload_bytes.decode("utf-8"))
        if payload.get("exp") and payload["exp"] < time.time():
            return None  # expired
        return payload
    except Exception:
        return None
