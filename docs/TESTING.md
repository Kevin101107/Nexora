# Nexora — Testing & Verification Guide

## 1. Testing Philosophy
Every feature, authorization boundary, and business rule in Nexora is validated through automated test suites and runtime verification gates. Tests run locally and in CI with zero external network or mock flakiness.

---

## 2. Test Suites Overview

### 2.1 Backend Pytest Suite
- **Location**: `backend/tests/`
- **Total Tests**: **149**
- **Test Modules**:
  - `test_auth.py` (7 tests): Password hashing, salt randomness, signature validation, tampering rejection, login, duplicate email rejection, production mock token rejection.
  - `test_business_rules.py` (1 test): 15 comprehensive business rules (owner-only roles, self-invite prevention, self-application prevention, role capacity, duplicate pending prevention, IDOR protection).
  - `test_e2e_complete_flows.py` (1 test): End-to-end integration tests for complete user journeys Flow A & Flow B.
  - `test_resources.py` (1 test): Project resources CRUD, member authorization, outsider rejection.
  - `test_matching_v2.py` (17 tests): Match Score V2 calculations, weightings, cold-start baselines, explanation bullets.
  - `test_matching.py` (12 tests): Recommendation ordering, deterministic tie-breaking, privacy exclusion.
  - `test_workspace.py` (17 tests): Tasks, milestones, activity feeds, progress percentage recalculation, member access.
  - `test_team_formation.py` (7 tests): Invitations, applications, reciprocal resolution, role capacity state changes.
  - `test_notifications.py` (28 tests): Notification triggers, recipient privacy, unread counters, category preferences.
  - `test_badges.py`, `test_contributions.py`, `test_users.py`, `test_projects.py`: Legacy and base entity validations.

### 2.2 Frontend Quality Gates
- **TypeScript Compilation**: `npx tsc --noEmit` verifies 100% strict type safety across all React components, page routes, and utility hooks.
- **ESLint**: `npm run lint` enforces Next.js recommended linting rules and prevents common React pitfalls.
- **Next.js Production Build**: `npm run build` verifies full static site generation, server rendering manifests, and production asset bundling for all 16 application routes.

---

## 3. How to Run Verification

### Run Backend Pytest Suite
```bash
cd backend
PYTHONPATH=. .venv/bin/pytest -v
```

### Run Frontend Quality Gates
```bash
cd frontend

# 1. Typecheck
npx tsc --noEmit

# 2. Lint
npm run lint

# 3. Production Build
npm run build
```

---

## 4. Verification Gate Results Record

| Gate | Target | Result | Status |
| :--- | :--- | :--- | :--- |
| **Backend Pytest** | 100% Passing | **149 / 149 passed** (1.70s) | **PASSED** |
| **Frontend TypeScript** | 0 errors | **0 errors** | **PASSED** |
| **Frontend ESLint** | 0 warnings | **0 warnings / 0 errors** | **PASSED** |
| **Next.js Build** | 16/16 routes | **16/16 routes compiled** | **PASSED** |
| **Flow A E2E Journey** | Complete flow | Verified in `test_e2e_complete_flows.py` | **PASSED** |
| **Flow B E2E Journey** | Complete flow | Verified in `test_e2e_complete_flows.py` | **PASSED** |
