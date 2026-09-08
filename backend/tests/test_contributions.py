import pytest
from datetime import datetime, timezone


def _auth_header(user_id: str = "user-alice"):
    return {"Authorization": f"Bearer {user_id}"}


def test_new_user_has_empty_contributions(client, mock_db):
    res = client.get("/api/users/bob/contributions")
    assert res.status_code == 200
    data = res.json()

    assert data["user"]["username"] == "bob"
    summary = data["summary"]
    assert summary["projects_joined"] == 0
    assert summary["active_projects"] == 0
    assert summary["completed_projects"] == 0
    assert summary["tasks_assigned"] == 0
    assert summary["tasks_completed"] == 0
    assert summary["tasks_in_progress"] == 0
    assert summary["task_completion_rate"] == 0.0
    assert summary["milestones_contributed"] == 0
    assert summary["roles_held"] == 0

    assert data["projects"] == []
    assert data["roles"] == []
    assert data["recent_activity"] == []

    # All badges should be unearned
    for badge in data["badges"]:
        assert badge["awarded"] is False


def test_user_profile_response_shape(client, mock_db):
    res = client.get("/api/users/alice/contributions")
    assert res.status_code == 200
    data = res.json()

    # Verify all expected top-level keys exist
    for key in ["user", "summary", "projects", "roles", "recent_activity", "signals", "badges"]:
        assert key in data

    signals = data["signals"]
    assert "task_completion_rate" in signals
    assert "completed_projects" in signals
    assert "contribution_consistency" in signals
    assert "active_project_count" in signals
    assert "roles_contributed" in signals
    assert "total_completed_tasks" in signals


def test_task_completed_by_attribution(client, mock_db):
    # Setup project and member
    mock_db["projects"].append({
        "id": "proj-1",
        "title": "Alpha Project",
        "visibility": "public",
        "status": "active",
        "owner_id": "user-alice",
    })
    mock_db["project_members"].append({
        "id": "pm-1",
        "project_id": "proj-1",
        "user_id": "user-alice",
        "member_role": "Owner",
        "role_name": "Project Lead",
    })

    # Create task directly as done
    create_res = client.post(
        "/api/projects/proj-1/tasks",
        headers=_auth_header("user-alice"),
        json={
            "title": "Initial Task",
            "description": "Testing done status",
            "status": "done",
            "assignee_id": "user-alice",
        },
    )
    assert create_res.status_code == 201
    task_data = create_res.json()
    assert task_data["completed_by"] == "user-alice"
    assert task_data["completed_at"] is not None

    # Check contributions
    res = client.get("/api/users/alice/contributions")
    assert res.status_code == 200
    summary = res.json()["summary"]
    assert summary["tasks_completed"] == 1
    assert summary["tasks_assigned"] == 1
    assert summary["task_completion_rate"] == 100.0


def test_task_reopen_resets_attribution(client, mock_db):
    mock_db["projects"].append({
        "id": "proj-1",
        "title": "Alpha Project",
        "visibility": "public",
        "status": "active",
        "owner_id": "user-alice",
    })
    mock_db["project_members"].append({
        "id": "pm-1",
        "project_id": "proj-1",
        "user_id": "user-alice",
        "member_role": "Owner",
    })
    # Create task in progress
    t_res = client.post(
        "/api/projects/proj-1/tasks",
        headers=_auth_header("user-alice"),
        json={"title": "Reopen Task", "status": "in_progress", "assignee_id": "user-alice"},
    )
    task_id = t_res.json()["id"]

    # Mark done
    done_res = client.patch(
        f"/api/projects/proj-1/tasks/{task_id}",
        headers=_auth_header("user-alice"),
        json={"status": "done"},
    )
    assert done_res.json()["completed_by"] == "user-alice"

    c_res = client.get("/api/users/alice/contributions")
    assert c_res.json()["summary"]["tasks_completed"] == 1

    # Reopen to in_progress
    reopen_res = client.patch(
        f"/api/projects/proj-1/tasks/{task_id}",
        headers=_auth_header("user-alice"),
        json={"status": "in_progress"},
    )
    assert reopen_res.json()["completed_by"] is None
    assert reopen_res.json()["completed_at"] is None

    c_res_after = client.get("/api/users/alice/contributions")
    assert c_res_after.json()["summary"]["tasks_completed"] == 0


