import pytest


def _setup_alice_bob_project(client, mock_db):
    """Sets up Alice as project owner, Bob as squad member with filled role."""
    # Ensure Charlie exists in users
    if not any(u["id"] == "user-charlie" for u in mock_db["users"]):
        mock_db["users"].append({
            "id": "user-charlie",
            "email": "charlie@example.com",
            "display_name": "Charlie Outsider",
            "username": "charlie",
            "headline": "Student outsider",
            "bio": "Not on the team",
            "skills": ["Python"],
            "roles": ["Backend Developer"],
            "interests": [],
            "availability": "open",
        })

    # Clear notifications and preferences for a clean test run
    mock_db["notifications"] = []
    mock_db["notification_preferences"] = []

    # Alice creates a project with 1 slot for Frontend Developer
    p_res = client.post(
        "/api/projects",
        json={
            "title": "VoiceGuard",
            "description": "AI safety monitor",
            "category": "hackathon",
            "roles": [
                {
                    "role_name": "Frontend Developer",
                    "slots": 1,
                    "required_skills": ["React"],
                }
            ],
        },
        headers={"Authorization": "Bearer user-alice"},
    )
    assert p_res.status_code == 201
    proj = p_res.json()
    proj_id = proj["id"]
    role_id = proj["roles"][0]["id"]

    # Bob applies and Alice accepts Bob to squad
    app_res = client.post(
        f"/api/projects/{proj_id}/apply",
        json={"role_id": role_id, "message": "Excited to join VoiceGuard!"},
        headers={"Authorization": "Bearer user-bob"},
    )
    assert app_res.status_code == 201
    application_id = app_res.json()["id"]

    dec_res = client.post(
        f"/api/applications/{application_id}/respond",
        json={"action": "accepted"},
        headers={"Authorization": "Bearer user-alice"},
    )
    assert dec_res.status_code == 200

    m_row = next(
        m for m in mock_db["project_members"]
        if m.get("project_id") == proj_id and m.get("user_id") == "user-bob"
    )

    return {
        "project_id": proj_id,
        "role_id": role_id,
        "bob_member_id": m_row["id"],
        "application_id": application_id,
    }


# 1. Invitation creates notification for recipient
def test_invitation_creates_notification_for_recipient(client, mock_db):
    mock_db["notifications"] = []
    inv_res = client.post(
        "/api/requests",
        json={"receiver_id": "user-bob", "message": "Join our team!"},
        headers={"Authorization": "Bearer user-alice"},
    )
    assert inv_res.status_code == 201

    notifs = client.get("/api/notifications", headers={"Authorization": "Bearer user-bob"}).json()
    assert len(notifs["notifications"]) == 1
    n = notifs["notifications"][0]
    assert n["type"] == "team_invitation_received"
    assert n["user_id"] == "user-bob"
    assert n["actor_id"] == "user-alice"
    assert n["is_read"] is False


# 2. Invitation acceptance notifies sender
def test_invitation_acceptance_notifies_sender(client, mock_db):
    mock_db["notifications"] = []
    inv_res = client.post(
        "/api/requests",
        json={"receiver_id": "user-bob", "message": "Join our team!"},
        headers={"Authorization": "Bearer user-alice"},
    )
    req_id = inv_res.json()["id"]

    resp = client.post(
        f"/api/requests/{req_id}/respond",
        json={"action": "accepted"},
        headers={"Authorization": "Bearer user-bob"},
    )
    assert resp.status_code == 200

    alice_notifs = client.get("/api/notifications", headers={"Authorization": "Bearer user-alice"}).json()
    types = [n["type"] for n in alice_notifs["notifications"]]
    assert "team_invitation_accepted" in types


# 3. Invitation decline notifies sender
def test_invitation_decline_notifies_sender(client, mock_db):
    mock_db["notifications"] = []
    inv_res = client.post(
        "/api/requests",
        json={"receiver_id": "user-bob", "message": "Join our team!"},
        headers={"Authorization": "Bearer user-alice"},
    )
    req_id = inv_res.json()["id"]

    resp = client.post(
        f"/api/requests/{req_id}/respond",
        json={"action": "declined"},
        headers={"Authorization": "Bearer user-bob"},
    )
    assert resp.status_code == 200

    alice_notifs = client.get("/api/notifications", headers={"Authorization": "Bearer user-alice"}).json()
    types = [n["type"] for n in alice_notifs["notifications"]]
    assert "team_invitation_declined" in types


