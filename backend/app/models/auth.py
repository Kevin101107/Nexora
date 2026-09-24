from pydantic import BaseModel, Field
from typing import List, Optional
from app.models.user import UserProfileRead


class UserRegisterRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=120)
    password: str = Field(..., min_length=6, max_length=100)
    username: str = Field(..., min_length=3, max_length=30)
    display_name: str = Field(..., min_length=1, max_length=100)
    headline: Optional[str] = None
    bio: Optional[str] = None
    skills: List[str] = Field(default_factory=list)
    roles: List[str] = Field(default_factory=list)
    interests: List[str] = Field(default_factory=list)
    college: Optional[str] = None
    department: Optional[str] = None
    year: Optional[str] = None
    portfolio_url: Optional[str] = None
    experience_level: Optional[str] = "intermediate"
    availability: str = "open"


class UserLoginRequest(BaseModel):
    username_or_email: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfileRead


class DemoUserItem(BaseModel):
    id: str
    username: str
    display_name: str
    headline: Optional[str] = None
    role_summary: str
    primary_skills: List[str] = Field(default_factory=list)
