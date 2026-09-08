import re
from typing import List, Dict, Set, Tuple, Optional, Literal
from pydantic import BaseModel, Field

# ── Centralized Weights & Constants ──────────────────────────────────────────

WEIGHT_SKILL = 0.60
WEIGHT_ROLE = 0.25
WEIGHT_AVAILABILITY = 0.15

# Role Canonicalization / Explicit Alias Map
# Only explicit, documented aliases are mapped here.
ROLE_ALIASES: Dict[str, str] = {
    # Frontend
    "frontend": "frontend developer",
    "frontend developer": "frontend developer",
    "frontend engineer": "frontend developer",
    "ui engineer": "frontend developer",
    "ui developer": "frontend developer",
    # Backend
    "backend": "backend developer",
    "backend developer": "backend developer",
    "backend engineer": "backend developer",
    # Full Stack
    "full stack": "full stack developer",
    "full-stack": "full stack developer",
    "full stack developer": "full stack developer",
    "full-stack developer": "full stack developer",
    "full stack engineer": "full stack developer",
    "full-stack engineer": "full stack developer",
    # Mobile
    "mobile": "mobile developer",
    "mobile developer": "mobile developer",
    "mobile engineer": "mobile developer",
    "ios developer": "mobile developer",
    "android developer": "mobile developer",
    "react native developer": "mobile developer",
    "flutter developer": "mobile developer",
    # UI/UX / Design
    "ui/ux": "ui/ux designer",
    "ui/ux designer": "ui/ux designer",
    "product designer": "ui/ux designer",
    "designer": "ui/ux designer",
    # AI / ML
    "ai / ml": "ai / ml engineer",
    "ai/ml": "ai / ml engineer",
    "ai engineer": "ai / ml engineer",
    "ml engineer": "ai / ml engineer",
    "machine learning engineer": "ai / ml engineer",
    "data scientist": "ai / ml engineer",
    # DevOps / Infra
    "devops": "devops engineer",
    "devops engineer": "devops engineer",
    "cloud engineer": "devops engineer",
    "infrastructure engineer": "devops engineer",
    # Product
    "product manager": "product manager",
    "pm": "product manager",
}


class MatchScoreResult(BaseModel):
    score: int = Field(ge=0, le=100)
    skill_score: int = Field(ge=0, le=100)
    role_score: int = Field(ge=0, le=100)
    availability_score: int = Field(ge=0, le=100)
    matched_skills: List[str] = Field(default_factory=list)
    missing_skills: List[str] = Field(default_factory=list)
    role_match: bool
    availability_match: bool
    reasons: List[str] = Field(default_factory=list)
    evidence_quality: Literal["high", "medium", "low"]
    score_label: str


# ── Pure Helper Functions ─────────────────────────────────────────────────────

def normalize_value(value: Optional[str]) -> str:
    """
    Trim whitespace, lowercase, and collapse multiple spaces into one.
    """
    if not value:
        return ""
    return re.sub(r"\s+", " ", value.strip().lower())


def normalize_collection(values: Optional[List[str]]) -> List[str]:
    """
    Normalize a list of strings, removing empties and duplicates while preserving order.
    """
    if not values:
        return []
    seen: Set[str] = set()
    result: List[str] = []
    for val in values:
        norm = normalize_value(val)
        if norm and norm not in seen:
            seen.add(norm)
            result.append(norm)
    return result


def canonicalize_role(role_name: str) -> str:
    """
    Map a role name to its canonical form using the explicit alias map,
    or return the normalized role name if not in alias map.
    """
    norm = normalize_value(role_name)
    return ROLE_ALIASES.get(norm, norm)


def get_score_label(score: int) -> str:
    """
    Human-readable label for a match score.
    """
    if score >= 90:
        return "Excellent Match"
    elif score >= 75:
        return "Strong Match"
    elif score >= 60:
        return "Good Match"
    elif score >= 40:
        return "Partial Match"
    else:
        return "Low Match"


# ── Component Matching Calculations ──────────────────────────────────────────

def calculate_skill_match(
    user_skills: Optional[List[str]],
    required_skills: Optional[List[str]],
) -> Tuple[int, List[str], List[str], str]:
    """
    Calculate skill match score (0-100), matched skills, missing skills, and explanation.

    Explicit neutral/missing data rules:
    - If the project role has 0 required skills: neutral score = 50 (cannot claim 100% skill match).
    - If user has 0 skills and role requires skills: score = 0.
    """
    # Map normalized key -> original required string to preserve display casing
    req_map: Dict[str, str] = {}
    if required_skills:
        for s in required_skills:
            norm = normalize_value(s)
            if norm and norm not in req_map:
                req_map[norm] = s.strip()

    total_required = len(req_map)

    # If role has no required skills, neutral baseline score is 50
    if total_required == 0:
        return (
            50,
            [],
            [],
            "Role has no specific skill requirements",
        )

    user_normalized_set = set(normalize_collection(user_skills))

    if not user_normalized_set:
        return (
            0,
            [],
            list(req_map.values()),
            f"0 of {total_required} required skills matched (no skills listed on builder profile)",
        )

    matched_skills: List[str] = []
    missing_skills: List[str] = []

    for norm_req, orig_req in req_map.items():
        if norm_req in user_normalized_set:
            matched_skills.append(orig_req)
        else:
            missing_skills.append(orig_req)

    matched_count = len(matched_skills)
    skill_score = int(round((matched_count / total_required) * 100))

    explanation = f"Matched {matched_count} of {total_required} required skills"
    return skill_score, matched_skills, missing_skills, explanation


