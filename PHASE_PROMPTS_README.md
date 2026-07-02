# UrbanVista Professional Phase Prompts

This document provides professional, copy-paste prompts for executing each transformation phase of UrbanVista.

Use these prompts with your coding agent (GitHub Copilot/LLM) in order, one phase at a time.

## How to Use

1. Complete one phase fully before starting the next.
2. Ask the agent to implement changes directly in code, not just produce plans.
3. Require verification after every phase: build, lint, API checks, and role-based smoke tests.
4. Keep backend authorization as the source of truth.

## Master Context (prepend before each phase prompt)

Paste this context before any phase prompt:

```text
Project: UrbanVista
Stack:
- Backend: Node.js + Express + Supabase + JWT
- Frontend: React + Vite + TypeScript + React Router
Roles:
- resident: self-service, own data only
- secretary: operational management for assigned flat/block scope
- admin: owner-level governance, full visibility and control

Non-negotiables:
- Enforce authorization on backend first
- Preserve existing working features unless phase explicitly changes behavior
- Keep changes production-safe and concurrency-aware
- Add or update migrations when schema changes are required
- After implementation, run validation and report results + remaining risks
```

---

## Phase 1 Prompt: RBAC Foundation and Scope Design

```text
Using the project context, implement Phase 1 end-to-end:

Objective:
Define and establish a secure RBAC foundation for roles resident, secretary, and admin, with flat/block scoped secretary access.

Required outcomes:
1. Create a clear role-permission matrix mapped to all modules: houses, members, vehicles, maintenance, expenditures, reports, settings.
2. Implement/standardize backend role middleware and scoped access utilities.
3. Define secretary assignment model (flat/block mapping) and account lifecycle rules.
4. Add required migration SQL for foundational RBAC tables/columns and indexes.
5. Ensure contracts exist for admin-controlled secretary provisioning, scope assignment, reset, disable/enable.

Implementation rules:
- Backend authorization must be enforceable independent of frontend.
- Do not break existing resident/admin flows.
- Keep code modular and reusable (middleware + scope helpers).

Validation:
- Show changed files.
- Run backend health checks and auth smoke tests.
- Confirm role claims and effective scope resolution work.
- Report what is complete vs pending for next phase.
```

---

## Phase 2 Prompt: Authentication and Account Management

```text
Using the existing Phase 1 foundation, implement Phase 2 fully:

Objective:
Deliver robust, role-aware authentication and secretary account lifecycle management.

Required outcomes:
1. Implement secretary login using admin-provisioned credentials.
2. Add admin APIs/UI flow for secretary create, update, reset password, activate/deactivate, and reassignment.
3. Add lockout/session controls (expiry, refresh/revoke strategy, brute-force protection basics).
4. Ensure role metadata is present in auth responses/token payloads safely.

Implementation rules:
- Hash passwords securely.
- Return minimal secure auth payloads.
- Log critical auth/account events to audit trail.

Validation:
- Verify login/logout/me/effective-scope endpoints.
- Verify account lifecycle APIs with success and failure cases.
- Confirm unauthorized role actions are blocked.
```

---

## Phase 3 Prompt: Backend RBAC and Flat-Level Authorization

```text
Implement Phase 3 across all backend APIs:

Objective:
Enforce role and scope authorization server-side for all protected modules.

Required outcomes:
1. Apply middleware consistently across routes.
2. Enforce secretary flat/block scope for read/write operations.
3. Enforce resident self-scope constraints where applicable.
4. Add audit logging for sensitive actions (create/update/delete/role changes).
5. Add test scenarios for authorization matrix coverage.

Implementation rules:
- Deny by default when scope is missing or invalid.
- Avoid duplicated authorization logic inside handlers; centralize reusable checks.

Validation:
- Provide role-by-role API access matrix with expected HTTP outcomes.
- Run smoke tests for admin full access, secretary scoped access, resident own-only access.
- Confirm no route remains unintentionally unguarded.
```

---

## Phase 4 Prompt: Secretary Panel Migration

