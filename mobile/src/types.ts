export type User = {
  id: string;
  display_name?: string | null;
  username?: string | null;
  headline?: string | null;
  availability: string;
  skills: string[];
  roles: string[];
};

export type Project = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  members_count: number;
  open_roles_count: number;
  roles: { id: string; role_name: string; required_skills: string[] }[];
};

export type Recommendation = {
  role: { id: string; role_name: string; required_skills: string[] };
  project: { id: string; title: string; category: string };
  match: { score: number; score_label: string; evidence_quality: string; matched_skills: string[] };
};

export type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
};

export type NotificationResponse = { notifications: Notification[]; unread_count: number };
