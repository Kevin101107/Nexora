export interface PublicUserProfile {
  id: string;
  display_name?: string | null;
  avatar_url?: string | null;
  username?: string | null;
  headline?: string | null;
  bio?: string | null;
  skills: string[];
  roles: string[];
  interests: string[];
  github_url?: string | null;
  linkedin_url?: string | null;
  college?: string | null;
  department?: string | null;
  year?: string | null;
  portfolio_url?: string | null;
  experience_level?: string | null;
  availability: string;
  tasks_completed_count?: number | null;
  completed_projects_count?: number | null;
  created_at?: string | null;
}

export interface UserProfileRead extends PublicUserProfile {
  email: string;
  updated_at?: string | null;
}

export interface ContributionSummary {
  projects_joined: number;
  active_projects: number;
  completed_projects: number;
  tasks_assigned: number;
  tasks_completed: number;
  tasks_in_progress: number;
  task_completion_rate: number;
  milestones_contributed: number;
  roles_held: number;
  current_projects: number;
}

export interface ProjectContribution {
  project_id: string;
  project_title: string;
  project_status: string;
  role_name?: string | null;
  joined_at?: string | null;
  left_at?: string | null;
  tasks_assigned: number;
  tasks_completed: number;
  tasks_in_progress: number;
  completion_rate: number;
  milestones_contributed: number;
  last_activity_at?: string | null;
}

export interface RoleContribution {
  project_id: string;
  project_title: string;
  role_id?: string | null;
  role_name: string;
  joined_at?: string | null;
  left_at?: string | null;
  membership_status: string;
}

export interface RecentContribution {
  id: string;
  project_id: string;
  project_title: string;
  action_type: string;
  summary: string;
  created_at: string;
}

export interface CollaborationSignals {
  task_completion_rate: number;
  completed_projects: number;
  contribution_consistency: boolean;
  active_project_count: number;
  roles_contributed: number;
  total_completed_tasks: number;
}

export interface ContributionBadge {
  id: string;
  name: string;
  description: string;
  criteria: string;
  awarded: boolean;
}

export interface ContributionProfileResponse {
  user: PublicUserProfile;
  summary: ContributionSummary;
  projects: ProjectContribution[];
  roles: RoleContribution[];
  recent_activity: RecentContribution[];
  signals: CollaborationSignals;
  badges: ContributionBadge[];
}

export interface ProjectRole {
  id: string;
  project_id: string;
  role_name: string;
  description?: string | null;
  required_skills: string[];
  slots: number;
  filled_slots: number;
  status: string;
  created_at?: string | null;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role_id?: string | null;
  member_role: string;
  joined_at?: string | null;
  user?: PublicUserProfile | null;
  role_name?: string | null;
}

export interface Project {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  visibility: string;
  created_at?: string | null;
  updated_at?: string | null;
  owner?: PublicUserProfile | null;
  roles: ProjectRole[];
  members: ProjectMember[];
  members_count: number;
  open_roles_count: number;
}

export interface ProjectResource {
  id: string;
  project_id: string;
  title: string;
  url: string;
  category: string;
  description?: string | null;
  created_by: string;
  creator?: PublicUserProfile | null;
  created_at?: string | null;
}

export interface ProjectListItem {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  visibility: string;
  created_at?: string | null;
  owner?: PublicUserProfile | null;
  roles: ProjectRole[];
  members_count: number;
  open_roles_count: number;
}

