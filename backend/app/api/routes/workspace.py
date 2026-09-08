import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Header, Query, Response, status

from app.core.database import get_database
from app.core.identity import get_user_id
from app.core.activity import record_activity
from app.core.notifications import create_notification
from app.models.notification import NotificationType
from app.models.user import PublicUserProfile
from app.models.workspace import (
    TaskCreate,
    TaskUpdate,
    TaskRead,
    MilestoneCreate,
    MilestoneUpdate,
    MilestoneRead,
    ProjectProgressRead,
    ProjectActivityRead,
    WorkspaceMemberStats,
    WorkspaceOverviewRead,
)

router = APIRouter(prefix="/projects", tags=["workspace"])


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


def verify_workspace_access(project_id: str, user_id: str, database) -> tuple[dict, bool]:
    """
    Verifies that the user is authorized to access the project workspace.
    Returns (project, is_owner).
    Raises 404 if project doesn't exist.
    Raises 403 if user is neither owner nor accepted squad member.
    """
    p_res = database.table("projects").select("*").eq("id", project_id).execute()
    if not p_res.data or len(p_res.data) == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    project = p_res.data[0]

    if project.get("owner_id") == user_id:
        return project, True

    m_res = (
        database.table("project_members")
        .select("*")
        .eq("project_id", project_id)
        .eq("user_id", user_id)
        .execute()
    )
    if m_res.data and len(m_res.data) > 0:
        return project, False

    raise HTTPException(status_code=403, detail="Not authorized to access this workspace")


def _is_squad_member(project_id: str, candidate_id: str, project: dict, database) -> bool:
    """Checks if a user is the owner or an accepted squad member of the project."""
    if project.get("owner_id") == candidate_id:
        return True
    m_res = (
        database.table("project_members")
        .select("id")
        .eq("project_id", project_id)
        .eq("user_id", candidate_id)
        .execute()
    )
    return bool(m_res.data and len(m_res.data) > 0)


def _build_task_read(t_row: dict, database) -> TaskRead:
    assignee = _fetch_user_public(t_row.get("assignee_id"), database) if t_row.get("assignee_id") else None
    milestone_title = None
    if t_row.get("milestone_id"):
        ms_res = database.table("milestones").select("title").eq("id", t_row["milestone_id"]).execute()
        if ms_res.data and len(ms_res.data) > 0:
            milestone_title = ms_res.data[0].get("title")

    # Legacy fallback for completed_by if task is done but completed_by is missing
    completed_by = t_row.get("completed_by")
    if completed_by is None and t_row.get("status") == "done":
        completed_by = t_row.get("assignee_id")

    return TaskRead(
        id=str(t_row["id"]),
        project_id=str(t_row["project_id"]),
        title=t_row["title"],
        description=t_row.get("description"),
        status=t_row.get("status", "todo"),
        priority=t_row.get("priority", "medium"),
        assignee_id=t_row.get("assignee_id"),
        assignee=assignee,
        created_by=str(t_row.get("created_by", "")),
        completed_by=completed_by,
        completed_at=t_row.get("completed_at"),
        milestone_id=t_row.get("milestone_id"),
        milestone_title=milestone_title,
        due_date=t_row.get("due_date"),
        created_at=str(t_row.get("created_at", "")),
        updated_at=str(t_row.get("updated_at", "")),
    )


def _calculate_progress(project_id: str, database) -> ProjectProgressRead:
    t_res = database.table("tasks").select("*").eq("project_id", project_id).execute()
    tasks = t_res.data or []
    total = len(tasks)
    completed = sum(1 for t in tasks if t.get("status") == "done")
    in_prog = sum(1 for t in tasks if t.get("status") == "in_progress")
    todo = sum(1 for t in tasks if t.get("status") == "todo")
    pct = round((completed / total) * 100.0, 1) if total > 0 else 0.0

    return ProjectProgressRead(
        total_tasks=total,
        completed_tasks=completed,
        in_progress_tasks=in_prog,
        todo_tasks=todo,
        progress_percentage=pct,
    )


