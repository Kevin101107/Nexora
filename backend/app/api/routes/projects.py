import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Header, Query, Response, status
from app.models.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectRead,
    ProjectListItem,
    ProjectRoleCreate,
    ProjectRoleUpdate,
    ProjectRoleRead,
    ProjectMemberRead,
)
from app.models.user import PublicUserProfile
from app.core.database import get_database
from app.core.identity import get_user_id
from app.core.activity import record_activity
from app.core.notifications import create_notification

router = APIRouter(prefix="/projects", tags=["projects"])


def _fetch_user_public(user_id: str, database) -> Optional[PublicUserProfile]:
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


def _build_project_read(p_row: dict, database) -> ProjectRead:
    project_id = str(p_row["id"])
    owner = _fetch_user_public(p_row["owner_id"], database)

    # Fetch roles
    roles: List[ProjectRoleRead] = []
    try:
        r_res = database.table("project_roles").select("*").eq("project_id", project_id).execute()
        if r_res.data:
            for r in r_res.data:
                roles.append(
                    ProjectRoleRead(
                        id=str(r["id"]),
                        project_id=project_id,
                        role_name=r["role_name"],
                        description=r.get("description"),
                        required_skills=r.get("required_skills") or [],
                        slots=r.get("slots", 1),
                        filled_slots=r.get("filled_slots", 0),
                        status=r.get("status", "open"),
                        created_at=r.get("created_at"),
                    )
                )
    except Exception:
        pass

    # Fetch members
    members: List[ProjectMemberRead] = []
    role_map = {r.id: r.role_name for r in roles}
    try:
        m_res = database.table("project_members").select("*").eq("project_id", project_id).execute()
        if m_res.data:
            for m in m_res.data:
                u_profile = _fetch_user_public(m["user_id"], database)
                rid = str(m["role_id"]) if m.get("role_id") else None
                members.append(
                    ProjectMemberRead(
                        id=str(m["id"]),
                        project_id=project_id,
                        user_id=str(m["user_id"]),
                        role_id=rid,
                        member_role=m.get("member_role", "Member"),
                        joined_at=m.get("joined_at"),
                        user=u_profile,
                        role_name=role_map.get(rid) if rid else ("Team Lead" if m.get("member_role") == "Owner" else None),
                    )
                )
    except Exception:
        pass

    open_roles = sum(1 for r in roles if r.status == "open" and r.filled_slots < r.slots)

    return ProjectRead(
        id=project_id,
        owner_id=str(p_row["owner_id"]),
        title=p_row["title"],
        description=p_row["description"],
        category=p_row.get("category", "side_project"),
        status=p_row.get("status", "recruiting"),
        visibility=p_row.get("visibility", "public"),
        created_at=p_row.get("created_at"),
        updated_at=p_row.get("updated_at"),
        owner=owner,
        roles=roles,
        members=members,
        members_count=len(members),
        open_roles_count=open_roles,
    )


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
async def create_project(payload: ProjectCreate, authorization: str = Header(...)):
    user_id = await get_user_id(authorization)
    database = get_database()

    proj_id = str(uuid.uuid4())
    proj_row = {
        "id": proj_id,
        "owner_id": user_id,
        "title": payload.title.strip(),
        "description": payload.description.strip(),
        "category": payload.category,
        "status": "recruiting",
        "visibility": payload.visibility,
    }

    try:
        database.table("projects").insert(proj_row).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create project: {str(e)}")

    # Add owner as member with 'Owner' role
    member_id = str(uuid.uuid4())
    try:
        database.table("project_members").insert({
            "id": member_id,
            "project_id": proj_id,
            "user_id": user_id,
            "member_role": "Owner",
        }).execute()
        database.table("project_membership_history").insert({
            "id": str(uuid.uuid4()),
            "project_id": proj_id,
            "user_id": user_id,
            "role_id": None,
            "role_name": "Project Owner",
            "joined_at": datetime.now(timezone.utc).isoformat(),
            "left_at": None,
            "status": "active",
        }).execute()
    except Exception:
        pass

    # Insert initial roles if provided
    if payload.roles:
        for r in payload.roles:
            try:
                database.table("project_roles").insert({
                    "id": str(uuid.uuid4()),
                    "project_id": proj_id,
                    "role_name": r.role_name.strip(),
                    "description": r.description,
                    "required_skills": r.required_skills,
                    "slots": r.slots,
                    "filled_slots": 0,
                    "status": "open",
                }).execute()
            except Exception:
                pass

    return _build_project_read(proj_row, database)


