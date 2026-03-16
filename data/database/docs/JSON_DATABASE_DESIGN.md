# 📚 JSON Database Structure Optimization

## Important Clarification

These JSON files are your **primary data store** (like a NoSQL database), NOT just configuration. This changes everything.

---

## Current State Analysis (As a Database)

### ✅ What You Have (21 JSON "Tables")

```
Core Data:
  ├── leads.json                 → Lead records (main entity)
  ├── company.json               → Companies (tenant data)
  ├── users.json                 → Users (team members)
  ├── teams.json                 → Team grouping

Pipeline & Workflow:
  ├── stages.json                → Pipeline stages
  ├── stage_handlers.json        → Stage routing/assignment rules
  ├── stage_form_assignments.json → Forms per stage
  ├── forms.json                 → Form templates

Transactions & State:
  ├── assignments.json           → Current lead assignments
  ├── lead_activities.json       → Audit trail
  ├── lead_ingestion_logs.json   → Ingestion records
  ├── sla_tracking.json          → SLA deadline tracking
  ├── form_submissions.json      → User form responses
  ├── followups.json             → Scheduled follow-ups

Configuration/Rules:
  ├── routing_rules.json         → Routing logic
  ├── lead_scoring_rules.json    → Scoring algorithm
  ├── lead_sources.json          → Lead sources
  ├── lead_deduplication_rules.json → Dedup rules
  ├── assignment_queues.json     → Queue state

Documentation:
  └── Various .md files
```

---

## 🎯 Optimized Database Structure

For a proper JSON database (like Firestore, MongoDB, or flat file DB), organize as:

### Recommended: 13 Core Data "Tables" (Files)

```
/database/
├── 🏢 TENANTS
│   └── companies.json           (2 records - multi-tenant isolation)
│
├── 👥 USERS & TEAMS
│   ├── users.json               (4 users with roles)
│   └── teams.json               (2 teams + members)
│
├── 💼 LEADS & CORE DATA
│   ├── leads.json               (4+ lead records - PRIMARY TABLE)
│   └── lead_sources.json        (5 sources - reference)
│
├── 🔄 PIPELINE & WORKFLOW
│   ├── stages.json              (6 stages with handlers + forms - CONSOLIDATED)
│   └── forms.json               (3 form templates)
│
├── 📊 ASSIGNMENTS & STATE
│   ├── assignments.json         (current lead-to-user mapping)
│   ├── assignment_queues.json   (team member queues + capacity)
│   └── followups.json           (scheduled follow-up activities)
│
├── 📈 TRANSACTIONS & AUDIT
│   ├── lead_activities.json     (complete audit trail of all actions)
│   ├── sla_tracking.json        (SLA deadline tracking)
│   ├── form_submissions.json    (user-submitted form data)
│   └── lead_ingestion_logs.json (ingestion processing records)
│
└── ⚙️ RULES & CONFIG
    ├── routing_rules.json       (5 routing rules)
    ├── lead_scoring_rules.json  (scoring algorithm)
    └── lead_deduplication_rules.json (dedup strategy)
```

**Total: 16 data files** (down from 21 by consolidating 3 stage files + removing pure docs)

---

## 📋 What Each "Table" Does

### PRIMARY TABLES (Application Data)

#### 1. **leads.json** ⭐⭐⭐

**Primary Key:** `id` (UUID)  
**Records:** 4-N leads  
**Used By:** Everything (core entity)  
**Example Record:**

```json
{
  "id": "lead-001",
  "company_id": "company-001",
  "first_name": "Kamal",
  "last_name": "Sharma",
  "email": "kamal@example.com",
  "phone": "+919675475113",
  "source_id": "source-001",
  "stage_id": "stage-001",
  "assigned_to_user_id": "user-003",
  "score": 75,
  "quality_tier": "warm",
  "created_at": "2026-02-01T06:49:13Z",
  "updated_at": "2026-02-01T08:00:00Z"
}
```

#### 2. **companies.json**

**Primary Key:** `id` (UUID)  
**Records:** 2-N companies (multi-tenant)  
**Used By:** All tables (via `company_id` foreign key)  
**Purpose:** Tenant isolation

#### 3. **users.json**

**Primary Key:** `id` (UUID)  
**Records:** 4-N users  
**Used By:** assignments, lead_activities, routing  
**Purpose:** User directory + roles/permissions

