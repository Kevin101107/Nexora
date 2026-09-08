from typing import List, Optional
from fastapi import APIRouter, HTTPException, Header, Query
from app.core.database import get_database
from app.core.identity import get_user_id
from app.models.user import PublicUserProfile
from app.models.project import ProjectRoleRead, ProjectListItem
from app.models.match import (
    UserRoleMatchResponse,
    RoleCandidateMatch,
    UserRoleRecommendation,
)
from app.services.matching import calculate_match_score

router = APIRouter(tags=["matches"])


def _row_to_public_profile(row: dict) -> PublicUserProfile:
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


def _row_to_project_role(row: dict) -> ProjectRoleRead:
    return ProjectRoleRead(
        id=str(row["id"]),
        project_id=str(row["project_id"]),
        role_name=row["role_name"],
        description=row.get("description"),
        required_skills=row.get("required_skills") or [],
        slots=row.get("slots", 1),
        filled_slots=row.get("filled_slots", 0),
        status=row.get("status", "open"),
        created_at=row.get("created_at"),
    )


def _row_to_project_list_item(p_row: dict, roles: List[ProjectRoleRead], members_count: int) -> ProjectListItem:
    open_roles = sum(1 for r in roles if r.status == "open" and r.filled_slots < r.slots)
    return ProjectListItem(
        id=str(p_row["id"]),
        owner_id=str(p_row["owner_id"]),
        title=p_row["title"],
        description=p_row["description"],
        category=p_row.get("category", "side_project"),
        status=p_row.get("status", "recruiting"),
        visibility=p_row.get("visibility", "public"),
        created_at=p_row.get("created_at"),
        roles=roles,
        members_count=members_count,
        open_roles_count=open_roles,
    )


# ── 1. Calculate Single Match: User <-> Project Role ─────────────────────────

@router.get("/matches/users/{user_id}/roles/{role_id}", response_model=UserRoleMatchResponse)
async def get_user_role_match(
    user_id: str,
    role_id: str,
    authorization: Optional[str] = Header(None),
):
    database = get_database()

    # 1. Fetch User
    u_res = (
        database.table("users")
        .select("id, display_name, avatar_url, username, headline, bio, skills, roles, interests, github_url, linkedin_url, availability, created_at")
        .eq("id", user_id)
        .execute()
    )
    if not u_res.data or len(u_res.data) == 0:
        raise HTTPException(status_code=404, detail="User not found")
    user_profile = _row_to_public_profile(u_res.data[0])

    # 2. Fetch Project Role
    r_res = database.table("project_roles").select("*").eq("id", role_id).execute()
    if not r_res.data or len(r_res.data) == 0:
        raise HTTPException(status_code=404, detail="Project role not found")
    role_row = r_res.data[0]
    role_model = _row_to_project_role(role_row)

    # 3. Fetch Parent Project
    p_res = database.table("projects").select("*").eq("id", role_row["project_id"]).execute()
    if not p_res.data or len(p_res.data) == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    proj_row = p_res.data[0]

    # Check project visibility access
    if proj_row.get("visibility") == "private":
        if not authorization:
            raise HTTPException(status_code=403, detail="Private project requires authorization")
        caller_id = await get_user_id(authorization)
        if proj_row["owner_id"] != caller_id:
            m_res = database.table("project_members").select("id").eq("project_id", proj_row["id"]).eq("user_id", caller_id).execute()
            if not m_res.data or len(m_res.data) == 0:
                raise HTTPException(status_code=403, detail="Not authorized to view private project match")

    # Fetch project roles for summary
    all_roles_res = database.table("project_roles").select("*").eq("project_id", proj_row["id"]).execute()
    roles_list = [_row_to_project_role(r) for r in (all_roles_res.data or [])]
    members_res = database.table("project_members").select("id").eq("project_id", proj_row["id"]).execute()
    members_count = len(members_res.data or [])

    proj_item = _row_to_project_list_item(proj_row, roles_list, members_count)

    # Calculate deterministic Match Score V1
    match_result = calculate_match_score(
        user_skills=user_profile.skills,
        user_roles=user_profile.roles,
        user_availability=user_profile.availability,
        role_name=role_model.role_name,
        required_skills=role_model.required_skills,
        project_category=proj_row.get("category"),
    )

    return UserRoleMatchResponse(
        user=user_profile,
        project=proj_item,
        role=role_model,
        match=match_result,
    )


# ── 2. Recommended Builders for Project Role ──────────────────────────────────

