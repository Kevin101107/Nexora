import pytest
from app.services.matching import (
    calculate_match_score,
    calculate_skill_match,
    calculate_role_match,
    calculate_availability_match,
    calculate_evidence_quality,
    normalize_value,
    normalize_collection,
    canonicalize_role,
    get_score_label,
    WEIGHT_SKILL,
    WEIGHT_ROLE,
    WEIGHT_AVAILABILITY,
)


# ── 1. Pure Matching Unit Tests (Cases 1-19) ──────────────────────────────────

def test_1_perfect_skill_match():
    user_skills = ["React", "TypeScript", "Tailwind CSS"]
    required_skills = ["React", "TypeScript", "Tailwind CSS"]
    score, matched, missing, reason = calculate_skill_match(user_skills, required_skills)
    assert score == 100
    assert len(matched) == 3
    assert len(missing) == 0
    assert "Matched 3 of 3" in reason


def test_2_partial_skill_match():
    user_skills = ["React", "Python"]
    required_skills = ["React", "TypeScript", "Tailwind CSS", "Next.js"]
    score, matched, missing, reason = calculate_skill_match(user_skills, required_skills)
    assert score == 25  # 1/4 = 25%
    assert matched == ["React"]
    assert len(missing) == 3


def test_3_zero_skill_overlap():
    user_skills = ["Python", "Django"]
    required_skills = ["React", "Tailwind"]
    score, matched, missing, reason = calculate_skill_match(user_skills, required_skills)
    assert score == 0
    assert len(matched) == 0
    assert len(missing) == 2


def test_4_skill_normalization():
    # "React", "react", "  React  " must match
    assert normalize_value("  React  ") == "react"
    user_skills = ["  rEaCt  ", "TYPEscript"]
    required_skills = ["React", "TypeScript"]
    score, matched, missing, _ = calculate_skill_match(user_skills, required_skills)
    assert score == 100
    assert len(matched) == 2
    assert len(missing) == 0


def test_5_duplicate_skills_do_not_inflate_score():
    # User lists React multiple times with different casing/spacing
    user_skills = ["React", "react", " React ", "REACT"]
    required_skills = ["React", "TypeScript"]
    score, matched, missing, _ = calculate_skill_match(user_skills, required_skills)
    # Only 1 unique skill matched out of 2 required
    assert score == 50
    assert len(matched) == 1
    assert missing == ["TypeScript"]


def test_6_exact_role_match():
    user_roles = ["Frontend Developer", "Mobile Developer"]
    target_role = "Frontend Developer"
    score, match, reason = calculate_role_match(user_roles, target_role)
    assert score == 100
    assert match is True
    assert "Preferred role matches Frontend Developer" in reason


def test_7_role_mismatch():
    user_roles = ["Data Scientist", "ML Engineer"]
    target_role = "Frontend Developer"
    score, match, reason = calculate_role_match(user_roles, target_role)
    assert score == 0
    assert match is False
    assert "do not match" in reason


def test_8_explicit_alias_behavior():
    # Explicit alias mapping: "Frontend" matches "Frontend Developer", "UI Engineer" matches "Frontend Developer"
    user_roles = ["Frontend"]
    target_role = "Frontend Developer"
    score, match, _ = calculate_role_match(user_roles, target_role)
    assert score == 100
    assert match is True

    # "Full-Stack Engineer" matches "Full Stack Developer"
    user_roles2 = ["Full-Stack Engineer"]
    target_role2 = "Full Stack Developer"
    score2, match2, _ = calculate_role_match(user_roles2, target_role2)
    assert score2 == 100
    assert match2 is True


def test_9_availability_compatible():
    # Open availability is compatible with all projects
    score, match, reason = calculate_availability_match("open", "hackathon")
    assert score == 100
    assert match is True

    # Hackathon availability with hackathon project
    score2, match2, reason2 = calculate_availability_match("looking_for_hackathon", "hackathon")
    assert score2 == 100
    assert match2 is True

    # Project availability with side project
    score3, match3, reason3 = calculate_availability_match("looking_for_project", "side_project")
    assert score3 == 100
    assert match3 is True


def test_10_availability_unknown():
    # Null or empty availability returns neutral 50 without pretending match is known
    score, match, reason = calculate_availability_match(None, "hackathon")
    assert score == 50
    assert match is False
    assert "not specified" in reason

    score2, match2, reason2 = calculate_availability_match("", "side_project")
    assert score2 == 50
    assert match2 is False


def test_11_missing_user_skills():
    # User has no skills
    score, matched, missing, reason = calculate_skill_match([], ["React", "FastAPI"])
    assert score == 0
    assert len(matched) == 0
    assert len(missing) == 2
    assert "no skills listed" in reason


