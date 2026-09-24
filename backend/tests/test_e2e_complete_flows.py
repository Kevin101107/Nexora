import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_complete_end_to_end_flow_a_and_flow_b():
    """
    End-to-End Verification:
    Flow A: Register builder -> Login -> Profile update -> Create project -> Open role -> Invite student ->
            Accept invitation -> Role filled -> Workspace task + milestone + resource -> Task completion -> Notifications.
    Flow B: Register 2 builders -> Create project + open role -> Discover & Apply ->
            Owner review & accept -> Membership created -> Role filled -> Notifications -> IDOR checks.
    """
    # =========================================================================
    # FLOW A: REGISTRATION -> PROJECT -> INVITE -> ACCEPT -> WORKSPACE LIFECYCLE
    # =========================================================================
    
    # 1. Register Alice
    alice_reg = client.post("/api/auth/register", json={
        "email": "alice_flow_a@test.com",
        "username": "alice_flow_a",
        "display_name": "Alice Flow",
        "password": "Password123!",
        "skills": ["React", "TypeScript", "Tailwind CSS"],
        "roles": ["Frontend Architect"],
        "college": "MIT",
        "department": "EECS",
        "year": "Senior"
    })
    assert alice_reg.status_code == 201, alice_reg.text
    alice_token = alice_reg.json()["access_token"]
    alice_id = alice_reg.json()["user"]["id"]
    alice_headers = {"Authorization": f"Bearer {alice_token}"}

    # 2. Verify Alice Login
    alice_login = client.post("/api/auth/login", json={
        "username_or_email": "alice_flow_a@test.com",
        "password": "Password123!"
    })
    assert alice_login.status_code == 200
    assert alice_login.json()["user"]["id"] == alice_id

    # 3. Update Alice Profile (Academic & Portfolio)
    update_res = client.patch("/api/users/me", headers=alice_headers, json={
        "experience_level": "advanced",
        "portfolio_url": "https://alice.dev"
    })
    assert update_res.status_code == 200
    assert update_res.json()["experience_level"] == "advanced"
    assert update_res.json()["portfolio_url"] == "https://alice.dev"

    # 4. Alice creates a Project with an open role
    proj_res = client.post("/api/projects", headers=alice_headers, json={
        "title": "Autonomous Campus Shuttle",
        "description": "Building self-driving golf carts for campus mobility.",
        "category": "hackathon",
        "visibility": "public",
        "roles": [
            {
                "role_name": "Frontend Architect",
                "description": "Own navigation telemetry UI",
                "required_skills": ["React", "TypeScript"],
                "slots": 1
            }
        ]
    })
    assert proj_res.status_code == 201
    proj_data = proj_res.json()
    project_id = proj_data["id"]
    role_id = proj_data["roles"][0]["id"]
    assert proj_data["roles"][0]["slots"] == 1
    assert proj_data["roles"][0]["filled_slots"] == 0

    # 5. Register Bob
    bob_reg = client.post("/api/auth/register", json={
        "email": "bob_flow_a@test.com",
        "username": "bob_flow_a",
        "display_name": "Bob Builder",
        "password": "Password123!",
        "skills": ["React", "TypeScript", "Next.js"],
        "roles": ["Frontend Developer"],
        "college": "MIT",
        "department": "EECS",
        "year": "Junior"
    })
    assert bob_reg.status_code == 201
    bob_token = bob_reg.json()["access_token"]
    bob_id = bob_reg.json()["user"]["id"]
    bob_headers = {"Authorization": f"Bearer {bob_token}"}

    # 6. Alice invites Bob to the Open Role
    invite_res = client.post("/api/requests", headers=alice_headers, json={
        "receiver_id": bob_id,
        "project_id": project_id,
        "role_id": role_id,
        "message": "Hey Bob, your React experience fits our telemetry UI perfectly!"
    })
    assert invite_res.status_code == 201
    invitation_id = invite_res.json()["id"]

    # 7. Bob checks his notifications
    bob_notifs = client.get("/api/notifications", headers=bob_headers)
    assert bob_notifs.status_code == 200
    assert any(n["type"] == "team_invitation_received" for n in bob_notifs.json()["notifications"])

    # 8. Bob accepts the invitation
    accept_res = client.post(f"/api/requests/{invitation_id}/respond", headers=bob_headers, json={
        "action": "accepted"
    })
    assert accept_res.status_code == 200

    # 9. Verify project role is now filled
    project_check = client.get(f"/api/projects/{project_id}")
    assert project_check.status_code == 200
    roles = project_check.json()["roles"]
    matching_role = next(r for r in roles if r["id"] == role_id)
    assert matching_role["filled_slots"] == 1
    assert matching_role["status"] == "filled"

    # 10. Alice and Bob in Project Workspace
    # 10a. Alice creates a Milestone
    milestone_res = client.post(f"/api/projects/{project_id}/milestones", headers=alice_headers, json={
        "title": "Phase 1 - Prototype Telemetry",
        "description": "Initial working telemetry dashboard",
        "due_date": "2026-10-15T00:00:00Z",
        "status": "planned"
    })
    assert milestone_res.status_code == 201
    milestone_id = milestone_res.json()["id"]

    # 10b. Alice creates a Task assigned to Bob
    task_res = client.post(f"/api/projects/{project_id}/tasks", headers=alice_headers, json={
        "title": "Build Realtime Map Component",
        "description": "Render shuttle GPS coordinates on canvas",
        "priority": "high",
        "assignee_id": bob_id,
        "milestone_id": milestone_id
    })
    assert task_res.status_code == 201
    task_id = task_res.json()["id"]

    # 10c. Alice adds Project Resources
    resource_res = client.post(f"/api/projects/{project_id}/resources", headers=alice_headers, json={
        "title": "Campus Shuttle Monorepo",
        "url": "https://github.com/nexora/campus-shuttle",
        "category": "github",
        "description": "Primary repository for firmware and frontend"
    })
    assert resource_res.status_code == 201
    resource_id = resource_res.json()["id"]

    # 10d. Bob views project resources
    bob_resources = client.get(f"/api/projects/{project_id}/resources", headers=bob_headers)
    assert bob_resources.status_code == 200
    assert len(bob_resources.json()) >= 1
    assert any(r["id"] == resource_id for r in bob_resources.json())

    # 11. Bob completes the assigned task
    task_update = client.patch(f"/api/projects/{project_id}/tasks/{task_id}", headers=bob_headers, json={
        "status": "done"
    })
    assert task_update.status_code == 200
    assert task_update.json()["status"] == "done"

    # 12. Verify Workspace Overview progress
    ws_res = client.get(f"/api/projects/{project_id}/workspace", headers=alice_headers)
    assert ws_res.status_code == 200
    ws_data = ws_res.json()
    assert ws_data["progress"]["progress_percentage"] == 100.0
    assert ws_data["progress"]["completed_tasks"] == 1

    # =========================================================================
    # FLOW B: DISCOVERY -> APPLICATION -> REVIEW & ACCEPT -> IDOR SECURITY
    # =========================================================================

    # 1. Register Charlie (Owner)
    charlie_reg = client.post("/api/auth/register", json={
        "email": "charlie_flow_b@test.com",
        "username": "charlie_flow_b",
        "display_name": "Charlie Founder",
        "password": "Password123!",
        "roles": ["Systems Lead"],
        "skills": ["C++", "ROS2", "Python"]
    })
    assert charlie_reg.status_code == 201
    charlie_token = charlie_reg.json()["access_token"]
    charlie_id = charlie_reg.json()["user"]["id"]
    charlie_headers = {"Authorization": f"Bearer {charlie_token}"}

    # 2. Register Diana (Applicant)
    diana_reg = client.post("/api/auth/register", json={
        "email": "diana_flow_b@test.com",
        "username": "diana_flow_b",
        "display_name": "Diana Engineer",
        "password": "Password123!",
        "roles": ["Embedded Engineer"],
        "skills": ["C++", "Embedded Systems", "FreeRTOS"]
    })
    assert diana_reg.status_code == 201
    diana_token = diana_reg.json()["access_token"]
    diana_id = diana_reg.json()["user"]["id"]
    diana_headers = {"Authorization": f"Bearer {diana_token}"}

    # 3. Charlie creates a Project & Open Role
    charlie_proj = client.post("/api/projects", headers=charlie_headers, json={
        "title": "Autonomous Underwater Sub",
        "description": "AUV for marine coral reef inspection.",
        "category": "research",
        "visibility": "public"
    })
    assert charlie_proj.status_code == 201
    charlie_project_id = charlie_proj.json()["id"]

    charlie_role = client.post(f"/api/projects/{charlie_project_id}/roles", headers=charlie_headers, json={
        "role_name": "Firmware Engineer",
        "description": "Motor drivers and sensor fusion on STM32",
        "required_skills": ["C++", "Embedded Systems"],
        "slots": 1
    })
    assert charlie_role.status_code == 201
    charlie_role_id = charlie_role.json()["id"]

    # 4. Diana discovers role and applies
    apply_res = client.post(f"/api/projects/{charlie_project_id}/apply", headers=diana_headers, json={
        "role_id": charlie_role_id,
        "message": "I built STM32 flight controllers and would love to build your firmware!"
    })
    assert apply_res.status_code == 201
    application_id = apply_res.json()["id"]

    # 5. Non-owner Diana cannot accept her own application
    diana_accept_try = client.post(f"/api/applications/{application_id}/respond", headers=diana_headers, json={
        "action": "accepted"
    })
    assert diana_accept_try.status_code == 403

    # 6. Charlie (Owner) accepts Diana's application
    app_accept = client.post(f"/api/applications/{application_id}/respond", headers=charlie_headers, json={
        "action": "accepted"
    })
    assert app_accept.status_code == 200

    # 7. Verify Diana received notification
    diana_notifs = client.get("/api/notifications", headers=diana_headers)
    assert diana_notifs.status_code == 200
    assert any("accepted" in n["title"].lower() or "accepted" in n["message"].lower() for n in diana_notifs.json()["notifications"])

    # 8. Verify role is filled and membership updated
    sub_proj = client.get(f"/api/projects/{charlie_project_id}")
    assert sub_proj.status_code == 200
    assert sub_proj.json()["members_count"] == 2
    sub_role = next(r for r in sub_proj.json()["roles"] if r["id"] == charlie_role_id)
    assert sub_role["filled_slots"] == 1
    assert sub_role["status"] == "filled"

    # 9. Verify Security / IDOR: Diana cannot add roles to Charlie's project
    add_role_try = client.post(f"/api/projects/{charlie_project_id}/roles", headers=diana_headers, json={
        "role_name": "Unauthorized Role",
        "slots": 1
    })
    assert add_role_try.status_code == 403

    # 10. Verify Diana cannot apply again to the filled role (duplicate/filled protection)
    dup_apply = client.post(f"/api/projects/{charlie_project_id}/apply", headers=diana_headers, json={
        "role_id": charlie_role_id,
        "message": "Applying again"
    })
    assert dup_apply.status_code in (400, 403, 409)
