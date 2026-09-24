import pytest
from app.services.matching import (
    calculate_match_score_v2,
    MatchScoreV2,
    WEIGHT_V2_SKILL,
    WEIGHT_V2_ROLE,
    WEIGHT_V2_AVAILABILITY,
    WEIGHT_V2_RELIABILITY,
    WEIGHT_V2_PROJECT,
)


# ── 1. Unit Tests for Match Score V2 ──────────────────────────────────────────

def test_v2_perfect_skill_match():
    res = calculate_match_score_v2(
        user_skills=["Python", "FastAPI", "PostgreSQL"],
        user_roles=["Backend Developer"],
        user_availability="open",
        role_name="Backend Developer",
        required_skills=["Python", "FastAPI", "PostgreSQL"],
        project_category="side_project",
    )
    assert res.skill_score == 100
    assert len(res.matched_skills) == 3
    assert len(res.missing_skills) == 0
    assert res.total_score == 100
    assert any("All 3 required skills matched" in r for r in res.reasons)


def test_v2_partial_skill_match():
    res = calculate_match_score_v2(
        user_skills=["Python"],
        user_roles=["Backend Developer"],
        user_availability="open",
        role_name="Backend Developer",
        required_skills=["Python", "FastAPI", "PostgreSQL", "Docker"],
        project_category="side_project",
    )
    assert res.skill_score == 25  # 1 of 4
    assert res.matched_skills == ["Python"]
    assert len(res.missing_skills) == 3
    assert "FastAPI" in res.missing_requirements
    assert "PostgreSQL" in res.missing_requirements
    assert "Docker" in res.missing_requirements


def test_v2_missing_required_skills():
    res = calculate_match_score_v2(
        user_skills=["Go", "Rust"],
        user_roles=["Backend Developer"],
        user_availability="open",
        role_name="Backend Developer",
        required_skills=["Python", "FastAPI"],
        project_category="side_project",
    )
    assert res.skill_score == 0
    assert len(res.matched_skills) == 0
    assert len(res.missing_skills) == 2
    assert "Python" in res.missing_requirements
    assert "FastAPI" in res.missing_requirements


def test_v2_verified_role_experience_bonus():
    # User has verified role in history that matches target role
    res = calculate_match_score_v2(
        user_skills=["React"],
        user_roles=["Full Stack Developer"],  # Declared role is different
        user_availability="open",
        role_name="Frontend Developer",
        required_skills=["React"],
        project_category="side_project",
        verified_roles=["Frontend Developer"],
    )
    assert res.role_experience_score == 100
    assert res.role_match is True
    assert any("Verified previous experience as Frontend Developer" in r for r in res.reasons)


def test_v2_role_experience_fallback():
    # User has verified role in another field
    res = calculate_match_score_v2(
        user_skills=["React"],
        user_roles=[],
        user_availability="open",
        role_name="Frontend Developer",
        required_skills=["React"],
        project_category="side_project",
        verified_roles=["Data Engineer"],
    )
    assert res.role_experience_score == 50
    assert res.role_match is False
    assert any("Verified background in related role" in r for r in res.reasons)


def test_v2_availability_compatibility_and_busy_penalty():
    # Open availability
    res_open = calculate_match_score_v2(
        user_skills=["Python"],
        user_roles=["Backend Developer"],
        user_availability="open",
        role_name="Backend Developer",
        required_skills=["Python"],
        project_category="hackathon",
    )
    assert res_open.availability_score == 100
    assert res_open.availability_match is True

    # Hackathon preference on hackathon project
    res_hack = calculate_match_score_v2(
        user_skills=["Python"],
        user_roles=["Backend Developer"],
        user_availability="looking_for_hackathon",
        role_name="Backend Developer",
        required_skills=["Python"],
        project_category="hackathon",
    )
    assert res_hack.availability_score == 100
    assert res_hack.availability_match is True

    # Hackathon preference on side_project
    res_mismatch = calculate_match_score_v2(
        user_skills=["Python"],
        user_roles=["Backend Developer"],
        user_availability="looking_for_hackathon",
        role_name="Backend Developer",
        required_skills=["Python"],
        project_category="side_project",
    )
    assert res_mismatch.availability_score == 40
    assert res_mismatch.availability_match is False

    # Busy penalty
    res_busy = calculate_match_score_v2(
        user_skills=["Python"],
        user_roles=["Backend Developer"],
        user_availability="busy",
        role_name="Backend Developer",
        required_skills=["Python"],
        project_category="side_project",
    )
    assert res_busy.availability_score == 0
    assert res_busy.availability_match is False
    assert "Builder is marked as busy" in res_busy.missing_requirements
    assert any("marked as busy" in r for r in res_busy.reasons)