def test_12_role_with_no_required_skills():
    # Role with 0 required skills must NOT grant automatic 100% skill score; explicit neutral 50
    score, matched, missing, reason = calculate_skill_match(["Python", "React"], [])
    assert score == 50
    assert len(matched) == 0
    assert len(missing) == 0
    assert "no specific skill requirements" in reason


def test_13_missing_user_roles():
    score, match, reason = calculate_role_match([], "Backend Developer")
    assert score == 0
    assert match is False
    assert "No preferred roles" in reason


def test_14_evidence_quality_high():
    # User has skills, role, and known availability
    res = calculate_match_score(
        user_skills=["React", "TypeScript"],
        user_roles=["Frontend Developer"],
        user_availability="open",
        role_name="Frontend Developer",
        required_skills=["React"],
        project_category="hackathon",
    )
    assert res.evidence_quality == "high"


def test_15_evidence_quality_medium():
    # User has skills and role, but availability is empty/unknown
    res = calculate_match_score(
        user_skills=["React"],
        user_roles=["Frontend Developer"],
        user_availability=None,
        role_name="Frontend Developer",
        required_skills=["React"],
        project_category="hackathon",
    )
    assert res.evidence_quality == "medium"


def test_16_evidence_quality_low():
    # User only has availability, no skills and no roles
    res = calculate_match_score(
        user_skills=[],
        user_roles=[],
        user_availability="open",
        role_name="Frontend Developer",
        required_skills=["React"],
        project_category="hackathon",
    )
    assert res.evidence_quality == "low"


def test_17_final_weighted_score_calculation():
    # Skill: 2/3 matched = 67
    # Role: match = 100
    # Availability: open = 100
    # Expected: (67 * 0.60) + (100 * 0.25) + (100 * 0.15) = 40.2 + 25 + 15 = 80.2 -> 80
    res = calculate_match_score(
        user_skills=["React", "TypeScript"],
        user_roles=["Frontend Developer"],
        user_availability="open",
        role_name="Frontend Developer",
        required_skills=["React", "TypeScript", "Tailwind CSS"],
        project_category="hackathon",
    )
    assert res.skill_score == 67
    assert res.role_score == 100
    assert res.availability_score == 100
    assert res.score == 80
    assert res.score_label == "Strong Match"


def test_18_score_cannot_exceed_100():
    res = calculate_match_score(
        user_skills=["React", "TypeScript", "Python"],
        user_roles=["Full Stack Developer"],
        user_availability="open",
        role_name="Full Stack Developer",
        required_skills=["React"],
        project_category="side_project",
    )
    assert res.score <= 100
    assert res.score == 100


def test_19_score_cannot_fall_below_0():
    res = calculate_match_score(
        user_skills=[],
        user_roles=[],
        user_availability="busy",
        role_name="DevOps Engineer",
        required_skills=["Kubernetes"],
        project_category="hackathon",
    )
    assert res.score >= 0
    assert res.score == 0


# ── 2. Match Endpoints Integration Tests (Cases 20-27) ────────────────────────