@router.get("", response_model=List[ProjectListItem])
async def list_projects(
    q: Optional[str] = Query(None, description="Search term for title or description"),
    category: Optional[str] = Query(None, description="Filter by category"),
    status: Optional[str] = Query(None, description="Filter by status"),
):
    database = get_database()
    try:
        query = database.table("projects").select("*").eq("visibility", "public")
        if status and status != "all":
            query = query.eq("status", status)
        if category and category != "all":
            query = query.eq("category", category)
        res = query.order("created_at", desc=True).execute()
        rows = res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch projects: {str(e)}")

    # In-memory keyword filtering
    if q:
        q_lower = q.lower().strip()
        rows = [
            r for r in rows
            if q_lower in r.get("title", "").lower() or q_lower in r.get("description", "").lower()
        ]

    items: List[ProjectListItem] = []
    for r in rows:
        proj_id = str(r["id"])
        owner = _fetch_user_public(r["owner_id"], database)
        # Fetch roles
        roles: List[ProjectRoleRead] = []
        try:
            r_res = database.table("project_roles").select("*").eq("project_id", proj_id).execute()
            if r_res.data:
                for ro in r_res.data:
                    roles.append(
                        ProjectRoleRead(
                            id=str(ro["id"]),
                            project_id=proj_id,
                            role_name=ro["role_name"],
                            description=ro.get("description"),
                            required_skills=ro.get("required_skills") or [],
                            slots=ro.get("slots", 1),
                            filled_slots=ro.get("filled_slots", 0),
                            status=ro.get("status", "open"),
                            created_at=ro.get("created_at"),
                        )
                    )
        except Exception:
            pass

        # Member count
        members_count = 1
        try:
            m_res = database.table("project_members").select("id", count="exact").eq("project_id", proj_id).execute()
            if m_res.count is not None:
                members_count = m_res.count
            elif m_res.data:
                members_count = len(m_res.data)
        except Exception:
            pass

        open_roles = sum(1 for ro in roles if ro.status == "open" and ro.filled_slots < ro.slots)

        items.append(
            ProjectListItem(
                id=proj_id,
                owner_id=str(r["owner_id"]),
                title=r["title"],
                description=r["description"],
                category=r.get("category", "side_project"),
                status=r.get("status", "recruiting"),
                visibility=r.get("visibility", "public"),
                created_at=r.get("created_at"),
                owner=owner,
                roles=roles,
                members_count=members_count,
                open_roles_count=open_roles,
            )
        )

    return items


@router.get("/{id}", response_model=ProjectRead)
async def get_project(id: str, authorization: Optional[str] = Header(None)):
    database = get_database()
    try:
        res = database.table("projects").select("*").eq("id", id).execute()
        if not res.data or len(res.data) == 0:
            raise HTTPException(status_code=404, detail="Project not found")
        row = res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch project: {str(e)}")

    if row.get("visibility") == "private":
        if not authorization:
            raise HTTPException(status_code=403, detail="Private project requires authorization")
        user_id = await get_user_id(authorization)
        if row["owner_id"] != user_id:
            # Check membership
            m_res = database.table("project_members").select("id").eq("project_id", id).eq("user_id", user_id).execute()
            if not m_res.data or len(m_res.data) == 0:
                raise HTTPException(status_code=403, detail="Not authorized to view this private project")

    return _build_project_read(row, database)


