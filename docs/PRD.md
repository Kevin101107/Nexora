# Nexora — Product Requirements Document (PRD)

## 1. Executive Summary
Nexora is a web-first teammate discovery, formation, and project execution platform specifically engineered for student builders, hackathon squads, and indie developers.

### Problem Statement
Students and indie developers struggle to find committed, skill-aligned collaborators for hackathons, capstone projects, and indie ventures. Traditional platforms provide either generic resumes or fragmented chat channels with zero accountability, leading to ghosting, misaligned expectations, and abandoned repositories.

### Solution
Nexora solves the entire collaboration lifecycle:
1. **Discovery**: Explainable, deterministic Match Score V2 based on verified technical skills, role requirements, availability, and delivery track record.
2. **Team Formation**: Structured role postings, applications, and invitations with explicit capacity enforcement and mutual resolution.
3. **Execution**: Private team workspaces equipped with Kanban boards, milestones, shared resources, and activity audit trails.
4. **Attestation**: Evidence-based builder reputations generated automatically from completed tasks and projects without arbitrary points or black-box algorithms.

---

## 2. Target Personas
- **Student Hackathon Competitor**: Seeking specialized peers (e.g., UI designer, ML engineer) under tight timelines.
- **Capstone / University Project Lead**: Building a semester-long project team with students from specific colleges and departments.
- **Indie Student Hacker**: Looking for long-term co-builders to prototype and ship open-source or commercial software.

---

## 3. Core Functional Requirements

### 3.1 Authentication & Profile Identity
- Secure student account registration with email, password, username, display name, skills, preferred roles, college, department, graduation year, portfolio URL, and experience level.
- Cryptographically secure password hashing (PBKDF2-HMAC-SHA256, 100,000 iterations, unique salt per credential).
- HMAC-SHA256 signed JWT session tokens with tamper-proofing and client-side expiration handling.
- Instant 1-click Quick Demo Builder switcher for frictionless local testing and evaluating the platform from various perspectives (Alice the Founder, Bob the Frontend Engineer, Charlie the ML Lead).

### 3.2 Teammate Discovery & Explainable Matching (Match Score V2)
- Multi-dimensional deterministic scoring (0–100%):
  - Skill Overlap (45%): Jaccard/containment comparison against required role skills.
  - Role Alignment & Experience (20%): Declared interests + verified delivery.
  - Availability & Bandwidth (15%): Open vs. busy status with workload penalty.
  - Task Delivery Reliability (10%): Ratio of completed assigned tasks (neutral 100% for cold-start users).
  - Project Completion Track Record (10%): Number of successfully shipped projects.
- Clear explanation bullets detailing why a candidate matches and explicit tags for missing skills.

### 3.3 Project Lifecycle & Role Management
- Creation of projects with title, pitch, description, category (`hackathon`, `side_project`, `research`, `startup`), visibility, and tags.
- Granular open roles per project with required skills, descriptions, and designated slot counts.
- Automated role state transitions:
  - `open`: Available slots remaining (`open_slots > 0`).
  - `filled`: All slots occupied (`open_slots == 0`).
  - `closed`: Explicitly closed by the project owner.

### 3.4 Request & Invitation Flow
- Project owners can invite candidates to specific open roles with customized messages.
- Candidates can apply to specific open roles with targeted pitches.
- Strict authorization: Only owners can invite or accept applications; only recipients can respond to invitations.
- Automatic resolution: Accepting an invitation or application marks the role slot filled and resolves reciprocal pending requests.

### 3.5 Team Workspace Execution
- Dedicated private workspace per project (`/projects/[id]/workspace`) accessible only to confirmed team members and owners.
- Collaborative Kanban Board (`todo`, `in_progress`, `done`) with member assignment, milestone linkage, and priority tags.
- Milestone Tracking: Progress percentages and deadlines.
- Project Resources Hub: Central repository of GitHub links, Figma prototypes, documentation, and live deployments with category-specific badges.
- Real-time project activity audit log.

### 3.6 Notification Center
- Categorized notifications across `Team`, `Tasks`, `Milestones`, and `Projects`.
- Unread count badge and one-click "Mark All as Read" action.
- Granular preference controls to mute or enable specific notification categories.

---

## 4. Non-Functional Requirements
- **Performance**: Sub-100ms API response times for queries and match score calculations; statically optimized Next.js client.
- **Security**: Server-enforced authorization across all mutations (zero IDOR), OWASP input sanitization, salted password hashing, JWT signing.
- **Reliability**: 100% test coverage for critical business rules, role capacity enforcement, and end-to-end user journeys.