def test_v2_high_completion_history():
    res = calculate_match_score_v2(
        user_skills=["Python"],
        user_roles=["Backend Developer"],
        user_availability="open",
        role_name="Backend Developer",
        required_skills=["Python"],
        project_category="side_project",
        tasks_assigned=10,
        tasks_completed=9,
        completed_projects=2,
    )
    assert res.reliability_score == 90
    assert res.project_experience_score == 100
    assert any("90.0% verified task completion rate" in r for r in res.reasons)
    assert any("Completed 2 project lifecycle(s)" in r for r in res.reasons)


def test_v2_low_completion_history():
    res = calculate_match_score_v2(
        user_skills=["Python"],
        user_roles=["Backend Developer"],
        user_availability="open",
        role_name="Backend Developer",
        required_skills=["Python"],
        project_category="side_project",
        tasks_assigned=10,
        tasks_completed=3,
        projects_joined=1,
    )
    assert res.reliability_score == 30
    assert res.project_experience_score == 90
    assert any("Low task completion rate: 30.0%" in r for r in res.reasons)
    assert "Low completion rate: 30.0%" in res.missing_requirements


def test_v2_cold_start_neutral_baseline_treatment():
    # User has 0 or < 3 tasks assigned
    res = calculate_match_score_v2(
        user_skills=["React", "TypeScript"],
        user_roles=["Frontend Developer"],
        user_availability="open",
        role_name="Frontend Developer",
        required_skills=["React", "TypeScript"],
        project_category="side_project",
        tasks_assigned=1,
        tasks_completed=1,
        completed_projects=0,
        projects_joined=0,
    )
    # Cold start: neutral 100% baseline for reliability and project experience
    assert res.reliability_score == 100
    assert res.project_experience_score == 100
    assert res.total_score == 100
    assert any("New contributor (neutral reliability baseline applied)" in r for r in res.reasons)
    assert any("Ready for first project collaboration" in r for r in res.reasons)


def test_v2_weighted_total_calculation():
    # Explicit weights check
    # 45% skill (60% = 27.0)
    # 20% role (100% = 20.0)
    # 15% availability (100% = 15.0)
    # 10% reliability (80% = 8.0)
    # 10% project (90% = 9.0)
    # Expected sum = 27 + 20 + 15 + 8 + 9 = 79
    res = calculate_match_score_v2(
        user_skills=["React", "TypeScript", "Next.js"],
        user_roles=["Frontend Developer"],
        user_availability="open",
        role_name="Frontend Developer",
        required_skills=["React", "TypeScript", "Next.js", "Vue", "Angular"],  # 3 of 5 = 60%
        project_category="side_project",
        tasks_assigned=10,
        tasks_completed=8,  # 80%
        projects_joined=1,  # 90%
    )
    assert res.skill_score == 60
    assert res.role_experience_score == 100
    assert res.availability_score == 100
    assert res.reliability_score == 80
    assert res.project_experience_score == 90
    assert res.total_score == 79
    assert res.version == "v2"


def test_v2_score_bounds_0_to_100():
    # Worst case: no skills, wrong role, busy, 0 completion
    res_worst = calculate_match_score_v2(
        user_skills=[],
        user_roles=["Designer"],
        user_availability="busy",
        role_name="Backend Developer",
        required_skills=["Python", "FastAPI"],
        project_category="side_project",
        tasks_assigned=10,
        tasks_completed=0,
    )
    assert 0 <= res_worst.total_score <= 100
    assert res_worst.skill_score == 0
    assert res_worst.availability_score == 0
    assert res_worst.reliability_score == 0

    # Best case
    res_best = calculate_match_score_v2(
        user_skills=["Python", "FastAPI"],
        user_roles=["Backend Developer"],
        user_availability="open",
        role_name="Backend Developer",
        required_skills=["Python", "FastAPI"],
        project_category="side_project",
        verified_roles=["Backend Developer"],
        tasks_assigned=10,
        tasks_completed=10,
        completed_projects=2,
    )
    assert res_best.total_score == 100
    assert res_best.skill_score == 100
    assert res_best.role_experience_score == 100
    assert res_best.availability_score == 100
    assert res_best.reliability_score == 100
    assert res_best.project_experience_score == 100