@router.patch("/{id}", response_model=ProjectRead)
async def update_project(id: str, payload: ProjectUpdate, authorization: str = Header(...)):
    user_id = await get_user_id(authorization)
    database = get_database()

    res = database.table("projects").select("*").eq("id", id).execute()
    if not res.data or len(res.data) == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    proj = res.data[0]

    if proj["owner_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only project owner can update this project")

    old_status = proj.get("status")
    body = payload.model_dump(exclude_unset=True)
    if body:
        try:
            database.table("projects").update(body).eq("id", id).execute()
            proj.update(body)
            new_status = body.get("status")
            if new_status and new_status != old_status:
                record_activity(
                    database,
                    project_id=id,
                    actor_id=user_id,
                    action_type="project_status_changed",
                    entity_type="project",
                    entity_id=id,
                    metadata={"title": proj.get("title"), "old_status": old_status, "new_status": new_status},
                )
                if new_status == "completed":
                    record_activity(
                        database,
                        project_id=id,
                        actor_id=user_id,
                        action_type="project_completed",
                        entity_type="project",
                        entity_id=id,
                        metadata={"title": proj.get("title")},
                    )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to update project: {str(e)}")

    return _build_project_read(proj, database)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(id: str, authorization: str = Header(...)):
    user_id = await get_user_id(authorization)
    database = get_database()

    res = database.table("projects").select("*").eq("id", id).execute()
    if not res.data or len(res.data) == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    proj = res.data[0]

    if proj["owner_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only project owner can delete this project")

    try:
        database.table("projects").delete().eq("id", id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete project: {str(e)}")

    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ── Roles Management ──────────────────────────────────────────────────────────

@router.post("/{id}/roles", response_model=ProjectRoleRead, status_code=status.HTTP_201_CREATED)
async def create_project_role(id: str, payload: ProjectRoleCreate, authorization: str = Header(...)):
    user_id = await get_user_id(authorization)
    database = get_database()

    res = database.table("projects").select("*").eq("id", id).execute()
    if not res.data or len(res.data) == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    proj = res.data[0]

    if proj["owner_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only project owner can add roles")

    role_id = str(uuid.uuid4())
    role_row = {
        "id": role_id,
        "project_id": id,
        "role_name": payload.role_name.strip(),
        "description": payload.description,
        "required_skills": payload.required_skills,
        "slots": payload.slots,
        "filled_slots": 0,
        "status": "open",
    }
    try:
        database.table("project_roles").insert(role_row).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create role: {str(e)}")

    return ProjectRoleRead(
        id=role_id,
        project_id=id,
        role_name=payload.role_name.strip(),
        description=payload.description,
        required_skills=payload.required_skills,
        slots=payload.slots,
        filled_slots=0,
        status="open",
    )


@router.patch("/{id}/roles/{role_id}", response_model=ProjectRoleRead)
async def update_project_role(
    id: str, role_id: str, payload: ProjectRoleUpdate, authorization: str = Header(...)
):
    user_id = await get_user_id(authorization)
    database = get_database()

    res = database.table("projects").select("*").eq("id", id).execute()
    if not res.data or len(res.data) == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    proj = res.data[0]

    if proj["owner_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only project owner can update roles")

    r_res = database.table("project_roles").select("*").eq("id", role_id).eq("project_id", id).execute()
    if not r_res.data or len(r_res.data) == 0:
        raise HTTPException(status_code=404, detail="Role not found")
    role_row = r_res.data[0]

    body = payload.model_dump(exclude_unset=True)
    if "slots" in body and body["slots"] is not None:
        if body["slots"] < role_row["filled_slots"]:
            raise HTTPException(status_code=400, detail="Slots cannot be less than already filled slots")

    if body:
        try:
            database.table("project_roles").update(body).eq("id", role_id).execute()
            role_row.update(body)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to update role: {str(e)}")

    return ProjectRoleRead(
        id=str(role_row["id"]),
        project_id=id,
        role_name=role_row["role_name"],
        description=role_row.get("description"),
        required_skills=role_row.get("required_skills") or [],
        slots=role_row.get("slots", 1),
        filled_slots=role_row.get("filled_slots", 0),
        status=role_row.get("status", "open"),
        created_at=role_row.get("created_at"),
    )


@router.delete("/{id}/roles/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project_role(id: str, role_id: str, authorization: str = Header(...)):
    user_id = await get_user_id(authorization)
    database = get_database()

    res = database.table("projects").select("*").eq("id", id).execute()
    if not res.data or len(res.data) == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    proj = res.data[0]

    if proj["owner_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only project owner can delete roles")

    r_res = database.table("project_roles").select("id").eq("id", role_id).eq("project_id", id).execute()
    if not r_res.data or len(r_res.data) == 0:
        raise HTTPException(status_code=404, detail="Role not found")

    try:
        database.table("project_roles").delete().eq("id", role_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete role: {str(e)}")

    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ── Members Management ────────────────────────────────────────────────────────

@router.delete("/{id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project_member(id: str, member_id: str, authorization: str = Header(...)):
    user_id = await get_user_id(authorization)
    database = get_database()

    # 1. Check project
    res = database.table("projects").select("*").eq("id", id).execute()
    if not res.data or len(res.data) == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    proj = res.data[0]

    # 2. Check ownership
    if proj["owner_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only project owner can remove squad members")

    # 3. Find member in project
    m_res = database.table("project_members").select("*").eq("id", member_id).eq("project_id", id).execute()
    if not m_res.data or len(m_res.data) == 0:
        raise HTTPException(status_code=404, detail="Project member not found")
    member_row = m_res.data[0]

    # 4. Prevent removing project owner
    if member_row.get("user_id") == proj["owner_id"] or member_row.get("member_role") == "Owner":
        raise HTTPException(status_code=400, detail="Project owner cannot be removed from the project")

    removed_user_id = member_row.get("user_id")

    # 5. If member held a role, decrement filled_slots and reopen role if needed
    role_id = member_row.get("role_id")
    if role_id:
        r_res = database.table("project_roles").select("*").eq("id", role_id).execute()
        if r_res.data and len(r_res.data) > 0:
            role_row = r_res.data[0]
            new_filled = max(0, role_row.get("filled_slots", 1) - 1)
            role_update = {"filled_slots": new_filled}
            role_reopened = False
            if role_row.get("status") == "filled" and new_filled < role_row.get("slots", 1):
                role_update["status"] = "open"
                role_reopened = True
            database.table("project_roles").update(role_update).eq("id", role_id).execute()

            if role_reopened:
                create_notification(
                    database,
                    user_id=proj["owner_id"],
                    type="project_role_reopened",
                    title="Role Reopened",
                    message=f"{role_row['role_name']} is open again after member removal.",
                    actor_id=removed_user_id,
                    entity_type="project_role",
                    entity_id=role_id,
                    project_id=id,
                    action_url=f"/projects/{id}",
                    metadata={"role_id": role_id, "role_name": role_row["role_name"]},
                )

    # 6. Delete member and update membership history
    now_iso = datetime.now(timezone.utc).isoformat()
    try:
        pmh_res = database.table("project_membership_history").select("*").eq("project_id", id).eq("user_id", removed_user_id).execute()
        if pmh_res.data and len(pmh_res.data) > 0:
            database.table("project_membership_history").update({
                "status": "removed",
                "left_at": now_iso
            }).eq("project_id", id).eq("user_id", removed_user_id).execute()
        else:
            role_title = "Squad Member"
            if member_row.get("role_id"):
                r_lookup = database.table("project_roles").select("role_name").eq("id", member_row["role_id"]).execute()
                if r_lookup.data:
                    role_title = r_lookup.data[0].get("role_name") or role_title
            database.table("project_membership_history").insert({
                "id": str(uuid.uuid4()),
                "project_id": id,
                "user_id": removed_user_id,
                "role_id": member_row.get("role_id"),
                "role_name": role_title,
                "joined_at": member_row.get("joined_at") or now_iso,
                "left_at": now_iso,
                "status": "removed"
            }).execute()
        database.table("project_members").delete().eq("id", member_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to remove member: {str(e)}")

    # 7. Unassign incomplete tasks assigned to the removed member in this project (preserve completed tasks)
    removed_user_id = member_row.get("user_id")
    if removed_user_id:
        try:
            t_res = database.table("tasks").select("*").eq("project_id", id).eq("assignee_id", removed_user_id).execute()
            if t_res.data:
                for t in t_res.data:
                    if t.get("status") != "done":
                        database.table("tasks").update({"assignee_id": None}).eq("id", t["id"]).execute()
                        create_notification(
                            database,
                            user_id=removed_user_id,
                            type="task_unassigned",
                            title="Task Unassigned",
                            message=f"You were unassigned from '{t['title']}' in {proj['title']}.",
                            actor_id=user_id,
                            entity_type="task",
                            entity_id=t["id"],
                            project_id=id,
                            action_url=f"/projects/{id}",
                        )
        except Exception:
            pass

        # 8. Record member_removed activity
        try:
            u_info = _fetch_user_public(removed_user_id, database)
            member_name = u_info.display_name if u_info else removed_user_id
            record_activity(
                database,
                project_id=id,
                actor_id=user_id,
                action_type="member_removed",
                entity_type="member",
                entity_id=removed_user_id,
                metadata={"removed_user_id": removed_user_id, "member_name": member_name},
            )
        except Exception:
            pass

        # 9. Notify removed member
        create_notification(
            database,
            user_id=removed_user_id,
            type="member_removed_project",
            title="Removed from Project",
            message=f"You were removed from the squad for {proj['title']}.",
            actor_id=user_id,
            entity_type="member",
            entity_id=removed_user_id,
            project_id=id,
            action_url=f"/projects/{id}",
        )

    return Response(status_code=status.HTTP_204_NO_CONTENT)
