from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Header, Query, Response, status

from app.core.database import get_database
from app.core.identity import get_user_id
from app.core.notifications import (
    get_notification_category,
    TEAM_NOTIFICATION_TYPES,
    TASK_NOTIFICATION_TYPES,
    MILESTONE_NOTIFICATION_TYPES,
    PROJECT_NOTIFICATION_TYPES,
)
from app.models.user import PublicUserProfile
from app.models.notification import (
    NotificationRead,
    NotificationListResponse,
    UnreadCountResponse,
    NotificationPreferencesRead,
    NotificationPreferencesUpdate,
)

router = APIRouter(prefix="/notifications", tags=["notifications"])


def _fetch_user_public(user_id: Optional[str], database) -> Optional[PublicUserProfile]:
    if not user_id:
        return None
    try:
        res = (
            database.table("users")
            .select("id, display_name, avatar_url, username, headline, bio, skills, roles, interests, github_url, linkedin_url, availability, created_at")
            .eq("id", user_id)
            .execute()
        )
        if res.data and len(res.data) > 0:
            row = res.data[0]
            return PublicUserProfile(
                id=str(row["id"]),
                display_name=row.get("display_name"),
                avatar_url=row.get("avatar_url"),
                username=row.get("username"),
                headline=row.get("headline"),
                bio=row.get("bio"),
                skills=row.get("skills") or [],
                roles=row.get("roles") or [],
                interests=row.get("interests") or [],
                github_url=row.get("github_url"),
                linkedin_url=row.get("linkedin_url"),
                availability=row.get("availability") or "open",
                created_at=row.get("created_at"),
            )
    except Exception:
        pass
    return None


def _build_notification_read(row: dict, database) -> NotificationRead:
    actor = _fetch_user_public(row.get("actor_id"), database) if row.get("actor_id") else None
    return NotificationRead(
        id=str(row["id"]),
        user_id=str(row["user_id"]),
        actor_id=row.get("actor_id"),
        actor=actor,
        type=row["type"],
        title=row["title"],
        message=row["message"],
        entity_type=row.get("entity_type"),
        entity_id=row.get("entity_id"),
        project_id=row.get("project_id"),
        action_url=row.get("action_url"),
        metadata=row.get("metadata") or {},
        is_read=bool(row.get("is_read", False)),
        created_at=str(row.get("created_at", "")),
        read_at=row.get("read_at"),
    )