#### 4. **teams.json**

**Primary Key:** `id` (UUID)  
**Records:** 2-N teams  
**Used By:** routing_rules, assignment_queues  
**Purpose:** Team structure

### WORKFLOW TABLES

#### 5. **stages.json** (CONSOLIDATED)

**Primary Key:** `id` (UUID)  
**Records:** 6 stages  
**Used By:** leads, routing, forms  
**Contains:**

```json
{
  "id": "stage-001",
  "name": "nqw",
  "handler": { "role": "Sales Rep", "assigned_to": ["user-003"] },
  "required_forms": [{ "form_id": "form-001", "name": "Qualification" }],
  "next_stages": ["stage-002"],
  "auto_reassign": true
}
```

✅ **Consolidates:** stages.json + stage_handlers.json + stage_form_assignments.json

#### 6. **forms.json**

**Primary Key:** `id` (UUID)  
**Records:** 3-N forms  
**Used By:** stages, form_submissions  
**Purpose:** Form template definitions

### STATE & ASSIGNMENT TABLES

#### 7. **assignments.json**

**Primary Key:** `id` (UUID)  
**Records:** Current assignments (1 per active lead)  
**Used By:** leads, assignment_queues, SLA tracking  
**Purpose:** Track who owns which lead  
**Example:**

```json
{
  "id": "assign-001",
  "company_id": "company-001",
  "lead_id": "lead-001",
  "user_id": "user-003",
  "assigned_at": "2026-02-01T07:00:00Z",
  "strategy": "round_robin"
}
```

#### 8. **assignment_queues.json**

**Primary Key:** `id` (UUID)  
**Records:** 2-N team queues  
**Used By:** routing_rules, assignment logic  
**Purpose:** Track team member capacity + round-robin state  
**Example:**

```json
{
  "id": "queue-001",
  "team_id": "team-001",
  "members": [
    {
      "user_id": "user-002",
      "current_load": 8,
      "max_capacity": 15,
      "last_assignment_at": "2026-02-01T09:45:00Z"
    }
  ]
}
```

#### 9. **followups.json**

**Primary Key:** `id` (UUID)  
**Records:** Scheduled follow-ups  
**Used By:** Calendar/scheduler  
**Purpose:** Track pending follow-up activities

### AUDIT & TRANSACTION TABLES

#### 10. **lead_activities.json** (CRITICAL AUDIT LOG)

**Primary Key:** `id` (UUID)  
**Records:** 1-N activities per lead (keep all history)  
**Used By:** Lead detail view, audit reports  
**Purpose:** Complete audit trail of every action  
**Example:**

```json
{
  "id": "activity-001",
  "lead_id": "lead-001",
  "type": "lead_created|stage_changed|assigned|form_submitted",
  "created_by": "user-003",
  "created_at": "2026-02-01T06:49:13Z",
  "data": { "from_stage": "...", "to_stage": "..." }
}
```

#### 11. **lead_ingestion_logs.json**

**Primary Key:** `id` (UUID)  
**Records:** All ingestion events  
**Used By:** System logs, debugging  
**Purpose:** Track lead ingestion process execution

#### 12. **sla_tracking.json**

**Primary Key:** `id` (UUID)  
**Records:** 1 per active lead SLA  
**Used By:** SLA monitoring, dashboards  
**Purpose:** Track deadlines, breaches  
**Example:**

```json
{
  "id": "sla-001",
  "lead_id": "lead-001",
  "first_response_deadline": "2026-02-01T08:49:13Z",
  "resolution_deadline": "2026-02-03T06:49:13Z",
  "first_response_at": null,
  "breach_status": "on_track"
}
```

#### 13. **form_submissions.json**

**Primary Key:** `id` (UUID)  
**Records:** User form submissions  
**Used By:** Lead detail view, reports  
**Purpose:** Track submitted form data

### RULES & CONFIGURATION TABLES

#### 14. **routing_rules.json** (Static Config)

**Primary Key:** `id` (string)  
**Records:** 5 routing rules  
**Used By:** Routing engine  
**Purpose:** Business logic for lead routing  
**Don't Change Often:** ✅ Mostly static

#### 15. **lead_scoring_rules.json** (Static Config)

