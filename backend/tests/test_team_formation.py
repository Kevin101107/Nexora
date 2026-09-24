import pytest


def test_invite_candidate_to_role_success(client):
    # 1. Alice creates project with 1 open role
    p_res = client.post(
        "/api/projects",
        json={
            "title": "Cloud IDE",
            "description": "Browser-based development environment",
            "category": "side_project",
            "roles": [
                {
                    "role_name": "Backend Engineer",
                    "slots": 1,
                    "required_skills": ["Go", "Docker"],
                }
            ],
        },
        headers={"Authorization": "Bearer user-alice"},
    )
    assert p_res.status_code == 201
    proj = p_res.json()
    proj_id = proj["id"]
    role_id = proj["roles"][0]["id"]

    # 2. Alice invites Bob to the Backend Engineer role
    invite_res = client.post(
        "/api/requests",
        json={
            "receiver_id": "user-bob",
            "project_id": proj_id,
            "role_id": role_id,
            "message": "We need your Go expertise for the runtime daemon.",
        },
        headers={"Authorization": "Bearer user-alice"},
    )
    assert invite_res.status_code == 201
    inv = invite_res.json()
    assert inv["sender_id"] == "user-alice"
    assert inv["receiver_id"] == "user-bob"
    assert inv["project_id"] == proj_id
    assert inv["project_title"] == "Cloud IDE"
    assert inv["role_id"] == role_id
    assert inv["role_name"] == "Backend Engineer"
    assert inv["status"] == "pending"


def test_invite_validation_errors(client, mock_db):
    mock_db["users"].append({
        "id": "user-charlie",
        "email": "charlie@example.com",
        "display_name": "Charlie",
        "username": "charlie",
        "skills": ["Rust"],
        "roles": ["Systems"],
        "availability": "open",
    })

    # Alice creates project with 1 role
    p_res = client.post(
        "/api/projects",
        json={
            "title": "Robotics Vision",
            "description": "Autonomous navigation for drones",
            "roles": [{"role_name": "Vision Lead", "slots": 1}],
        },
        headers={"Authorization": "Bearer user-alice"},
    )
    proj_id = p_res.json()["id"]
    role_id = p_res.json()["roles"][0]["id"]

    # 1. Self-invite rejected -> 400
    res_self = client.post(
        "/api/requests",
        json={"receiver_id": "user-alice", "project_id": proj_id, "role_id": role_id},
        headers={"Authorization": "Bearer user-alice"},
    )
    assert res_self.status_code == 400

    # 2. Non-existent recipient -> 404
    res_no_user = client.post(
        "/api/requests",
        json={"receiver_id": "user-ghost", "project_id": proj_id},
        headers={"Authorization": "Bearer user-alice"},
    )
    assert res_no_user.status_code == 404

    # 3. Non-existent project -> 404
    res_no_proj = client.post(
        "/api/requests",
        json={"receiver_id": "user-bob", "project_id": "project-fake"},
        headers={"Authorization": "Bearer user-alice"},
    )
    assert res_no_proj.status_code == 404

    # 4. Non-owner cannot invite candidate to project -> 403
    res_non_owner = client.post(
        "/api/requests",
        json={"receiver_id": "user-charlie", "project_id": proj_id},
        headers={"Authorization": "Bearer user-bob"},
    )
    assert res_non_owner.status_code == 403

    # 5. Invalid role on project -> 404
    res_bad_role = client.post(
        "/api/requests",
        json={"receiver_id": "user-bob", "project_id": proj_id, "role_id": "role-invalid"},
        headers={"Authorization": "Bearer user-alice"},
    )
    assert res_bad_role.status_code == 404