def test_v2_explanation_bullets_generation():
    res = calculate_match_score_v2(
        user_skills=["Python"],
        user_roles=["Backend Developer"],
        user_availability="open",
        role_name="Backend Developer",
        required_skills=["Python", "Docker"],
        project_category="side_project",
        tasks_assigned=5,
        tasks_completed=5,
    )
    assert len(res.reasons) >= 5
    assert any("Matched 1/2 required skills" in r for r in res.reasons)
    assert any("Preferred role matches Backend Developer" in r for r in res.reasons)
    assert any("Builder is open to all collaborations" in r for r in res.reasons)
    assert any("100.0% verified task completion rate" in r for r in res.reasons)


def test_v2_missing_requirements_list():
    res = calculate_match_score_v2(
        user_skills=["Python"],
        user_roles=["UI Designer"],
        user_availability="busy",
        role_name="Backend Developer",
        required_skills=["Python", "Redis", "Kafka"],
        project_category="side_project",
        tasks_assigned=10,
        tasks_completed=2,
    )
    assert "Redis" in res.missing_requirements
    assert "Kafka" in res.missing_requirements
    assert "Builder is marked as busy" in res.missing_requirements
    assert "Role mismatch with Backend Developer" in res.missing_requirements
    assert "Low completion rate: 20.0%" in res.missing_requirements


# ── 2. API Integration Tests ──────────────────────────────────────────────────

def test_v2_role_candidate_matches_api(client, mock_db):
    """
    Test GET /api/projects/{project_id}/roles/{role_id}/matches returns candidates ranked
    with V2 fields and tie-breaking.
    """
    proj_id = "proj-v2-test"
    role_id = "role-v2-fe"

    # Add candidates to mock_db
    mock_db["users"].append({
        "id": "cand-adam",
        "username": "adam",
        "display_name": "Adam Smith",
        "skills": ["React", "TypeScript"],
        "roles": ["Frontend Developer"],
        "availability": "open",
    })
    mock_db["users"].append({
        "id": "cand-zack",
        "username": "zack",
        "display_name": "Zack Taylor",
        "skills": ["React", "TypeScript"],
        "roles": ["Frontend Developer"],
        "availability": "open",
    })
    mock_db["users"].append({
        "id": "cand-bob",
        "username": "bobbuilder",
        "display_name": "Bob Builder",
        "skills": ["React"],
        "roles": ["Frontend Developer"],
        "availability": "open",
    })

    mock_db["projects"].append({
        "id": proj_id,
        "owner_id": "owner-123",
        "title": "Match V2 Showcase",
        "description": "Showcase",
        "category": "side_project",
        "status": "recruiting",
        "visibility": "public",
    })

    mock_db["project_roles"].append({
        "id": role_id,
        "project_id": proj_id,
        "role_name": "Frontend Developer",
        "required_skills": ["React", "TypeScript"],
        "slots": 2,
        "filled_slots": 0,
        "status": "open",
    })

    res = client.get(f"/api/projects/{proj_id}/roles/{role_id}/matches")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 2

    first = data[0]
    assert "user" in first
    assert "match" in first
    m = first["match"]
    assert "score" in m
    assert "skill_score" in m
    assert "role_experience_score" in m
    assert "reliability_score" in m
    assert "project_experience_score" in m
    assert "version" in m
    assert m["version"] == "v2"

    # Tie-breaking test: Adam and Zack both have 100% match.
    # Adam must appear before Zack due to alphabetical username tie-breaker
    top_two = [c for c in data if c["match"]["score"] == 100]
    assert len(top_two) >= 2
    assert top_two[0]["user"]["username"] == "adam"
    assert top_two[1]["user"]["username"] == "zack"

    # Verify ranking order (descending by score)
    scores = [item["match"]["score"] for item in data]
    assert scores == sorted(scores, reverse=True)


