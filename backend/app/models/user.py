from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class PublicUserProfile(BaseModel):
    id: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    username: Optional[str] = None
    headline: Optional[str] = None
    bio: Optional[str] = None
    skills: List[str] = Field(default_factory=list)
    roles: List[str] = Field(default_factory=list)
    interests: List[str] = Field(default_factory=list)
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    availability: str = "open"
    tasks_completed_count: Optional[int] = None
    completed_projects_count: Optional[int] = None
    created_at: Optional[datetime] = None


class UserProfileRead(BaseModel):
    id: str
    email: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    username: Optional[str] = None
    headline: Optional[str] = None
    bio: Optional[str] = None
    skills: List[str] = Field(default_factory=list)
    roles: List[str] = Field(default_factory=list)
    interests: List[str] = Field(default_factory=list)
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    availability: str = "open"
    tasks_completed_count: Optional[int] = None
    completed_projects_count: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# Backwards compatibility alias
UserProfile = UserProfileRead


class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    username: Optional[str] = None
    avatar_url: Optional[str] = None
    headline: Optional[str] = None
    bio: Optional[str] = None
    skills: Optional[List[str]] = None
    roles: Optional[List[str]] = None
    interests: Optional[List[str]] = None
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    availability: Optional[str] = None