**Primary Key:** N/A (algorithm config)  
**Records:** 6 factor groups  
**Used By:** Scoring service  
**Purpose:** Scoring algorithm parameters  
**Don't Change Often:** ✅ Mostly static

#### 16. **lead_sources.json** (Reference Data)

**Primary Key:** `id` (string)  
**Records:** 5 sources  
**Used By:** Routing, source filtering  
**Purpose:** Lead source definitions

#### 17. **lead_deduplication_rules.json** (Static Config)

**Primary Key:** `id` (string)  
**Records:** 5 dedup rules  
**Used By:** Dedup service  
**Purpose:** Duplicate detection strategy

---

## 🔗 Data Relationships (Referential Integrity)

### Foreign Key Structure:

```
leads
  ├── company_id → companies.id
  ├── source_id → lead_sources.id
  ├── stage_id → stages.id
  └── assigned_to_user_id → users.id

assignments
  ├── company_id → companies.id
  ├── lead_id → leads.id
  ├── user_id → users.id

lead_activities
  ├── lead_id → leads.id
  └── created_by → users.id

sla_tracking
  └── lead_id → leads.id

form_submissions
  ├── lead_id → leads.id
  └── form_id → forms.id

assignment_queues
  ├── team_id → teams.id
  └── members[].user_id → users.id

teams
  └── members[].user_id → users.id
```

---

## 📊 Data Cardinality

```
1 Company → Many Users, Teams, Leads
1 Team → Many Users (members)
1 User → Many Leads (assignments), Activities
1 Lead → 1 Company, 1 User (assigned), Many Activities, Many Forms
1 Stage → Many Leads, Required/Optional Forms
1 Form → Many Form Submissions
1 Assignment Queue → 1 Team, Many Members
```

---

## 🎯 Database Optimization for JSON

### For Better Performance with JSON:

#### 1. **Indexing Simulation** (Add indexes property)

```json
{
  "_metadata": {
    "version": "1.0",
    "indexes": [
      { "field": "company_id", "type": "hash" },
      { "field": "lead_id", "type": "hash" },
      { "field": "created_at", "type": "range" },
      { "field": "status", "type": "hash" }
    ]
  },
  "records": [...]
}
```

#### 2. **Pagination Support** (Keep in mind)

```json
{
  "_metadata": {
    "total": 1000,
    "page": 1,
    "per_page": 50
  },
  "records": [...]
}
```

#### 3. **Timestamps** (For all records)

```json
{
  "created_at": "2026-02-01T06:49:13Z",
  "updated_at": "2026-02-01T08:00:00Z",
  "deleted_at": null // Soft delete support
}
```

---

## ✅ What to Keep/Change

### Keep All 16 Data Files

All are necessary for complete database functionality.

### Consolidate (3 → 1):

```
✅ Keep: stages.json (consolidated)
❌ Delete: stage_handlers.json
❌ Delete: stage_form_assignments.json
```

### Why Keep Everything Else:

| File                     | Records Type  | Why Keep             |
| ------------------------ | ------------- | -------------------- |
| leads.json               | Live data     | Primary table        |
| companies.json           | Tenant data   | Multi-tenancy        |
| users.json               | User data     | Directory + auth     |
| teams.json               | Organization  | Routing target       |
| assignments.json         | State         | Current ownership    |
| assignment_queues.json   | State         | Capacity tracking    |
| lead_activities.json     | Audit         | Compliance + history |
| sla_tracking.json        | Transaction   | SLA monitoring       |
| form_submissions.json    | Transaction   | User data            |
| followups.json           | Transaction   | Scheduling           |
| lead_ingestion_logs.json | Transaction   | System logs          |
| forms.json               | Configuration | Form templates       |
| routing_rules.json       | Rules         | Routing logic        |
| lead_scoring_rules.json  | Rules         | Scoring algorithm    |
| lead_sources.json        | Reference     | Source mapping       |
| lead_dedup_rules.json    | Rules         | Dedup logic          |

---

## 📈 Recommended Folder Structure

