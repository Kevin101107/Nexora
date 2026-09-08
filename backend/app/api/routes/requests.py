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
    if payload.project_id:
        p_res = database.table("projects").select("title").eq("id", payload.project_id).execute()
        if not p_res.data or len(p_res.data) == 0:
            raise HTTPException(status_code=404, detail="Project not found")
        project_title = p_res.data[0]["title"]

    # Check duplicate pending request
    dup_check = (
        database.table("teammate_requests")
        .select("id")
        .eq("sender_id", sender_id)
        .eq("receiver_id", payload.receiver_id)
        .eq("status", "pending")
        .execute()
    )
    if dup_check.data and len(dup_check.data) > 0:
        raise HTTPException(status_code=409, detail="A request is already pending for this user")

    req_id = str(uuid.uuid4())
    req_row = {
        "id": req_id,
        "sender_id": sender_id,
        "receiver_id": payload.receiver_id,
        "project_id": payload.project_id,
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
            # We fetch all requests where sender or receiver is user
            # PostgREST or filter
            query = query.or_(f"sender_id.eq.{user_id},receiver_id.eq.{user_id}")

        res = query.order("created_at", desc=True).execute()
        rows = res.data or []
    except Exception as e:
        # Fallback if or_ filter syntax differs
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

        results.append(
            TeammateRequestRead(
                id=str(r["id"]),
                sender_id=str(r["sender_id"]),
                sender=get_cached_user(str(r["sender_id"])),
                receiver_id=str(r["receiver_id"]),
                receiver=get_cached_user(str(r["receiver_id"])),
                project_id=str(r["project_id"]) if r.get("project_id") else None,
                project_title=proj_title,
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

    new_status = payload.action  # 'accepted' or 'declined'
    database.table("teammate_requests").update({"status": new_status}).eq("id", id).execute()
    req_row["status"] = new_status

    proj_title = None
    if req_row.get("project_id"):
        p_res = database.table("projects").select("title").eq("id", req_row["project_id"]).execute()
        if p_res.data and len(p_res.data) > 0:
            proj_title = p_res.data[0]["title"]

    return TeammateRequestRead(
        id=str(req_row["id"]),
        sender_id=str(req_row["sender_id"]),
        sender=_fetch_user_public(req_row["sender_id"], database),
        receiver_id=str(req_row["receiver_id"]),
        receiver=_fetch_user_public(req_row["receiver_id"], database),
        project_id=str(req_row["project_id"]) if req_row.get("project_id") else None,
        project_title=proj_title,
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

    return TeammateRequestRead(
        id=str(req_row["id"]),
        sender_id=str(req_row["sender_id"]),
        sender=_fetch_user_public(req_row["sender_id"], database),
        receiver_id=str(req_row["receiver_id"]),
        receiver=_fetch_user_public(req_row["receiver_id"], database),
        project_id=str(req_row["project_id"]) if req_row.get("project_id") else None,
        project_title=proj_title,
        message=req_row.get("message"),
        status="cancelled",
        created_at=req_row.get("created_at"),
        updated_at=req_row.get("updated_at"),
    )