# 4. Application creates notification for project owner
def test_application_creates_notification_for_project_owner(client, mock_db):
    mock_db["notifications"] = []
    p_res = client.post(
        "/api/projects",
        json={"title": "AppTest", "description": "Testing applications", "category": "side_project", "roles": [{"role_name": "Dev", "slots": 1}]},
        headers={"Authorization": "Bearer user-alice"},
    )
    assert p_res.status_code == 201
    proj_id = p_res.json()["id"]
    role_id = p_res.json()["roles"][0]["id"]

    client.post(
        f"/api/projects/{proj_id}/apply",
        json={"role_id": role_id, "message": "Hi Alice"},
        headers={"Authorization": "Bearer user-bob"},
    )

    alice_notifs = client.get("/api/notifications", headers={"Authorization": "Bearer user-alice"}).json()
    types = [n["type"] for n in alice_notifs["notifications"]]
    assert "application_received" in types


# 5. Application accepted notifies applicant
def test_application_accepted_notifies_applicant(client, mock_db):
    mock_db["notifications"] = []
    p_res = client.post(
        "/api/projects",
        json={"title": "AppAcceptTest", "description": "Testing accepted", "category": "side_project", "roles": [{"role_name": "Dev", "slots": 1}]},
        headers={"Authorization": "Bearer user-alice"},
    )
    assert p_res.status_code == 201
    proj_id = p_res.json()["id"]
    role_id = p_res.json()["roles"][0]["id"]

    app_res = client.post(
        f"/api/projects/{proj_id}/apply",
        json={"role_id": role_id, "message": "Let me in"},
        headers={"Authorization": "Bearer user-bob"},
    )
    app_id = app_res.json()["id"]

    client.post(
        f"/api/applications/{app_id}/respond",
        json={"action": "accepted"},
        headers={"Authorization": "Bearer user-alice"},
    )

    bob_notifs = client.get("/api/notifications", headers={"Authorization": "Bearer user-bob"}).json()
    types = [n["type"] for n in bob_notifs["notifications"]]
    assert "application_accepted" in types


# 6. Application declined notifies applicant
def test_application_declined_notifies_applicant(client, mock_db):
    mock_db["notifications"] = []
    p_res = client.post(
        "/api/projects",
        json={"title": "AppDeclineTest", "description": "Testing declined", "category": "side_project", "roles": [{"role_name": "Dev", "slots": 1}]},
        headers={"Authorization": "Bearer user-alice"},
    )
    assert p_res.status_code == 201
    proj_id = p_res.json()["id"]
    role_id = p_res.json()["roles"][0]["id"]

    app_res = client.post(
        f"/api/projects/{proj_id}/apply",
        json={"role_id": role_id, "message": "Let me in"},
        headers={"Authorization": "Bearer user-bob"},
    )
    app_id = app_res.json()["id"]

    dec_res = client.post(
        f"/api/applications/{app_id}/respond",
        json={"action": "rejected"},
        headers={"Authorization": "Bearer user-alice"},
    )
    assert dec_res.status_code == 200

    bob_notifs = client.get("/api/notifications", headers={"Authorization": "Bearer user-bob"}).json()
    types = [n["type"] for n in bob_notifs["notifications"]]
    assert "application_declined" in types


# 7. Users cannot read another user's notification
def test_users_cannot_read_another_users_notifications(client, mock_db):
    mock_db["notifications"] = [
        {"id": "notif-1", "user_id": "user-alice", "type": "task_assigned", "title": "Secret", "message": "Hi Alice", "is_read": False, "created_at": "2026-09-08T00:00:00Z"},
        {"id": "notif-2", "user_id": "user-bob", "type": "task_assigned", "title": "Public", "message": "Hi Bob", "is_read": False, "created_at": "2026-09-08T00:00:00Z"},
    ]
    bob_res = client.get("/api/notifications", headers={"Authorization": "Bearer user-bob"})
    assert bob_res.status_code == 200
    items = bob_res.json()["notifications"]
    assert len(items) == 1
    assert items[0]["id"] == "notif-2"
    assert all(item["user_id"] == "user-bob" for item in items)