def _build_milestone_read(m_row: dict, project_tasks: List[dict]) -> MilestoneRead:
    m_id = str(m_row["id"])
    m_tasks = [t for t in project_tasks if t.get("milestone_id") == m_id]
    total = len(m_tasks)
    completed = sum(1 for t in m_tasks if t.get("status") == "done")
    pct = round((completed / total) * 100.0, 1) if total > 0 else 0.0

    return MilestoneRead(
        id=m_id,
        project_id=str(m_row["project_id"]),
        title=m_row["title"],
        description=m_row.get("description"),
        due_date=m_row.get("due_date"),
        status=m_row.get("status", "planned"),
        created_by=str(m_row.get("created_by", "")),
        created_at=str(m_row.get("created_at", "")),
        updated_at=str(m_row.get("updated_at", "")),
        total_tasks=total,
        completed_tasks=completed,
        progress_percentage=pct,
    )


# ── Workspace Overview & Progress ─────────────────────────────────────────────

@router.get("/{id}/workspace", response_model=WorkspaceOverviewRead)
async def get_project_workspace(id: str, authorization: str = Header(...)):
    user_id = await get_user_id(authorization)
    database = get_database()
    project, is_owner = verify_workspace_access(id, user_id, database)

    # Fetch all project tasks
    t_res = database.table("tasks").select("*").eq("project_id", id).execute()
    all_tasks = t_res.data or []

    # Calculate overall progress
    progress = _calculate_progress(id, database)

    # Fetch owner profile
    owner_profile = _fetch_user_public(project["owner_id"], database)

    # Fetch squad members and build member stats
    m_res = database.table("project_members").select("*").eq("project_id", id).execute()
    member_rows = m_res.data or []

    # Fetch project roles for role title lookup
    r_res = database.table("project_roles").select("*").eq("project_id", id).execute()
    role_map = {str(r["id"]): r.get("role_name") for r in (r_res.data or [])}

    members_stats: List[WorkspaceMemberStats] = []
    seen_user_ids = set()

    # Ensure owner is in members list if not in project_members
    for m in member_rows:
        u_id = m.get("user_id")
        if not u_id or u_id in seen_user_ids:
            continue
        seen_user_ids.add(u_id)
        u_prof = _fetch_user_public(u_id, database)
        role_name = role_map.get(str(m.get("role_id"))) if m.get("role_id") else None
        m_tasks = [t for t in all_tasks if t.get("assignee_id") == u_id]
        members_stats.append(
            WorkspaceMemberStats(
                user_id=u_id,
                user=u_prof,
                member_role=m.get("member_role", "Member"),
                role_name=role_name,
                assigned_tasks_count=len(m_tasks),
                completed_tasks_count=sum(1 for t in m_tasks if t.get("status") == "done"),
            )
        )

    # If owner wasn't in project_members, prepend owner
    if project["owner_id"] not in seen_user_ids:
        owner_id = project["owner_id"]
        seen_user_ids.add(owner_id)
        m_tasks = [t for t in all_tasks if t.get("assignee_id") == owner_id]
        members_stats.insert(
            0,
            WorkspaceMemberStats(
                user_id=owner_id,
                user=owner_profile,
                member_role="Owner",
                role_name="Project Lead",
                assigned_tasks_count=len(m_tasks),
                completed_tasks_count=sum(1 for t in m_tasks if t.get("status") == "done"),
            ),
        )

    # Fetch milestones
    ms_res = database.table("milestones").select("*").eq("project_id", id).execute()
    milestone_rows = ms_res.data or []
    active_milestones = [_build_milestone_read(ms, all_tasks) for ms in milestone_rows]

    # Fetch recent activity
    act_res = database.table("project_activity").select("*").eq("project_id", id).order("created_at", desc=True).execute()
    recent_activity_rows = act_res.data or []
    recent_activity: List[ProjectActivityRead] = []
    for act in recent_activity_rows[:20]:
        actor_prof = _fetch_user_public(act.get("actor_id"), database)
        recent_activity.append(
            ProjectActivityRead(
                id=str(act["id"]),
                project_id=str(act["project_id"]),
                actor_id=str(act["actor_id"]),
                actor=actor_prof,
                action_type=act["action_type"],
                entity_type=act["entity_type"],
                entity_id=act.get("entity_id"),
                metadata=act.get("metadata") or {},
                created_at=str(act.get("created_at", "")),
            )
        )

    return WorkspaceOverviewRead(
        project_id=id,
        title=project["title"],
        description=project.get("description"),
        category=project.get("category", "side_project"),
        status=project.get("status", "active"),
        owner_id=project["owner_id"],
        owner=owner_profile,
        progress=progress,
        members=members_stats,
        active_milestones=active_milestones,
        recent_activity=recent_activity,
        is_owner=is_owner,
    )


