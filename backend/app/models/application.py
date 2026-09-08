from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime
from app.models.user import PublicUserProfile
from app.models.match import MatchScoreResult


class ProjectApplicationCreate(BaseModel):
    role_id: Optional[str] = None
    message: Optional[str] = None


class ProjectApplicationDecision(BaseModel):
    action: Literal["accepted", "rejected"]


class ProjectApplicationRead(BaseModel):
    id: str
    project_id: str
    project_title: Optional[str] = None
    role_id: Optional[str] = None
    role_name: Optional[str] = None
    applicant_id: str
    applicant: Optional[PublicUserProfile] = None
    message: Optional[str] = None
    status: str  # 'pending', 'accepted', 'rejected', 'withdrawn'
    match: Optional[MatchScoreResult] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