def test_20_and_21_recommendation_ordering_and_deterministic_tie_breaking(client, mock_db):
    # Setup project with open role
    proj_id = "proj-radar"
    role_id = "role-radar-frontend"
    mock_db["projects"].append({
        "id": proj_id,
        "owner_id": "user-owner",
        "title": "Campus Radar",
        "description": "Radar app",
        "category": "hackathon",
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

    # Two users with identical high skill and role overlap
    # User B and User A: tie-breaking should sort username alphabetically
    mock_db["users"].append({
        "id": "user-zack",
        "username": "zack",
        "display_name": "Zack",
        "skills": ["React", "TypeScript"],
        "roles": ["Frontend Developer"],
        "availability": "open",
    })
    mock_db["users"].append({
        "id": "user-adam",
        "username": "adam",
        "display_name": "Adam",
        "skills": ["React", "TypeScript"],
        "roles": ["Frontend Developer"],
        "availability": "open",
    })
    mock_db["users"].append({
        "id": "user-low",
        "username": "lowmatch",
        "display_name": "Low Match",
        "skills": ["Python"],
        "roles": ["Backend Developer"],
        "availability": "busy",
    })

    res = client.get(f"/api/projects/{proj_id}/roles/{role_id}/matches")
    assert res.status_code == 200
    candidates = res.json()
    assert len(candidates) >= 3

    # Zack and Adam both have 100% match.
    # Tie-breaking must sort Adam before Zack alphabetically by username.
    top_two = candidates[:2]
    assert top_two[0]["match"]["score"] == 100
    assert top_two[1]["match"]["score"] == 100
    assert top_two[0]["user"]["username"] == "adam"
    assert top_two[1]["user"]["username"] == "zack"

    # Low match is at the bottom
    scores = [c["match"]["score"] for c in candidates]
    assert scores == sorted(scores, reverse=True)


def test_22_and_23_owner_and_members_excluded_from_recommendations(client, mock_db):
    proj_id = "proj-excl"
    role_id = "role-excl-be"
    owner_id = "user-alice"
    member_id = "user-bob"

    mock_db["projects"].append({
        "id": proj_id,
        "owner_id": owner_id,
        "title": "Exclusive Project",
        "description": "Test exclusions",
        "category": "hackathon",
        "status": "recruiting",
        "visibility": "public",
    })
    mock_db["project_roles"].append({
        "id": role_id,
        "project_id": proj_id,
        "role_name": "Backend Developer",
        "required_skills": ["Go"],
        "slots": 1,
        "filled_slots": 0,
        "status": "open",
    })
    # Bob is already a member
    mock_db["project_members"].append({
        "id": "mem-bob",
        "project_id": proj_id,
        "user_id": member_id,
        "member_role": "Member",
    })

    res = client.get(f"/api/projects/{proj_id}/roles/{role_id}/matches")
    assert res.status_code == 200
    candidates = res.json()
    candidate_user_ids = [c["user"]["id"] for c in candidates]

    # Neither Alice (owner) nor Bob (existing member) can appear in candidate recommendations
    assert owner_id not in candidate_user_ids
    assert member_id not in candidate_user_ids


def test_24_and_25_closed_and_filled_roles_excluded(client, mock_db):
    caller_id = "user-charlie-recs"
    mock_db["users"].append({
        "id": caller_id,
        "username": "charlierecs",
        "display_name": "Charlie Recs",
        "skills": ["React", "Go"],
        "roles": ["Frontend Developer", "Backend Developer"],
        "availability": "open",
    })

    proj_id = "proj-status-test"
    mock_db["projects"].append({
        "id": proj_id,
        "owner_id": "other-owner",
        "title": "Status Project",
        "description": "Role status test",
        "category": "side_project",
        "status": "recruiting",
        "visibility": "public",
    })

    # Closed role
    mock_db["project_roles"].append({
        "id": "role-closed",
        "project_id": proj_id,
        "role_name": "Frontend Developer",
        "required_skills": ["React"],
        "slots": 1,
        "filled_slots": 0,
        "status": "closed",
    })

    # Filled role (slots == filled_slots)
    mock_db["project_roles"].append({
        "id": "role-filled",
        "project_id": proj_id,
        "role_name": "Backend Developer",
        "required_skills": ["Go"],
        "slots": 1,
        "filled_slots": 1,
        "status": "open",
    })

    # Open role
    mock_db["project_roles"].append({
        "id": "role-valid-open",
        "project_id": proj_id,
        "role_name": "Backend Developer",
        "required_skills": ["Go"],
        "slots": 2,
        "filled_slots": 0,
        "status": "open",
    })

    res = client.get(
        "/api/matches/me/roles",
        headers={"Authorization": f"Bearer {caller_id}"},
    )
    assert res.status_code == 200
    recs = res.json()
    role_ids = [r["role"]["id"] for r in recs]

    assert "role-closed" not in role_ids
    assert "role-filled" not in role_ids
    assert "role-valid-open" in role_ids


def test_26_recommended_roles_for_current_user(client, mock_db):
    caller_id = "user-alice"
    res = client.get(
        "/api/matches/me/roles",
        headers={"Authorization": f"Bearer {caller_id}"},
    )
    assert res.status_code == 200
    recs = res.json()
    assert isinstance(recs, list)
    # Ensure all recommended items have MatchScoreResult with reasons and scores
    for r in recs:
        assert "score" in r["match"]
        assert "reasons" in r["match"]
        assert len(r["match"]["reasons"]) == 3
        assert 0 <= r["match"]["score"] <= 100


def test_27_private_user_information_excluded_from_match_responses(client, mock_db):
    # Single match endpoint
    proj_id = "proj-pvt-test"
    role_id = "role-pvt-test"
    mock_db["projects"].append({
        "id": proj_id,
        "owner_id": "owner-1",
        "title": "Public Project",
        "description": "Desc",
        "category": "hackathon",
        "status": "recruiting",
        "visibility": "public",
    })
    mock_db["project_roles"].append({
        "id": role_id,
        "project_id": proj_id,
        "role_name": "Frontend Developer",
        "required_skills": ["React"],
        "slots": 1,
        "filled_slots": 0,
        "status": "open",
    })

    res = client.get(f"/api/matches/users/user-alice/roles/{role_id}")
    assert res.status_code == 200
    data = res.json()

    # Verify user field contains PublicUserProfile and strictly excludes private fields like email
    assert "user" in data
    assert "email" not in data["user"]
    assert "id" in data["user"]
    assert "username" in data["user"]
    assert data["match"]["score"] > 0
    assert "reasons" in data["match"]