```
/database/
├── _metadata.json              (schema version, tables list)
├── README.md                   (database documentation)
│
├── tenants/
│   └── companies.json          (multi-tenant isolation)
│
├── users/
│   ├── users.json              (user directory)
│   └── teams.json              (team structure)
│
├── leads/
│   ├── leads.json              (PRIMARY - lead records)
│   ├── stages.json             (pipeline definition)
│   ├── forms.json              (form templates)
│   └── lead_sources.json       (source reference)
│
├── transactions/
│   ├── assignments.json        (current assignments)
│   ├── assignment_queues.json  (team queues)
│   ├── followups.json          (follow-up tracking)
│   ├── sla_tracking.json       (SLA monitoring)
│   ├── form_submissions.json   (submitted data)
│   ├── lead_activities.json    (audit trail)
│   └── lead_ingestion_logs.json (ingestion logs)
│
└── rules/
    ├── routing_rules.json      (routing logic)
    ├── lead_scoring_rules.json (scoring config)
    └── lead_dedup_rules.json   (dedup rules)
```

---

## 🔄 Operations & Consistency

### For JSON Database Integrity:

#### 1. **Transaction-like Behavior**

When moving a lead, ensure:

```
1. Create lead_activity record
2. Update assignment (if changed)
3. Update assignment_queue capacity
4. Update sla_tracking (if stage changed)
5. Create stage_change activity
```

#### 2. **Cascade Operations**

- Delete lead → Delete related activities, assignments, SLAs, form_submissions
- Delete user → Reassign their leads, update teams

#### 3. **Referential Integrity**

Always validate:

- Lead's `assigned_to_user_id` exists in `users.json`
- `stage_id` exists in `stages.json`
- `company_id` exists in `companies.json`

#### 4. **Consistency Checks**

Before ingesting:

- Ensure all foreign keys are valid
- Check no orphaned records exist
- Verify all required fields present

---

## 🚀 Future Migration Path

If you outgrow JSON database:

### Phase 1: JSON Database (Current) ✅

- Start here for MVP/prototype
- Works for 1000s of records
- File-based, simple deployment

### Phase 2: SQLite (Intermediate)

- Better query capabilities
- Still single file
- Better performance

### Phase 3: PostgreSQL/MongoDB (Production)

- Full ACID transactions
- Horizontal scaling
- Enterprise features

**Migration is easy:** Same schema, just different storage backend.

---

## 📊 Size Estimates

### Current JSON Database:

```
companies.json:              2 KB  (2 records)
users.json:                  3 KB  (4 records)
teams.json:                  2 KB  (2 records)
leads.json:                  5 KB  (4 records, grows with each new lead)
stages.json:                 7 KB  (6 stages - consolidated)
forms.json:                  3 KB  (3 forms)
assignments.json:            2 KB  (active assignments)
assignment_queues.json:      2 KB  (2 queues)
followups.json:              3 KB  (5-N records)
lead_activities.json:        6 KB  (10-N records, grows with activity)
sla_tracking.json:           2 KB  (active SLAs)
form_submissions.json:       3 KB  (submitted forms)
lead_ingestion_logs.json:    5 KB  (ingestion records)
routing_rules.json:          3 KB  (5 rules)
lead_scoring_rules.json:     5 KB  (scoring config)
lead_sources.json:           2 KB  (5 sources)
lead_dedup_rules.json:       4 KB  (5 rules)
────────────────────────────────
Total:                      ~60 KB (small database)
```

### Growth Model:

- **Per 100 leads added:** ~25 KB
- **Per 1000 activities:** ~5 KB
- **Reasonable for:** Up to 10,000 leads before considering PostgreSQL

---

## ✨ Database Design Principles Applied

✅ **Normalization** - Data not repeated across tables  
✅ **Foreign Keys** - Referential integrity via IDs  
✅ **Timestamps** - Audit trail with created_at/updated_at  
✅ **Soft Deletes** - deleted_at field for compliance  
✅ **Multi-tenancy** - company_id isolates data  
✅ **Immutable Logs** - Activities are append-only  
✅ **State Tracking** - Assignment, SLA tracking captures current state

---

## 🎯 Summary

**Keep all 16 data files.** They represent your complete JSON database with:

- **4 structural tables** (companies, users, teams, stages)
- **3 primary data tables** (leads, forms, lead_sources)
- **5 state/transaction tables** (assignments, followups, sla_tracking, etc.)
- **4 rules/config tables** (routing, scoring, dedup, etc.)

This is a **properly structured JSON database** - no reduction needed!