@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    filter: Optional[str] = Query("all", description="'all', 'unread', 'read'"),
    type: Optional[str] = Query(None, description="Optional notification type filter"),
    category: Optional[str] = Query(None, description="Optional category: team, tasks, milestones, projects"),
    authorization: str = Header(...),
):
    user_id = await get_user_id(authorization)
    database = get_database()

    # Query all notifications for this user
    res = (
        database.table("notifications")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    user_notifs = res.data or []

    # Calculate overall unread count for user
    unread_count = sum(1 for n in user_notifs if not n.get("is_read", False))

    # Apply filters
    filtered = user_notifs
    if filter == "unread":
        filtered = [n for n in filtered if not n.get("is_read", False)]
    elif filter == "read":
        filtered = [n for n in filtered if n.get("is_read", False)]

    if type:
        filtered = [n for n in filtered if n.get("type") == type]

    if category:
        cat_lower = category.lower()
        if cat_lower in ("team", "team_updates"):
            filtered = [n for n in filtered if n.get("type") in TEAM_NOTIFICATION_TYPES]
        elif cat_lower in ("tasks", "task", "task_updates"):
            filtered = [n for n in filtered if n.get("type") in TASK_NOTIFICATION_TYPES]
        elif cat_lower in ("milestones", "milestone", "milestone_updates"):
            filtered = [n for n in filtered if n.get("type") in MILESTONE_NOTIFICATION_TYPES]
        elif cat_lower in ("projects", "project", "project_updates"):
            filtered = [n for n in filtered if n.get("type") in PROJECT_NOTIFICATION_TYPES]

    items = [_build_notification_read(n, database) for n in filtered]
    return NotificationListResponse(
        notifications=items,
        total=len(items),
        unread_count=unread_count,
    )


@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(authorization: str = Header(...)):
    user_id = await get_user_id(authorization)
    database = get_database()

    res = (
        database.table("notifications")
        .select("*")
        .eq("user_id", user_id)
        .eq("is_read", False)
        .execute()
    )
    count = len(res.data or [])
    return UnreadCountResponse(unread_count=count)


@router.post("/read-all")
async def mark_all_read(authorization: str = Header(...)):
    user_id = await get_user_id(authorization)
    database = get_database()

    res = (
        database.table("notifications")
        .select("*")
        .eq("user_id", user_id)
        .eq("is_read", False)
        .execute()
    )
    unread_rows = res.data or []
    now_iso = datetime.now(timezone.utc).isoformat()

    for row in unread_rows:
        database.table("notifications").update({
            "is_read": True,
            "read_at": now_iso,
        }).eq("id", row["id"]).execute()

    return {"success": True, "marked_read": len(unread_rows)}


@router.delete("/read", status_code=status.HTTP_204_NO_CONTENT)
async def delete_read_notifications(authorization: str = Header(...)):
    user_id = await get_user_id(authorization)
    database = get_database()

    res = (
        database.table("notifications")
        .select("*")
        .eq("user_id", user_id)
        .eq("is_read", True)
        .execute()
    )
    read_rows = res.data or []
    for row in read_rows:
        database.table("notifications").delete().eq("id", row["id"]).execute()

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch("/{id}/read", response_model=NotificationRead)
async def mark_notification_read(id: str, authorization: str = Header(...)):
    user_id = await get_user_id(authorization)
    database = get_database()

    res = database.table("notifications").select("*").eq("id", id).execute()
    if not res.data or len(res.data) == 0:
        raise HTTPException(status_code=404, detail="Notification not found")

    notif = res.data[0]
    # Scope check: do not leak or allow updating other user's notification
    if notif.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Notification not found")

    # Idempotent read
    if not notif.get("is_read", False):
        now_iso = datetime.now(timezone.utc).isoformat()
        database.table("notifications").update({
            "is_read": True,
            "read_at": now_iso,
        }).eq("id", id).execute()
        notif["is_read"] = True
        notif["read_at"] = now_iso

    return _build_notification_read(notif, database)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification(id: str, authorization: str = Header(...)):
    user_id = await get_user_id(authorization)
    database = get_database()

    res = database.table("notifications").select("*").eq("id", id).execute()
    if not res.data or len(res.data) == 0:
        raise HTTPException(status_code=404, detail="Notification not found")

    notif = res.data[0]
    if notif.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Notification not found")

    database.table("notifications").delete().eq("id", id).execute()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ── Preferences ───────────────────────────────────────────────────────────────

@router.get("/preferences", response_model=NotificationPreferencesRead)
async def get_notification_preferences(authorization: str = Header(...)):
    user_id = await get_user_id(authorization)
    database = get_database()

    res = database.table("notification_preferences").select("*").eq("user_id", user_id).execute()
    if res.data and len(res.data) > 0:
        row = res.data[0]
        return NotificationPreferencesRead(
            user_id=user_id,
            team_updates=row.get("team_updates", True),
            task_updates=row.get("task_updates", True),
            milestone_updates=row.get("milestone_updates", True),
            project_updates=row.get("project_updates", True),
            created_at=row.get("created_at"),
            updated_at=row.get("updated_at"),
        )

    return NotificationPreferencesRead(user_id=user_id)


@router.patch("/preferences", response_model=NotificationPreferencesRead)
async def update_notification_preferences(
    payload: NotificationPreferencesUpdate,
    authorization: str = Header(...),
):
    user_id = await get_user_id(authorization)
    database = get_database()

    now_iso = datetime.now(timezone.utc).isoformat()
    res = database.table("notification_preferences").select("*").eq("user_id", user_id).execute()

    existing = res.data[0] if (res.data and len(res.data) > 0) else None

    updates = {}
    if payload.team_updates is not None:
        updates["team_updates"] = payload.team_updates
    if payload.task_updates is not None:
        updates["task_updates"] = payload.task_updates
    if payload.milestone_updates is not None:
        updates["milestone_updates"] = payload.milestone_updates
    if payload.project_updates is not None:
        updates["project_updates"] = payload.project_updates

    if existing:
        updates["updated_at"] = now_iso
        database.table("notification_preferences").update(updates).eq("user_id", user_id).execute()
        updated_row = {**existing, **updates}
    else:
        new_row = {
            "id": user_id,
            "user_id": user_id,
            "team_updates": payload.team_updates if payload.team_updates is not None else True,
            "task_updates": payload.task_updates if payload.task_updates is not None else True,
            "milestone_updates": payload.milestone_updates if payload.milestone_updates is not None else True,
            "project_updates": payload.project_updates if payload.project_updates is not None else True,
            "created_at": now_iso,
            "updated_at": now_iso,
        }
        database.table("notification_preferences").insert(new_row).execute()
        updated_row = new_row

    return NotificationPreferencesRead(
        user_id=user_id,
        team_updates=updated_row.get("team_updates", True),
        task_updates=updated_row.get("task_updates", True),
        milestone_updates=updated_row.get("milestone_updates", True),
        project_updates=updated_row.get("project_updates", True),
        created_at=updated_row.get("created_at"),
        updated_at=updated_row.get("updated_at"),
    )
