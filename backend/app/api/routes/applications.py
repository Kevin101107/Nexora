import uuid
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Header, status
from app.models.application import (
    ProjectApplicationCreate,
    ProjectApplicationDecision,
    ProjectApplicationRead,
)
from app.models.user import PublicUserProfile
from app.core.database import get_database
from app.core.identity import get_user_id
from app.core.activity import record_activity
from app.core.notifications import create_notification
from app.services.matching import calculate_match_score, calculate_match_score_v2
from app.api.routes.matches import _fetch_user_collaboration_history

router = APIRouter(tags=["applications"])


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


# 1. Apply to Project / Role
@router.post("/projects/{id}/apply", response_model=ProjectApplicationRead, status_code=status.HTTP_201_CREATED)
async def apply_to_project(id: str, payload: ProjectApplicationCreate, authorization: str = Header(...)):
    user_id = await get_user_id(authorization)
    database = get_database()

    # Check project
    p_res = database.table("projects").select("*").eq("id", id).execute()
    if not p_res.data or len(p_res.data) == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    proj = p_res.data[0]

    # Check owner
    if proj["owner_id"] == user_id:
        raise HTTPException(status_code=400, detail="Owners cannot apply to their own project")

    # Check existing membership
    m_res = database.table("project_members").select("id").eq("project_id", id).eq("user_id", user_id).execute()
    if m_res.data and len(m_res.data) > 0:
        raise HTTPException(status_code=400, detail="Already a member of this project")

    role_name = None
    if payload.role_id:
        r_res = database.table("project_roles").select("*").eq("id", payload.role_id).eq("project_id", id).execute()
        if not r_res.data or len(r_res.data) == 0:
            raise HTTPException(status_code=404, detail="Role not found")
        role_row = r_res.data[0]
        role_name = role_row["role_name"]
        if role_row.get("status") == "filled" or role_row.get("filled_slots", 0) >= role_row.get("slots", 1):
            raise HTTPException(status_code=400, detail="This role is already filled")

    # Check duplicate pending application
    app_query = (
        database.table("project_applications")
        .select("id")
        .eq("project_id", id)
        .eq("applicant_id", user_id)
        .eq("status", "pending")
    )
    if payload.role_id:
        app_query = app_query.eq("role_id", payload.role_id)
    existing_app = app_query.execute()
    if existing_app.data and len(existing_app.data) > 0:
        raise HTTPException(status_code=409, detail="Application already pending")

    app_id = str(uuid.uuid4())
    app_row = {
        "id": app_id,
        "project_id": id,
        "role_id": payload.role_id,
        "applicant_id": user_id,
        "message": payload.message,
        "status": "pending",
    }
    try:
        database.table("project_applications").insert(app_row).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to submit application: {str(e)}")

    applicant_profile = _fetch_user_public(user_id, database)
    applicant_name = applicant_profile.display_name if (applicant_profile and applicant_profile.display_name) else (applicant_profile.username if applicant_profile else "A builder")

    create_notification(
        database,
        user_id=proj["owner_id"],
        type="application_received",
        title="New Application Received",
        message=f"{applicant_name} applied for {role_name or 'a role'} in {proj['title']}.",
        actor_id=user_id,
        entity_type="project_application",
        entity_id=app_id,
        project_id=id,
        action_url=f"/projects/{id}",
        metadata={"role_id": payload.role_id, "role_name": role_name},
    )

    return ProjectApplicationRead(
        id=app_id,
        project_id=id,
        project_title=proj["title"],
        role_id=payload.role_id,
        role_name=role_name,
        applicant_id=user_id,
        applicant=applicant_profile,
        message=payload.message,
        status="pending",
    )