export interface ProjectApplication {
  id: string;
  project_id: string;
  project_title?: string | null;
  role_id?: string | null;
  role_name?: string | null;
  applicant_id: string;
  applicant?: PublicUserProfile | null;
  message?: string | null;
  status: "pending" | "accepted" | "rejected" | "withdrawn";
  match?: MatchScoreResult | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface TeammateRequest {
  id: string;
  sender_id: string;
  sender?: PublicUserProfile | null;
  receiver_id: string;
  receiver?: PublicUserProfile | null;
  project_id?: string | null;
  project_title?: string | null;
  role_id?: string | null;
  role_name?: string | null;
  message?: string | null;
  status: "pending" | "accepted" | "declined" | "cancelled";
  created_at?: string | null;
  updated_at?: string | null;
}

export interface UserTeam {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  owner_id: string;
  my_member_role: string;
  members_count: number;
  members: {
    id: string;
    user_id: string;
    member_role: string;
    role_name?: string | null;
    joined_at?: string | null;
    user?: PublicUserProfile | null;
  }[];
  created_at?: string | null;
}

export interface MatchScoreResult {
  score: number;
  skill_score: number;
  role_score: number;
  availability_score: number;
  matched_skills: string[];
  missing_skills: string[];
  role_match: boolean;
  availability_match: boolean;
  reasons: string[];
  evidence_quality: "high" | "medium" | "low";
  score_label: string;
  total_score?: number;
  role_experience_score?: number;
  reliability_score?: number;
  project_experience_score?: number;
  missing_requirements?: string[];
  version?: "v1" | "v2";
}

export interface UserRoleMatchResponse {
  user: PublicUserProfile;
  project: ProjectListItem;
  role: ProjectRole;
  match: MatchScoreResult;
}

export interface RoleCandidateMatch {
  user: PublicUserProfile;
  match: MatchScoreResult;
}

export interface UserRoleRecommendation {
  project: ProjectListItem;
  role: ProjectRole;
  match: MatchScoreResult;
}

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";
export type MilestoneStatus = "planned" | "active" | "completed";

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id?: string | null;
  assignee?: PublicUserProfile | null;
  created_by: string;
  milestone_id?: string | null;
  milestone_title?: string | null;
  due_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Milestone {
  id: string;
  project_id: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  status: MilestoneStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  total_tasks: number;
  completed_tasks: number;
  progress_percentage: number;
}

export interface ProjectProgress {
  total_tasks: number;
  completed_tasks: number;
  todo_tasks: number;
  in_progress_tasks: number;
  progress_percentage: number;
}

export interface ProjectActivity {
  id: string;
  project_id: string;
  actor_id: string;
  actor?: PublicUserProfile | null;
  action_type: string;
  entity_type: string;
  entity_id?: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export interface WorkspaceMemberStats {
  user_id: string;
  user?: PublicUserProfile | null;
  member_role: string;
  role_name?: string | null;
  assigned_tasks_count: number;
  completed_tasks_count: number;
}

export interface WorkspaceOverview {
  project_id: string;
  title: string;
  description?: string | null;
  category: string;
  status: string;
  owner_id: string;
  owner?: PublicUserProfile | null;
  progress: ProjectProgress;
  members: WorkspaceMemberStats[];
  active_milestones: Milestone[];
  recent_activity: ProjectActivity[];
  is_owner: boolean;
}

export type NotificationType =
  | "team_invitation_received"
  | "team_invitation_accepted"
  | "team_invitation_declined"
  | "team_invitation_cancelled"
  | "application_received"
  | "application_accepted"
  | "application_declined"
  | "member_joined_project"
  | "member_removed_project"
  | "task_assigned"
  | "task_reassigned"
  | "task_unassigned"
  | "task_status_changed"
  | "task_completed"
  | "milestone_created"
  | "milestone_updated"
  | "milestone_completed"
  | "project_role_filled"
  | "project_role_reopened";

export interface NotificationItem {
  id: string;
  user_id: string;
  actor_id?: string | null;
  actor?: PublicUserProfile | null;
  type: string;
  title: string;
  message: string;
  entity_type?: string | null;
  entity_id?: string | null;
  project_id?: string | null;
  action_url?: string | null;
  metadata: Record<string, any>;
  is_read: boolean;
  created_at: string;
  read_at?: string | null;
}

export interface NotificationListResponse {
  notifications: NotificationItem[];
  unread_count: number;
}

export interface UnreadCountResponse {
  unread_count: number;
}

export interface NotificationPreferences {
  user_id: string;
  team_updates: boolean;
  task_updates: boolean;
  milestone_updates: boolean;
  project_updates: boolean;
  created_at: string;
  updated_at: string;
}
