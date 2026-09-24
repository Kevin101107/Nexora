from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.models.user import PublicUserProfile


class ProjectResourceCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)
    url: str = Field(..., min_length=1, max_length=500)
    category: str = Field("other", description="github, documentation, figma, deployment, other")
    description: Optional[str] = None


class ProjectResourceUpdate(BaseModel):
    title: Optional[str] = None
    url: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None


class ProjectResourceRead(BaseModel):
    id: str
    project_id: str
    title: str
    url: str
    category: str = "other"
    description: Optional[str] = None
    created_by: str
    creator: Optional[PublicUserProfile] = None
    created_at: Optional[datetime] = None
