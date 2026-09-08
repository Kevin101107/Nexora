from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from app.models.user import PublicUserProfile


class ProjectRoleCreate(BaseModel):
    role_name: str
    description: Optional[str] = None
    required_skills: List[str] = Field(default_factory=list)
    slots: int = Field(default=1, gt=0)


class ProjectRoleUpdate(BaseModel):
    role_name: Optional[str] = None
    description: Optional[str] = None
    required_skills: Optional[List[str]] = None
    slots: Optional[int] = Field(default=None, gt=0)
    status: Optional[str] = None


class ProjectRoleRead(BaseModel):
    id: str
    project_id: str
    role_name: str
    description: Optional[str] = None
    required_skills: List[str] = Field(default_factory=list)
    slots: int = 1
    filled_slots: int = 0
    status: str = "open"
    created_at: Optional[datetime] = None


class ProjectMemberRead(BaseModel):
    id: str
    project_id: str
    user_id: str
    role_id: Optional[str] = None
    member_role: str = "Member"
    joined_at: Optional[datetime] = None
    user: Optional[PublicUserProfile] = None
    role_name: Optional[str] = None


class ProjectCreate(BaseModel):
    title: str
    description: str
    category: str = "side_project"  # 'hackathon', 'side_project', 'research', 'startup'
    visibility: str = "public"      # 'public', 'private'
    roles: Optional[List[ProjectRoleCreate]] = None


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None    # 'recruiting', 'active', 'completed', 'archived'
    visibility: Optional[str] = None


class ProjectRead(BaseModel):
    id: str
    owner_id: str
    title: str
    description: str
    category: str
    status: str
    visibility: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    owner: Optional[PublicUserProfile] = None
    roles: List[ProjectRoleRead] = Field(default_factory=list)
    members: List[ProjectMemberRead] = Field(default_factory=list)
    members_count: int = 0
    open_roles_count: int = 0


class ProjectListItem(BaseModel):
    id: str
    owner_id: str
    title: str
    description: str
    category: str
    status: str
    visibility: str
    created_at: Optional[datetime] = None
    owner: Optional[PublicUserProfile] = None
    roles: List[ProjectRoleRead] = Field(default_factory=list)
    members_count: int = 0
    open_roles_count: int = 0