# 8. Users cannot update another user's notification
def test_users_cannot_update_another_users_notification(client, mock_db):
    mock_db["notifications"] = [
        {"id": "notif-alice", "user_id": "user-alice", "type": "task_assigned", "title": "Secret", "message": "Hi Alice", "is_read": False, "created_at": "2026-09-08T00:00:00Z"},
    ]
    res = client.patch("/api/notifications/notif-alice/read", headers={"Authorization": "Bearer user-bob"})
    assert res.status_code == 404


# 9. Unread count is correct
def test_unread_count_is_correct(client, mock_db):
    mock_db["notifications"] = [
        {"id": "n1", "user_id": "user-bob", "type": "task_assigned", "title": "T1", "message": "M1", "is_read": False, "created_at": "2026-09-08T00:00:00Z"},
        {"id": "n2", "user_id": "user-bob", "type": "task_assigned", "title": "T2", "message": "M2", "is_read": True, "created_at": "2026-09-08T00:00:00Z"},
        {"id": "n3", "user_id": "user-bob", "type": "task_assigned", "title": "T3", "message": "M3", "is_read": False, "created_at": "2026-09-08T00:00:00Z"},
    ]
    res = client.get("/api/notifications/unread-count", headers={"Authorization": "Bearer user-bob"})
    assert res.status_code == 200
    assert res.json()["unread_count"] == 2


# 10. Mark single notification read works
def test_mark_single_notification_read_works(client, mock_db):
    mock_db["notifications"] = [
        {"id": "n1", "user_id": "user-bob", "type": "task_assigned", "title": "T1", "message": "M1", "is_read": False, "created_at": "2026-09-08T00:00:00Z"},
    ]
    res = client.patch("/api/notifications/n1/read", headers={"Authorization": "Bearer user-bob"})
    assert res.status_code == 200
    assert res.json()["is_read"] is True
    assert res.json()["read_at"] is not None

    unread = client.get("/api/notifications/unread-count", headers={"Authorization": "Bearer user-bob"}).json()
    assert unread["unread_count"] == 0


# 11. Mark read is idempotent
def test_mark_read_is_idempotent(client, mock_db):
    mock_db["notifications"] = [
        {"id": "n1", "user_id": "user-bob", "type": "task_assigned", "title": "T1", "message": "M1", "is_read": True, "read_at": "2026-09-08T00:00:00Z", "created_at": "2026-09-08T00:00:00Z"},
    ]
    res = client.patch("/api/notifications/n1/read", headers={"Authorization": "Bearer user-bob"})
    assert res.status_code == 200
    assert res.json()["is_read"] is True
    unread = client.get("/api/notifications/unread-count", headers={"Authorization": "Bearer user-bob"}).json()
    assert unread["unread_count"] == 0


# 12. Mark all as read affects only current user
def test_mark_all_as_read_affects_only_current_user(client, mock_db):
    mock_db["notifications"] = [
        {"id": "n1", "user_id": "user-alice", "type": "task_assigned", "title": "T1", "message": "M1", "is_read": False, "created_at": "2026-09-08T00:00:00Z"},
        {"id": "n2", "user_id": "user-bob", "type": "task_assigned", "title": "T2", "message": "M2", "is_read": False, "created_at": "2026-09-08T00:00:00Z"},
    ]
    res = client.post("/api/notifications/read-all", headers={"Authorization": "Bearer user-alice"})
    assert res.status_code == 200

    alice_unread = client.get("/api/notifications/unread-count", headers={"Authorization": "Bearer user-alice"}).json()
    bob_unread = client.get("/api/notifications/unread-count", headers={"Authorization": "Bearer user-bob"}).json()
    assert alice_unread["unread_count"] == 0
    assert bob_unread["unread_count"] == 1