def test_task_reassignment_preserves_completed_by(client, mock_db):
    mock_db["projects"].append({
        "id": "proj-1",
        "title": "Alpha Project",
        "visibility": "public",
        "status": "active",
        "owner_id": "user-alice",
    })
    mock_db["project_members"].extend([
        {"id": "pm-1", "project_id": "proj-1", "user_id": "user-alice", "member_role": "Owner"},
        {"id": "pm-2", "project_id": "proj-1", "user_id": "user-bob", "member_role": "Member"},
    ])

    # Alice completes the task
    t_res = client.post(
        "/api/projects/proj-1/tasks",
        headers=_auth_header("user-alice"),
        json={"title": "Important Task", "status": "done", "assignee_id": "user-alice"},
    )
    task_id = t_res.json()["id"]

    # Reassign the completed task to Bob
    client.patch(
        f"/api/projects/proj-1/tasks/{task_id}",
        headers=_auth_header("user-alice"),
        json={"assignee_id": "user-bob"},
    )

    # Completed by should still be Alice
    alice_res = client.get("/api/users/alice/contributions")
    assert alice_res.json()["summary"]["tasks_completed"] == 1

    # Bob should not have completion credit
    bob_res = client.get("/api/users/bob/contributions")
    assert bob_res.json()["summary"]["tasks_completed"] == 0


def test_legacy_task_fallback_to_assignee(client, mock_db):
    mock_db["projects"].append({
        "id": "proj-legacy",
        "title": "Legacy Project",
        "visibility": "public",
        "status": "active",
        "owner_id": "user-alice",
    })
    mock_db["project_members"].append({
        "id": "pm-legacy",
        "project_id": "proj-legacy",
        "user_id": "user-alice",
        "member_role": "Owner",
    })
    # Seed legacy task without completed_by
    mock_db["tasks"].append({
        "id": "task-legacy-1",
        "project_id": "proj-legacy",
        "title": "Old Done Task",
        "status": "done",
        "assignee_id": "user-alice",
        "completed_by": None,
        "completed_at": None,
    })

    res = client.get("/api/users/alice/contributions")
    assert res.status_code == 200
    assert res.json()["summary"]["tasks_completed"] == 1


