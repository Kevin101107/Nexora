from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from app.models.user import PublicUserProfile

class NotificationType(str, Enum):
    team_invitation_received = "team_invitation_received"
    team_invitation_accepted = "team_invitation_accepted"
    team_invitation_declined = "team_invitation_declined"
    team_invitation_cancelled = "team_invitation_cancelled"
    application_received = "application_received"
    application_accepted = "application_accepted"
    application_declined = "application_declined"
    member_joined_project = "member_joined_project"
    member_removed_project = "member_removed_project"
    task_assigned = "task_assigned"
    task_reassigned = "task_reassigned"
    task_unassigned = "task_unassigned"
    task_status_changed = "task_status_changed"
    task_completed = "task_completed"
    milestone_created = "milestone_created"
    milestone_updated = "milestone_updated"
    milestone_completed = "milestone_completed"
    project_role_filled = "project_role_filled"
    project_role_reopened = "project_role_reopened"


class NotificationRead(BaseModel):
    id: str
    user_id: str
    actor_id: Optional[str] = None
    actor: Optional[PublicUserProfile] = None
    type: str
    title: str
    message: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    project_id: Optional[str] = None
    action_url: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    is_read: bool = False
    created_at: str
    read_at: Optional[str] = None


class NotificationListResponse(BaseModel):
    notifications: List[NotificationRead]
    total: int
    unread_count: int


class UnreadCountResponse(BaseModel):
    unread_count: int


class NotificationPreferencesRead(BaseModel):
    user_id: str
    team_updates: bool = True
    task_updates: bool = True
    milestone_updates: bool = True
    project_updates: bool = True
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class NotificationPreferencesUpdate(BaseModel):
    team_updates: Optional[bool] = None
    task_updates: Optional[bool] = None
    milestone_updates: Optional[bool] = None
    project_updates: Optional[bool] = None