# 13. Task assignment notifies assignee
def test_task_assignment_notifies_assignee(client, mock_db):
    data = _setup_alice_bob_project(client, mock_db)
    proj_id = data["project_id"]

    mock_db["notifications"] = []
    res = client.post(
        f"/api/projects/{proj_id}/tasks",
        json={"title": "Setup OAuth", "assignee_id": "user-bob"},
        headers={"Authorization": "Bearer user-alice"},
    )
    assert res.status_code == 201

    bob_notifs = client.get("/api/notifications", headers={"Authorization": "Bearer user-bob"}).json()
    types = [n["type"] for n in bob_notifs["notifications"]]
    assert "task_assigned" in types


# 14. Reassign task notifies new assignee
def test_reassign_task_notifies_new_assignee(client, mock_db):
    data = _setup_alice_bob_project(client, mock_db)
    proj_id = data["project_id"]

    t_res = client.post(
        f"/api/projects/{proj_id}/tasks",
        json={"title": "Refactor DB", "assignee_id": "user-bob"},
        headers={"Authorization": "Bearer user-alice"},
    )
    task_id = t_res.json()["id"]

    mock_db["notifications"] = []
    # Add Charlie as member first.
    mock_db["project_members"].append({
        "id": "mem-charlie",
        "project_id": proj_id,
        "user_id": "user-charlie",
        "member_role": "Member",
    })

    client.patch(
        f"/api/projects/{proj_id}/tasks/{task_id}",
        json={"assignee_id": "user-charlie"},
        headers={"Authorization": "Bearer user-alice"},
    )

    charlie_notifs = client.get("/api/notifications", headers={"Authorization": "Bearer user-charlie"}).json()
    types = [n["type"] for n in charlie_notifs["notifications"]]
    assert "task_reassigned" in types


# 15. Reassign task unassigns/notifies prior assignee correctly
def test_reassign_task_notifies_prior_assignee(client, mock_db):
    data = _setup_alice_bob_project(client, mock_db)
    proj_id = data["project_id"]

    t_res = client.post(
        f"/api/projects/{proj_id}/tasks",
        json={"title": "Refactor DB 2", "assignee_id": "user-bob"},
        headers={"Authorization": "Bearer user-alice"},
    )
    task_id = t_res.json()["id"]

    mock_db["project_members"].append({
        "id": "mem-charlie",
        "project_id": proj_id,
        "user_id": "user-charlie",
        "member_role": "Member",
    })

    mock_db["notifications"] = []
    client.patch(
        f"/api/projects/{proj_id}/tasks/{task_id}",
        json={"assignee_id": "user-charlie"},
        headers={"Authorization": "Bearer user-alice"},
    )

    bob_notifs = client.get("/api/notifications", headers={"Authorization": "Bearer user-bob"}).json()
    types = [n["type"] for n in bob_notifs["notifications"]]
    assert "task_unassigned" in types


# 16. Same assignee PATCH does not create duplicate notification
def test_same_assignee_patch_does_not_create_duplicate_notification(client, mock_db):
    data = _setup_alice_bob_project(client, mock_db)
    proj_id = data["project_id"]

    t_res = client.post(
        f"/api/projects/{proj_id}/tasks",
        json={"title": "Build UI", "assignee_id": "user-bob"},
        headers={"Authorization": "Bearer user-alice"},
    )
    task_id = t_res.json()["id"]

    initial_bob_notifs = client.get("/api/notifications", headers={"Authorization": "Bearer user-bob"}).json()["notifications"]
    assigned_count_1 = sum(1 for n in initial_bob_notifs if n["type"] == "task_assigned")

    # PATCH task with same assignee_id
    client.patch(
        f"/api/projects/{proj_id}/tasks/{task_id}",
        json={"assignee_id": "user-bob"},
        headers={"Authorization": "Bearer user-alice"},
    )

    after_bob_notifs = client.get("/api/notifications", headers={"Authorization": "Bearer user-bob"}).json()["notifications"]
    assigned_count_2 = sum(1 for n in after_bob_notifs if n["type"] == "task_assigned")
    assert assigned_count_1 == assigned_count_2


