from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime
from fastapi import APIRouter, HTTPException, Header
from app.models.user import PublicUserProfile
from app.core.database import get_database
from app.core.identity import get_user_id

router = APIRouter(prefix="/teams", tags=["teams"])


class TeamMemberItem(BaseModel):
    id: str
    user_id: str
    member_role: str
    role_name: Optional[str] = None
    joined_at: Optional[datetime] = None
    user: Optional[PublicUserProfile] = None


class UserTeamRead(BaseModel):
    id: str
    title: str
    description: str
    category: str
    status: str
    owner_id: str
    my_member_role: str
    members_count: int
    members: List[TeamMemberItem] = Field(default_factory=list)
    created_at: Optional[datetime] = None


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


@router.get("/me", response_model=List[UserTeamRead])
async def list_my_teams(authorization: str = Header(...)):
    user_id = await get_user_id(authorization)
    database = get_database()

    try:
        # Find all project_members rows for user
        m_res = database.table("project_members").select("*").eq("user_id", user_id).execute()
        memberships = m_res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch memberships: {str(e)}")

    teams: List[UserTeamRead] = []
    user_cache = {}

    def get_cached_user(uid: str):
        if uid not in user_cache:
            user_cache[uid] = _fetch_user_public(uid, database)
        return user_cache[uid]

    for m in memberships:
        proj_id = m["project_id"]
        p_res = database.table("projects").select("*").eq("id", proj_id).execute()
        if not p_res.data or len(p_res.data) == 0:
            continue
        proj = p_res.data[0]

        # Fetch all members of this project
        all_m_res = database.table("project_members").select("*").eq("project_id", proj_id).execute()
        all_members_rows = all_m_res.data or []

        # Fetch role names
        r_res = database.table("project_roles").select("id, role_name").eq("project_id", proj_id).execute()
        role_map = {str(r["id"]): r["role_name"] for r in (r_res.data or [])}

        roster: List[TeamMemberItem] = []
        for mr in all_members_rows:
            uid = str(mr["user_id"])
            rid = str(mr["role_id"]) if mr.get("role_id") else None
            role_title = role_map.get(rid) if rid else ("Team Lead" if mr.get("member_role") == "Owner" else None)
            roster.append(
                TeamMemberItem(
                    id=str(mr["id"]),
                    user_id=uid,
                    member_role=mr.get("member_role", "Member"),
                    role_name=role_title,
                    joined_at=mr.get("joined_at"),
                    user=get_cached_user(uid),
                )
            )

        teams.append(
            UserTeamRead(
                id=str(proj["id"]),
                title=proj["title"],
                description=proj["description"],
                category=proj.get("category", "side_project"),
                status=proj.get("status", "recruiting"),
                owner_id=str(proj["owner_id"]),
                my_member_role=m.get("member_role", "Member"),
                members_count=len(roster),
                members=roster,
                created_at=proj.get("created_at"),
            )
        )

    return teams
