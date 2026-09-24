from typing import List, Optional
from pydantic import BaseModel, Field
from app.models.user import PublicUserProfile


class ContributionSummary(BaseModel):
    projects_joined: int = 0
    active_projects: int = 0
    completed_projects: int = 0
    tasks_assigned: int = 0
    tasks_completed: int = 0
    tasks_in_progress: int = 0
    task_completion_rate: float = 0.0
    milestones_contributed: int = 0
    roles_held: int = 0
    current_projects: int = 0


class ProjectContribution(BaseModel):
    project_id: str
    project_title: str
    project_status: str
    role_name: Optional[str] = None
    joined_at: Optional[str] = None
    left_at: Optional[str] = None
    tasks_assigned: int = 0
    tasks_completed: int = 0
    tasks_in_progress: int = 0
    completion_rate: float = 0.0
    milestones_contributed: int = 0
    last_activity_at: Optional[str] = None


class RoleContribution(BaseModel):
    project_id: str
    project_title: str
    role_id: Optional[str] = None
    role_name: str
    joined_at: Optional[str] = None
    left_at: Optional[str] = None
    membership_status: str = "active"


class RecentContribution(BaseModel):
    id: str
    project_id: str
    project_title: str
    action_type: str
    summary: str
    created_at: str


class CollaborationSignals(BaseModel):
    task_completion_rate: float = 0.0
    completed_projects: int = 0
    contribution_consistency: bool = False
    active_project_count: int = 0
    roles_contributed: int = 0
    total_completed_tasks: int = 0


class ContributionBadge(BaseModel):
    id: str
    name: str
    description: str
    criteria: str
    awarded: bool = False


class ContributionProfileResponse(BaseModel):
    user: PublicUserProfile
    summary: ContributionSummary
    projects: List[ProjectContribution] = Field(default_factory=list)
    roles: List[RoleContribution] = Field(default_factory=list)
    recent_activity: List[RecentContribution] = Field(default_factory=list)
    signals: CollaborationSignals
    badges: List[ContributionBadge] = Field(default_factory=list)