# 17. Task status change notifies owner when actor differs
def test_task_status_change_notifies_owner_when_actor_differs(client, mock_db):
    data = _setup_alice_bob_project(client, mock_db)
    proj_id = data["project_id"]

    t_res = client.post(
        f"/api/projects/{proj_id}/tasks",
        json={"title": "Write Docs", "assignee_id": "user-bob"},
        headers={"Authorization": "Bearer user-alice"},
    )
    task_id = t_res.json()["id"]

    mock_db["notifications"] = []
    # Bob changes status to in_progress
    client.patch(
        f"/api/projects/{proj_id}/tasks/{task_id}",
        json={"status": "in_progress"},
        headers={"Authorization": "Bearer user-bob"},
    )

    alice_notifs = client.get("/api/notifications", headers={"Authorization": "Bearer user-alice"}).json()
    types = [n["type"] for n in alice_notifs["notifications"]]
    assert "task_status_changed" in types


# 18. Task completion only notifies once
def test_task_completion_only_notifies_once(client, mock_db):
    data = _setup_alice_bob_project(client, mock_db)
    proj_id = data["project_id"]

    t_res = client.post(
        f"/api/projects/{proj_id}/tasks",
        json={"title": "Deploy Service", "assignee_id": "user-bob"},
        headers={"Authorization": "Bearer user-alice"},
    )
    task_id = t_res.json()["id"]

    mock_db["notifications"] = []
    # Bob marks task done
    client.patch(
        f"/api/projects/{proj_id}/tasks/{task_id}",
        json={"status": "done"},
        headers={"Authorization": "Bearer user-bob"},
    )

    alice_notifs = client.get("/api/notifications", headers={"Authorization": "Bearer user-alice"}).json()["notifications"]
    completed_notifs = [n for n in alice_notifs if n["type"] == "task_completed"]
    assert len(completed_notifs) == 1

    # Bob sends another patch with status done
    client.patch(
        f"/api/projects/{proj_id}/tasks/{task_id}",
        json={"status": "done"},
        headers={"Authorization": "Bearer user-bob"},
    )

    alice_notifs_after = client.get("/api/notifications", headers={"Authorization": "Bearer user-alice"}).json()["notifications"]
    completed_notifs_after = [n for n in alice_notifs_after if n["type"] == "task_completed"]
    assert len(completed_notifs_after) == 1


# 19. No self-notification for actor
def test_no_self_notification_for_actor(client, mock_db):
    data = _setup_alice_bob_project(client, mock_db)
    proj_id = data["project_id"]

    mock_db["notifications"] = []
    # Alice creates task assigned to Alice
    client.post(
        f"/api/projects/{proj_id}/tasks",
        json={"title": "Alice Task", "assignee_id": "user-alice"},
        headers={"Authorization": "Bearer user-alice"},
    )

    alice_notifs = client.get("/api/notifications", headers={"Authorization": "Bearer user-alice"}).json()
    assert len(alice_notifs["notifications"]) == 0


# 20. Milestone creation notifies squad members
def test_milestone_creation_notifies_squad_members(client, mock_db):
    data = _setup_alice_bob_project(client, mock_db)
    proj_id = data["project_id"]

    mock_db["notifications"] = []
    client.post(
        f"/api/projects/{proj_id}/milestones",
        json={"title": "Sprint 1 MVP"},
        headers={"Authorization": "Bearer user-alice"},
    )

    bob_notifs = client.get("/api/notifications", headers={"Authorization": "Bearer user-bob"}).json()
    types = [n["type"] for n in bob_notifs["notifications"]]
    assert "milestone_created" in types


# 21. Milestone meaningful update creates notifications
def test_milestone_meaningful_update_creates_notifications(client, mock_db):
    data = _setup_alice_bob_project(client, mock_db)
    proj_id = data["project_id"]

    ms_res = client.post(
        f"/api/projects/{proj_id}/milestones",
        json={"title": "Sprint 2 Beta"},
        headers={"Authorization": "Bearer user-alice"},
    )
    ms_id = ms_res.json()["id"]

    mock_db["notifications"] = []
    patch_res = client.patch(
        f"/api/projects/{proj_id}/milestones/{ms_id}",
        json={"status": "active"},
        headers={"Authorization": "Bearer user-alice"},
    )
    assert patch_res.status_code == 200

    bob_notifs = client.get("/api/notifications", headers={"Authorization": "Bearer user-bob"}).json()
    types = [n["type"] for n in bob_notifs["notifications"]]
    assert "milestone_updated" in types


