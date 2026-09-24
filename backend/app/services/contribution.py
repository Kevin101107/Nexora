from typing import Dict, Any, List, Optional
from app.models.contribution import (
    ContributionSummary,
    ProjectContribution,
    RoleContribution,
    RecentContribution,
    CollaborationSignals,
    ContributionBadge,
    ContributionProfileResponse,
)
from app.models.user import PublicUserProfile


def _format_activity_summary(act: dict, proj_title: str) -> str:
    action_type = act.get("action_type", "")
    metadata = act.get("metadata") or {}

    if action_type == "task_completed":
        title = metadata.get("task_title", "task")
        return f'Completed "{title}"'
    elif action_type == "task_status_changed":
        title = metadata.get("task_title", "task")
        new_status = metadata.get("new_status", "").replace("_", " ").title()
        return f'Moved "{title}" to {new_status}'
    elif action_type == "task_created":
        title = metadata.get("task_title", "task")
        return f'Created task "{title}"'
    elif action_type == "task_assigned":
        title = metadata.get("task_title", "task")
        return f'Assigned to "{title}"'
    elif action_type == "milestone_completed":
        title = metadata.get("milestone_title", "milestone")
        return f'Completed milestone "{title}"'
    elif action_type == "milestone_created":
        title = metadata.get("milestone_title", "milestone")
        return f'Created milestone "{title}"'
    elif action_type in ("member_joined", "team_member_joined"):
        role = metadata.get("role_name") or "squad member"
        return f'Joined squad as {role}'
    elif action_type == "project_created":
        return f'Founded project "{proj_title}"'
    elif action_type == "project_completed":
        return f'Completed project "{proj_title}"'
    else:
        clean = action_type.replace("_", " ").capitalize()
        return f'{clean} in "{proj_title}"'


