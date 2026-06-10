from pydantic import BaseModel
from typing import List


class UserProfile(BaseModel):
    id: str
    email: str
    display_name: str | None = None
    avatar_url: str | None = None
    xp: int = 0
    level: int = 1
    streak: int = 0
    badges: List[str] = []
    favourite_subjects: List[str] = []
    daily_goal_minutes: int = 60


class UserUpdate(BaseModel):
    display_name: str | None = None
    avatar_url: str | None = None
    favourite_subjects: List[str] | None = None
    daily_goal_minutes: int | None = None