# 22. No-op milestone update creates no notification
def test_noop_milestone_update_creates_no_notification(client, mock_db):
    data = _setup_alice_bob_project(client, mock_db)
    proj_id = data["project_id"]

    ms_res = client.post(
        f"/api/projects/{proj_id}/milestones",
        json={"title": "Sprint 3 Polish"},
        headers={"Authorization": "Bearer user-alice"},
    )
    ms_id = ms_res.json()["id"]

    mock_db["notifications"] = []
    # Update with only title or description, not status or due_date
    client.patch(
        f"/api/projects/{proj_id}/milestones/{ms_id}",
        json={"title": "Sprint 3 Polish Revised"},
        headers={"Authorization": "Bearer user-alice"},
    )

    bob_notifs = client.get("/api/notifications", headers={"Authorization": "Bearer user-bob"}).json()
    assert len(bob_notifs["notifications"]) == 0


# 23. Milestone completion notifies squad members once
def test_milestone_completion_notifies_squad_members_once(client, mock_db):
    data = _setup_alice_bob_project(client, mock_db)
    proj_id = data["project_id"]

    ms_res = client.post(
        f"/api/projects/{proj_id}/milestones",
        json={"title": "Sprint 4 Final"},
        headers={"Authorization": "Bearer user-alice"},
    )
    ms_id = ms_res.json()["id"]

    mock_db["notifications"] = []
    client.patch(
        f"/api/projects/{proj_id}/milestones/{ms_id}",
        json={"status": "completed"},
        headers={"Authorization": "Bearer user-alice"},
    )

    bob_notifs = client.get("/api/notifications", headers={"Authorization": "Bearer user-bob"}).json()["notifications"]
    completed_notifs = [n for n in bob_notifs if n["type"] == "milestone_completed"]
    assert len(completed_notifs) == 1

    # Repeat completed PATCH
    client.patch(
        f"/api/projects/{proj_id}/milestones/{ms_id}",
        json={"status": "completed"},
        headers={"Authorization": "Bearer user-alice"},
    )

    bob_notifs_after = client.get("/api/notifications", headers={"Authorization": "Bearer user-bob"}).json()["notifications"]
    completed_notifs_after = [n for n in bob_notifs_after if n["type"] == "milestone_completed"]
    assert len(completed_notifs_after) == 1


# 24. Member removal unassigns tasks and handles notification cleanly
def test_member_removal_unassigns_tasks_and_handles_notification_cleanly(client, mock_db):
    data = _setup_alice_bob_project(client, mock_db)
    proj_id = data["project_id"]
    bob_member_id = data["bob_member_id"]

    # Assign a task to Bob
    t_res = client.post(
        f"/api/projects/{proj_id}/tasks",
        json={"title": "Feature Work", "assignee_id": "user-bob"},
        headers={"Authorization": "Bearer user-alice"},
    )
    task_id = t_res.json()["id"]

    mock_db["notifications"] = []
    del_res = client.delete(
        f"/api/projects/{proj_id}/members/{bob_member_id}",
        headers={"Authorization": "Bearer user-alice"},
    )
    assert del_res.status_code == 204

    # Verify task in DB is unassigned
    task_in_db = next(t for t in mock_db["tasks"] if t["id"] == task_id)
    assert task_in_db["assignee_id"] is None

    bob_notifs = client.get("/api/notifications", headers={"Authorization": "Bearer user-bob"}).json()["notifications"]
    types = [n["type"] for n in bob_notifs]
    assert "member_removed_project" in types
    assert "task_unassigned" in types


# 25. Role filled notification behavior works
def test_role_filled_notification_behavior(client, mock_db):
    mock_db["notifications"] = []
    p_res = client.post(
        "/api/projects",
        json={"title": "FillTest", "description": "Testing role filled", "category": "side_project", "roles": [{"role_name": "UI Lead", "slots": 1}]},
        headers={"Authorization": "Bearer user-alice"},
    )
    assert p_res.status_code == 201
    proj_id = p_res.json()["id"]
    role_id = p_res.json()["roles"][0]["id"]

    app_res = client.post(
        f"/api/projects/{proj_id}/apply",
        json={"role_id": role_id, "message": "Applying"},
        headers={"Authorization": "Bearer user-bob"},
    )
    app_id = app_res.json()["id"]

    mock_db["notifications"] = []
    client.post(
        f"/api/applications/{app_id}/respond",
        json={"action": "accepted"},
        headers={"Authorization": "Bearer user-alice"},
    )

    alice_notifs = client.get("/api/notifications", headers={"Authorization": "Bearer user-alice"}).json()["notifications"]
    types = [n["type"] for n in alice_notifs]
    assert "project_role_filled" in types


