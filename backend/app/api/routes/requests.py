import uuid
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Header, Query, status
from app.models.request import (
    TeammateRequestCreate,
    TeammateRequestDecision,
    TeammateRequestRead,
)
from app.models.user import PublicUserProfile
from app.core.database import get_database
from app.core.identity import get_user_id

router = APIRouter(prefix="/requests", tags=["requests"])


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


@router.post("", response_model=TeammateRequestRead, status_code=status.HTTP_201_CREATED)
async def create_request(payload: TeammateRequestCreate, authorization: str = Header(...)):
    sender_id = await get_user_id(authorization)
    if payload.receiver_id == sender_id:
        raise HTTPException(status_code=400, detail="Cannot send request to yourself")

    database = get_database()

    # Check receiver exists
    u_res = database.table("users").select("id").eq("id", payload.receiver_id).execute()
    if not u_res.data or len(u_res.data) == 0:
        raise HTTPException(status_code=404, detail="Recipient user not found")

    project_title = None
    role_name = None
    if payload.project_id:
        p_res = database.table("projects").select("*").eq("id", payload.project_id).execute()
        if not p_res.data or len(p_res.data) == 0:
            raise HTTPException(status_code=404, detail="Project not found")
        proj = p_res.data[0]
        project_title = proj["title"]

        # Only project owner/lead can invite candidates to a project
        if proj["owner_id"] != sender_id:
            raise HTTPException(status_code=403, detail="Only the project owner can invite candidates to this project")

        # Check if recipient is already a member
        m_check = database.table("project_members").select("id").eq("project_id", payload.project_id).eq("user_id", payload.receiver_id).execute()
        if m_check.data and len(m_check.data) > 0:
            raise HTTPException(status_code=400, detail="User is already a member of this project")

        # If role_id is specified, validate role
        if payload.role_id:
            r_check = database.table("project_roles").select("*").eq("id", payload.role_id).eq("project_id", payload.project_id).execute()
            if not r_check.data or len(r_check.data) == 0:
                raise HTTPException(status_code=404, detail="Role not found on this project")
            role_row = r_check.data[0]
            role_name = role_row["role_name"]
            if role_row.get("status") == "filled" or role_row.get("filled_slots", 0) >= role_row.get("slots", 1):
                raise HTTPException(status_code=400, detail="This role is already filled")

    # Check duplicate pending request
    dup_query = (
        database.table("teammate_requests")
        .select("id")
        .eq("sender_id", sender_id)
        .eq("receiver_id", payload.receiver_id)
        .eq("status", "pending")
    )
    if payload.project_id:
        dup_query = dup_query.eq("project_id", payload.project_id)
    dup_check = dup_query.execute()
    if dup_check.data and len(dup_check.data) > 0:
        raise HTTPException(status_code=409, detail="A request is already pending for this user")

    req_id = str(uuid.uuid4())
    req_row = {
        "id": req_id,
        "sender_id": sender_id,
        "receiver_id": payload.receiver_id,
        "project_id": payload.project_id,
        "role_id": payload.role_id,
        "message": payload.message,
        "status": "pending",
    }
    try:
        database.table("teammate_requests").insert(req_row).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send request: {str(e)}")

    sender = _fetch_user_public(sender_id, database)
    receiver = _fetch_user_public(payload.receiver_id, database)

    return TeammateRequestRead(
        id=req_id,
        sender_id=sender_id,
        sender=sender,
        receiver_id=payload.receiver_id,
        receiver=receiver,
        project_id=payload.project_id,
        project_title=project_title,
        role_id=payload.role_id,
        role_name=role_name,
        message=payload.message,
        status="pending",
    )