# 2. My Applications
@router.get("/applications/me", response_model=List[ProjectApplicationRead])
async def list_my_applications(authorization: str = Header(...)):
    user_id = await get_user_id(authorization)
    database = get_database()

    try:
        res = (
            database.table("project_applications")
            .select("*")
            .eq("applicant_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        apps = res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch applications: {str(e)}")

    applicant_profile = _fetch_user_public(user_id, database)
    results: List[ProjectApplicationRead] = []

    for a in apps:
        proj_title = None
        p_res = database.table("projects").select("title").eq("id", a["project_id"]).execute()
        if p_res.data and len(p_res.data) > 0:
            proj_title = p_res.data[0]["title"]

        role_name = None
        if a.get("role_id"):
            r_res = database.table("project_roles").select("role_name").eq("id", a["role_id"]).execute()
            if r_res.data and len(r_res.data) > 0:
                role_name = r_res.data[0]["role_name"]

        results.append(
            ProjectApplicationRead(
                id=str(a["id"]),
                project_id=str(a["project_id"]),
                project_title=proj_title,
                role_id=str(a["role_id"]) if a.get("role_id") else None,
                role_name=role_name,
                applicant_id=user_id,
                applicant=applicant_profile,
                message=a.get("message"),
                status=a.get("status", "pending"),
                created_at=a.get("created_at"),
                updated_at=a.get("updated_at"),
            )
        )

    return results


# 3. Project Applications (Owner view)
@router.get("/projects/{id}/applications", response_model=List[ProjectApplicationRead])
async def list_project_applications(id: str, authorization: str = Header(...)):
    user_id = await get_user_id(authorization)
    database = get_database()

    p_res = database.table("projects").select("*").eq("id", id).execute()
    if not p_res.data or len(p_res.data) == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    proj = p_res.data[0]

    if proj["owner_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only project owner can view applications")

    try:
        res = (
            database.table("project_applications")
            .select("*")
            .eq("project_id", id)
            .order("created_at", desc=True)
            .execute()
        )
        apps = res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch applications: {str(e)}")

    results: List[ProjectApplicationRead] = []
    for a in apps:
        app_uid = a.get("applicant_id") or a.get("user_id") or ""
        applicant = _fetch_user_public(app_uid, database) if app_uid else None
        role_name = None
        match_result = None
        if a.get("role_id"):
            r_res = database.table("project_roles").select("*").eq("id", a["role_id"]).execute()
            if r_res.data and len(r_res.data) > 0:
                role_row = r_res.data[0]
                role_name = role_row["role_name"]
                if applicant:
                    c_hist = _fetch_user_collaboration_history(applicant.id, database)
                    match_result = calculate_match_score_v2(
                        user_skills=applicant.skills,
                        user_roles=applicant.roles,
                        user_availability=applicant.availability,
                        role_name=role_row["role_name"],
                        required_skills=role_row.get("required_skills") or [],
                        project_category=proj.get("category"),
                        verified_roles=c_hist["verified_roles"],
                        tasks_assigned=c_hist["tasks_assigned"],
                        tasks_completed=c_hist["tasks_completed"],
                        projects_joined=c_hist["projects_joined"],
                        completed_projects=c_hist["completed_projects"],
                    )

        results.append(
            ProjectApplicationRead(
                id=str(a["id"]),
                project_id=id,
                project_title=proj["title"],
                role_id=str(a["role_id"]) if a.get("role_id") else None,
                role_name=role_name,
                applicant_id=app_uid,
                applicant=applicant,
                message=a.get("message"),
                status=a.get("status", "pending"),
                match=match_result,
                created_at=a.get("created_at"),
                updated_at=a.get("updated_at"),
            )
        )

    return results


# 4. Respond to Application (Owner accept/reject)
@router.post("/applications/{id}/respond", response_model=ProjectApplicationRead)
async def respond_to_application(
    id: str, payload: ProjectApplicationDecision, authorization: str = Header(...)
):
    user_id = await get_user_id(authorization)
    database = get_database()

    a_res = database.table("project_applications").select("*").eq("id", id).execute()
    if not a_res.data or len(a_res.data) == 0:
        raise HTTPException(status_code=404, detail="Application not found")
    app_row = a_res.data[0]

    if app_row["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Application is already {app_row['status']}")

    p_res = database.table("projects").select("*").eq("id", app_row["project_id"]).execute()
    if not p_res.data or len(p_res.data) == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    proj = p_res.data[0]

    if proj["owner_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only project owner can decide on applications")

    role_name = None
    role_row = None
    if payload.action == "accepted":
        role_id = app_row.get("role_id")
        if role_id:
            r_res = database.table("project_roles").select("*").eq("id", role_id).execute()
            if r_res.data and len(r_res.data) > 0:
                role_row = r_res.data[0]
                role_name = role_row["role_name"]
                filled = role_row.get("filled_slots", 0)
                slots = role_row.get("slots", 1)
                if filled >= slots:
                    raise HTTPException(status_code=400, detail="Cannot accept application: role slots are already full")

                new_filled = filled + 1
                role_update = {"filled_slots": new_filled}
                if new_filled >= slots:
                    role_update["status"] = "filled"
                database.table("project_roles").update(role_update).eq("id", role_id).execute()

        # Add to project_members if not already a member
        m_res = (
            database.table("project_members")
            .select("id")
            .eq("project_id", app_row["project_id"])
            .eq("user_id", app_row["applicant_id"])
            .execute()
        )
        if not m_res.data or len(m_res.data) == 0:
            database.table("project_members").insert({
                "id": str(uuid.uuid4()),
                "project_id": app_row["project_id"],
                "user_id": app_row["applicant_id"],
                "role_id": role_id,
                "member_role": "Member",
            }).execute()
            try:
                database.table("project_membership_history").insert({
                    "id": str(uuid.uuid4()),
                    "project_id": app_row["project_id"],
                    "user_id": app_row["applicant_id"],
                    "role_id": role_id,
                    "role_name": role_name or "Squad Member",
                    "joined_at": datetime.now(timezone.utc).isoformat(),
                    "left_at": None,
                    "status": "active",
                }).execute()
            except Exception:
                pass

            try:
                record_activity(
                    database,
                    project_id=app_row["project_id"],
                    actor_id=user_id,
                    action_type="member_joined",
                    entity_type="member",
                    entity_id=app_row["applicant_id"],
                    metadata={"member_id": app_row["applicant_id"], "role_name": role_name},
                )
            except Exception:
                pass

        # Auto-resolve reciprocal pending teammate requests between project and applicant
        req_res = (
            database.table("teammate_requests")
            .select("id")
            .eq("project_id", app_row["project_id"])
            .eq("receiver_id", app_row["applicant_id"])
            .eq("status", "pending")
            .execute()
        )
        for req in (req_res.data or []):
            database.table("teammate_requests").update({"status": "accepted"}).eq("id", req["id"]).execute()

        database.table("project_applications").update({"status": "accepted"}).eq("id", id).execute()
        app_row["status"] = "accepted"

        create_notification(
            database,
            user_id=app_row["applicant_id"],
            type="application_accepted",
            title="Application Accepted",
            message=f"Your application to join {proj['title']}" + (f" as {role_name}." if role_name else " was accepted!"),
            actor_id=user_id,
            entity_type="project_application",
            entity_id=id,
            project_id=app_row["project_id"],
            action_url=f"/projects/{app_row['project_id']}/workspace",
            metadata={"role_id": app_row.get("role_id"), "role_name": role_name},
        )

        if role_id and new_filled >= slots:
            create_notification(
                database,
                user_id=proj["owner_id"],
                type="project_role_filled",
                title="Role Filled",
                message=f"Role '{role_name}' in {proj['title']} is now filled.",
                actor_id=app_row["applicant_id"],
                entity_type="project_role",
                entity_id=role_id,
                project_id=app_row["project_id"],
                action_url=f"/projects/{app_row['project_id']}",
                metadata={"role_id": role_id, "role_name": role_name},
            )
    else:
        database.table("project_applications").update({"status": "rejected"}).eq("id", id).execute()
        app_row["status"] = "rejected"

        create_notification(
            database,
            user_id=app_row["applicant_id"],
            type="application_declined",
            title="Application Declined",
            message=f"Your application to join {proj['title']} was declined.",
            actor_id=user_id,
            entity_type="project_application",
            entity_id=id,
            project_id=app_row["project_id"],
            action_url=f"/projects/{app_row['project_id']}",
            metadata={"role_id": app_row.get("role_id"), "role_name": role_name},
        )

    applicant = _fetch_user_public(app_row["applicant_id"], database)

    match_result = None
    if applicant and app_row.get("role_id"):
        if not role_row:
            r_res = database.table("project_roles").select("*").eq("id", app_row["role_id"]).execute()
            if r_res.data and len(r_res.data) > 0:
                role_row = r_res.data[0]
                role_name = role_row["role_name"]
        if role_row:
            c_hist = _fetch_user_collaboration_history(applicant.id, database)
            match_result = calculate_match_score_v2(
                user_skills=applicant.skills,
                user_roles=applicant.roles,
                user_availability=applicant.availability,
                role_name=role_row["role_name"],
                required_skills=role_row.get("required_skills") or [],
                project_category=proj.get("category"),
                verified_roles=c_hist["verified_roles"],
                tasks_assigned=c_hist["tasks_assigned"],
                tasks_completed=c_hist["tasks_completed"],
                projects_joined=c_hist["projects_joined"],
                completed_projects=c_hist["completed_projects"],
            )

    return ProjectApplicationRead(
        id=str(app_row["id"]),
        project_id=str(app_row["project_id"]),
        project_title=proj["title"],
        role_id=str(app_row["role_id"]) if app_row.get("role_id") else None,
        role_name=role_name,
        applicant_id=str(app_row["applicant_id"]),
        applicant=applicant,
        message=app_row.get("message"),
        status=app_row["status"],
        match=match_result,
        created_at=app_row.get("created_at"),
        updated_at=app_row.get("updated_at"),
    )


# 5. Withdraw Application (Applicant)
@router.post("/applications/{id}/withdraw", response_model=ProjectApplicationRead)
async def withdraw_application(id: str, authorization: str = Header(...)):
    user_id = await get_user_id(authorization)
    database = get_database()

    a_res = database.table("project_applications").select("*").eq("id", id).execute()
    if not a_res.data or len(a_res.data) == 0:
        raise HTTPException(status_code=404, detail="Application not found")
    app_row = a_res.data[0]

    if app_row["applicant_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only the applicant can withdraw this application")

    if app_row["status"] != "pending":
        raise HTTPException(status_code=400, detail="Only pending applications can be withdrawn")

    database.table("project_applications").update({"status": "withdrawn"}).eq("id", id).execute()
    app_row["status"] = "withdrawn"

    p_res = database.table("projects").select("title").eq("id", app_row["project_id"]).execute()
    proj_title = p_res.data[0]["title"] if p_res.data else None

    return ProjectApplicationRead(
        id=str(app_row["id"]),
        project_id=str(app_row["project_id"]),
        project_title=proj_title,
        role_id=str(app_row["role_id"]) if app_row.get("role_id") else None,
        applicant_id=user_id,
        applicant=_fetch_user_public(user_id, database),
        message=app_row.get("message"),
        status="withdrawn",
        created_at=app_row.get("created_at"),
        updated_at=app_row.get("updated_at"),
    )