def test_invite_accept_flow_and_reciprocal_resolution(client):
    # 1. Alice creates project
    p_res = client.post(
        "/api/projects",
        json={
            "title": "NeuroNet",
            "description": "Spiking neural network simulator",
            "roles": [{"role_name": "Core Dev", "slots": 1}],
        },
        headers={"Authorization": "Bearer user-alice"},
    )
    proj_id = p_res.json()["id"]
    role_id = p_res.json()["roles"][0]["id"]

    # 2. Bob creates a pending application to that role
    app_res = client.post(
        f"/api/projects/{proj_id}/apply",
        json={"role_id": role_id, "message": "Applying directly"},
        headers={"Authorization": "Bearer user-bob"},
    )
    assert app_res.status_code == 201
    app_id = app_res.json()["id"]

    # 3. Alice also invites Bob to that role
    inv_res = client.post(
        "/api/requests",
        json={"receiver_id": "user-bob", "project_id": proj_id, "role_id": role_id},
        headers={"Authorization": "Bearer user-alice"},
    )
    assert inv_res.status_code == 201
    inv_id = inv_res.json()["id"]

    # 4. Bob accepts the invitation
    acc_res = client.post(
        f"/api/requests/{inv_id}/respond",
        json={"action": "accepted"},
        headers={"Authorization": "Bearer user-bob"},
    )
    assert acc_res.status_code == 200
    assert acc_res.json()["status"] == "accepted"

    # 5. Verify Bob is now in squad roster
    proj_detail = client.get(f"/api/projects/{proj_id}").json()
    members = proj_detail["members"]
    assert any(m["user_id"] == "user-bob" for m in members)
    assert proj_detail["members_count"] == 2

    # 6. Verify role occupancy is updated and role is now marked filled
    role = next(r for r in proj_detail["roles"] if r["id"] == role_id)
    assert role["filled_slots"] == 1
    assert role["status"] == "filled"
    assert proj_detail["open_roles_count"] == 0

    # 7. Verify reciprocal application was automatically marked accepted
    my_apps = client.get("/api/applications/me", headers={"Authorization": "Bearer user-bob"}).json()
    my_app = next(a for a in my_apps if a["id"] == app_id)
    assert my_app["status"] == "accepted"

    # 8. Attempting to invite Bob again to the same project should now return 400 (already member)
    dup_member_inv = client.post(
        "/api/requests",
        json={"receiver_id": "user-bob", "project_id": proj_id},
        headers={"Authorization": "Bearer user-alice"},
    )
    assert dup_member_inv.status_code == 400


def test_invite_decline_and_cancel_lifecycle(client):
    # Alice creates project
    p_res = client.post(
        "/api/projects",
        json={"title": "DataFlow", "description": "Streaming engine"},
        headers={"Authorization": "Bearer user-alice"},
    )
    proj_id = p_res.json()["id"]

    # Alice invites Bob
    inv_res = client.post(
        "/api/requests",
        json={"receiver_id": "user-bob", "project_id": proj_id},
        headers={"Authorization": "Bearer user-alice"},
    )
    inv_id = inv_res.json()["id"]

    # 1. Alice cannot respond to her own sent request -> 403
    alice_respond = client.post(
        f"/api/requests/{inv_id}/respond",
        json={"action": "declined"},
        headers={"Authorization": "Bearer user-alice"},
    )
    assert alice_respond.status_code == 403

    # 2. Bob declines the invitation
    bob_decline = client.post(
        f"/api/requests/{inv_id}/respond",
        json={"action": "declined"},
        headers={"Authorization": "Bearer user-bob"},
    )
    assert bob_decline.status_code == 200
    assert bob_decline.json()["status"] == "declined"

    # 3. Bob is NOT in project members
    proj = client.get(f"/api/projects/{proj_id}").json()
    assert not any(m["user_id"] == "user-bob" for m in proj["members"])

    # 4. Cannot respond again -> 400
    res_again = client.post(
        f"/api/requests/{inv_id}/respond",
        json={"action": "accepted"},
        headers={"Authorization": "Bearer user-bob"},
    )
    assert res_again.status_code == 400

    # 5. Alice sends another invitation and then cancels it
    inv_res2 = client.post(
        "/api/requests",
        json={"receiver_id": "user-bob", "project_id": proj_id},
        headers={"Authorization": "Bearer user-alice"},
    )
    inv2_id = inv_res2.json()["id"]

    # Bob cannot cancel Alice's sent request -> 403
    bob_cancel = client.post(
        f"/api/requests/{inv2_id}/cancel",
        headers={"Authorization": "Bearer user-bob"},
    )
    assert bob_cancel.status_code == 403

    # Alice cancels
    alice_cancel = client.post(
        f"/api/requests/{inv2_id}/cancel",
        headers={"Authorization": "Bearer user-alice"},
    )
    assert alice_cancel.status_code == 200
    assert alice_cancel.json()["status"] == "cancelled"


