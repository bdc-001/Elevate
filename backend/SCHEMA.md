### MongoDB schema (live data)

This backend uses **MongoDB collections** (not SQL tables). Documents use an app-level UUID string field called **`id`** for most lookups; MongoDB’s native **`_id`** still exists but is not used by the API.

#### Relationships (how documents connect)

- **Customers** are the root entity.
- **Activities / Risks / Opportunities / Tasks / DataLabs Reports / Documents** reference customers via **`customer_id`** (string UUID).
- **Users** are referenced by `*_id` fields (e.g. `assigned_to_id`, `owner_id`, `created_by_id`, `csm_owner_id`).
- **Settings** is a singleton config doc with `id="global"` used by the Settings UI.

---

### Collections

#### `users`
- **Purpose**: authentication + ownership/assignment.
- **Primary key**: `id` (string UUID)
- **Unique**: `email`
- **Fields**
  - `id` (string, required)
  - `email` (string, required, unique)
  - `password` (string bcrypt hash, required)
  - `name` (string, required)
  - `role` (string enum: `CSM|AM|ADMIN|CS_LEADER|CS_OPS`, required)
  - `created_at` (ISO string or Date, required)

#### `customers`
- **Purpose**: core account record shown in Customers list + Customer dashboard.
- **Primary key**: `id` (string UUID)
- **Currently enforced unique**: `company_name` (note: change this if you want duplicates)
- **Fields (high level)**
  - Identity: `id`, `company_name`, `website`
  - Commercials: `plan_type`, `arr`, `one_time_setup_cost`, `quarterly_consumption_cost`
  - Dates: `contract_start_date`, `contract_end_date`, `renewal_date`, `go_live_date`
  - Usage/health: `health_score`, `health_status`, `calls_processed`, `active_users`, `total_licensed_users`, `last_activity_date`
  - Ownership: `csm_owner_id`, `csm_owner_name`, `am_owner_id`, `am_owner_name`
  - Status: `onboarding_status`, `account_status`
  - Meta: `tags[]`, `stakeholders[]`, `created_at`, `updated_at`

#### `activities`
- **Purpose**: customer engagement timeline.
- **Primary key**: `id`
- **Fields**
  - `id`, `customer_id`, `activity_type`, `activity_date`, `title`, `summary`, `csm_id`
  - Optional: `sentiment`, `internal_notes`, follow-up fields, `customer_name`, `csm_name`
  - `created_at`

#### `risks`
- **Purpose**: risk register tied to customers.
- **Primary key**: `id`
- **Fields**
  - `id`, `customer_id`, `category`, `severity`, `status`, `title`, `description`
  - Ownership: `assigned_to_id`, `assigned_to_name`
  - Optional: `subcategory`, mitigation fields, revenue/churn fields, target/resolution dates
  - `created_at`, `updated_at`

#### `opportunities`
- **Purpose**: expansion/renewal pipeline.
- **Primary key**: `id`
- **Fields**
  - `id`, `customer_id`, `opportunity_type`, `title`, `stage`, `owner_id`
  - Optional: `description`, `value`, `probability`, `expected_close_date`, `owner_name`
  - `created_at`, `updated_at`

#### `tasks`
- **Purpose**: action items.
- **Primary key**: `id`
- **Fields**
  - `id`, `customer_id`, `task_type`, `title`, `priority`, `status`, `assigned_to_id`, `due_date`, `created_by_id`
  - Optional: `description`, `completed_date`, `assigned_to_name`, `created_by_name`, `customer_name`
  - `created_at`, `updated_at`

#### `datalabs_reports`
- **Purpose**: links/metadata for DataLabs reports.
- **Primary key**: `id`
- **Fields**
  - `id`, `customer_id`, `report_date`, `report_title`, `report_link`, `report_type`, `created_by_id`
  - Optional: `description`, `sent_to[]`, `customer_name`, `created_by_name`
  - `created_at`

#### `documents`
- **Purpose**: document metadata (URLs, uploaded file details).
- **Primary key**: `id`
- **Fields**
  - `id`, `customer_id`, `document_type`, `title`
  - Optional: `description`, `document_url`, `file_name`, `file_size`, creator fields
  - `created_at`

#### `settings`
- **Purpose**: singleton configuration for dropdowns/tags/roles/templates.
- **Primary key**: `id` (expected `global`)
- **Fields**
  - `id`
  - `organization`, `health_thresholds`, `notifications`
  - `tags[]`, `dropdowns[]`, `field_configs{}`, `roles[]`, `templates[]`

#### `_meta`
- **Purpose**: internal markers (e.g. init timestamp).
- **Primary key**: `id`

---

### Indexes (enforced in code)

Indexes are created by:
- `backend/init_db.py` (manual one-off)
- plus automatically on backend startup via `ensure_schema()`

Key unique indexes:
- `users.email`, `users.id`
- `customers.id`, `customers.company_name`
- `activities.id`
- `risks.id`
- `opportunities.id`
- `tasks.id`
- `datalabs_reports.id`
- `documents.id`
- `settings.id`
- `_meta.id`


