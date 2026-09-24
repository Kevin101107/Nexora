import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any

TEAM_NOTIFICATION_TYPES = {
    "team_invitation_received",
    "team_invitation_accepted",
    "team_invitation_declined",
    "team_invitation_cancelled",
    "application_received",
    "application_accepted",
    "application_declined",
    "member_joined_project",
    "member_removed_project",
}

TASK_NOTIFICATION_TYPES = {
    "task_assigned",
    "task_reassigned",
    "task_unassigned",
    "task_status_changed",
    "task_completed",
}

MILESTONE_NOTIFICATION_TYPES = {
    "milestone_created",
    "milestone_updated",
    "milestone_completed",
}

PROJECT_NOTIFICATION_TYPES = {
    "project_role_filled",
    "project_role_reopened",
}


def get_notification_category(notif_type: str) -> Optional[str]:
    if notif_type in TEAM_NOTIFICATION_TYPES:
        return "team_updates"
    if notif_type in TASK_NOTIFICATION_TYPES:
        return "task_updates"
    if notif_type in MILESTONE_NOTIFICATION_TYPES:
        return "milestone_updates"
    if notif_type in PROJECT_NOTIFICATION_TYPES:
        return "project_updates"
    return None


def create_notification(
    database,
    user_id: str,
    type: str,
    title: str,
    message: str,
    actor_id: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    project_id: Optional[str] = None,
    action_url: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> Optional[Dict[str, Any]]:
    """
    Centralized helper to create notifications.
    Enforces:
    - Self-notification suppression (actor_id == user_id).
    - User preference checks (skips if category is disabled).
    - Deterministic event deduplication.
    """
    # 1. Suppress self-notification
    if actor_id and actor_id == user_id:
        return None

    # 2. Check user notification preferences
    category = get_notification_category(type)
    if category:
        try:
            pref_res = (
                database.table("notification_preferences")
                .select("*")
                .eq("user_id", user_id)
                .execute()
            )
            if pref_res.data and len(pref_res.data) > 0:
                user_prefs = pref_res.data[0]
                if not user_prefs.get(category, True):
                    # Category is disabled by the user
                    return None
        except Exception:
            pass

    # 3. Deduplication check
    try:
        existing_res = (
            database.table("notifications")
            .select("*")
            .eq("user_id", user_id)
            .eq("type", type)
            .execute()
        )
        existing_list = existing_res.data or []

        # Check for duplicate events
        for ex in existing_list:
            # If notification is for the same entity
            if entity_id and ex.get("entity_id") == entity_id:
                # For once-only events like task_completed or milestone_completed, don't notify again
                if type in ("task_completed", "milestone_completed"):
                    return None

                # For task assignments or status changes, skip if an unread notification with identical state exists
                if not ex.get("is_read", False):
                    ex_meta = ex.get("metadata") or {}
                    new_meta = metadata or {}
                    if type in ("task_assigned", "task_reassigned", "task_unassigned"):
                        return None
                    if type == "task_status_changed" and ex_meta.get("new_status") == new_meta.get("new_status"):
                        return None
                    if type in ("project_role_filled", "project_role_reopened"):
                        return None
                    if ex.get("title") == title and ex.get("message") == message:
                        return None
    except Exception:
        pass

    now_iso = datetime.now(timezone.utc).isoformat()
    notif_id = str(uuid.uuid4())
    record = {
        "id": notif_id,
        "user_id": user_id,
        "actor_id": actor_id,
        "type": type,
        "title": title,
        "message": message,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "project_id": project_id,
        "action_url": action_url,
        "metadata": metadata or {},
        "is_read": False,
        "created_at": now_iso,
        "read_at": None,
    }

    try:
        database.table("notifications").insert(record).execute()
    except Exception:
        return None

    return record