@router.get("/{id}/progress", response_model=ProjectProgressRead)
async def get_project_progress(id: str, authorization: str = Header(...)):
    user_id = await get_user_id(authorization)
    database = get_database()
    verify_workspace_access(id, user_id, database)
    return _calculate_progress(id, database)


# ── Tasks Management ──────────────────────────────────────────────────────────

@router.get("/{id}/tasks", response_model=List[TaskRead])
async def list_project_tasks(
    id: str,
    milestone_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    assignee_id: Optional[str] = Query(None),
    authorization: str = Header(...),
):
    user_id = await get_user_id(authorization)
    database = get_database()
    verify_workspace_access(id, user_id, database)

    query = database.table("tasks").select("*").eq("project_id", id)
    if milestone_id:
        query = query.eq("milestone_id", milestone_id)
    if status:
        query = query.eq("status", status)
    if assignee_id:
        query = query.eq("assignee_id", assignee_id)

    res = query.order("created_at", desc=False).execute()
    tasks = res.data or []
    return [_build_task_read(t, database) for t in tasks]


@router.post("/{id}/tasks", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
async def create_project_task(
    id: str,
    payload: TaskCreate,
    authorization: str = Header(...),
):
    user_id = await get_user_id(authorization)
    database = get_database()
    project, is_owner = verify_workspace_access(id, user_id, database)

    if not is_owner:
        raise HTTPException(status_code=403, detail="Only project owner can create tasks")

    # Validate assignee is a squad member if specified
    if payload.assignee_id:
        if not _is_squad_member(id, payload.assignee_id, project, database):
            raise HTTPException(status_code=400, detail="Cannot assign task to user who is not a squad member")

    # Validate milestone belongs to this project if specified
    if payload.milestone_id:
        ms_res = database.table("milestones").select("*").eq("id", payload.milestone_id).execute()
        if not ms_res.data or ms_res.data[0].get("project_id") != id:
            raise HTTPException(status_code=400, detail="Milestone does not belong to this project")

    task_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()
    is_done = (payload.status == "done")
    task_row = {
        "id": task_id,
        "project_id": id,
        "title": payload.title.strip(),
        "description": payload.description.strip() if payload.description else None,
        "status": payload.status or "todo",
        "priority": payload.priority or "medium",
        "assignee_id": payload.assignee_id,
        "created_by": user_id,
        "completed_by": (payload.assignee_id or user_id) if is_done else None,
        "completed_at": now_iso if is_done else None,
        "milestone_id": payload.milestone_id,
        "due_date": payload.due_date,
        "created_at": now_iso,
        "updated_at": now_iso,
    }

    try:
        database.table("tasks").insert(task_row).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create task: {str(e)}")

    # Record activity
    record_activity(
        database,
        project_id=id,
        actor_id=user_id,
        action_type="task_created",
        entity_type="task",
        entity_id=task_id,
        metadata={"task_title": task_row["title"], "status": task_row["status"], "priority": task_row["priority"]},
    )

    if payload.assignee_id:
        assignee_u = _fetch_user_public(payload.assignee_id, database)
        assignee_name = assignee_u.display_name if assignee_u else payload.assignee_id
        record_activity(
            database,
            project_id=id,
            actor_id=user_id,
            action_type="task_assigned",
            entity_type="task",
            entity_id=task_id,
            metadata={"task_title": task_row["title"], "assignee_id": payload.assignee_id, "assignee_name": assignee_name},
        )
        create_notification(
            database,
            user_id=payload.assignee_id,
            type=NotificationType.task_assigned.value,
            title=f"New task assigned: {task_row['title']}",
            message=f"You were assigned '{task_row['title']}' in {project.get('title', 'the project')}.",
            actor_id=user_id,
            entity_type="task",
            entity_id=task_id,
            project_id=id,
            action_url=f"/projects/{id}/workspace",
            metadata={"task_title": task_row["title"], "project_title": project.get("title")},
        )

    return _build_task_read(task_row, database)


@router.get("/{id}/tasks/{task_id}", response_model=TaskRead)
async def get_project_task(
    id: str,
    task_id: str,
    authorization: str = Header(...),
):
    user_id = await get_user_id(authorization)
    database = get_database()
    verify_workspace_access(id, user_id, database)

    t_res = database.table("tasks").select("*").eq("id", task_id).eq("project_id", id).execute()
    if not t_res.data or len(t_res.data) == 0:
        raise HTTPException(status_code=404, detail="Task not found")

    return _build_task_read(t_res.data[0], database)


@router.patch("/{id}/tasks/{task_id}", response_model=TaskRead)
async def update_project_task(
    id: str,
    task_id: str,
    payload: TaskUpdate,
    authorization: str = Header(...),
):
    user_id = await get_user_id(authorization)
    database = get_database()
    project, is_owner = verify_workspace_access(id, user_id, database)

    t_res = database.table("tasks").select("*").eq("id", task_id).eq("project_id", id).execute()
    if not t_res.data or len(t_res.data) == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    existing_task = t_res.data[0]

    # Authorization rules for updating task:
    if not is_owner:
        # Squad member can only update task assigned to them
        if existing_task.get("assignee_id") != user_id:
            raise HTTPException(status_code=403, detail="Squad members can only update tasks assigned to them")

        # Squad member can only modify task status
        for field in payload.model_fields_set:
            if field != "status":
                val = getattr(payload, field)
                if val != existing_task.get(field):
                    raise HTTPException(status_code=403, detail="Squad members can only update task status")
    else:
        # Owner validation:
        if "assignee_id" in payload.model_fields_set and payload.assignee_id:
            if not _is_squad_member(id, payload.assignee_id, project, database):
                raise HTTPException(status_code=400, detail="Cannot assign task to user who is not a squad member")
        if "milestone_id" in payload.model_fields_set and payload.milestone_id:
            ms_res = database.table("milestones").select("*").eq("id", payload.milestone_id).execute()
            if not ms_res.data or ms_res.data[0].get("project_id") != id:
                raise HTTPException(status_code=400, detail="Milestone does not belong to this project")

    now_iso = datetime.now(timezone.utc).isoformat()
    updates = {"updated_at": now_iso}
    for field in payload.model_fields_set:
        val = getattr(payload, field)
        if field == "title" and val is not None:
            updates["title"] = val.strip()
        elif field == "description":
            updates["description"] = val.strip() if val else None
        elif field in ("status", "priority", "due_date"):
            updates[field] = val
        elif field in ("assignee_id", "milestone_id"):
            updates[field] = val if val else None

    # Handle completion attribution
    old_status = existing_task.get("status")
    new_status = updates.get("status")
    if new_status and new_status != old_status:
        if new_status == "done":
            updates["completed_by"] = existing_task.get("assignee_id") or user_id
            updates["completed_at"] = now_iso
        elif old_status == "done":
            updates["completed_by"] = None
            updates["completed_at"] = None

    try:
        database.table("tasks").update(updates).eq("id", task_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update task: {str(e)}")

    updated_task = {**existing_task, **updates}

    # Record activity & send notifications
    old_status = existing_task.get("status")
    new_status = updates.get("status")
    task_title = updated_task.get("title", "Task")
    project_title = project.get("title", "the project")

    if new_status and new_status != old_status:
        record_activity(
            database,
            project_id=id,
            actor_id=user_id,
            action_type="task_status_changed",
            entity_type="task",
            entity_id=task_id,
            metadata={"task_title": task_title, "old_status": old_status, "new_status": new_status},
        )
        if user_id != project.get("owner_id"):
            create_notification(
                database,
                user_id=project["owner_id"],
                type=NotificationType.task_status_changed.value,
                title=f"Task status updated: {task_title}",
                message=f"Task '{task_title}' status changed to {new_status} in {project_title}.",
                actor_id=user_id,
                entity_type="task",
                entity_id=task_id,
                project_id=id,
                action_url=f"/projects/{id}/workspace",
                metadata={"task_title": task_title, "old_status": old_status, "new_status": new_status, "project_title": project_title},
            )

        if new_status == "done":
            record_activity(
                database,
                project_id=id,
                actor_id=user_id,
                action_type="task_completed",
                entity_type="task",
                entity_id=task_id,
                metadata={"task_title": task_title},
            )
            if user_id != project.get("owner_id") and old_status != "done":
                create_notification(
                    database,
                    user_id=project["owner_id"],
                    type=NotificationType.task_completed.value,
                    title=f"Task completed: {task_title}",
                    message=f"Task '{task_title}' was marked as complete in {project_title}.",
                    actor_id=user_id,
                    entity_type="task",
                    entity_id=task_id,
                    project_id=id,
                    action_url=f"/projects/{id}/workspace",
                    metadata={"task_title": task_title, "project_title": project_title},
                )

    old_assignee = existing_task.get("assignee_id")
    if "assignee_id" in updates:
        new_assignee = updates.get("assignee_id")
        if new_assignee != old_assignee:
            if new_assignee:
                assignee_u = _fetch_user_public(new_assignee, database)
                assignee_name = assignee_u.display_name if assignee_u else new_assignee
                record_activity(
                    database,
                    project_id=id,
                    actor_id=user_id,
                    action_type="task_assigned",
                    entity_type="task",
                    entity_id=task_id,
                    metadata={"task_title": task_title, "assignee_id": new_assignee, "assignee_name": assignee_name},
                )
                notif_type = NotificationType.task_reassigned.value if old_assignee else NotificationType.task_assigned.value
                notif_title = f"Task reassigned: {task_title}" if old_assignee else f"New task assigned: {task_title}"
                create_notification(
                    database,
                    user_id=new_assignee,
                    type=notif_type,
                    title=notif_title,
                    message=f"You were assigned '{task_title}' in {project_title}.",
                    actor_id=user_id,
                    entity_type="task",
                    entity_id=task_id,
                    project_id=id,
                    action_url=f"/projects/{id}/workspace",
                    metadata={"task_title": task_title, "project_title": project_title},
                )
            if old_assignee:
                create_notification(
                    database,
                    user_id=old_assignee,
                    type=NotificationType.task_unassigned.value,
                    title=f"Task unassigned: {task_title}",
                    message=f"You were unassigned from '{task_title}' in {project_title}.",
                    actor_id=user_id,
                    entity_type="task",
                    entity_id=task_id,
                    project_id=id,
                    action_url=f"/projects/{id}/workspace",
                    metadata={"task_title": task_title, "project_title": project_title},
                )

    return _build_task_read(updated_task, database)


@router.delete("/{id}/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project_task(
    id: str,
    task_id: str,
    authorization: str = Header(...),
):
    user_id = await get_user_id(authorization)
    database = get_database()
    project, is_owner = verify_workspace_access(id, user_id, database)

    if not is_owner:
        raise HTTPException(status_code=403, detail="Only project owner can delete tasks")

    t_res = database.table("tasks").select("*").eq("id", task_id).eq("project_id", id).execute()
    if not t_res.data or len(t_res.data) == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    task = t_res.data[0]

    try:
        database.table("tasks").delete().eq("id", task_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete task: {str(e)}")

    record_activity(
        database,
        project_id=id,
        actor_id=user_id,
        action_type="task_deleted",
        entity_type="task",
        entity_id=task_id,
        metadata={"task_title": task.get("title")},
    )

    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ── Milestones Management ─────────────────────────────────────────────────────

@router.get("/{id}/milestones", response_model=List[MilestoneRead])
async def list_project_milestones(
    id: str,
    authorization: str = Header(...),
):
    user_id = await get_user_id(authorization)
    database = get_database()
    verify_workspace_access(id, user_id, database)

    ms_res = database.table("milestones").select("*").eq("project_id", id).order("created_at", desc=False).execute()
    milestone_rows = ms_res.data or []

    t_res = database.table("tasks").select("*").eq("project_id", id).execute()
    all_tasks = t_res.data or []

    return [_build_milestone_read(ms, all_tasks) for ms in milestone_rows]


@router.post("/{id}/milestones", response_model=MilestoneRead, status_code=status.HTTP_201_CREATED)
async def create_project_milestone(
    id: str,
    payload: MilestoneCreate,
    authorization: str = Header(...),
):
    user_id = await get_user_id(authorization)
    database = get_database()
    project, is_owner = verify_workspace_access(id, user_id, database)

    if not is_owner:
        raise HTTPException(status_code=403, detail="Only project owner can create milestones")

    ms_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()
    ms_row = {
        "id": ms_id,
        "project_id": id,
        "title": payload.title.strip(),
        "description": payload.description.strip() if payload.description else None,
        "due_date": payload.due_date,
        "status": payload.status or "planned",
        "created_by": user_id,
        "created_at": now_iso,
        "updated_at": now_iso,
    }

    try:
        database.table("milestones").insert(ms_row).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create milestone: {str(e)}")

    record_activity(
        database,
        project_id=id,
        actor_id=user_id,
        action_type="milestone_created",
        entity_type="milestone",
        entity_id=ms_id,
        metadata={"milestone_title": ms_row["title"]},
    )

    project_title = project.get("title", "the project")
    m_res = database.table("project_members").select("user_id").eq("project_id", id).execute()
    squad_members = [m["user_id"] for m in (m_res.data or []) if m.get("user_id")]
    for member_uid in squad_members:
        create_notification(
            database,
            user_id=member_uid,
            type=NotificationType.milestone_created.value,
            title=f"New milestone: {ms_row['title']}",
            message=f"A new milestone '{ms_row['title']}' was added to {project_title}.",
            actor_id=user_id,
            entity_type="milestone",
            entity_id=ms_id,
            project_id=id,
            action_url=f"/projects/{id}/workspace",
            metadata={"milestone_title": ms_row["title"], "project_title": project_title},
        )

    return MilestoneRead(
        id=ms_id,
        project_id=id,
        title=ms_row["title"],
        description=ms_row["description"],
        due_date=ms_row["due_date"],
        status=ms_row["status"],
        created_by=user_id,
        created_at=now_iso,
        updated_at=now_iso,
        total_tasks=0,
        completed_tasks=0,
        progress_percentage=0.0,
    )


@router.patch("/{id}/milestones/{milestone_id}", response_model=MilestoneRead)
async def update_project_milestone(
    id: str,
    milestone_id: str,
    payload: MilestoneUpdate,
    authorization: str = Header(...),
):
    user_id = await get_user_id(authorization)
    database = get_database()
    project, is_owner = verify_workspace_access(id, user_id, database)

    if not is_owner:
        raise HTTPException(status_code=403, detail="Only project owner can update milestones")

    ms_res = database.table("milestones").select("*").eq("id", milestone_id).eq("project_id", id).execute()
    if not ms_res.data or len(ms_res.data) == 0:
        raise HTTPException(status_code=404, detail="Milestone not found")
    existing_ms = ms_res.data[0]

    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
    for field in payload.model_fields_set:
        val = getattr(payload, field)
        if field == "title" and val is not None:
            updates["title"] = val.strip()
        elif field == "description":
            updates["description"] = val.strip() if val else None
        elif field in ("due_date", "status"):
            updates[field] = val

    try:
        database.table("milestones").update(updates).eq("id", milestone_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update milestone: {str(e)}")

    updated_ms = {**existing_ms, **updates}

    record_activity(
        database,
        project_id=id,
        actor_id=user_id,
        action_type="milestone_updated",
        entity_type="milestone",
        entity_id=milestone_id,
        metadata={"milestone_title": updated_ms["title"], "status": updated_ms.get("status")},
    )

    project_title = project.get("title", "the project")
    old_ms_status = existing_ms.get("status")
    new_ms_status = updates.get("status", old_ms_status)
    old_due = existing_ms.get("due_date")
    new_due = updates.get("due_date", old_due)

    status_changed = "status" in updates and new_ms_status != old_ms_status
    due_changed = "due_date" in updates and new_due != old_due

    m_res = database.table("project_members").select("user_id").eq("project_id", id).execute()
    squad_members = [m["user_id"] for m in (m_res.data or []) if m.get("user_id")]

    if updates.get("status") == "completed" and existing_ms.get("status") != "completed":
        record_activity(
            database,
            project_id=id,
            actor_id=user_id,
            action_type="milestone_completed",
            entity_type="milestone",
            entity_id=milestone_id,
            metadata={"milestone_title": updated_ms["title"]},
        )
        for member_uid in squad_members:
            create_notification(
                database,
                user_id=member_uid,
                type=NotificationType.milestone_completed.value,
                title=f"Milestone completed: {updated_ms['title']}",
                message=f"Milestone '{updated_ms['title']}' was marked as completed in {project_title}.",
                actor_id=user_id,
                entity_type="milestone",
                entity_id=milestone_id,
                project_id=id,
                action_url=f"/projects/{id}/workspace",
                metadata={"milestone_title": updated_ms["title"], "project_title": project_title},
            )
    elif status_changed or due_changed:
        for member_uid in squad_members:
            create_notification(
                database,
                user_id=member_uid,
                type=NotificationType.milestone_updated.value,
                title=f"Milestone updated: {updated_ms['title']}",
                message=f"Milestone '{updated_ms['title']}' was updated in {project_title}.",
                actor_id=user_id,
                entity_type="milestone",
                entity_id=milestone_id,
                project_id=id,
                action_url=f"/projects/{id}/workspace",
                metadata={"milestone_title": updated_ms["title"], "project_title": project_title},
            )

    t_res = database.table("tasks").select("*").eq("project_id", id).execute()
    all_tasks = t_res.data or []

    return _build_milestone_read(updated_ms, all_tasks)


@router.delete("/{id}/milestones/{milestone_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project_milestone(
    id: str,
    milestone_id: str,
    authorization: str = Header(...),
):
    user_id = await get_user_id(authorization)
    database = get_database()
    project, is_owner = verify_workspace_access(id, user_id, database)

    if not is_owner:
        raise HTTPException(status_code=403, detail="Only project owner can delete milestones")

    ms_res = database.table("milestones").select("*").eq("id", milestone_id).eq("project_id", id).execute()
    if not ms_res.data or len(ms_res.data) == 0:
        raise HTTPException(status_code=404, detail="Milestone not found")

    # Detach tasks referencing this milestone
    try:
        tasks = database.table("tasks").select("*").eq("project_id", id).eq("milestone_id", milestone_id).execute().data or []
        for t in tasks:
            database.table("tasks").update({"milestone_id": None}).eq("id", t["id"]).execute()
    except Exception:
        pass

    try:
        database.table("milestones").delete().eq("id", milestone_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete milestone: {str(e)}")

    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ── Activity Feed ─────────────────────────────────────────────────────────────

@router.get("/{id}/activity", response_model=List[ProjectActivityRead])
async def list_project_activity(
    id: str,
    authorization: str = Header(...),
):
    user_id = await get_user_id(authorization)
    database = get_database()
    verify_workspace_access(id, user_id, database)

    act_res = database.table("project_activity").select("*").eq("project_id", id).order("created_at", desc=True).execute()
    rows = act_res.data or []

    results: List[ProjectActivityRead] = []
    for act in rows:
        actor_prof = _fetch_user_public(act.get("actor_id"), database)
        results.append(
            ProjectActivityRead(
                id=str(act["id"]),
                project_id=str(act["project_id"]),
                actor_id=str(act["actor_id"]),
                actor=actor_prof,
                action_type=act["action_type"],
                entity_type=act["entity_type"],
                entity_id=act.get("entity_id"),
                metadata=act.get("metadata") or {},
                created_at=str(act.get("created_at", "")),
            )
        )

    return results
