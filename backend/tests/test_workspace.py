import pytest


def _setup_users_and_project(client, mock_db):
    """Helper to setup Alice (owner), Bob (squad member), and Charlie (outsider)."""
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
            "roles": ["Backend"],
            "interests": [],
            "availability": "open",
        })

    # Alice creates a project
    p_res = client.post(
        "/api/projects",
        json={
            "title": "StudySquad",
            "description": "Collaborative study tool",
            "category": "side_project",
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
        json={"role_id": role_id, "message": "I want to build this frontend!"},
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

    # Get Bob's member id in project_members
    m_row = next(
        m for m in mock_db["project_members"]
        if m.get("project_id") == proj_id and m.get("user_id") == "user-bob"
    )

    return {
        "project_id": proj_id,
        "role_id": role_id,
        "bob_member_id": m_row["id"],
    }


def test_owner_creates_task(client, mock_db):
    data = _setup_users_and_project(client, mock_db)
    proj_id = data["project_id"]

    # Alice creates task
    res = client.post(
        f"/api/projects/{proj_id}/tasks",
        json={
            "title": "Setup project workspace",
            "description": "Initialize repository and UI structure",
            "priority": "high",
            "due_date": "2026-09-20",
        },
        headers={"Authorization": "Bearer user-alice"},
    )
    assert res.status_code == 201
    task = res.json()
    assert task["title"] == "Setup project workspace"
    assert task["status"] == "todo"
    assert task["priority"] == "high"
    assert task["created_by"] == "user-alice"
    assert task["assignee_id"] is None

    # Squad member (Bob) cannot create tasks (owner only)
    b_res = client.post(
        f"/api/projects/{proj_id}/tasks",
        json={"title": "Unauthorized task"},
        headers={"Authorization": "Bearer user-bob"},
    )
    assert b_res.status_code == 403


def test_squad_member_can_view_tasks(client, mock_db):
    data = _setup_users_and_project(client, mock_db)
    proj_id = data["project_id"]

    # Alice creates two tasks
    client.post(
        f"/api/projects/{proj_id}/tasks",
        json={"title": "Task 1"},
        headers={"Authorization": "Bearer user-alice"},
    )
    client.post(
        f"/api/projects/{proj_id}/tasks",
        json={"title": "Task 2"},
        headers={"Authorization": "Bearer user-alice"},
    )

    # Bob (squad member) views tasks
    res = client.get(
        f"/api/projects/{proj_id}/tasks",
        headers={"Authorization": "Bearer user-bob"},
    )
    assert res.status_code == 200
    tasks = res.json()
    assert len(tasks) == 2
    assert {t["title"] for t in tasks} == {"Task 1", "Task 2"}


def test_outsider_cannot_access_workspace(client, mock_db):
    data = _setup_users_and_project(client, mock_db)
    proj_id = data["project_id"]

    # Charlie (outsider) tries to access workspace endpoints
    headers = {"Authorization": "Bearer user-charlie"}

    assert client.get(f"/api/projects/{proj_id}/workspace", headers=headers).status_code == 403
    assert client.get(f"/api/projects/{proj_id}/tasks", headers=headers).status_code == 403
    assert client.get(f"/api/projects/{proj_id}/milestones", headers=headers).status_code == 403
    assert client.get(f"/api/projects/{proj_id}/activity", headers=headers).status_code == 403
    assert client.get(f"/api/projects/{proj_id}/progress", headers=headers).status_code == 403
    assert client.post(f"/api/projects/{proj_id}/tasks", json={"title": "Bad"}, headers=headers).status_code == 403


def test_owner_assigns_task_to_squad_member(client, mock_db):
    data = _setup_users_and_project(client, mock_db)
    proj_id = data["project_id"]

    # Alice creates task assigned directly to Bob
    res = client.post(
        f"/api/projects/{proj_id}/tasks",
        json={
            "title": "Build React Components",
            "assignee_id": "user-bob",
            "priority": "high",
        },
        headers={"Authorization": "Bearer user-alice"},
    )
    assert res.status_code == 201
    task = res.json()
    assert task["assignee_id"] == "user-bob"
    assert task["assignee"] is not None
    assert task["assignee"]["username"] == "bob"

    # Alice updates task assignee to herself
    t_id = task["id"]
    u_res = client.patch(
        f"/api/projects/{proj_id}/tasks/{t_id}",
        json={"assignee_id": "user-alice"},
        headers={"Authorization": "Bearer user-alice"},
    )
    assert u_res.status_code == 200
    assert u_res.json()["assignee_id"] == "user-alice"


def test_cannot_assign_task_to_outsider(client, mock_db):
    data = _setup_users_and_project(client, mock_db)
    proj_id = data["project_id"]

    # Try creating task assigned to outsider Charlie
    res = client.post(
        f"/api/projects/{proj_id}/tasks",
        json={
            "title": "Outsider Task",
            "assignee_id": "user-charlie",
        },
        headers={"Authorization": "Bearer user-alice"},
    )
    assert res.status_code == 400
    assert "not a squad member" in res.json()["detail"].lower()

    # Create task unassigned first, then try updating assignee to outsider
    t_res = client.post(
        f"/api/projects/{proj_id}/tasks",
        json={"title": "Unassigned Task"},
        headers={"Authorization": "Bearer user-alice"},
    )
    assert t_res.status_code == 201
    task_id = t_res.json()["id"]

    patch_res = client.patch(
        f"/api/projects/{proj_id}/tasks/{task_id}",
        json={"assignee_id": "user-charlie"},
        headers={"Authorization": "Bearer user-alice"},
    )
    assert patch_res.status_code == 400


def test_squad_member_updates_own_assigned_task_status(client, mock_db):
    data = _setup_users_and_project(client, mock_db)
    proj_id = data["project_id"]

    # Alice creates task assigned to Bob
    res = client.post(
        f"/api/projects/{proj_id}/tasks",
        json={
            "title": "Implement Navbar",
            "assignee_id": "user-bob",
            "status": "todo",
        },
        headers={"Authorization": "Bearer user-alice"},
    )
    task_id = res.json()["id"]

    # Bob updates status to in_progress
    p1 = client.patch(
        f"/api/projects/{proj_id}/tasks/{task_id}",
        json={"status": "in_progress"},
        headers={"Authorization": "Bearer user-bob"},
    )
    assert p1.status_code == 200
    assert p1.json()["status"] == "in_progress"

    # Bob updates status to done
    p2 = client.patch(
        f"/api/projects/{proj_id}/tasks/{task_id}",
        json={"status": "done"},
        headers={"Authorization": "Bearer user-bob"},
    )
    assert p2.status_code == 200
    assert p2.json()["status"] == "done"


def test_squad_member_cannot_modify_unauthorized_task_fields(client, mock_db):
    data = _setup_users_and_project(client, mock_db)
    proj_id = data["project_id"]

    # Alice creates task assigned to Bob
    res = client.post(
        f"/api/projects/{proj_id}/tasks",
        json={
            "title": "Implement Navbar",
            "assignee_id": "user-bob",
            "priority": "medium",
        },
        headers={"Authorization": "Bearer user-alice"},
    )
    task_id = res.json()["id"]

    # Bob tries to modify title -> 403
    t_mod = client.patch(
        f"/api/projects/{proj_id}/tasks/{task_id}",
        json={"title": "Hacked Title"},
        headers={"Authorization": "Bearer user-bob"},
    )
    assert t_mod.status_code == 403

    # Bob tries to modify priority -> 403
    p_mod = client.patch(
        f"/api/projects/{proj_id}/tasks/{task_id}",
        json={"priority": "high"},
        headers={"Authorization": "Bearer user-bob"},
    )
    assert p_mod.status_code == 403

    # Alice creates task assigned to herself
    res2 = client.post(
        f"/api/projects/{proj_id}/tasks",
        json={"title": "Alice's Private Task", "assignee_id": "user-alice"},
        headers={"Authorization": "Bearer user-alice"},
    )
    task2_id = res2.json()["id"]

    # Bob tries to update Alice's task status -> 403
    o_mod = client.patch(
        f"/api/projects/{proj_id}/tasks/{task2_id}",
        json={"status": "done"},
        headers={"Authorization": "Bearer user-bob"},
    )
    assert o_mod.status_code == 403


def test_owner_can_edit_any_project_task(client, mock_db):
    data = _setup_users_and_project(client, mock_db)
    proj_id = data["project_id"]

    # Alice creates task assigned to Bob
    res = client.post(
        f"/api/projects/{proj_id}/tasks",
        json={"title": "Original Title", "assignee_id": "user-bob", "priority": "low"},
        headers={"Authorization": "Bearer user-alice"},
    )
    task_id = res.json()["id"]

    # Alice edits title, description, priority, and due_date
    patch_res = client.patch(
        f"/api/projects/{proj_id}/tasks/{task_id}",
        json={
            "title": "Updated Title",
            "description": "Detailed description added",
            "priority": "high",
            "due_date": "2026-09-30",
        },
        headers={"Authorization": "Bearer user-alice"},
    )
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["title"] == "Updated Title"
    assert updated["description"] == "Detailed description added"
    assert updated["priority"] == "high"
    assert updated["due_date"] == "2026-09-30"


def test_owner_can_delete_task(client, mock_db):
    data = _setup_users_and_project(client, mock_db)
    proj_id = data["project_id"]

    res = client.post(
        f"/api/projects/{proj_id}/tasks",
        json={"title": "To be deleted"},
        headers={"Authorization": "Bearer user-alice"},
    )
    task_id = res.json()["id"]

    # Bob tries to delete task -> 403
    b_del = client.delete(
        f"/api/projects/{proj_id}/tasks/{task_id}",
        headers={"Authorization": "Bearer user-bob"},
    )
    assert b_del.status_code == 403

    # Alice deletes task -> 204
    a_del = client.delete(
        f"/api/projects/{proj_id}/tasks/{task_id}",
        headers={"Authorization": "Bearer user-alice"},
    )
    assert a_del.status_code == 204

    # Verify task no longer exists
    get_res = client.get(
        f"/api/projects/{proj_id}/tasks/{task_id}",
        headers={"Authorization": "Bearer user-alice"},
    )
    assert get_res.status_code == 404


def test_task_progress_calculation(client, mock_db):
    data = _setup_users_and_project(client, mock_db)
    proj_id = data["project_id"]

    # Create 3 tasks
    t1 = client.post(
        f"/api/projects/{proj_id}/tasks",
        json={"title": "Task 1", "status": "done"},
        headers={"Authorization": "Bearer user-alice"},
    ).json()

    t2 = client.post(
        f"/api/projects/{proj_id}/tasks",
        json={"title": "Task 2", "status": "in_progress"},
        headers={"Authorization": "Bearer user-alice"},
    ).json()

    t3 = client.post(
        f"/api/projects/{proj_id}/tasks",
        json={"title": "Task 3", "status": "todo"},
        headers={"Authorization": "Bearer user-alice"},
    ).json()

    prog = client.get(
        f"/api/projects/{proj_id}/progress",
        headers={"Authorization": "Bearer user-alice"},
    ).json()

    assert prog["total_tasks"] == 3
    assert prog["completed_tasks"] == 1
    assert prog["in_progress_tasks"] == 1
    assert prog["todo_tasks"] == 1
    assert prog["progress_percentage"] == 33.3

    # Mark second task done
    client.patch(
        f"/api/projects/{proj_id}/tasks/{t2['id']}",
        json={"status": "done"},
        headers={"Authorization": "Bearer user-alice"},
    )

    prog2 = client.get(
        f"/api/projects/{proj_id}/progress",
        headers={"Authorization": "Bearer user-alice"},
    ).json()

    assert prog2["total_tasks"] == 3
    assert prog2["completed_tasks"] == 2
    assert prog2["progress_percentage"] == 66.7


def test_zero_task_project_returns_zero_progress(client, mock_db):
    data = _setup_users_and_project(client, mock_db)
    proj_id = data["project_id"]

    prog = client.get(
        f"/api/projects/{proj_id}/progress",
        headers={"Authorization": "Bearer user-alice"},
    ).json()

    assert prog["total_tasks"] == 0
    assert prog["completed_tasks"] == 0
    assert prog["progress_percentage"] == 0.0


def test_owner_creates_milestone(client, mock_db):
    data = _setup_users_and_project(client, mock_db)
    proj_id = data["project_id"]

    # Bob (squad member) cannot create milestone
    b_res = client.post(
        f"/api/projects/{proj_id}/milestones",
        json={"title": "Unauthorized Milestone"},
        headers={"Authorization": "Bearer user-bob"},
    )
    assert b_res.status_code == 403

    # Alice (owner) creates milestone
    res = client.post(
        f"/api/projects/{proj_id}/milestones",
        json={
            "title": "MVP Launch",
            "description": "First working alpha release",
            "due_date": "2026-10-01",
            "status": "active",
        },
        headers={"Authorization": "Bearer user-alice"},
    )
    assert res.status_code == 201
    ms = res.json()
    assert ms["title"] == "MVP Launch"
    assert ms["status"] == "active"
    assert ms["total_tasks"] == 0
    assert ms["completed_tasks"] == 0


def test_task_attached_to_valid_milestone(client, mock_db):
    data = _setup_users_and_project(client, mock_db)
    proj_id = data["project_id"]

    # Alice creates milestone
    ms = client.post(
        f"/api/projects/{proj_id}/milestones",
        json={"title": "Beta Demo"},
        headers={"Authorization": "Bearer user-alice"},
    ).json()

    # Alice creates task attached to milestone
    t_res = client.post(
        f"/api/projects/{proj_id}/tasks",
        json={
            "title": "Deploy staging app",
            "milestone_id": ms["id"],
        },
        headers={"Authorization": "Bearer user-alice"},
    )
    assert t_res.status_code == 201
    task = t_res.json()
    assert task["milestone_id"] == ms["id"]
    assert task["milestone_title"] == "Beta Demo"


def test_task_cannot_use_milestone_from_another_project(client, mock_db):
    data = _setup_users_and_project(client, mock_db)
    proj_a = data["project_id"]

    # Alice creates a second project
    p2 = client.post(
        "/api/projects",
        json={"title": "Other Project", "description": "Second test project", "category": "side_project"},
        headers={"Authorization": "Bearer user-alice"},
    ).json()
    proj_b = p2["id"]

    # Milestone in Project B
    ms_b = client.post(
        f"/api/projects/{proj_b}/milestones",
        json={"title": "Project B Milestone"},
        headers={"Authorization": "Bearer user-alice"},
    ).json()

    # Alice tries to use Project B's milestone in Project A
    bad_res = client.post(
        f"/api/projects/{proj_a}/tasks",
        json={
            "title": "Cross Project Task",
            "milestone_id": ms_b["id"],
        },
        headers={"Authorization": "Bearer user-alice"},
    )
    assert bad_res.status_code == 400
    assert "does not belong to this project" in bad_res.json()["detail"].lower()


def test_milestone_progress_calculation(client, mock_db):
    data = _setup_users_and_project(client, mock_db)
    proj_id = data["project_id"]

    # Alice creates milestone
    ms = client.post(
        f"/api/projects/{proj_id}/milestones",
        json={"title": "Core Engine"},
        headers={"Authorization": "Bearer user-alice"},
    ).json()
    ms_id = ms["id"]

    # Task 1 attached: done
    client.post(
        f"/api/projects/{proj_id}/tasks",
        json={"title": "M Task 1", "milestone_id": ms_id, "status": "done"},
        headers={"Authorization": "Bearer user-alice"},
    )

    # Task 2 attached: todo
    client.post(
        f"/api/projects/{proj_id}/tasks",
        json={"title": "M Task 2", "milestone_id": ms_id, "status": "todo"},
        headers={"Authorization": "Bearer user-alice"},
    )

    # Task 3 unattached
    client.post(
        f"/api/projects/{proj_id}/tasks",
        json={"title": "Unattached Task", "status": "done"},
        headers={"Authorization": "Bearer user-alice"},
    )

    # Check milestone progress
    m_list = client.get(
        f"/api/projects/{proj_id}/milestones",
        headers={"Authorization": "Bearer user-alice"},
    ).json()
    assert len(m_list) == 1
    m_data = m_list[0]
    assert m_data["total_tasks"] == 2
    assert m_data["completed_tasks"] == 1
    assert m_data["progress_percentage"] == 50.0


def test_removing_squad_member_unassigns_their_tasks(client, mock_db):
    data = _setup_users_and_project(client, mock_db)
    proj_id = data["project_id"]
    bob_member_id = data["bob_member_id"]

    # Create 2 tasks assigned to Bob
    t1 = client.post(
        f"/api/projects/{proj_id}/tasks",
        json={"title": "Bob Task 1", "assignee_id": "user-bob"},
        headers={"Authorization": "Bearer user-alice"},
    ).json()

    t2 = client.post(
        f"/api/projects/{proj_id}/tasks",
        json={"title": "Bob Task 2", "assignee_id": "user-bob"},
        headers={"Authorization": "Bearer user-alice"},
    ).json()

    # Create 1 task assigned to Alice
    t3 = client.post(
        f"/api/projects/{proj_id}/tasks",
        json={"title": "Alice Task", "assignee_id": "user-alice"},
        headers={"Authorization": "Bearer user-alice"},
    ).json()

    # Alice removes Bob from project
    del_res = client.delete(
        f"/api/projects/{proj_id}/members/{bob_member_id}",
        headers={"Authorization": "Bearer user-alice"},
    )
    assert del_res.status_code == 204

    # Verify tasks: Bob's tasks are NOT deleted, but assignee_id is now None
    tasks = client.get(
        f"/api/projects/{proj_id}/tasks",
        headers={"Authorization": "Bearer user-alice"},
    ).json()
    task_map = {t["id"]: t for t in tasks}

    assert task_map[t1["id"]]["assignee_id"] is None
    assert task_map[t2["id"]]["assignee_id"] is None
    assert task_map[t3["id"]]["assignee_id"] == "user-alice"


def test_activity_records_lifecycle(client, mock_db):
    data = _setup_users_and_project(client, mock_db)
    proj_id = data["project_id"]

    # 1. Create task with assignee -> records task_created and task_assigned
    t_res = client.post(
        f"/api/projects/{proj_id}/tasks",
        json={"title": "Audit Security", "assignee_id": "user-bob", "status": "todo"},
        headers={"Authorization": "Bearer user-alice"},
    )
    assert t_res.status_code == 201
    task_id = t_res.json()["id"]

    # 2. Status change to in_progress
    client.patch(
        f"/api/projects/{proj_id}/tasks/{task_id}",
        json={"status": "in_progress"},
        headers={"Authorization": "Bearer user-bob"},
    )

    # 3. Status change to done -> records task_status_changed and task_completed
    client.patch(
        f"/api/projects/{proj_id}/tasks/{task_id}",
        json={"status": "done"},
        headers={"Authorization": "Bearer user-bob"},
    )

    # 4. Fetch activity feed
    act_res = client.get(
        f"/api/projects/{proj_id}/activity",
        headers={"Authorization": "Bearer user-alice"},
    )
    assert act_res.status_code == 200
    activities = act_res.json()
    actions = [a["action_type"] for a in activities]

    # Check that all events were recorded
    assert "task_created" in actions
    assert "task_assigned" in actions
    assert "task_status_changed" in actions
    assert "task_completed" in actions


def test_workspace_overview_endpoint(client, mock_db):
    data = _setup_users_and_project(client, mock_db)
    proj_id = data["project_id"]

    # Create a milestone and a task
    client.post(
        f"/api/projects/{proj_id}/milestones",
        json={"title": "Launch Alpha"},
        headers={"Authorization": "Bearer user-alice"},
    )
    client.post(
        f"/api/projects/{proj_id}/tasks",
        json={"title": "Setup DNS", "assignee_id": "user-bob", "status": "done"},
        headers={"Authorization": "Bearer user-alice"},
    )

    # Alice views workspace overview
    ws_res = client.get(
        f"/api/projects/{proj_id}/workspace",
        headers={"Authorization": "Bearer user-alice"},
    )
    assert ws_res.status_code == 200
    ws = ws_res.json()

    assert ws["project_id"] == proj_id
    assert ws["is_owner"] is True
    assert ws["progress"]["total_tasks"] == 1
    assert ws["progress"]["completed_tasks"] == 1
    assert len(ws["active_milestones"]) == 1
    assert len(ws["members"]) >= 2

    # Check member stats for Bob
    bob_stat = next(m for m in ws["members"] if m["user_id"] == "user-bob")
    assert bob_stat["assigned_tasks_count"] == 1
    assert bob_stat["completed_tasks_count"] == 1

    # Bob views workspace overview (is_owner should be False)
    bob_ws_res = client.get(
        f"/api/projects/{proj_id}/workspace",
        headers={"Authorization": "Bearer user-bob"},
    )
    assert bob_ws_res.status_code == 200
    assert bob_ws_res.json()["is_owner"] is False