@router.get("/projects/{project_id}/roles/{role_id}/matches", response_model=List[RoleCandidateMatch])
async def get_recommended_builders_for_role(
    project_id: str,
    role_id: str,
    min_score: int = Query(0, ge=0, le=100, description="Minimum match score threshold"),
    limit: int = Query(20, ge=1, le=50, description="Max candidate results to return"),
    authorization: Optional[str] = Header(None),
):
    database = get_database()

    # 1. Fetch Project
    p_res = database.table("projects").select("*").eq("id", project_id).execute()
    if not p_res.data or len(p_res.data) == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    proj_row = p_res.data[0]

    # Check project visibility access
    if proj_row.get("visibility") == "private":
        if not authorization:
            raise HTTPException(status_code=403, detail="Private project requires authorization")
        caller_id = await get_user_id(authorization)
        if proj_row["owner_id"] != caller_id:
            m_res = database.table("project_members").select("id").eq("project_id", project_id).eq("user_id", caller_id).execute()
            if not m_res.data or len(m_res.data) == 0:
                raise HTTPException(status_code=403, detail="Not authorized to access private project candidates")

    # 2. Fetch Role
    r_res = database.table("project_roles").select("*").eq("id", role_id).eq("project_id", project_id).execute()
    if not r_res.data or len(r_res.data) == 0:
        raise HTTPException(status_code=404, detail="Role not found on this project")
    role_row = r_res.data[0]
    role_model = _row_to_project_role(role_row)

    # 3. Identify excluded user IDs:
    # - Project owner
    # - Existing project members
    # - Users who have already been accepted
    excluded_user_ids = {str(proj_row["owner_id"])}
    m_res = database.table("project_members").select("user_id").eq("project_id", project_id).execute()
    for m in (m_res.data or []):
        excluded_user_ids.add(str(m["user_id"]))

    # 4. Fetch Candidate Users
    u_res = (
        database.table("users")
        .select("id, display_name, avatar_url, username, headline, bio, skills, roles, interests, github_url, linkedin_url, availability, created_at")
        .execute()
    )
    user_rows = u_res.data or []

    candidates: List[RoleCandidateMatch] = []
    for u_row in user_rows:
        uid = str(u_row["id"])
        if uid in excluded_user_ids:
            continue

        public_user = _row_to_public_profile(u_row)
        match_result = calculate_match_score(
            user_skills=public_user.skills,
            user_roles=public_user.roles,
            user_availability=public_user.availability,
            role_name=role_model.role_name,
            required_skills=role_model.required_skills,
            project_category=proj_row.get("category"),
        )

        if match_result.score >= min_score:
            candidates.append(
                RoleCandidateMatch(
                    user=public_user,
                    match=match_result,
                )
            )

    # 5. Deterministic sorting: score DESC, username ASC
    candidates.sort(
        key=lambda c: (-c.match.score, (c.user.username or c.user.id).lower())
    )

    return candidates[:limit]


# ── 3. Recommended Roles for Current User ─────────────────────────────────────

@router.get("/matches/me/roles", response_model=List[UserRoleRecommendation])
async def get_recommended_roles_for_me(
    min_score: int = Query(0, ge=0, le=100, description="Minimum match score threshold"),
    limit: int = Query(20, ge=1, le=50, description="Max roles to return"),
    authorization: str = Header(...),
):
    caller_id = await get_user_id(authorization)
    database = get_database()

    # 1. Fetch Current User Profile
    u_res = (
        database.table("users")
        .select("id, display_name, avatar_url, username, headline, bio, skills, roles, interests, github_url, linkedin_url, availability, created_at")
        .eq("id", caller_id)
        .execute()
    )
    if not u_res.data or len(u_res.data) == 0:
        raise HTTPException(status_code=404, detail="Current user profile not found")
    current_user = _row_to_public_profile(u_res.data[0])

    # 2. Fetch Projects where caller is already a member
    mem_res = database.table("project_members").select("project_id").eq("user_id", caller_id).execute()
    my_project_ids = {str(m["project_id"]) for m in (mem_res.data or [])}

    # 3. Fetch all public recruiting projects (excluding projects caller owns or is already member of)
    p_res = (
        database.table("projects")
        .select("*")
        .eq("visibility", "public")
        .eq("status", "recruiting")
        .neq("owner_id", caller_id)
        .execute()
    )
    projects_list = [p for p in (p_res.data or []) if str(p["id"]) not in my_project_ids]

    if not projects_list:
        return []

    project_map = {str(p["id"]): p for p in projects_list}
    proj_ids = list(project_map.keys())

    # 4. Fetch open roles across these candidate projects
    r_res = (
        database.table("project_roles")
        .select("*")
        .eq("status", "open")
        .execute()
    )
    all_roles = r_res.data or []

    # Map project id -> roles list for project item summaries
    proj_roles_map: dict = {}
    for r in all_roles:
        pid = str(r["project_id"])
        if pid in project_map:
            proj_roles_map.setdefault(pid, []).append(_row_to_project_role(r))

    recommendations: List[UserRoleRecommendation] = []

    for r_row in all_roles:
        pid = str(r_row["project_id"])
        if pid not in project_map:
            continue

        role_model = _row_to_project_role(r_row)

        # Exclude filled roles
        if role_model.filled_slots >= role_model.slots:
            continue

        proj_row = project_map[pid]
        roles_for_proj = proj_roles_map.get(pid, [])
        proj_item = _row_to_project_list_item(proj_row, roles_for_proj, members_count=1)

        match_result = calculate_match_score(
            user_skills=current_user.skills,
            user_roles=current_user.roles,
            user_availability=current_user.availability,
            role_name=role_model.role_name,
            required_skills=role_model.required_skills,
            project_category=proj_row.get("category"),
        )

        if match_result.score >= min_score:
            recommendations.append(
                UserRoleRecommendation(
                    project=proj_item,
                    role=role_model,
                    match=match_result,
                )
            )

    # 5. Deterministic sorting: score DESC, project title ASC, role name ASC
    recommendations.sort(
        key=lambda r: (-r.match.score, r.project.title.lower(), r.role.role_name.lower())
    )

    return recommendations[:limit]
