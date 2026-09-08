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
  availability: string;
  created_at?: string | null;
}

export interface UserProfileRead extends PublicUserProfile {
  email: string;
  updated_at?: string | null;
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

