from pydantic import BaseModel
from typing import List


class UserProfile(BaseModel):
    id: str
    email: str
    display_name: str | None = None
    avatar_url: str | None = None
    headline: str | None = None
    bio: str | None = None
    skills: List[str] = []
    roles: List[str] = []
    github_url: str | None = None
    linkedin_url: str | None = None
    availability: str | None = "open"


class UserUpdate(BaseModel):
    display_name: str | None = None
    avatar_url: str | None = None
    headline: str | None = None
    bio: str | None = None
    skills: List[str] | None = None
    roles: List[str] | None = None
    github_url: str | None = None
    linkedin_url: str | None = None
    availability: str | None = None