@router.get("", response_model=List[TeammateRequestRead])
async def list_requests(
    direction: Optional[str] = Query("all", description="'all', 'received', or 'sent'"),
    authorization: str = Header(...),
):
    user_id = await get_user_id(authorization)
    database = get_database()

    try:
        query = database.table("teammate_requests").select("*")
        if direction == "received":
            query = query.eq("receiver_id", user_id)
        elif direction == "sent":
            query = query.eq("sender_id", user_id)
        else:
            query = query.or_(f"sender_id.eq.{user_id},receiver_id.eq.{user_id}")

        res = query.order("created_at", desc=True).execute()
        rows = res.data or []
    except Exception as e:
        try:
            r1 = database.table("teammate_requests").select("*").eq("receiver_id", user_id).execute()
            r2 = database.table("teammate_requests").select("*").eq("sender_id", user_id).execute()
            combined = {r["id"]: r for r in (r1.data or []) + (r2.data or [])}
            rows = sorted(combined.values(), key=lambda x: x.get("created_at") or "", reverse=True)
        except Exception:
            raise HTTPException(status_code=500, detail=f"Failed to fetch requests: {str(e)}")

    results: List[TeammateRequestRead] = []
    user_cache = {}

    def get_cached_user(uid: str):
        if uid not in user_cache:
            user_cache[uid] = _fetch_user_public(uid, database)
        return user_cache[uid]

    for r in rows:
        proj_title = None
        if r.get("project_id"):
            p_res = database.table("projects").select("title").eq("id", r["project_id"]).execute()
            if p_res.data and len(p_res.data) > 0:
                proj_title = p_res.data[0]["title"]

        role_title = None
        if r.get("role_id"):
            ro_res = database.table("project_roles").select("role_name").eq("id", r["role_id"]).execute()
            if ro_res.data and len(ro_res.data) > 0:
                role_title = ro_res.data[0]["role_name"]

        results.append(
            TeammateRequestRead(
                id=str(r["id"]),
                sender_id=str(r["sender_id"]),
                sender=get_cached_user(str(r["sender_id"])),
                receiver_id=str(r["receiver_id"]),
                receiver=get_cached_user(str(r["receiver_id"])),
                project_id=str(r["project_id"]) if r.get("project_id") else None,
                project_title=proj_title,
                role_id=str(r["role_id"]) if r.get("role_id") else None,
                role_name=role_title,
                message=r.get("message"),
                status=r.get("status", "pending"),
                created_at=r.get("created_at"),
                updated_at=r.get("updated_at"),
            )
        )

    return results


