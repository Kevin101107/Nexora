import uuid
from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Text,
    Integer,
    DateTime,
    ForeignKey,
    JSON,
    UniqueConstraint,
    CheckConstraint,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)
    email = Column(String, nullable=False)
    display_name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    username = Column(String, unique=True, nullable=True, index=True)
    headline = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    skills = Column(JSON, default=list, nullable=False)
    roles = Column(JSON, default=list, nullable=False)
    interests = Column(JSON, default=list, nullable=False)
    github_url = Column(String, nullable=True)
    linkedin_url = Column(String, nullable=True)
    availability = Column(String, default="open", nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    owned_projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan", foreign_keys="Project.owner_id")
    project_memberships = relationship("ProjectMember", back_populates="user", cascade="all, delete-orphan", foreign_keys="ProjectMember.user_id")
    applications = relationship("ProjectApplication", back_populates="applicant", cascade="all, delete-orphan", foreign_keys="ProjectApplication.applicant_id")
    sent_requests = relationship("TeammateRequest", back_populates="sender", cascade="all, delete-orphan", foreign_keys="TeammateRequest.sender_id")
    received_requests = relationship("TeammateRequest", back_populates="receiver", cascade="all, delete-orphan", foreign_keys="TeammateRequest.receiver_id")


class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    owner_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String, default="side_project", nullable=False, index=True)
    status = Column(String, default="recruiting", nullable=False, index=True)
    visibility = Column(String, default="public", nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    owner = relationship("User", back_populates="owned_projects", foreign_keys=[owner_id])
    roles = relationship("ProjectRole", back_populates="project", cascade="all, delete-orphan")
    members = relationship("ProjectMember", back_populates="project", cascade="all, delete-orphan")
    applications = relationship("ProjectApplication", back_populates="project", cascade="all, delete-orphan")


class ProjectRole(Base):
    __tablename__ = "project_roles"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    role_name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    required_skills = Column(JSON, default=list, nullable=False)
    slots = Column(Integer, default=1, nullable=False)
    filled_slots = Column(Integer, default=0, nullable=False)
    status = Column(String, default="open", nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relationships
    project = relationship("Project", back_populates="roles")
    members = relationship("ProjectMember", back_populates="role")
    applications = relationship("ProjectApplication", back_populates="role")

    __table_args__ = (
        CheckConstraint("slots > 0", name="chk_project_roles_slots_positive"),
        CheckConstraint("filled_slots >= 0 AND filled_slots <= slots", name="chk_project_roles_filled_slots_valid"),
    )


class ProjectMember(Base):
    __tablename__ = "project_members"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role_id = Column(String, ForeignKey("project_roles.id", ondelete="SET NULL"), nullable=True)
    member_role = Column(String, default="Member", nullable=False)  # "Owner", "Lead", "Member"
    joined_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relationships
    project = relationship("Project", back_populates="members")
    user = relationship("User", back_populates="project_memberships")
    role = relationship("ProjectRole", back_populates="members")

    __table_args__ = (
        UniqueConstraint("project_id", "user_id", name="uq_project_member"),
    )


class ProjectApplication(Base):
    __tablename__ = "project_applications"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    role_id = Column(String, ForeignKey("project_roles.id", ondelete="SET NULL"), nullable=True)
    applicant_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    message = Column(Text, nullable=True)
    status = Column(String, default="pending", nullable=False, index=True)  # "pending", "accepted", "rejected", "withdrawn"
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    project = relationship("Project", back_populates="applications")
    role = relationship("ProjectRole", back_populates="applications")
    applicant = relationship("User", back_populates="applications")


class TeammateRequest(Base):
    __tablename__ = "teammate_requests"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    sender_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    receiver_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(String, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    message = Column(Text, nullable=True)
    status = Column(String, default="pending", nullable=False, index=True)  # "pending", "accepted", "declined", "cancelled"
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_requests")
    receiver = relationship("User", foreign_keys=[receiver_id], back_populates="received_requests")
    project = relationship("Project")

    __table_args__ = (
        CheckConstraint("sender_id <> receiver_id", name="chk_no_self_request"),
    )