# 26. Role reopened notification behavior works
def test_role_reopened_notification_behavior(client, mock_db):
    data = _setup_alice_bob_project(client, mock_db)
    proj_id = data["project_id"]
    bob_member_id = data["bob_member_id"]

    mock_db["notifications"] = []
    client.delete(
        f"/api/projects/{proj_id}/members/{bob_member_id}",
        headers={"Authorization": "Bearer user-alice"},
    )

    alice_notifs = client.get("/api/notifications", headers={"Authorization": "Bearer user-alice"}).json()["notifications"]
    types = [n["type"] for n in alice_notifs]
    assert "project_role_reopened" in types


# 27. Disabled team_updates blocks new team notifications
def test_disabled_team_updates_blocks_new_team_notifications(client, mock_db):
    # Bob disables team_updates
    pref_res = client.patch(
        "/api/notifications/preferences",
        json={"team_updates": False},
        headers={"Authorization": "Bearer user-bob"},
    )
    assert pref_res.status_code == 200
    assert pref_res.json()["team_updates"] is False

    mock_db["notifications"] = []
    # Alice invites Bob
    client.post(
        "/api/requests",
        json={"receiver_id": "user-bob", "message": "Join us"},
        headers={"Authorization": "Bearer user-alice"},
    )

    bob_notifs = client.get("/api/notifications", headers={"Authorization": "Bearer user-bob"}).json()
    assert len(bob_notifs["notifications"]) == 0


# 28. Disabled task_updates blocks new task notifications
def test_disabled_task_updates_blocks_new_task_notifications(client, mock_db):
    data = _setup_alice_bob_project(client, mock_db)
    proj_id = data["project_id"]

    # Bob disables task_updates
    client.patch(
        "/api/notifications/preferences",
        json={"task_updates": False},
        headers={"Authorization": "Bearer user-bob"},
    )

    mock_db["notifications"] = []
    client.post(
        f"/api/projects/{proj_id}/tasks",
        json={"title": "Silent Task", "assignee_id": "user-bob"},
        headers={"Authorization": "Bearer user-alice"},
    )

    bob_notifs = client.get("/api/notifications", headers={"Authorization": "Bearer user-bob"}).json()
    assert len(bob_notifs["notifications"]) == 0


# 29. Disabled milestone_updates blocks new milestone notifications
def test_disabled_milestone_updates_blocks_new_milestone_notifications(client, mock_db):
    data = _setup_alice_bob_project(client, mock_db)
    proj_id = data["project_id"]

    # Bob disables milestone_updates
    client.patch(
        "/api/notifications/preferences",
        json={"milestone_updates": False},
        headers={"Authorization": "Bearer user-bob"},
    )

    mock_db["notifications"] = []
    client.post(
        f"/api/projects/{proj_id}/milestones",
        json={"title": "Silent Milestone"},
        headers={"Authorization": "Bearer user-alice"},
    )

    bob_notifs = client.get("/api/notifications", headers={"Authorization": "Bearer user-bob"}).json()
    assert len(bob_notifs["notifications"]) == 0


# 30. Existing notifications remain after preference changes
def test_existing_notifications_remain_after_preference_changes(client, mock_db):
    mock_db["notifications"] = [
        {"id": "n-exist", "user_id": "user-bob", "type": "team_invitation_received", "title": "Old Invite", "message": "Join", "is_read": False, "created_at": "2026-09-08T00:00:00Z"},
    ]
    # Bob disables team_updates
    client.patch(
        "/api/notifications/preferences",
        json={"team_updates": False},
        headers={"Authorization": "Bearer user-bob"},
    )

    bob_notifs = client.get("/api/notifications", headers={"Authorization": "Bearer user-bob"}).json()["notifications"]
    assert len(bob_notifs) == 1
    assert bob_notifs[0]["id"] == "n-exist"