@router.post("/{id}/respond", response_model=TeammateRequestRead)
async def respond_to_request(
    id: str, payload: TeammateRequestDecision, authorization: str = Header(...)
):
    user_id = await get_user_id(authorization)
    database = get_database()

    r_res = database.table("teammate_requests").select("*").eq("id", id).execute()
    if not r_res.data or len(r_res.data) == 0:
        raise HTTPException(status_code=404, detail="Request not found")
    req_row = r_res.data[0]

    if req_row["receiver_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only the recipient can respond to this request")

    if req_row["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Request is already {req_row['status']}")

    role_title = None
    if payload.action == "accepted":
        project_id = req_row.get("project_id")
        role_id = req_row.get("role_id")

        if project_id:
            # Check role capacity if a role was targeted
            if role_id:
                ro_res = database.table("project_roles").select("*").eq("id", role_id).execute()
                if ro_res.data and len(ro_res.data) > 0:
                    role_info = ro_res.data[0]
                    role_title = role_info["role_name"]
                    filled = role_info.get("filled_slots", 0)
                    slots = role_info.get("slots", 1)
                    if filled >= slots:
                        raise HTTPException(status_code=400, detail="Cannot accept invitation: role slots are already full")

                    new_filled = filled + 1
                    role_update = {"filled_slots": new_filled}
                    if new_filled >= slots:
                        role_update["status"] = "filled"
                    database.table("project_roles").update(role_update).eq("id", role_id).execute()

            # Check if user is already a member before inserting
            m_res = database.table("project_members").select("id").eq("project_id", project_id).eq("user_id", user_id).execute()
            if not m_res.data or len(m_res.data) == 0:
                database.table("project_members").insert({
                    "id": str(uuid.uuid4()),
                    "project_id": project_id,
                    "user_id": user_id,
                    "role_id": role_id,
                    "member_role": "Member",
                }).execute()

            # Auto-resolve reciprocal pending applications for this user on this project
            app_res = (
                database.table("project_applications")
                .select("id")
                .eq("project_id", project_id)
                .eq("applicant_id", user_id)
                .eq("status", "pending")
                .execute()
            )
            for app in (app_res.data or []):
                database.table("project_applications").update({"status": "accepted"}).eq("id", app["id"]).execute()

        new_status = "accepted"
    else:
        new_status = "declined"

    database.table("teammate_requests").update({"status": new_status}).eq("id", id).execute()
    req_row["status"] = new_status

    proj_title = None
    if req_row.get("project_id"):
        p_res = database.table("projects").select("title").eq("id", req_row["project_id"]).execute()
        if p_res.data and len(p_res.data) > 0:
            proj_title = p_res.data[0]["title"]

    if req_row.get("role_id") and not role_title:
        ro_res = database.table("project_roles").select("role_name").eq("id", req_row["role_id"]).execute()
        if ro_res.data and len(ro_res.data) > 0:
            role_title = ro_res.data[0]["role_name"]

    return TeammateRequestRead(
        id=str(req_row["id"]),
        sender_id=str(req_row["sender_id"]),
        sender=_fetch_user_public(req_row["sender_id"], database),
        receiver_id=str(req_row["receiver_id"]),
        receiver=_fetch_user_public(req_row["receiver_id"], database),
        project_id=str(req_row["project_id"]) if req_row.get("project_id") else None,
        project_title=proj_title,
        role_id=str(req_row["role_id"]) if req_row.get("role_id") else None,
        role_name=role_title,
        message=req_row.get("message"),
        status=new_status,
        created_at=req_row.get("created_at"),
        updated_at=req_row.get("updated_at"),
    )


@router.post("/{id}/cancel", response_model=TeammateRequestRead)
async def cancel_request(id: str, authorization: str = Header(...)):
    user_id = await get_user_id(authorization)
    database = get_database()

    r_res = database.table("teammate_requests").select("*").eq("id", id).execute()
    if not r_res.data or len(r_res.data) == 0:
        raise HTTPException(status_code=404, detail="Request not found")
    req_row = r_res.data[0]

    if req_row["sender_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only the sender can cancel this request")

    if req_row["status"] != "pending":
        raise HTTPException(status_code=400, detail="Only pending requests can be cancelled")

    database.table("teammate_requests").update({"status": "cancelled"}).eq("id", id).execute()
    req_row["status"] = "cancelled"

    proj_title = None
    if req_row.get("project_id"):
        p_res = database.table("projects").select("title").eq("id", req_row["project_id"]).execute()
        if p_res.data and len(p_res.data) > 0:
            proj_title = p_res.data[0]["title"]

    role_title = None
    if req_row.get("role_id"):
        ro_res = database.table("project_roles").select("role_name").eq("id", req_row["role_id"]).execute()
        if ro_res.data and len(ro_res.data) > 0:
            role_title = ro_res.data[0]["role_name"]

    return TeammateRequestRead(
        id=str(req_row["id"]),
        sender_id=str(req_row["sender_id"]),
        sender=_fetch_user_public(req_row["sender_id"], database),
        receiver_id=str(req_row["receiver_id"]),
        receiver=_fetch_user_public(req_row["receiver_id"], database),
        project_id=str(req_row["project_id"]) if req_row.get("project_id") else None,
        project_title=proj_title,
        role_id=str(req_row["role_id"]) if req_row.get("role_id") else None,
        role_name=role_title,
        message=req_row.get("message"),
        status="cancelled",
        created_at=req_row.get("created_at"),
        updated_at=req_row.get("updated_at"),
    )
