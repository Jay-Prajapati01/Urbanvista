# Phase 1 Implementation Plan

## Objective
Establish the RBAC foundation for UrbanVista so resident, secretary, and admin access is enforced from the backend outward.

## Completed in This Step
- Added a reusable permission matrix for resident, secretary, and admin.
- Standardized staff auth context to always attach permission and scope metadata.
- Normalized secretary scope data to include a machine-readable scope type.
- Added a public role-matrix endpoint for UI and integration reference.
- Added audit logging for secretary lifecycle actions.
- Hardened standard staff routes with method-aware permission checks.
- Added settlement workflow APIs for secretary submission and admin review.
- Added resident statement access for payment and history review.

## Next Backend Tasks
1. Add end-to-end API smoke tests for admin, secretary, and resident access paths.
2. Wire frontend dashboards to the new role matrix and settlement endpoints.
3. Add any missing resident read endpoints for profile and notices if the UI requires them.
4. Add migration coverage checks against `Backend/database/phase1_rbac.sql` and verify indexes match query patterns.

## Validation Checklist
- [x] Backend RBAC helpers compile without syntax errors.
- [x] Secretaries remain admin-only for provisioning routes.
- [x] Scope metadata is attached for secretary requests.
- [x] Audit entries are written for secretary provisioning changes.
- [ ] End-to-end API smoke test for admin, secretary, and resident role access.
- [ ] Database migration applied in Supabase and schema reloaded.
- [ ] Frontend role-aware UI wiring for the new permission matrix.

## Implementation Principle
Keep authorization on the backend as the source of truth. The frontend should only reflect the permissions the backend already enforces.
