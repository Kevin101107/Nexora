from pydantic import BaseModel
from datetime import datetime


class FocusSessionCreate(BaseModel):
    duration_minutes: int
    mode: str = "focus_25"
    subject: str | None = None


class FocusSession(BaseModel):
    id: str
    user_id: str
    duration_minutes: int
    mode: str
    subject: str | None = None
    created_at: datetime
