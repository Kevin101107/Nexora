from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime
from app.models.user import PublicUserProfile


class TeammateRequestCreate(BaseModel):
    receiver_id: str
    project_id: Optional[str] = None
    message: Optional[str] = None


class TeammateRequestDecision(BaseModel):
    action: Literal["accepted", "declined"]


class TeammateRequestRead(BaseModel):
    id: str
    sender_id: str
    sender: Optional[PublicUserProfile] = None
    receiver_id: str
    receiver: Optional[PublicUserProfile] = None
    project_id: Optional[str] = None
    project_title: Optional[str] = None
    message: Optional[str] = None
    status: str  # 'pending', 'accepted', 'declined', 'cancelled'
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