def calculate_user_contributions(target_user: dict, database) -> ContributionProfileResponse:
    user_id = target_user["id"]

    # 1. Fetch all public projects
    projs_res = database.table("projects").select("*").execute()
    all_projs = projs_res.data or []
    public_projs = {p["id"]: p for p in all_projs if p.get("visibility") != "private"}

    # 2. Fetch user's membership history and current memberships
    pmh_res = database.table("project_membership_history").select("*").eq("user_id", user_id).execute()
    history_rows = pmh_res.data or []

    pm_res = database.table("project_members").select("*").eq("user_id", user_id).execute()
    current_members = pm_res.data or []

    # Merge membership records so any project in project_members not in history is included
    memberships: List[dict] = []
    seen_membership_keys = set()

    for h in history_rows:
        pid = h.get("project_id")
        if pid in public_projs:
            memberships.append(h)
            seen_membership_keys.add((pid, h.get("role_id")))

    for m in current_members:
        pid = m.get("project_id")
        key = (pid, m.get("role_id"))
        if pid in public_projs and key not in seen_membership_keys:
            memberships.append({
                "id": m.get("id"),
                "project_id": pid,
                "user_id": user_id,
                "role_id": m.get("role_id"),
                "role_name": m.get("role_name") or (
                    "Project Owner" if m.get("member_role") == "Owner" else "Squad Member"
                ),
                "joined_at": m.get("joined_at"),
                "left_at": None,
                "status": "active",
            })
            seen_membership_keys.add(key)

    # 3. Project counts
    projects_joined_ids = sorted(list(set(m["project_id"] for m in memberships if m.get("project_id") in public_projs)))
    projects_joined = len(projects_joined_ids)

    completed_projects = 0
    active_projects = 0
    for pid in projects_joined_ids:
        proj = public_projs[pid]
        p_status = proj.get("status", "active")
        if p_status == "completed":
            completed_projects += 1
        elif p_status in ("active", "recruiting", "planning"):
            # Active if user has at least one active membership in it
            has_active = any(m["project_id"] == pid and m.get("status") == "active" for m in memberships)
            if has_active:
                active_projects += 1

    current_projects = active_projects

    # 4. Tasks assigned and completed in public projects
    tasks_res = database.table("tasks").select("*").execute()
    all_tasks = tasks_res.data or []
    public_tasks = [t for t in all_tasks if t.get("project_id") in public_projs]

    # Attribution check:
    # A task is completed by user if:
    # t.status == 'done' AND (t.completed_by == user_id or (t.completed_by is None and t.assignee_id == user_id))
    user_assigned_tasks = []
    user_completed_tasks = []
    user_in_progress_tasks = []
    milestone_ids = set()

    for t in public_tasks:
        assignee_id = t.get("assignee_id")
        completed_by = t.get("completed_by")
        status = t.get("status")
        ms_id = t.get("milestone_id")

        is_assigned = (assignee_id == user_id)
        is_completed_by_user = (status == "done") and (
            completed_by == user_id or (completed_by is None and assignee_id == user_id)
        )

        if is_assigned or is_completed_by_user:
            user_assigned_tasks.append(t)
            if ms_id:
                milestone_ids.add(ms_id)

        if is_completed_by_user:
            user_completed_tasks.append(t)
        elif is_assigned and status == "in_progress":
            user_in_progress_tasks.append(t)

    tasks_assigned = len(user_assigned_tasks)
    tasks_completed = len(user_completed_tasks)
    tasks_in_progress = len(user_in_progress_tasks)
    task_completion_rate = round((tasks_completed / tasks_assigned) * 100.0, 1) if tasks_assigned > 0 else 0.0
    milestones_contributed = len(milestone_ids)

    # 5. Role history
    roles_list: List[RoleContribution] = []
    seen_role_pairs = set()

    # Pre-fetch project roles for quick lookup
    pr_res = database.table("project_roles").select("*").execute()
    roles_map = {r["id"]: r.get("role_name", "Squad Member") for r in (pr_res.data or [])}

    for m in memberships:
        pid = m["project_id"]
        proj = public_projs[pid]
        role_name = m.get("role_name")
        if not role_name:
            if m.get("role_id") and m["role_id"] in roles_map:
                role_name = roles_map[m["role_id"]]
            elif proj.get("owner_id") == user_id:
                role_name = "Project Owner"
            else:
                role_name = "Squad Member"

        pair_key = (pid, role_name)
        if pair_key not in seen_role_pairs:
            seen_role_pairs.add(pair_key)
            roles_list.append(RoleContribution(
                project_id=pid,
                project_title=proj.get("title", "Project"),
                role_id=m.get("role_id"),
                role_name=role_name,
                joined_at=m.get("joined_at"),
                left_at=m.get("left_at"),
                membership_status=m.get("status", "active"),
            ))

    roles_held = len(roles_list)

    # 6. Project contribution breakdown
    projects_breakdown: List[ProjectContribution] = []
    for pid in projects_joined_ids:
        proj = public_projs[pid]
        proj_tasks = [t for t in user_assigned_tasks if t.get("project_id") == pid]
        p_assigned = len(proj_tasks)
        p_completed = len([
            t for t in proj_tasks
            if t.get("status") == "done" and (
                t.get("completed_by") == user_id or (t.get("completed_by") is None and t.get("assignee_id") == user_id)
            )
        ])
        p_in_prog = len([t for t in proj_tasks if t.get("status") == "in_progress" and t.get("assignee_id") == user_id])
        p_rate = round((p_completed / p_assigned) * 100.0, 1) if p_assigned > 0 else 0.0
        p_ms = len(set(t.get("milestone_id") for t in proj_tasks if t.get("milestone_id")))

        # Find primary role in this project
        proj_memberships = [m for m in memberships if m.get("project_id") == pid]
        p_role = proj_memberships[0].get("role_name") if proj_memberships else None
        if not p_role:
            if proj.get("owner_id") == user_id:
                p_role = "Project Owner"
            elif proj_memberships and proj_memberships[0].get("role_id") in roles_map:
                p_role = roles_map[proj_memberships[0]["role_id"]]
            else:
                p_role = "Squad Member"

        joined_at = proj_memberships[0].get("joined_at") if proj_memberships else proj.get("created_at")
        left_at = proj_memberships[0].get("left_at") if proj_memberships else None

        # Find last activity in this project
        last_activity = None
        for t in proj_tasks:
            t_time = t.get("updated_at") or t.get("created_at")
            if t_time and (last_activity is None or t_time > last_activity):
                last_activity = t_time

        projects_breakdown.append(ProjectContribution(
            project_id=pid,
            project_title=proj.get("title", "Project"),
            project_status=proj.get("status", "active"),
            role_name=p_role,
            joined_at=joined_at,
            left_at=left_at,
            tasks_assigned=p_assigned,
            tasks_completed=p_completed,
            tasks_in_progress=p_in_prog,
            completion_rate=p_rate,
            milestones_contributed=p_ms,
            last_activity_at=last_activity,
        ))

    # 7. Recent meaningful contributions
    act_res = database.table("project_activity").select("*").execute()
    all_activities = act_res.data or []
    user_activities = [
        a for a in all_activities
        if a.get("actor_id") == user_id and a.get("project_id") in public_projs
    ]
    user_activities.sort(key=lambda a: a.get("created_at") or "", reverse=True)

    recent_contributions: List[RecentContribution] = []
    seen_event_keys = set()

    for act in user_activities:
        action_type = act.get("action_type", "")
        # Filter low-value noise
        if action_type in ("notification_read", "preference_updated"):
            continue

        pid = act.get("project_id", "")
        proj = public_projs.get(pid, {})
        summary = _format_activity_summary(act, proj.get("title", "Project"))

        event_key = (action_type, act.get("entity_id"), summary)
        if event_key not in seen_event_keys:
            seen_event_keys.add(event_key)
            recent_contributions.append(RecentContribution(
                id=str(act.get("id")),
                project_id=pid,
                project_title=proj.get("title", "Project"),
                action_type=action_type,
                summary=summary,
                created_at=str(act.get("created_at", "")),
            ))
            if len(recent_contributions) >= 10:
                break

    # 8. Reputation / Collaboration Signals & Badges
    consistency = (tasks_assigned >= 10 and task_completion_rate >= 80.0)
    signals = CollaborationSignals(
        task_completion_rate=task_completion_rate,
        completed_projects=completed_projects,
        contribution_consistency=consistency,
        active_project_count=active_projects,
        roles_contributed=roles_held,
        total_completed_tasks=tasks_completed,
    )

    badges = [
        ContributionBadge(
            id="first_project",
            name="First Project",
            description="Joined at least 1 project squad on Nexora",
            criteria="projects_joined >= 1",
            awarded=(projects_joined >= 1),
        ),
        ContributionBadge(
            id="contributor",
            name="Contributor",
            description="Completed 5 or more tasks across projects",
            criteria="tasks_completed >= 5",
            awarded=(tasks_completed >= 5),
        ),
        ContributionBadge(
            id="active_contributor",
            name="Active Contributor",
            description="Completed 20 or more tasks across projects",
            criteria="tasks_completed >= 20",
            awarded=(tasks_completed >= 20),
        ),
        ContributionBadge(
            id="project_finisher",
            name="Project Finisher",
            description="Completed at least 1 project lifecycle",
            criteria="completed_projects >= 1",
            awarded=(completed_projects >= 1),
        ),
        ContributionBadge(
            id="multi_project",
            name="Multi-Project Builder",
            description="Contributed to 3 or more projects",
            criteria="projects_joined >= 3",
            awarded=(projects_joined >= 3),
        ),
        ContributionBadge(
            id="consistent_contributor",
            name="Consistent Contributor",
            description="Assigned 10+ tasks with an 80%+ completion rate",
            criteria="tasks_assigned >= 10 and task_completion_rate >= 80%",
            awarded=consistency,
        ),
    ]

    summary = ContributionSummary(
        projects_joined=projects_joined,
        active_projects=active_projects,
        completed_projects=completed_projects,
        tasks_assigned=tasks_assigned,
        tasks_completed=tasks_completed,
        tasks_in_progress=tasks_in_progress,
        task_completion_rate=task_completion_rate,
        milestones_contributed=milestones_contributed,
        roles_held=roles_held,
        current_projects=current_projects,
    )

    user_profile = PublicUserProfile(
        id=str(target_user.get("id")),
        display_name=target_user.get("display_name"),
        avatar_url=target_user.get("avatar_url"),
        username=target_user.get("username"),
        headline=target_user.get("headline"),
        bio=target_user.get("bio"),
        skills=target_user.get("skills") or [],
        roles=target_user.get("roles") or [],
        interests=target_user.get("interests") or [],
        github_url=target_user.get("github_url"),
        linkedin_url=target_user.get("linkedin_url"),
        availability=target_user.get("availability") or "open",
        tasks_completed_count=tasks_completed,
        completed_projects_count=completed_projects,
        created_at=target_user.get("created_at"),
    )

    return ContributionProfileResponse(
        user=user_profile,
        summary=summary,
        projects=projects_breakdown,
        roles=roles_list,
        recent_activity=recent_contributions,
        signals=signals,
        badges=badges,
    )
