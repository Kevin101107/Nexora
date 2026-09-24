import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Header, Response, status

from app.core.database import get_database
from app.core.identity import get_user_id
from app.core.activity import record_activity
from app.models.resource import ProjectResourceCreate, ProjectResourceRead, ProjectResourceUpdate
from app.models.user import PublicUserProfile
from app.api.routes.users import _row_to_public_profile

router = APIRouter(prefix="/projects", tags=["resources"])


def _fetch_user_public(user_id: str, database) -> Optional[PublicUserProfile]:
    try:
        res = database.table("users").select("*").eq("id", user_id).execute()
        if res.data and len(res.data) > 0:
            return _row_to_public_profile(res.data[0])
    except Exception:
        pass
    return None


def _check_project_access(project_id: str, user_id: Optional[str], database):
    p_res = database.table("projects").select("*").eq("id", project_id).execute()
    if not p_res.data or len(p_res.data) == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    proj = p_res.data[0]

    is_owner = bool(user_id and proj["owner_id"] == user_id)
    is_member = False
    if user_id:
        m_res = database.table("project_members").select("id").eq("project_id", project_id).eq("user_id", user_id).execute()
        is_member = bool(m_res.data and len(m_res.data) > 0)

    if proj.get("visibility") == "private" and not (is_owner or is_member):
        raise HTTPException(status_code=403, detail="Not authorized to access this private project")

    return proj, is_owner, is_member


@router.get("/{id}/resources", response_model=List[ProjectResourceRead])
async def list_project_resources(id: str, authorization: Optional[str] = Header(None)):
    database = get_database()
    user_id = None
    if authorization:
        try:
            user_id = await get_user_id(authorization)
        except Exception:
            pass

    _check_project_access(id, user_id, database)

    try:
        res = database.table("project_resources").select("*").eq("project_id", id).execute()
        rows = res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch resources: {str(e)}")

    results: List[ProjectResourceRead] = []
    for r in rows:
        creator = _fetch_user_public(r.get("created_by"), database) if r.get("created_by") else None
        results.append(
            ProjectResourceRead(
                id=str(r["id"]),
                project_id=id,
                title=r["title"],
                url=r["url"],
                category=r.get("category", "other"),
                description=r.get("description"),
                created_by=str(r.get("created_by")),
                creator=creator,
                created_at=r.get("created_at"),
            )
        )

    return results


@router.post("/{id}/resources", response_model=ProjectResourceRead, status_code=status.HTTP_201_CREATED)
async def create_project_resource(
    id: str, payload: ProjectResourceCreate, authorization: str = Header(...)
):
    user_id = await get_user_id(authorization)
    database = get_database()

    proj, is_owner, is_member = _check_project_access(id, user_id, database)
    if not (is_owner or is_member):
        raise HTTPException(status_code=403, detail="Only squad members or owner can add project resources")

    res_id = f"res-{uuid.uuid4().hex[:10]}"
    now_iso = datetime.now(timezone.utc).isoformat()

    row = {
        "id": res_id,
        "project_id": id,
        "title": payload.title.strip(),
        "url": payload.url.strip(),
        "category": payload.category.lower(),
        "description": payload.description.strip() if payload.description else None,
        "created_by": user_id,
        "created_at": now_iso,
    }

    try:
        database.table("project_resources").insert(row).execute()
        record_activity(
            database,
            project_id=id,
            actor_id=user_id,
            action_type="resource_added",
            entity_type="resource",
            entity_id=res_id,
            metadata={"title": row["title"], "category": row["category"]},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add resource: {str(e)}")

    creator = _fetch_user_public(user_id, database)
    return ProjectResourceRead(
        id=res_id,
        project_id=id,
        title=row["title"],
        url=row["url"],
        category=row["category"],
        description=row["description"],
        created_by=user_id,
        creator=creator,
        created_at=now_iso,
    )


@router.delete("/{id}/resources/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project_resource(
    id: str, resource_id: str, authorization: str = Header(...)
):
    user_id = await get_user_id(authorization)
    database = get_database()

    proj, is_owner, is_member = _check_project_access(id, user_id, database)

    r_res = database.table("project_resources").select("*").eq("id", resource_id).eq("project_id", id).execute()
    if not r_res.data or len(r_res.data) == 0:
        raise HTTPException(status_code=404, detail="Resource not found")
    resource = r_res.data[0]

    # Only resource creator or project owner can delete
    if resource["created_by"] != user_id and not is_owner:
        raise HTTPException(status_code=403, detail="Only the resource author or project owner can delete this resource")

    try:
        database.table("project_resources").delete().eq("id", resource_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete resource: {str(e)}")

    return Response(status_code=status.HTTP_204_NO_CONTENT)
