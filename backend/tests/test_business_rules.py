import pytest


def test_business_rules_enforcement(client):
    # Setup users in mock_db
    r_charlie = client.post("/api/auth/register", json={
        "email": "charlie@nexora.dev", "password": "password123", "username": "charlie", "display_name": "Charlie"
    })
    charlie_id = r_charlie.json()["user"]["id"]

    r_david = client.post("/api/auth/register", json={
        "email": "david@nexora.dev", "password": "password123", "username": "david", "display_name": "David"
    })
    david_id = r_david.json()["user"]["id"]

    # 1. Create project with owner user-alice
    p_res = client.post("/api/projects", json={
        "title": "Autonomous Rules Test",
        "description": "Validating all 15 business rules",
        "category": "hackathon",
        "visibility": "public",
        "roles": [
            {"role_name": "Lead Frontend", "required_skills": ["React"], "slots": 1}
        ]
    }, headers={"Authorization": "Bearer user-alice"})
    assert p_res.status_code == 201
    proj = p_res.json()
    proj_id = proj["id"]
    role_id = proj["roles"][0]["id"]

    # Rule 1: Non-owner cannot add project roles
    add_role_forbidden = client.post(f"/api/projects/{proj_id}/roles", json={
        "role_name": "Hacker", "required_skills": ["Bash"], "slots": 1
    }, headers={"Authorization": f"Bearer {charlie_id}"})
    assert add_role_forbidden.status_code == 403

    # Rule 2: Non-owner cannot invite users to the project
    invite_forbidden = client.post("/api/requests", json={
        "receiver_id": david_id, "project_id": proj_id, "role_id": role_id
    }, headers={"Authorization": f"Bearer {charlie_id}"})
    assert invite_forbidden.status_code == 403

    # Rule 3: Cannot invite yourself
    self_invite = client.post("/api/requests", json={
        "receiver_id": "user-alice", "project_id": proj_id, "role_id": role_id
    }, headers={"Authorization": "Bearer user-alice"})
    assert self_invite.status_code == 400

    # Rule: Owner cannot apply to their own project
    self_apply = client.post(f"/api/projects/{proj_id}/apply", json={
        "role_id": role_id, "message": "Applying to my own project"
    }, headers={"Authorization": "Bearer user-alice"})
    assert self_apply.status_code == 400

    # Rule 5: Duplicate pending invitations rejected
    inv1 = client.post("/api/requests", json={
        "receiver_id": charlie_id, "project_id": proj_id, "role_id": role_id, "message": "Join us!"
    }, headers={"Authorization": "Bearer user-alice"})
    assert inv1.status_code == 201
    inv_id = inv1.json()["id"]

    inv_dup = client.post("/api/requests", json={
        "receiver_id": charlie_id, "project_id": proj_id, "role_id": role_id, "message": "Again!"
    }, headers={"Authorization": "Bearer user-alice"})
    assert inv_dup.status_code == 409

    # Rule 10: Unauthorized user cannot accept someone else's invitation
    hijack_accept = client.post(f"/api/requests/{inv_id}/respond", json={
        "action": "accepted"
    }, headers={"Authorization": f"Bearer {david_id}"})
    assert hijack_accept.status_code == 403

    # Legitimate recipient accepts invitation
    accept_res = client.post(f"/api/requests/{inv_id}/respond", json={
        "action": "accepted"
    }, headers={"Authorization": f"Bearer {charlie_id}"})
    assert accept_res.status_code == 200

    # Rule 4 & 8: Now role has 1 slot, filled is 1 (FILLED!). Another student applying should be rejected.
    fill_check = client.post(f"/api/projects/{proj_id}/apply", json={
        "role_id": role_id, "message": "I want this slot too"
    }, headers={"Authorization": f"Bearer {david_id}"})
    assert fill_check.status_code == 400

    # Rule 4: Charlie is already a member, cannot apply again
    charlie_reapply = client.post(f"/api/projects/{proj_id}/apply", json={
        "message": "Reapply"
    }, headers={"Authorization": f"Bearer {charlie_id}"})
    assert charlie_reapply.status_code == 400

    # Add a second role with 1 slot
    role2_res = client.post(f"/api/projects/{proj_id}/roles", json={
        "role_name": "ML Engineer", "required_skills": ["Python"], "slots": 1
    }, headers={"Authorization": "Bearer user-alice"})
    assert role2_res.status_code == 201
    role2_id = role2_res.json()["id"]

    # Student david applies to role2
    app_res = client.post(f"/api/projects/{proj_id}/apply", json={
        "role_id": role2_id, "message": "I know PyTorch"
    }, headers={"Authorization": f"Bearer {david_id}"})
    assert app_res.status_code == 201
    app_id = app_res.json()["id"]

    # Rule 6: Duplicate pending application rejected
    dup_app = client.post(f"/api/projects/{proj_id}/apply", json={
        "role_id": role2_id, "message": "Applying again"
    }, headers={"Authorization": f"Bearer {david_id}"})
    assert dup_app.status_code == 409

    # Rule 11: Non-owner cannot accept application
    non_owner_accept = client.post(f"/api/applications/{app_id}/respond", json={
        "action": "accepted"
    }, headers={"Authorization": f"Bearer {charlie_id}"})
    assert non_owner_accept.status_code == 403

    # Owner accepts application
    owner_accept = client.post(f"/api/applications/{app_id}/respond", json={
        "action": "accepted"
    }, headers={"Authorization": "Bearer user-alice"})
    assert owner_accept.status_code == 200

    # Verify project has members (Alice owner, Charlie, David)
    proj_get = client.get(f"/api/projects/{proj_id}")
    assert proj_get.status_code == 200
    assert proj_get.json()["members_count"] == 3