```text
Implement Phase 4 in frontend and backend integration:

Objective:
Move day-to-day operational workflows from admin panel to secretary workspace with strict scoping.

Required outcomes:
1. Build/complete secretary panel routes and layout.
2. Port operational modules: houses, members, vehicles, maintenance, expenditures, reports.
3. Ensure all module data and actions are automatically filtered by secretary assignment.
4. Keep admin panel focused on oversight and management controls.

Implementation rules:
- Reuse existing components where possible; avoid duplication by abstraction.
- Preserve UX consistency and role clarity.

Validation:
- Secretary can complete operational tasks only within assigned scope.
- Admin still has global visibility and controls.
- No cross-scope data leakage in API or UI.
```

---

## Phase 5 Prompt: Real-Time Data Synchronization

```text
Implement Phase 5 for real-time cross-panel updates:

Objective:
Ensure resident actions reflect quickly for secretary/admin and maintain consistency under concurrent edits.

Required outcomes:
1. Add real-time event/subscription mechanism for core entities.
2. Update frontend state management for live updates with minimal flicker.
3. Implement optimistic update + rollback strategy.
4. Add conflict handling rules for concurrent writes.

Implementation rules:
- Prioritize correctness over visual speed.
- Keep retry/backoff behavior deterministic.

Validation:
- Demonstrate resident update propagation to secretary/admin in near real-time.
- Simulate concurrent edits and document conflict outcome behavior.
- Confirm no duplicate events or stale UI loops.
```

---

## Phase 6 Prompt: Admin Command Center Dashboard

```text
Implement Phase 6 as an owner-level command center:

Objective:
Transform admin experience into governance, monitoring, and analytics rather than routine operations.

Required outcomes:
1. Build KPI cards/boxes and trend widgets for society-level metrics.
2. Add live activity feed for secretary actions and notable system events.
3. Provide flat-wise and secretary-wise performance views.
4. Add filter controls (date range, block, secretary, category).

Implementation rules:
- Keep dashboard read-optimized.
- Ensure all metrics are traceable to reliable backend aggregations.

Validation:
- Verify metric correctness with sample data checks.
- Confirm dashboard remains responsive for larger datasets.
- Confirm admin-only access and no sensitive leakage to other roles.
```

---

## Phase 7 Prompt: Production Readiness and Concurrency Hardening

```text
Implement Phase 7 for production-grade stability:

Objective:
Harden the platform for multi-user, high-concurrency use with strong observability.

Required outcomes:
1. Optimize critical queries and add missing indexes.
2. Implement rate limiting/security headers/input hardening.
3. Add caching for expensive dashboard/report reads where safe.
4. Add background processing strategy for heavy operations.
5. Prepare monitoring, logging, and alerting baseline.

Implementation rules:
- Do not regress security to gain speed.
- Measure before and after for performance-critical paths.

Validation:
- Provide baseline vs improved metrics.
- Run concurrency/load smoke scenarios.
- Report bottlenecks, mitigations, and residual risks.
```

---

## Phase 8 Prompt: UAT, Rollout, and Governance

```text
Implement Phase 8 launch readiness:

Objective:
Deliver controlled go-live with rollback safety, UAT traceability, and post-launch governance.

Required outcomes:
1. Create role-based UAT checklist and execution evidence.
2. Define staged rollout plan (environment progression + rollback criteria).
3. Finalize runbooks for incident response and support handoff.
4. Create post-launch improvement backlog based on observed issues.

Implementation rules:
- Every release decision must be evidence-backed.
- Keep operational ownership clear across team roles.

Validation:
- Provide go/no-go checklist with status.
- Provide rollback drill summary.
- Provide first-30-days monitoring and triage protocol.
```

---

## Final Delivery Prompt (After All Phases)

```text
Now produce a final transformation report for UrbanVista:
1. Completed work by phase.
2. Changed files and migration scripts.
3. Security and authorization verification summary.
4. Performance/concurrency readiness summary.
5. Remaining risks and recommended next actions.
6. Exact commands to run for build, test, and startup (frontend + backend).
```

## Recommended Execution Order

1. Phase 1
2. Phase 2
3. Phase 3
4. Phase 4
5. Phase 5
6. Phase 6
7. Phase 7
8. Phase 8
9. Final Delivery Prompt
