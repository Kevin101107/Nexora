import pytest


# ── 1. User Profiles Tests ───────────────────────────────────────────────────

def test_get_current_user_profile(client):
    res = client.get("/api/users/me", headers={"Authorization": "Bearer user-alice"})
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == "user-alice"
    assert data["email"] == "alice@example.com"
    assert data["username"] == "alice"
    assert "React" in data["skills"]


def test_update_current_user_profile(client):
    payload = {
        "headline": "Lead Full-Stack Architect",
        "skills": ["React", "FastAPI", "TypeScript", "GraphQL"],
        "availability": "busy",
    }
    res = client.patch(
        "/api/users/me",
        json=payload,
        headers={"Authorization": "Bearer user-alice"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["headline"] == "Lead Full-Stack Architect"
    assert "TypeScript" in data["skills"]
    assert data["availability"] == "busy"


def test_get_public_profile_by_username(client):
    res = client.get("/api/users/alice")
    assert res.status_code == 200
    data = res.json()
    assert data["username"] == "alice"
    assert data["display_name"] == "Alice Innovator"
    # Ensure sensitive private fields like email are not leaked
    assert "email" not in data


def test_get_public_profile_not_found(client):
    res = client.get("/api/users/nonexistent_user_123")
    assert res.status_code == 404


def test_discover_users_with_filter(client):
    # Filter by skill 'Docker'
    res = client.get("/api/users?skill=Docker")
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 1
    assert data[0]["username"] == "bob"

    # Search keyword
    res2 = client.get("/api/users?q=Innovator")
    assert res2.status_code == 200
    assert len(res2.json()) == 1
    assert res2.json()[0]["username"] == "alice"


# ── 2. Project & Role Tests ───────────────────────────────────────────────────

def test_create_project_and_roles(client):
    payload = {
        "title": "Campus Study Hub",
        "description": "Collaborative study room finder for universities.",
        "category": "hackathon",
        "visibility": "public",
        "roles": [
            {
                "role_name": "Frontend Engineer",
                "description": "Build Next.js web application",
                "required_skills": ["Next.js", "Tailwind CSS"],
                "slots": 2,
            }
        ],
    }
    res = client.post(
        "/api/projects",
        json=payload,
        headers={"Authorization": "Bearer user-alice"},
    )
    assert res.status_code == 201
    data = res.json()
    assert data["title"] == "Campus Study Hub"
    assert data["owner_id"] == "user-alice"
    assert data["members_count"] == 1
    assert len(data["roles"]) == 1
    assert data["roles"][0]["role_name"] == "Frontend Engineer"
    assert data["roles"][0]["slots"] == 2


def test_non_owner_cannot_update_project(client):
    # Create project by Alice
    create_res = client.post(
        "/api/projects",
        json={"title": "Private Project", "description": "Alice's project"},
        headers={"Authorization": "Bearer user-alice"},
    )
    project_id = create_res.json()["id"]

    # Bob tries to update Alice's project -> 403 Forbidden
    res = client.patch(
        f"/api/projects/{project_id}",
        json={"title": "Hacked Title"},
        headers={"Authorization": "Bearer user-bob"},
    )
    assert res.status_code == 403


def test_owner_can_add_and_delete_roles(client):
    # Alice creates project
    create_res = client.post(
        "/api/projects",
        json={"title": "IoT Smart Campus", "description": "Campus sensors"},
        headers={"Authorization": "Bearer user-alice"},
    )
    proj_id = create_res.json()["id"]

    # Alice adds a role
    role_res = client.post(
        f"/api/projects/{proj_id}/roles",
        json={"role_name": "Embedded Systems Dev", "slots": 1},
        headers={"Authorization": "Bearer user-alice"},
    )
    assert role_res.status_code == 201
    role_id = role_res.json()["id"]

    # Non-owner cannot delete role
    del_forbidden = client.delete(
        f"/api/projects/{proj_id}/roles/{role_id}",
        headers={"Authorization": "Bearer user-bob"},
    )
    assert del_forbidden.status_code == 403

    # Owner deletes role
    del_res = client.delete(
        f"/api/projects/{proj_id}/roles/{role_id}",
        headers={"Authorization": "Bearer user-alice"},
    )
    assert del_res.status_code == 204


# ── 3. Application Flow Tests ─────────────────────────────────────────────────

def test_project_application_lifecycle(client):
    # 1. Alice creates project with 1 open role
    p_res = client.post(
        "/api/projects",
        json={
            "title": "Quantum AI Visualizer",
            "description": "Visualizing quantum states",
            "roles": [
                {
                    "role_name": "ML Engineer",
                    "slots": 1,
                    "required_skills": ["Python", "PyTorch"],
                }
            ],
        },
        headers={"Authorization": "Bearer user-alice"},
    )
    proj = p_res.json()
    proj_id = proj["id"]
    role_id = proj["roles"][0]["id"]

    # 2. Alice (owner) cannot apply to her own project
    self_app = client.post(
        f"/api/projects/{proj_id}/apply",
        json={"role_id": role_id, "message": "Can I join my own project?"},
        headers={"Authorization": "Bearer user-alice"},
    )
    assert self_app.status_code == 400

    # 3. Bob applies to the role
    bob_app = client.post(
        f"/api/projects/{proj_id}/apply",
        json={"role_id": role_id, "message": "I love PyTorch and quantum!"},
        headers={"Authorization": "Bearer user-bob"},
    )
    assert bob_app.status_code == 201
    app_id = bob_app.json()["id"]

    # 4. Bob cannot submit a duplicate pending application
    dup_app = client.post(
        f"/api/projects/{proj_id}/apply",
        json={"role_id": role_id, "message": "Applying again"},
        headers={"Authorization": "Bearer user-bob"},
    )
    assert dup_app.status_code == 409

    # 5. Bob can see application in /api/applications/me
    my_apps = client.get(
        "/api/applications/me",
        headers={"Authorization": "Bearer user-bob"},
    )
    assert my_apps.status_code == 200
    assert len(my_apps.json()) == 1
    assert my_apps.json()[0]["id"] == app_id

    # 6. Alice (owner) accepts Bob's application
    accept_res = client.post(
        f"/api/applications/{app_id}/respond",
        json={"action": "accepted"},
        headers={"Authorization": "Bearer user-alice"},
    )
    assert accept_res.status_code == 200
    assert accept_res.json()["status"] == "accepted"

    # 7. Verify Bob is now in project members
    proj_detail = client.get(f"/api/projects/{proj_id}")
    assert proj_detail.status_code == 200
    members = proj_detail.json()["members"]
    member_user_ids = [m["user_id"] for m in members]
    assert "user-bob" in member_user_ids

    # 8. Check team list for Bob
    bob_teams = client.get("/api/teams/me", headers={"Authorization": "Bearer user-bob"})
    assert bob_teams.status_code == 200
    assert any(t["id"] == proj_id for t in bob_teams.json())


def test_applicant_withdraw_application(client):
    # Alice creates project
    p_res = client.post(
        "/api/projects",
        json={"title": "DevBoard", "description": "Student board"},
        headers={"Authorization": "Bearer user-alice"},
    )
    proj_id = p_res.json()["id"]

    # Bob applies
    app_res = client.post(
        f"/api/projects/{proj_id}/apply",
        json={"message": "Hey!"},
        headers={"Authorization": "Bearer user-bob"},
    )
    app_id = app_res.json()["id"]

    # Bob withdraws
    withdraw_res = client.post(
        f"/api/applications/{app_id}/withdraw",
        headers={"Authorization": "Bearer user-bob"},
    )
    assert withdraw_res.status_code == 200
    assert withdraw_res.json()["status"] == "withdrawn"


# ── 4. Teammate Requests Tests ────────────────────────────────────────────────

def test_teammate_request_flow(client):
    # 1. Cannot send request to oneself
    self_req = client.post(
        "/api/requests",
        json={"receiver_id": "user-alice", "message": "Connect with myself"},
        headers={"Authorization": "Bearer user-alice"},
    )
    assert self_req.status_code == 400

    # 2. Alice sends request to Bob
    req_res = client.post(
        "/api/requests",
        json={"receiver_id": "user-bob", "message": "Want to team up for Hackathon?"},
        headers={"Authorization": "Bearer user-alice"},
    )
    assert req_res.status_code == 201
    req_id = req_res.json()["id"]

    # 3. Duplicate pending request rejected
    dup_req = client.post(
        "/api/requests",
        json={"receiver_id": "user-bob", "message": "Another request"},
        headers={"Authorization": "Bearer user-alice"},
    )
    assert dup_req.status_code == 409

    # 4. Receiver (Bob) responds and accepts
    accept_res = client.post(
        f"/api/requests/{req_id}/respond",
        json={"action": "accepted"},
        headers={"Authorization": "Bearer user-bob"},
    )
    assert accept_res.status_code == 200
    assert accept_res.json()["status"] == "accepted"


def test_cancel_teammate_request(client):
    # Bob sends request to Alice
    req_res = client.post(
        "/api/requests",
        json={"receiver_id": "user-alice", "message": "Let's connect"},
        headers={"Authorization": "Bearer user-bob"},
    )
    req_id = req_res.json()["id"]

    # Alice cannot cancel Bob's request -> 403
    forbidden_cancel = client.post(
        f"/api/requests/{req_id}/cancel",
        headers={"Authorization": "Bearer user-alice"},
    )
    assert forbidden_cancel.status_code == 403

    # Bob cancels his request
    cancel_res = client.post(
        f"/api/requests/{req_id}/cancel",
        headers={"Authorization": "Bearer user-bob"},
    )
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "cancelled"


def test_username_uniqueness_and_validation(client):
    # Bob tries to claim Alice's username -> 409
    res = client.patch(
        "/api/users/me",
        json={"username": "alice"},
        headers={"Authorization": "Bearer user-bob"},
    )
    assert res.status_code == 409

    # Invalid username format -> 422
    res_inv = client.patch(
        "/api/users/me",
        json={"username": "a!"},
        headers={"Authorization": "Bearer user-bob"},
    )
    assert res_inv.status_code == 422


def test_application_slot_limit_enforcement(client, mock_db):
    # Add third user Charlie to DB
    mock_db["users"].append({
        "id": "user-charlie",
        "email": "charlie@example.com",
        "display_name": "Charlie",
        "username": "charlie",
        "skills": ["Python"],
        "roles": ["Backend"],
        "availability": "open",
    })

    # Alice creates project with 1 slot
    p_res = client.post(
        "/api/projects",
        json={
            "title": "One-Slot Project",
            "description": "Only 1 member needed",
            "roles": [{"role_name": "Solo Dev", "slots": 1}],
        },
        headers={"Authorization": "Bearer user-alice"},
    )
    proj = p_res.json()
    proj_id = proj["id"]
    role_id = proj["roles"][0]["id"]

    # Bob applies and is accepted
    app1 = client.post(
        f"/api/projects/{proj_id}/apply",
        json={"role_id": role_id, "message": "Bob here"},
        headers={"Authorization": "Bearer user-bob"},
    ).json()

    client.post(
        f"/api/applications/{app1['id']}/respond",
        json={"action": "accepted"},
        headers={"Authorization": "Bearer user-alice"},
    )

    # Charlie applies
    app2 = client.post(
        f"/api/projects/{proj_id}/apply",
        json={"role_id": role_id, "message": "Charlie here"},
        headers={"Authorization": "Bearer user-charlie"},
    )
    # Role is already filled so applying to filled role returns 400
    assert app2.status_code == 400


def test_delete_project_lifecycle(client):
    create_res = client.post(
        "/api/projects",
        json={"title": "To be deleted", "description": "Temp project"},
        headers={"Authorization": "Bearer user-alice"},
    )
    proj_id = create_res.json()["id"]

    # Bob cannot delete Alice's project -> 403
    del_forbidden = client.delete(
        f"/api/projects/{proj_id}",
        headers={"Authorization": "Bearer user-bob"},
    )
    assert del_forbidden.status_code == 403

    # Alice deletes project -> 204
    del_ok = client.delete(
        f"/api/projects/{proj_id}",
        headers={"Authorization": "Bearer user-alice"},
    )
    assert del_ok.status_code == 204

    # Now 404
    get_res = client.get(f"/api/projects/{proj_id}")
    assert get_res.status_code == 404