def test_v2_user_role_match_detail_api(client, mock_db):
    """
    Test GET /api/matches/users/{user_id}/roles/{role_id} returns MatchScoreV2.
    """
    user_id = "target-user-v2"
    proj_id = "proj-detail-v2"
    role_id = "role-detail-v2"

    mock_db["users"].append({
        "id": user_id,
        "username": "detailuser",
        "display_name": "Detail User",
        "skills": ["Python", "FastAPI"],
        "roles": ["Backend Developer"],
        "availability": "open",
    })

    mock_db["projects"].append({
        "id": proj_id,
        "owner_id": "owner-xyz",
        "title": "Detail Project",
        "description": "Detail",
        "category": "side_project",
        "status": "recruiting",
        "visibility": "public",
    })

    mock_db["project_roles"].append({
        "id": role_id,
        "project_id": proj_id,
        "role_name": "Backend Developer",
        "required_skills": ["Python"],
        "slots": 1,
        "filled_slots": 0,
        "status": "open",
    })

    res = client.get(f"/api/matches/users/{user_id}/roles/{role_id}")
    assert res.status_code == 200
    data = res.json()
    assert "match" in data
    m = data["match"]
    assert m["version"] == "v2"
    assert "reasons" in m
    assert isinstance(m["reasons"], list)
    assert "total_score" in m
    assert m["score"] == 100


def test_v2_my_role_recommendations_api(client, mock_db):
    """
    Test GET /api/matches/me/roles returns recommendations using V2.
    """
    # Active user id from auth is "user-alice"
    proj_id = "proj-recs-v2"
    role_id = "role-recs-v2"

    mock_db["projects"].append({
        "id": proj_id,
        "owner_id": "other-builder",
        "title": "Alice Recommendations",
        "description": "Alice Recs",
        "category": "side_project",
        "status": "recruiting",
        "visibility": "public",
    })

    mock_db["project_roles"].append({
        "id": role_id,
        "project_id": proj_id,
        "role_name": "Frontend Developer",
        "required_skills": ["React", "FastAPI"],
        "slots": 2,
        "filled_slots": 0,
        "status": "open",
    })

    # Alice has React, FastAPI, PostgreSQL, Frontend Developer, open
    res = client.get(
        "/api/matches/me/roles",
        headers={"Authorization": "Bearer user-alice"}
    )
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) > 0
    first = data[0]
    assert "match" in first
    m = first["match"]
    assert m["version"] == "v2"
    assert m["score"] == 100
    scores = [item["match"]["score"] for item in data]
    assert scores == sorted(scores, reverse=True)


def test_v2_application_review_match(client, mock_db):
    """
    Test that application listings for a project include Match Score V2 breakdown.
    """
    owner_id = "app-proj-owner"
    applicant_id = "app-applicant-1"
    proj_id = "proj-app-v2"
    role_id = "role-app-v2"
    app_id = "app-12345"

    mock_db["users"].append({
        "id": owner_id,
        "username": "projowner",
        "display_name": "Project Owner",
        "skills": ["Design"],
        "roles": ["UI/UX Designer"],
        "availability": "open",
    })
    mock_db["users"].append({
        "id": applicant_id,
        "username": "smartapplicant",
        "display_name": "Smart Applicant",
        "skills": ["React", "TypeScript"],
        "roles": ["Frontend Developer"],
        "availability": "open",
    })
    mock_db["projects"].append({
        "id": proj_id,
        "owner_id": owner_id,
        "title": "Application Project",
        "description": "App Review",
        "category": "side_project",
        "status": "recruiting",
        "visibility": "public",
    })
    mock_db["project_roles"].append({
        "id": role_id,
        "project_id": proj_id,
        "role_name": "Frontend Developer",
        "required_skills": ["React", "TypeScript"],
        "slots": 1,
        "filled_slots": 0,
        "status": "open",
    })
    mock_db["project_applications"].append({
        "id": app_id,
        "project_id": proj_id,
        "role_id": role_id,
        "user_id": applicant_id,
        "status": "pending",
        "note": "Excited to join!",
        "created_at": "2026-09-08T12:00:00Z",
    })

    apps_res = client.get(
        f"/api/projects/{proj_id}/applications",
        headers={"Authorization": f"Bearer {owner_id}"},
    )
    assert apps_res.status_code == 200
    apps = apps_res.json()
    assert len(apps) == 1
    first_app = apps[0]
    assert "match" in first_app
    assert first_app["match"] is not None
    m = first_app["match"]
    assert m["version"] == "v2"
    assert m["score"] == 100
    assert m["skill_score"] == 100
    assert m["role_experience_score"] == 100
    assert m["reliability_score"] == 100
