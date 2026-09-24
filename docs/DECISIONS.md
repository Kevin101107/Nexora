# Nexora — Architectural Decision Records (ADRs)

## ADR-001: Pure Standard-Library Cryptography for Password Hashing
- **Date**: 2026-09-24
- **Context**: Need real, production-grade salted password hashing in Python without introducing heavy C-extension dependencies (such as bcrypt or argon2) that can introduce compilation failures across target environments.
- **Decision**: Implemented PBKDF2-HMAC-SHA256 with 100,000 iterations using Python's standard `hashlib` and `secrets` module.
- **Consequences**: Zero external C-bindings required, OWASP-compliant key derivation, guaranteed portability, constant-time verification using `hmac.compare_digest`.

---

## ADR-002: Dual-Mode Token Authentication Interceptor
- **Date**: 2026-09-24
- **Context**: The existing frontend prototype had mock tokens (`user-alice`) hardcoded in development constants. A full rewrite would risk breaking existing views.
- **Decision**: Enhanced `frontend/src/lib/api.ts` with `getActiveToken()` which checks `localStorage.getItem("nexora_token")`. If a user logs in or switches demo accounts, the real signed JWT is transmitted in `Authorization: Bearer <jwt>`. In the backend, `decode_access_token` checks for valid JWT signatures first, falling back to development IDs only in test environments.
- **Consequences**: Smooth, zero-regression evolution from prototype to production authentication.

---

## ADR-003: Deterministic Match Score V2 vs. Black-Box AI Matching
- **Date**: 2026-09-24
- **Context**: Students and recruiters reject opaque AI scores that cannot explain why a candidate was ranked high or low. LLM calls for matching are also slow, non-deterministic, and costly.
- **Decision**: Implemented an explicit 5-factor deterministic formula (Skill Overlap 45%, Role Alignment 20%, Availability 15%, Delivery Reliability 10%, Project Experience 10%) accompanied by human-readable explanation bullets and skill gap tags.
- **Consequences**: Instantaneous calculations (<5ms), complete transparency, cold-start neutrality, reproducible test assertions.

---

## ADR-004: Shared Project Resources as First-Class Workspace Entity
- **Date**: 2026-09-24
- **Context**: Student teams frequently lose track of Figma files, GitHub repos, API documentation, and staging deployment URLs scattered in chat threads.
- **Decision**: Added `ProjectResource` schema and dedicated Resources Hub within `/projects/[id]/workspace` with categorization (`github`, `figma`, `docs`, `deployment`, `other`) and creator/owner deletion controls.
- **Consequences**: Streamlined project execution and shared knowledge base for confirmed team members.

---

## ADR-005: Strict Boundary Against Generic Productivity Bloat
- **Date**: 2026-09-24
- **Context**: Earlier iterations contemplated flashcards, generic notes, or Pomodoro timers.
- **Decision**: Strictly bounded product scope to teammate discovery, project recruitment, open roles, invitations/applications, team formation, workspace management (tasks, milestones, resources), and notifications.
- **Consequences**: Cohesive, differentiated product value proposition tailored specifically to building and shipping projects together.
