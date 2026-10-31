# LabReserve Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Deliver a working reservation application and Thai learning course with reproducible verification.
**Architecture:** npm workspaces for React web, Express API, shared contracts. Parameterized PostgreSQL queries, database-enforced non-overlap, sessions, same-origin delivery.
**Tech Stack:** TypeScript strict, React/Vite, Express, pg, Zod, Vitest, Playwright, Docker Compose, GitHub Actions.
**Spec:** docs/superpowers/specs/2026-10-31-lab-reservation-design.md (approved by user).

## Global Constraints

- Equipment is one physical asset; intervals [start,end); timestamps stored as timestamptz and displayed in Asia/Bangkok.
- confirmed/cancelled persisted; derived upcoming/active/completed status.
- Member cancel before start; admin cancel before end with reason.
- Parameterized SQL, btree_gist exclusion constraint, equipment row locking.
- No public hosting/account creation or paid resources. Local seed never production.
- Thai UI/course; no secrets in repository/logs. Explain AI authorship honestly.

## Review Focus

- DST/offset-free date input must not silently shift a reservation (Task 1 and 4).
- Malformed ids, query limits, and oversized request bodies return safe errors (Task 2/3).
- Session rotation, logout, expiry and CSRF prevent stale/forged access (Task 2).
- Two cancellation requests cannot create duplicate events; disable/book race is serialized (Task 3).
- Failed database operations roll back state and history together; restore verifies actual records (Task 3/5).

### Task 1: Workspace and executable domain rules

**Files:** package.json, tsconfig.base.json, packages/contracts/src/index.ts, apps/api/src/reservations/rules.ts, apps/api/test/rules.test.ts, config files.
**Interfaces:** intervalSchema -> {startAt:string,endAt:string}; assertBookingWindow(start,end,now):void; assertCancellation(role,start,end,reason,now):void.

- [x] Write literal boundary tests: equal/end-before-start rejected, adjacent interval accepted by DB later, start==now allowed, member at start rejected, admin before end requires reason, offset required.
- [x] Run npm test; observe missing rules/failed assertions.
- [x] Implement schemas, rules and AppError with HTTP status/code.
- [x] Run npm test and typecheck; expect all domain tests pass. Commit.

### Task 2: Database, sessions and equipment API

**Files:** apps/api/migrations/001_initial.sql; src/db.ts, config.ts, app.ts, auth/_, equipment/_, scripts/{migrate,seed,bootstrap-admin}.ts; test/api.test.ts.
**Interfaces:** createApp(pool,config):Express; migrate(pool):Promise<void>; /api/v1/auth/{csrf,register,login,logout,me}; /api/v1/equipment GET/POST; /equipment/:id GET/PATCH. Auth responses {user}; list {items,total,page,pageSize}; errors {error:{code,message,requestId}}.

- [x] Write integration tests against dedicated real PostgreSQL for register/login/me/logout, password mismatch, duplicate normalized email, CSRF, expired session, admin-only equipment edits, pagination and malformed ids.
- [x] Run npm run test:integration; expect missing behavior failure.
- [x] Implement SQL schema/migrations, transaction helper, hashed passwords and tokens, CSRF, session rotation, safe DTOs, validation and centralized errors.
- [x] Run npm test and npm run test:integration; expect all pass. Commit.

### Task 3: Transactional reservation workflow

**Files:** src/reservations/{repository,service,routes}.ts; test/reservations.test.ts.
**Interfaces:** /api/v1/reservations GET/POST; /:id GET; /:id/cancel POST; GET /equipment/:id/availability?startAt&endAt. Reservation DTO contains equipmentName, startAt/endAt,status,phase, own accessible events.

- [x] Write tests for concurrent overlap (201,409), touching intervals (201,201), cancelled frees slot, ownership, member/admin deadlines, inactive equipment, rollback and repeated cancel.
- [x] Run integration tests; expect missing endpoints fail.
- [x] Implement row locking and transactions, map exclusion violation to 409, events with state changes, pagination/filtering and scoped history.
- [x] Run full unit/integration suite; expect pass. Commit.

### Task 4: Accessible web UI

**Files:** apps/web/src/{App,api,styles,dates}.*, components and pages; e2e/app.spec.ts; playwright.config.ts.
**Interfaces:** consumes Task 2/3 routes with CSRF header, credentials, typed DTOs. Bangkok datetime-local conversion done explicitly.

- [x] Write date conversion tests and browser flow tests (register, book, see conflict, cancel, admin edit, mobile).
- [x] Run tests before implementation; record failure.
- [x] Implement Thai responsive UI, accessible labels, error/loading/empty states, pagination, history, admin forms.
- [x] Run all tests and production build; manually inspect screenshots and keyboard flow. Commit.

### Task 5: Runtime, delivery and operational evidence

**Files:** Dockerfile, compose.yaml, .github/workflows/ci.yml, src/server.ts, scripts/{load-test,restore-check}.*, docs/{operations,verification}.md, docs/openapi.yaml.
**Interfaces:** npm run dev/build/start/check/test/test:integration/test:e2e; /health/live and /health/ready; DATABASE_URL and APP_ORIGIN configuration.

- [x] Add tests proving readiness failure is 503, safe malformed JSON errors, production config rejection without secure settings.
- [x] Run failing tests then implement guards, logging, shutdown and deployment scripts.
- [x] Run fresh Compose path, load test with recorded conditions and real pg_dump/restore drill; record exact evidence and any environment limits.
- [x] Run check/build and all tests. Commit.

### Task 6: Thai learning course and portfolio handoff

**Files:** README.md, docs/architecture.md, docs/adr/_, docs/lessons/{00..12}.md, docs/solutions/_, examples/*, docs/portfolio.md.
**Interfaces:** every lesson references real files/commands from Tasks 1–5; runnable CLI and isolated race lab.

- [x] Create foundation examples with tests first; run fail then implement and pass.
- [x] Write 13 lessons with prerequisites, goals, file tour, commands, expected output, troubleshooting, exercise, separate solution and comprehension checks.
- [x] Cross-check commands/links against repository; run examples and quickstart checks.
- [x] Run final verification, independent whole-project code review, fix important findings with regression tests, record actual limitations. Commit.

## Execution decision

Proceed inline under the user's authorization to plan and develop to completion; do not request repeated approval for routine implementation. A fresh reviewer will inspect the final implementation. New repository on feat/labreserve, no pre-existing work to isolate.

## Completion evidence

See docs/verification.md and docs/review.md for commands, results, review fixes and limitations. GitHub Actions is supplied but not run remotely; repository has no remote.
