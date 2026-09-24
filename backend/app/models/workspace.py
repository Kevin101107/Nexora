from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field
from app.models.user import PublicUserProfile

TaskStatus = Literal["todo", "in_progress", "done"]
TaskPriority = Literal["low", "medium", "high"]
MilestoneStatus = Literal["planned", "active", "completed"]


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    status: Optional[TaskStatus] = "todo"
    priority: Optional[TaskPriority] = "medium"
    assignee_id: Optional[str] = None
    milestone_id: Optional[str] = None
    due_date: Optional[str] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    assignee_id: Optional[str] = None
    milestone_id: Optional[str] = None
    due_date: Optional[str] = None


class TaskRead(BaseModel):
    id: str
    project_id: str
    title: str
    description: Optional[str] = None
    status: str
    priority: str
    assignee_id: Optional[str] = None
    assignee: Optional[PublicUserProfile] = None
    created_by: str
    completed_by: Optional[str] = None
    completed_at: Optional[str] = None
    milestone_id: Optional[str] = None
    milestone_title: Optional[str] = None
    due_date: Optional[str] = None
    created_at: str
    updated_at: str


class MilestoneCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    due_date: Optional[str] = None
    status: Optional[MilestoneStatus] = "planned"


class MilestoneUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    due_date: Optional[str] = None
    status: Optional[MilestoneStatus] = None


class MilestoneRead(BaseModel):
    id: str
    project_id: str
    title: str
    description: Optional[str] = None
    due_date: Optional[str] = None
    status: str
    created_by: str
    created_at: str
    updated_at: str
    total_tasks: int = 0
    completed_tasks: int = 0
    progress_percentage: float = 0.0


class ProjectProgressRead(BaseModel):
    total_tasks: int
    completed_tasks: int
    todo_tasks: int
    in_progress_tasks: int
    progress_percentage: float


class ProjectActivityRead(BaseModel):
    id: str
    project_id: str
    actor_id: str
    actor: Optional[PublicUserProfile] = None
    action_type: str
    entity_type: str
    entity_id: Optional[str] = None
    metadata: Dict[str, Any] = {}
    created_at: str


class WorkspaceMemberStats(BaseModel):
    user_id: str
    user: Optional[PublicUserProfile] = None
    member_role: str
    role_name: Optional[str] = None
    assigned_tasks_count: int = 0
    completed_tasks_count: int = 0


class WorkspaceOverviewRead(BaseModel):
    project_id: str
    title: str
    description: Optional[str] = None
    category: str
    status: str
    owner_id: str
    owner: Optional[PublicUserProfile] = None
    progress: ProjectProgressRead
    members: List[WorkspaceMemberStats]
    active_milestones: List[MilestoneRead]
    recent_activity: List[ProjectActivityRead]
    is_owner: bool