def test_application_acceptance_with_match_score(client):
    # Alice creates project with a role requiring skills Bob has
    p_res = client.post(
        "/api/projects",
        json={
            "title": "KubeDeploy",
            "description": "Automated deployments on Kubernetes",
            "roles": [
                {
                    "role_name": "DevOps Engineer",
                    "slots": 1,
                    "required_skills": ["Docker", "Kubernetes", "Go"],
                }
            ],
        },
        headers={"Authorization": "Bearer user-alice"},
    )
    proj_id = p_res.json()["id"]
    role_id = p_res.json()["roles"][0]["id"]

    # Bob applies
    app_res = client.post(
        f"/api/projects/{proj_id}/apply",
        json={"role_id": role_id, "message": "I know Docker, K8s, and Go thoroughly!"},
        headers={"Authorization": "Bearer user-bob"},
    )
    assert app_res.status_code == 201
    app_id = app_res.json()["id"]

    # Alice lists applications for her project
    apps_list_res = client.get(
        f"/api/projects/{proj_id}/applications",
        headers={"Authorization": "Bearer user-alice"},
    )
    assert apps_list_res.status_code == 200
    apps_list = apps_list_res.json()
    assert len(apps_list) == 1
    app_item = apps_list[0]
    assert app_item["id"] == app_id
    assert app_item["role_name"] == "DevOps Engineer"
    # Ensure Match Score V1 is computed and present
    assert app_item["match"] is not None
    assert app_item["match"]["score"] > 70
    assert "Go" in app_item["match"]["matched_skills"]
    assert "Docker" in app_item["match"]["matched_skills"]

    # Alice accepts Bob's application
    acc_res = client.post(
        f"/api/applications/{app_id}/respond",
        json={"action": "accepted"},
        headers={"Authorization": "Bearer user-alice"},
    )
    assert acc_res.status_code == 200
    assert acc_res.json()["status"] == "accepted"
    assert acc_res.json()["match"] is not None

    # Verify project roster and role occupancy
    proj = client.get(f"/api/projects/{proj_id}").json()
    assert proj["members_count"] == 2
    role = proj["roles"][0]
    assert role["filled_slots"] == 1
    assert role["status"] == "filled"


