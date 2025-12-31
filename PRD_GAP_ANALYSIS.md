# Convin Elevate — PRD vs Implementation Gap Analysis

Source PRD: `/Users/arsalaanmohammed/Desktop/Convin Elevate/CSM Tool - Final Detailed PRD.pdf` (extracted to text).

This repo currently implements a **working MVP** across core modules (customers, activities, risks, opportunities, tasks, datalabs reports, documents-as-metadata, dashboards, exports, settings/users), but **does not yet implement the full “enterprise-grade Vitally-like” scope** described in the PRD.

## Quick Verdict

- **Core modules present**: ✅
- **Full PRD coverage**: ❌ (**many requirements are partial/missing**, especially RBAC/data-scoping, integrations/sync, advanced filtering/saved views, full document/file handling, and many data model fields).

## CRUD coverage by module (Backend API + Frontend UI)

Legend:
- ✅ = supported
- ⚠️ = exists but has a known issue / is partial
- ❌ = missing

| Module / Entity | Create | Read | Update | Delete | Notes / Gaps |
|---|---:|---:|---:|---:|---|
| **Auth** | ✅ | ✅ | N/A | N/A | API: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`. UI: Login/Register screens. |
| **Users** | ✅ | ✅ | ✅ | ✅ | API: `GET /api/users`, `PUT /api/users/{user_id}`, `DELETE /api/users/{user_id}`, `POST /api/users/{user_id}/reset-password`. UI: Settings → User Management (create via register, edit, reset password, delete). |
| **Settings** | N/A | ✅ | ✅ | ❌ | API: `GET /api/settings`, `PUT /api/settings`, tags `POST/DELETE /api/settings/tags`. UI edits settings + tags. Missing: enforcement of many settings across all forms/filters. |
| **Customers** | ✅ | ✅ | ✅ | ✅ (API) / ❌ (UI) | API: `POST/GET /api/customers`, `GET/PUT/DELETE /api/customers/{customer_id}`. UI: create/list/detail/update. **Customer delete isn’t exposed in UI** (only API). |
| **Customers: Bulk upload** | ✅ | N/A | ⚠️ | N/A | API: `POST /api/customers/bulk-upload`. UI: Bulk upload modal. “Update existing vs create” behavior depends on CSV row matching logic; no dry-run/preview. |
| **Customers: Account health** | N/A | ✅ (via customer) | ✅ | N/A | API: `PUT /api/customers/{customer_id}/health`. UI: “Change Health”. |
| **Customers: Account status** | N/A | ✅ (via customer) | ✅ | N/A | API: `PUT /api/customers/{customer_id}/account-status`. UI: inline edit in Customer list + Customer detail. |
| **Stakeholders** | ✅ | ✅ (via customer) | ✅ | ❌ | API: `POST /api/customers/{customer_id}/stakeholders`, `PUT /api/customers/{customer_id}/stakeholders/{stakeholder_id}`. Missing: stakeholder delete endpoint. |
| **Documents (customer documents metadata)** | ✅ | ✅ | ❌ | ✅ | API: `POST/GET /api/customers/{customer_id}/documents`, `DELETE /api/customers/{customer_id}/documents/{document_id}`. UI: add/list/delete. Missing: update document metadata; also this is **not file upload/storage**. |
| **Activities** | ✅ | ✅ | ✅ | ❌ | API: `POST/GET /api/activities`, `PUT /api/activities/{activity_id}`. UI: Customer detail tab + Activity form supports create/edit. Missing: delete endpoint + UI. |
| **Risks** | ✅ | ✅ | ⚠️ | ❌ | API: `POST/GET /api/risks`, `PUT /api/risks/{risk_id}`. **Bug risk**: there are **two** `PUT /api/risks/{risk_id}` route definitions in `server.py` (one typed, one `dict`) — should be consolidated. Missing: delete endpoint + UI. |
| **Opportunities** | ✅ | ✅ | ✅ | ❌ | API: `POST/GET /api/opportunities`, `PUT /api/opportunities/{opportunity_id}`. UI: Pipeline + Opportunity form supports create/edit. Missing: delete endpoint + UI. |
| **Tasks** | ✅ | ✅ | ⚠️ | ✅ (API) / ❌ (UI) | API: `POST/GET /api/tasks`, `PUT /api/tasks/{task_id}`, `DELETE /api/tasks/{task_id}`. UI: Task list + Task form supports create/edit; status toggle does **partial PUT**. **Backend expects a full `TaskCreate` body for updates**, so partial update calls may fail / overwrite fields; should be changed to PATCH/partial update. Task delete not exposed in UI. |
| **Data Labs Reports** | ✅ | ✅ | ❌ | ❌ | API: `POST/GET /api/datalabs-reports`. UI: create/list only. Missing update/delete + richer scheduling/templates from PRD. |
| **Dashboard / Analytics** | N/A | ✅ | N/A | N/A | API: `GET /api/dashboard/stats`. UI: Dashboard + Reports use this. Missing: role-based dashboards + deeper analytics/predictive features from PRD. |
| **Exports / Reports** | ✅ | ✅ | N/A | N/A | API: `GET /api/exports/{entity}`, `GET /api/exports/dump`. UI: export buttons on Customers/Tasks/Opportunities/DataLabs + “Export All” dump. Missing: scheduled/custom report builder, PDF exports, permissions/audit around exports. |

## What’s Implemented (High Confidence)

### Module 1 — Customer Data Management (MVP)
- **Implemented**:
  - Customer CRUD, list/search/basic filtering, detail view (`frontend/src/pages/CustomerList.jsx`, `frontend/src/pages/CustomerDetail.jsx`)
  - Stakeholders (basic add/update) (`/api/customers/{id}/stakeholders`)
  - Bulk upload customers from CSV (`/api/customers/bulk-upload`)
  - Account health score/status + update health status (`/api/customers/{id}/health`)
  - Account status update (inline on list + detail) (`/api/customers/{id}/account-status`)
- **Partial**:
  - Customer data model vs PRD: only a subset of PRD fields exist in `Customer` (e.g., no logo upload, tier, company size, address, currency/payment fields, onboarding checklist/progress %, integrations checklist, etc.)
  - Tags exist but are not deeply integrated into workflow/filters beyond basic display
- **Missing** (examples from PRD):
  - Advanced filtering system (multi-field, ranges, AND/OR logic, filter chips)
  - Saved views (custom filter views)
  - Column customization / table sorting / multi-column sort
  - Bulk actions beyond CSV import (bulk edit tags/status/owners, etc.)

### Module 2 — CSM Activity & Risk Logging (MVP+)
- **Implemented**:
  - Activities create/list/update (`/api/activities`)
  - Risks create/list/update (`/api/risks`)
  - Customer detail tabs to view/create/edit (`frontend/src/pages/CustomerDetail.jsx`)
- **Partial / Missing**:
  - No delete endpoints for activities/risks
  - Limited “workflows” around follow-ups, playbooks, and automated reminders described in PRD

### Module 3 — Opportunity Tracking (MVP)
- **Implemented**:
  - Opportunities create/list/update (`/api/opportunities`)
  - Kanban pipeline UI (`frontend/src/pages/OpportunityPipeline.jsx`)
- **Missing/Partial**:
  - No delete endpoint
  - Minimal forecasting/rollups vs PRD (stages, probability, renewal forecasting, etc.)

### Module 4 — Task Management (Partial)
- **Implemented**:
  - Tasks create/list/update/delete (`/api/tasks`)
  - Basic filters & UI (`frontend/src/pages/TaskList.jsx`)
- **Risk**:
  - Backend `PUT /tasks/{task_id}` is typed as `TaskCreate` (full object) — while UI sends partial updates in some places. This can cause “works sometimes / fails sometimes” behavior and should be aligned.

### Module 5 — Data Labs Reports (MVP)
- **Implemented**:
  - Data labs reports create/list (`/api/datalabs-reports`)
  - UI to create entries (`frontend/src/pages/DataLabsReports.jsx`)
- **Missing**:
  - Update/delete, richer “sent_to”, templates, scheduled sending, etc. as described in PRD

### Module 6 — Document Management (Partial)
- **Implemented**:
  - Document *metadata* stored per customer (`/api/customers/{id}/documents`) — supports adding a URL and displaying/previewing via that URL
- **Missing**:
  - Actual file upload/storage pipeline (S3/local), file permissions, versioning, virus scanning, etc.

### Module 7 — Dashboard & Analytics (MVP)
- **Implemented**:
  - Dashboard stats endpoint (`/api/dashboard/stats`) and a dashboard UI (`frontend/src/pages/Dashboard.jsx`)
- **Missing**:
  - Role-specific dashboards, deeper analytics, predictive health, configurable KPIs, etc.

### Module 8 — Reporting & Exports (MVP)
- **Implemented**:
  - CSV/JSON exports for major entities (`/api/exports/{entity}`)
  - Full JSON dump (`/api/exports/dump`)
  - UI triggers added for exports in multiple pages
- **Missing**:
  - Scheduled reports, custom report builder, PDF exports, permissions around sensitive exports

### Module 9 — Settings & Configuration (Partial)
- **Implemented**:
  - Persisted settings document (`/api/settings`) including org fields, health thresholds, notifications, tags, dropdowns, field configs, roles, templates
  - UI wiring for editing these (`frontend/src/pages/Settings.jsx`)
- **Missing**:
  - Many settings are not yet enforced across the product (e.g., dropdown definitions controlling actual form options everywhere)

### Module 10 — User & Role Management (Partial)
- **Implemented**:
  - Register/login/me (`/api/auth/*`)
  - User list/update/delete/reset-password (`/api/users/*`)
  - Roles exist as values and as editable “settings metadata”
- **Missing (Major)**:
  - **Real RBAC enforcement** (route guards by role, per-role data scoping like “CSM sees only own accounts”, “AM sees mapped CSMs”, etc.)
  - Team mapping (AM→CSM relationships), permissions matrix, audit logs

## Major PRD Gaps (Top Priority)

1. **RBAC & data visibility** (CSM/AM/Leadership/Ops) — currently token contains role, but routes do not enforce it.
2. **Advanced filtering + saved views** on customers (Vitally-style).
3. **Customer data model completeness** (large missing surface: logo, tier, size, address, billing/payment, integrations, onboarding checklist/progress, etc.)
4. **Document management as true file upload/storage** (not just URL metadata).
5. **Full CRUD parity** (delete endpoints and safe partial updates across modules).
6. **Integrations/sync & operational workflows** (not currently present).

## Pointers (Where to look)

- Backend: `Elivate/backend/server.py`
- Frontend:
  - Customers list: `Elivate/frontend/src/pages/CustomerList.jsx`
  - Customer detail: `Elivate/frontend/src/pages/CustomerDetail.jsx`
  - Dashboard: `Elivate/frontend/src/pages/Dashboard.jsx`
  - Reports: `Elivate/frontend/src/pages/Reports.jsx`
  - Tasks: `Elivate/frontend/src/pages/TaskList.jsx`
  - Opportunities: `Elivate/frontend/src/pages/OpportunityPipeline.jsx`
  - Data Labs: `Elivate/frontend/src/pages/DataLabsReports.jsx`
  - Settings: `Elivate/frontend/src/pages/Settings.jsx`