def test_private_project_not_included_in_public_contributions(client, mock_db):
    mock_db["projects"].append({
        "id": "proj-secret",
        "title": "Secret Project",
        "visibility": "private",
        "status": "active",
        "owner_id": "user-alice",
    })
    mock_db["project_members"].append({
        "id": "pm-secret",
        "project_id": "proj-secret",
        "user_id": "user-alice",
        "member_role": "Owner",
    })
    mock_db["tasks"].append({
        "id": "task-secret-1",
        "project_id": "proj-secret",
        "title": "Secret Done Task",
        "status": "done",
        "assignee_id": "user-alice",
        "completed_by": "user-alice",
    })
    mock_db["project_activity"].append({
        "id": "act-secret",
        "project_id": "proj-secret",
        "actor_id": "user-alice",
        "action_type": "task_completed",
        "metadata": {"task_title": "Secret Done Task"},
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    res = client.get("/api/users/alice/contributions")
    assert res.status_code == 200
    data = res.json()

    # Should not show any private project data
    assert data["summary"]["projects_joined"] == 0
    assert data["summary"]["tasks_completed"] == 0
    assert len(data["projects"]) == 0
    assert len(data["recent_activity"]) == 0


def test_role_history_deduplication(client, mock_db):
    mock_db["projects"].append({
        "id": "proj-1",
        "title": "Alpha Project",
        "visibility": "public",
        "status": "active",
        "owner_id": "user-alice",
    })
    mock_db["project_membership_history"].extend([
        {
            "id": "pmh-1",
            "project_id": "proj-1",
            "user_id": "user-alice",
            "role_name": "Project Lead",
            "status": "active",
        },
        {
            "id": "pmh-2",
            "project_id": "proj-1",
            "user_id": "user-alice",
            "role_name": "Project Lead",
            "status": "active",
        },
    ])

    res = client.get("/api/users/alice/contributions")
    assert res.status_code == 200
    roles = res.json()["roles"]
    assert len(roles) == 1
    assert roles[0]["role_name"] == "Project Lead"


def test_member_removal_preserves_completed_tasks(client, mock_db):
    mock_db["projects"].append({
        "id": "proj-1",
        "title": "Alpha Project",
        "visibility": "public",
        "status": "active",
        "owner_id": "user-alice",
    })
    mock_db["project_members"].extend([
        {"id": "pm-1", "project_id": "proj-1", "user_id": "user-alice", "member_role": "Owner"},
        {"id": "pm-2", "project_id": "proj-1", "user_id": "user-bob", "member_role": "Member", "role_name": "Backend Dev"},
    ])
    mock_db["tasks"].extend([
        {
            "id": "t-done",
            "project_id": "proj-1",
            "title": "Finished Task",
            "status": "done",
            "assignee_id": "user-bob",
            "completed_by": "user-bob",
        },
        {
            "id": "t-prog",
            "project_id": "proj-1",
            "title": "WIP Task",
            "status": "in_progress",
            "assignee_id": "user-bob",
        },
    ])

    # Remove Bob
    del_res = client.delete(
        "/api/projects/proj-1/members/pm-2",
        headers=_auth_header("user-alice"),
    )
    assert del_res.status_code == 204

    # Bob's completed task is preserved
    bob_res = client.get("/api/users/bob/contributions")
    assert bob_res.json()["summary"]["tasks_completed"] == 1


def test_member_removal_unassigns_incomplete_tasks(client, mock_db):
    mock_db["projects"].append({
        "id": "proj-1",
        "title": "Alpha Project",
        "visibility": "public",
        "status": "active",
        "owner_id": "user-alice",
    })
    mock_db["project_members"].extend([
        {"id": "pm-1", "project_id": "proj-1", "user_id": "user-alice", "member_role": "Owner"},
        {"id": "pm-2", "project_id": "proj-1", "user_id": "user-bob", "member_role": "Member"},
    ])
    mock_db["tasks"].append({
        "id": "t-wip",
        "project_id": "proj-1",
        "title": "WIP Task",
        "status": "in_progress",
        "assignee_id": "user-bob",
    })

    client.delete("/api/projects/proj-1/members/pm-2", headers=_auth_header("user-alice"))

    # Incomplete task should now be unassigned
    task = next(t for t in mock_db["tasks"] if t["id"] == "t-wip")
    assert task["assignee_id"] is None


def test_member_removal_records_left_at_and_status(client, mock_db):
    mock_db["projects"].append({
        "id": "proj-1",
        "title": "Alpha Project",
        "visibility": "public",
        "status": "active",
        "owner_id": "user-alice",
    })
    mock_db["project_members"].extend([
        {"id": "pm-1", "project_id": "proj-1", "user_id": "user-alice", "member_role": "Owner"},
        {"id": "pm-2", "project_id": "proj-1", "user_id": "user-bob", "member_role": "Member"},
    ])
    mock_db["project_membership_history"].append({
        "id": "pmh-bob",
        "project_id": "proj-1",
        "user_id": "user-bob",
        "role_name": "Dev",
        "status": "active",
    })

    client.delete("/api/projects/proj-1/members/pm-2", headers=_auth_header("user-alice"))

    history_record = next(h for h in mock_db["project_membership_history"] if h["user_id"] == "user-bob")
    assert history_record["status"] == "removed"
    assert history_record["left_at"] is not None


def test_badge_first_project_awarded(client, mock_db):
    mock_db["projects"].append({
        "id": "proj-1",
        "title": "Alpha Project",
        "visibility": "public",
        "status": "active",
        "owner_id": "user-alice",
    })
    mock_db["project_members"].append({
        "id": "pm-1",
        "project_id": "proj-1",
        "user_id": "user-alice",
        "member_role": "Owner",
    })

    res = client.get("/api/users/alice/contributions")
    badges = {b["id"]: b for b in res.json()["badges"]}
    assert badges["first_project"]["awarded"] is True


def test_badge_contributor_awarded(client, mock_db):
    mock_db["projects"].append({
        "id": "proj-1",
        "title": "Alpha Project",
        "visibility": "public",
        "status": "active",
        "owner_id": "user-alice",
    })
    mock_db["project_members"].append({
        "id": "pm-1",
        "project_id": "proj-1",
        "user_id": "user-alice",
        "member_role": "Owner",
    })
    # Add 5 completed tasks
    for i in range(5):
        mock_db["tasks"].append({
            "id": f"task-{i}",
            "project_id": "proj-1",
            "title": f"Task {i}",
            "status": "done",
            "completed_by": "user-alice",
        })

    res = client.get("/api/users/alice/contributions")
    badges = {b["id"]: b for b in res.json()["badges"]}
    assert badges["contributor"]["awarded"] is True
    assert badges["active_contributor"]["awarded"] is False


def test_badge_active_contributor_awarded(client, mock_db):
    mock_db["projects"].append({
        "id": "proj-1",
        "title": "Alpha Project",
        "visibility": "public",
        "status": "active",
        "owner_id": "user-alice",
    })
    mock_db["project_members"].append({
        "id": "pm-1",
        "project_id": "proj-1",
        "user_id": "user-alice",
        "member_role": "Owner",
    })
    # Add 20 completed tasks
    for i in range(20):
        mock_db["tasks"].append({
            "id": f"task-{i}",
            "project_id": "proj-1",
            "title": f"Task {i}",
            "status": "done",
            "completed_by": "user-alice",
        })

    res = client.get("/api/users/alice/contributions")
    badges = {b["id"]: b for b in res.json()["badges"]}
    assert badges["active_contributor"]["awarded"] is True


def test_badge_project_finisher_awarded(client, mock_db):
    mock_db["projects"].append({
        "id": "proj-1",
        "title": "Alpha Project",
        "visibility": "public",
        "status": "completed",
        "owner_id": "user-alice",
    })
    mock_db["project_members"].append({
        "id": "pm-1",
        "project_id": "proj-1",
        "user_id": "user-alice",
        "member_role": "Owner",
    })

    res = client.get("/api/users/alice/contributions")
    badges = {b["id"]: b for b in res.json()["badges"]}
    assert badges["project_finisher"]["awarded"] is True


def test_badge_multi_project_awarded(client, mock_db):
    for i in range(3):
        pid = f"proj-{i}"
        mock_db["projects"].append({
            "id": pid,
            "title": f"Project {i}",
            "visibility": "public",
            "status": "active",
            "owner_id": "user-alice",
        })
        mock_db["project_members"].append({
            "id": f"pm-{i}",
            "project_id": pid,
            "user_id": "user-alice",
            "member_role": "Owner",
        })

    res = client.get("/api/users/alice/contributions")
    badges = {b["id"]: b for b in res.json()["badges"]}
    assert badges["multi_project"]["awarded"] is True


def test_badge_consistent_contributor_awarded(client, mock_db):
    mock_db["projects"].append({
        "id": "proj-1",
        "title": "Alpha Project",
        "visibility": "public",
        "status": "active",
        "owner_id": "user-alice",
    })
    mock_db["project_members"].append({
        "id": "pm-1",
        "project_id": "proj-1",
        "user_id": "user-alice",
        "member_role": "Owner",
    })
    # 10 tasks assigned: 8 done, 2 in_progress -> 80% completion
    for i in range(8):
        mock_db["tasks"].append({
            "id": f"task-done-{i}",
            "project_id": "proj-1",
            "title": f"Done {i}",
            "status": "done",
            "assignee_id": "user-alice",
            "completed_by": "user-alice",
        })
    for i in range(2):
        mock_db["tasks"].append({
            "id": f"task-wip-{i}",
            "project_id": "proj-1",
            "title": f"WIP {i}",
            "status": "in_progress",
            "assignee_id": "user-alice",
        })

    res = client.get("/api/users/alice/contributions")
    badges = {b["id"]: b for b in res.json()["badges"]}
    assert badges["consistent_contributor"]["awarded"] is True


def test_badge_consistent_contributor_not_awarded_under_threshold(client, mock_db):
    mock_db["projects"].append({
        "id": "proj-1",
        "title": "Alpha Project",
        "visibility": "public",
        "status": "active",
        "owner_id": "user-alice",
    })
    mock_db["project_members"].append({
        "id": "pm-1",
        "project_id": "proj-1",
        "user_id": "user-alice",
        "member_role": "Owner",
    })
    # 5 tasks assigned: all 5 done (100%), but tasks_assigned < 10
    for i in range(5):
        mock_db["tasks"].append({
            "id": f"task-done-{i}",
            "project_id": "proj-1",
            "title": f"Done {i}",
            "status": "done",
            "assignee_id": "user-alice",
            "completed_by": "user-alice",
        })

    res = client.get("/api/users/alice/contributions")
    badges = {b["id"]: b for b in res.json()["badges"]}
    assert badges["consistent_contributor"]["awarded"] is False


def test_task_completion_rate_calculation(client, mock_db):
    mock_db["projects"].append({
        "id": "proj-1",
        "title": "Alpha Project",
        "visibility": "public",
        "status": "active",
        "owner_id": "user-alice",
    })
    mock_db["project_members"].append({
        "id": "pm-1",
        "project_id": "proj-1",
        "user_id": "user-alice",
        "member_role": "Owner",
    })
    # 3 tasks assigned: 1 completed -> 33.3%
    mock_db["tasks"].extend([
        {"id": "t1", "project_id": "proj-1", "status": "done", "assignee_id": "user-alice", "completed_by": "user-alice"},
        {"id": "t2", "project_id": "proj-1", "status": "in_progress", "assignee_id": "user-alice"},
        {"id": "t3", "project_id": "proj-1", "status": "in_progress", "assignee_id": "user-alice"},
    ])

    res = client.get("/api/users/alice/contributions")
    assert res.json()["summary"]["task_completion_rate"] == 33.3


def test_recent_contributions_limit_10(client, mock_db):
    mock_db["projects"].append({
        "id": "proj-1",
        "title": "Alpha Project",
        "visibility": "public",
        "status": "active",
        "owner_id": "user-alice",
    })
    # Add 15 distinct activities
    for i in range(15):
        mock_db["project_activity"].append({
            "id": f"act-{i}",
            "project_id": "proj-1",
            "actor_id": "user-alice",
            "action_type": "task_completed",
            "entity_id": f"task-ent-{i}",
            "metadata": {"task_title": f"Task #{i}"},
            "created_at": f"2026-09-08T10:{i:02d}:00Z",
        })

    res = client.get("/api/users/alice/contributions")
    assert len(res.json()["recent_activity"]) == 10


def test_recent_contributions_excludes_noisy_events(client, mock_db):
    mock_db["projects"].append({
        "id": "proj-1",
        "title": "Alpha Project",
        "visibility": "public",
        "status": "active",
        "owner_id": "user-alice",
    })
    mock_db["project_activity"].extend([
        {
            "id": "act-noisy-1",
            "project_id": "proj-1",
            "actor_id": "user-alice",
            "action_type": "notification_read",
            "created_at": "2026-09-08T12:00:00Z",
        },
        {
            "id": "act-noisy-2",
            "project_id": "proj-1",
            "actor_id": "user-alice",
            "action_type": "preference_updated",
            "created_at": "2026-09-08T12:01:00Z",
        },
        {
            "id": "act-good",
            "project_id": "proj-1",
            "actor_id": "user-alice",
            "action_type": "task_completed",
            "metadata": {"task_title": "Clean Task"},
            "created_at": "2026-09-08T12:02:00Z",
        },
    ])

    res = client.get("/api/users/alice/contributions")
    activities = res.json()["recent_activity"]
    assert len(activities) == 1
    assert activities[0]["action_type"] == "task_completed"


def test_recent_contributions_readable_summaries(client, mock_db):
    mock_db["projects"].append({
        "id": "proj-1",
        "title": "Alpha Project",
        "visibility": "public",
        "status": "active",
        "owner_id": "user-alice",
    })
    mock_db["project_activity"].extend([
        {
            "id": "act-1",
            "project_id": "proj-1",
            "actor_id": "user-alice",
            "action_type": "task_completed",
            "metadata": {"task_title": "Design Specs"},
            "created_at": "2026-09-08T10:00:00Z",
        },
        {
            "id": "act-2",
            "project_id": "proj-1",
            "actor_id": "user-alice",
            "action_type": "milestone_completed",
            "metadata": {"milestone_title": "MVP Release"},
            "created_at": "2026-09-08T11:00:00Z",
        },
    ])

    res = client.get("/api/users/alice/contributions")
    acts = {a["action_type"]: a["summary"] for a in res.json()["recent_activity"]}
    assert acts["task_completed"] == 'Completed "Design Specs"'
    assert acts["milestone_completed"] == 'Completed milestone "MVP Release"'


def test_contributions_by_username_endpoint(client, mock_db):
    res = client.get("/api/users/alice/contributions")
    assert res.status_code == 200
    assert res.json()["user"]["username"] == "alice"


def test_contributions_by_id_endpoint(client, mock_db):
    res = client.get("/api/users/user-alice/contributions")
    assert res.status_code == 200
    assert res.json()["user"]["id"] == "user-alice"


def test_contributions_me_endpoint(client, mock_db):
    res = client.get("/api/users/me/contributions", headers=_auth_header("user-alice"))
    assert res.status_code == 200
    assert res.json()["user"]["id"] == "user-alice"


def test_contributions_me_unauthorized(client, mock_db):
    res = client.get("/api/users/me/contributions")
    assert res.status_code == 401


def test_contributions_user_not_found(client, mock_db):
    res = client.get("/api/users/nonexistent_builder_xyz/contributions")
    assert res.status_code == 404
    assert res.json()["detail"] == "User not found"


def test_list_users_includes_tasks_completed_count(client, mock_db):
    mock_db["projects"].append({
        "id": "proj-1",
        "title": "Alpha Project",
        "visibility": "public",
        "status": "completed",
        "owner_id": "user-alice",
    })
    mock_db["project_members"].append({
        "id": "pm-1",
        "project_id": "proj-1",
        "user_id": "user-alice",
        "member_role": "Owner",
    })
    mock_db["tasks"].append({
        "id": "t-done",
        "project_id": "proj-1",
        "title": "Task Done",
        "status": "done",
        "completed_by": "user-alice",
    })

    res = client.get("/api/users")
    assert res.status_code == 200
    users = {u["id"]: u for u in res.json()}
    assert users["user-alice"]["tasks_completed_count"] == 1
    assert users["user-alice"]["completed_projects_count"] == 1
    assert users["user-bob"]["tasks_completed_count"] == 0
    assert users["user-bob"]["completed_projects_count"] == 0
