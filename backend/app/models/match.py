from pydantic import BaseModel
from typing import List, Optional
from app.models.user import PublicUserProfile
from app.models.project import ProjectRoleRead, ProjectListItem
from app.services.matching import MatchScoreResult, MatchScoreV2


class UserRoleMatchResponse(BaseModel):
    user: PublicUserProfile
    project: ProjectListItem
    role: ProjectRoleRead
    match: MatchScoreResult


class RoleCandidateMatch(BaseModel):
    user: PublicUserProfile
    match: MatchScoreResult


class UserRoleRecommendation(BaseModel):
    project: ProjectListItem
    role: ProjectRoleRead
    match: MatchScoreResult