def test_member_removal_reopens_role(client):
    # 1. Alice creates project with 1 role
    p_res = client.post(
        "/api/projects",
        json={
            "title": "QuantumSim",
            "description": "Quantum circuit simulation",
            "roles": [{"role_name": "Algorithm Researcher", "slots": 1}],
        },
        headers={"Authorization": "Bearer user-alice"},
    )
    proj_id = p_res.json()["id"]
    role_id = p_res.json()["roles"][0]["id"]

    # 2. Bob applies and is accepted
    app_res = client.post(
        f"/api/projects/{proj_id}/apply",
        json={"role_id": role_id, "message": "I want to research circuits"},
        headers={"Authorization": "Bearer user-bob"},
    )
    app_id = app_res.json()["id"]
    client.post(
        f"/api/applications/{app_id}/respond",
        json={"action": "accepted"},
        headers={"Authorization": "Bearer user-alice"},
    )

    # Verify role is filled
    proj_before = client.get(f"/api/projects/{proj_id}").json()
    assert proj_before["roles"][0]["status"] == "filled"
    assert proj_before["roles"][0]["filled_slots"] == 1
    assert proj_before["members_count"] == 2

    # Find Bob's member_id in project members
    bob_member = next(m for m in proj_before["members"] if m["user_id"] == "user-bob")
    bob_member_id = bob_member["id"]
    alice_member = next(m for m in proj_before["members"] if m["user_id"] == "user-alice")

    # 3. Bob cannot remove members (not owner) -> 403
    res_unauth = client.delete(
        f"/api/projects/{proj_id}/members/{bob_member_id}",
        headers={"Authorization": "Bearer user-bob"},
    )
    assert res_unauth.status_code == 403

    # 4. Alice cannot remove herself (project owner) -> 400
    res_remove_owner = client.delete(
        f"/api/projects/{proj_id}/members/{alice_member['id']}",
        headers={"Authorization": "Bearer user-alice"},
    )
    assert res_remove_owner.status_code == 400

    # 5. Alice removes Bob -> 204 No Content
    del_res = client.delete(
        f"/api/projects/{proj_id}/members/{bob_member_id}",
        headers={"Authorization": "Bearer user-alice"},
    )
    assert del_res.status_code == 204

    # 6. Verify Bob is gone from squad roster
    proj_after = client.get(f"/api/projects/{proj_id}").json()
    assert proj_after["members_count"] == 1
    assert not any(m["user_id"] == "user-bob" for m in proj_after["members"])

    # 7. Verify role occupancy is decremented and status reverted to "open"
    role_after = proj_after["roles"][0]
    assert role_after["filled_slots"] == 0
    assert role_after["status"] == "open"
    assert proj_after["open_roles_count"] == 1


def test_matching_recommendation_updates_upon_team_formation(client, mock_db):
    # Setup users in mock_db
    mock_db["users"].append({
        "id": "user-candidate",
        "email": "candidate@example.com",
        "display_name": "Claire Candidate",
        "username": "claire",
        "skills": ["Python", "FastAPI"],
        "roles": ["Backend"],
        "availability": "open",
    })

    # Alice creates project with 1 slot for Backend
    p_res = client.post(
        "/api/projects",
        json={
            "title": "API Gateway",
            "description": "High performance API gateway",
            "category": "side_project",
            "roles": [{"role_name": "Backend Engineer", "slots": 1, "required_skills": ["Python", "FastAPI"]}],
        },
        headers={"Authorization": "Bearer user-alice"},
    )
    proj_id = p_res.json()["id"]
    role_id = p_res.json()["roles"][0]["id"]

    # 1. Candidate recommendations for role: Claire and Bob should appear
    cand_res = client.get(
        f"/api/projects/{proj_id}/roles/{role_id}/matches",
        headers={"Authorization": "Bearer user-alice"},
    )
    assert cand_res.status_code == 200
    candidates = cand_res.json()
    assert any(c["user"]["id"] == "user-candidate" for c in candidates)

    # 2. Recommended roles for Claire: this role should appear
    rec_res = client.get(
        "/api/matches/me/roles",
        headers={"Authorization": "Bearer user-candidate"},
    )
    assert rec_res.status_code == 200
    recs = rec_res.json()
    assert any(r["role"]["id"] == role_id for r in recs)

    # 3. Alice invites Claire and Claire accepts
    inv_res = client.post(
        "/api/requests",
        json={"receiver_id": "user-candidate", "project_id": proj_id, "role_id": role_id},
        headers={"Authorization": "Bearer user-alice"},
    )
    inv_id = inv_res.json()["id"]

    client.post(
        f"/api/requests/{inv_id}/respond",
        json={"action": "accepted"},
        headers={"Authorization": "Bearer user-candidate"},
    )

    # 4. Now Claire is a member -> Claire must be EXCLUDED from candidate recommendations for this role
    cand_res_after = client.get(
        f"/api/projects/{proj_id}/roles/{role_id}/matches",
        headers={"Authorization": "Bearer user-alice"},
    )
    assert not any(c["user"]["id"] == "user-candidate" for c in cand_res_after.json())

    # 5. Role is now full -> Role must be EXCLUDED from recommended roles
    rec_res_after = client.get(
        "/api/matches/me/roles",
        headers={"Authorization": "Bearer user-bob"},
    )
    assert not any(r["role"]["id"] == role_id for r in rec_res_after.json())