def calculate_role_match(
    user_roles: Optional[List[str]],
    target_role_name: Optional[str],
) -> Tuple[int, bool, str]:
    """
    Compare user's preferred roles against the project role name.

    Rules:
    - Exact or alias match: 100
    - Missing user roles or target role: 0
    - No match: 0
    """
    if not target_role_name or not target_role_name.strip():
        return 0, False, "Target project role is undefined"

    clean_target = target_role_name.strip()
    target_canonical = canonicalize_role(clean_target)

    if not user_roles:
        return 0, False, f"No preferred roles listed to match against {clean_target}"

    # Check each user role against target
    for u_role in user_roles:
        if not u_role:
            continue
        u_canonical = canonicalize_role(u_role)
        if u_canonical == target_canonical:
            return 100, True, f"Preferred role matches {clean_target}"

    return 0, False, f"Preferred roles do not match {clean_target}"


def calculate_availability_match(
    user_availability: Optional[str],
    project_category: Optional[str],
) -> Tuple[int, bool, str]:
    """
    Deterministic compatibility rules based on Phase 2 availability and project category.

    Rules:
    - Missing / null user availability: 50 (neutral, unknown)
    - "busy": 0 (incompatible)
    - "open": 100 (open to all collaborations)
    - "looking_for_hackathon":
        - project_category == 'hackathon': 100 (direct match)
        - otherwise: 40 (partial/mismatched preference)
    - "looking_for_project":
        - project_category in ('side_project', 'research', 'startup'): 100
        - project_category == 'hackathon': 40
    - Other/unknown: 50 (neutral)
    """
    norm_avail = normalize_value(user_availability)
    norm_cat = normalize_value(project_category)

    if not norm_avail:
        return 50, False, "Availability status not specified on profile"

    if norm_avail == "busy":
        return 0, False, "Builder is currently marked as busy / full"

    if norm_avail == "open":
        return 100, True, "Builder is open to all collaborations"

    if norm_avail == "looking_for_hackathon":
        if norm_cat == "hackathon":
            return 100, True, "Builder is specifically looking for a hackathon squad"
        cat_display = project_category.replace("_", " ") if project_category else "project"
        return 40, False, f"Builder preferred hackathon squads; project is a {cat_display}"

    if norm_avail == "looking_for_project":
        if norm_cat in ("side_project", "research", "startup", ""):
            return 100, True, "Builder is looking for project collaborations"
        return 40, False, "Builder preferred longer-term projects; project is a hackathon"

    return 50, False, "Availability compatibility could not be determined"


def calculate_evidence_quality(
    has_skills_evidence: bool,
    has_role_evidence: bool,
    has_availability_evidence: bool,
) -> Literal["high", "medium", "low"]:
    """
    Determines evidence quality based on how many structured components
    provided meaningful data.
    """
    count = sum([has_skills_evidence, has_role_evidence, has_availability_evidence])
    if count == 3:
        return "high"
    elif count == 2:
        return "medium"
    else:
        return "low"


# ── Overall Match Score V1 Calculation ────────────────────────────────────────

def calculate_match_score(
    user_skills: Optional[List[str]],
    user_roles: Optional[List[str]],
    user_availability: Optional[str],
    role_name: Optional[str],
    required_skills: Optional[List[str]],
    project_category: Optional[str],
) -> MatchScoreResult:
    """
    Pure deterministic Match Score V1 calculation.
    """
    # 1. Skill match
    skill_score, matched_skills, missing_skills, skill_reason = calculate_skill_match(
        user_skills, required_skills
    )

    # 2. Role match
    role_score, role_match, role_reason = calculate_role_match(
        user_roles, role_name
    )

    # 3. Availability match
    avail_score, avail_match, avail_reason = calculate_availability_match(
        user_availability, project_category
    )

    # 4. Weighted formula
    weighted = (
        (skill_score * WEIGHT_SKILL)
        + (role_score * WEIGHT_ROLE)
        + (avail_score * WEIGHT_AVAILABILITY)
    )

    final_score = int(round(weighted))
    final_score = max(0, min(100, final_score))

    # 5. Evidence Quality
    # Skills has meaningful evidence if user has skills and role defines requirements
    has_skills_evidence = bool(
        normalize_collection(user_skills) and normalize_collection(required_skills)
    )
    has_role_evidence = bool(normalize_collection(user_roles))
    norm_avail = normalize_value(user_availability)
    has_avail_evidence = norm_avail in ("open", "looking_for_hackathon", "looking_for_project", "busy")

    evidence_quality = calculate_evidence_quality(
        has_skills_evidence, has_role_evidence, has_avail_evidence
    )

    # 6. Template reasons
    reasons = [skill_reason, role_reason, avail_reason]

    return MatchScoreResult(
        score=final_score,
        skill_score=skill_score,
        role_score=role_score,
        availability_score=avail_score,
        matched_skills=matched_skills,
        missing_skills=missing_skills,
        role_match=role_match,
        availability_match=avail_match,
        reasons=reasons,
        evidence_quality=evidence_quality,
        score_label=get_score_label(final_score),
    )
