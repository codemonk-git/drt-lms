# 📊 JSON Database - Final Structure (At a Glance)

## Your Database: 16 JSON Tables

```
┌─────────────────────────────────────────────────────────────────┐
│                    JSON DATABASE SCHEMA                         │
└─────────────────────────────────────────────────────────────────┘

MULTI-TENANCY FOUNDATION
━━━━━━━━━━━━━━━━━━━━━━━━━
  companies.json              (2 companies)
        │
        ├─ company_id: uuid
        ├─ name: string
        └─ subscription: object

USERS & TEAMS
━━━━━━━━━━━━━━
  users.json                  (4+ users)
        │
        ├─ user_id: uuid
        ├─ name: string
        ├─ role: "Admin|Manager|Sales|Support"
        └─ permissions: array

  teams.json                  (2+ teams)
        │
        ├─ team_id: uuid
        ├─ name: string
        └─ members: [user_id...]


CORE LEAD PIPELINE
━━━━━━━━━━━━━━━━━━
  leads.json                  (4+ leads) ⭐ PRIMARY TABLE
        │
        ├─ lead_id: uuid
        ├─ company_id: uuid (foreign key)
        ├─ first_name, last_name, email, phone
        ├─ source_id: uuid (foreign key)
        ├─ stage_id: uuid (foreign key)
        ├─ assigned_to_user_id: uuid (foreign key)
        ├─ score: 0-100
        ├─ quality_tier: "cold|warm|hot|vip"
        └─ timestamps: created_at, updated_at

  stages.json                 (6 stages) - CONSOLIDATED
        │
        ├─ stage_id: uuid
        ├─ name: string
        ├─ color: hex
        ├─ handler: { role, assigned_to_user_ids, auto_reassign }
        ├─ required_forms: [{ form_id, is_required }]
        └─ next_stages: [stage_id...]

  forms.json                  (3+ form templates)
        │
        ├─ form_id: uuid
        ├─ name: string
        └─ fields: array


LEAD SOURCE REFERENCE
━━━━━━━━━━━━━━━━━━━━━
  lead_sources.json           (5 sources)
        │
        ├─ source_id: uuid
        ├─ name: "Website|Email|Phone|LinkedIn|Referral"
        ├─ routing_rule_id: string
        └─ quality_score: number


ASSIGNMENTS & STATE
━━━━━━━━━━━━━━━━━━━
  assignments.json            (Current mappings)
        │
        ├─ assignment_id: uuid
        ├─ lead_id: uuid (foreign key)
        ├─ user_id: uuid (foreign key)
        ├─ assigned_at: timestamp
        └─ strategy: "round_robin|availability|skill_based|specific"

  assignment_queues.json      (Team capacity tracking)
        │
        ├─ queue_id: uuid
        ├─ team_id: uuid (foreign key)
        ├─ members: [
        │    {
        │      user_id: uuid,
        │      current_load: number,
        │      max_capacity: number,
        │      last_assignment_at: timestamp
        │    }
        │  ]


FOLLOW-UPS & REMINDERS
━━━━━━━━━━━━━━━━━━━━━━
  followups.json              (Scheduled activities)
        │
        ├─ followup_id: uuid
        ├─ lead_id: uuid (foreign key)
        ├─ type: "call|email|meeting"
        ├─ scheduled_for: timestamp
        └─ status: "pending|completed|cancelled"


TRANSACTIONS & AUDIT
━━━━━━━━━━━━━━━━━━━━
  lead_activities.json        (Complete audit trail) ⭐ CRITICAL
        │
        ├─ activity_id: uuid
        ├─ lead_id: uuid (foreign key)
        ├─ type: "lead_created|assigned|stage_changed|form_submitted"
        ├─ created_by: user_id (foreign key)
        ├─ created_at: timestamp
        └─ data: { context_details }

  sla_tracking.json           (Deadline management)
        │
        ├─ sla_id: uuid
        ├─ lead_id: uuid (foreign key)
        ├─ first_response_deadline: timestamp
        ├─ resolution_deadline: timestamp
        ├─ first_response_at: timestamp
        └─ breach_status: "on_track|breached|escalated"

  form_submissions.json       (User-submitted data)
        │
        ├─ submission_id: uuid
        ├─ lead_id: uuid (foreign key)
        ├─ form_id: uuid (foreign key)
        ├─ submitted_by: user_id (foreign key)
        ├─ data: { form_field_values }
        └─ submitted_at: timestamp

  lead_ingestion_logs.json    (System execution logs)
        │
        ├─ log_id: uuid
        ├─ lead_id: uuid (foreign key)
        ├─ source_id: uuid (foreign key)
        ├─ processing_steps: [{ step, status, duration }]
        └─ ingestion_at: timestamp


BUSINESS RULES & CONFIG
━━━━━━━━━━━━━━━━━━━━━━━
  routing_rules.json          (5 routing rules)
        │
        ├─ rule_id: string
        ├─ conditions: { source, score, location }
        ├─ strategy: "round_robin|availability|skill_based|specific"
        ├─ target_team_id: uuid
        ├─ sla_config: { response_min, resolution_hour }

  lead_scoring_rules.json     (Scoring algorithm)
        │
        ├─ factors: [
        │    { factor: "domain", weight: 0.2, points: 0-20 },
        │    { factor: "company_size", weight: 0.25, points: 0-25 },
        │    ...
        │  ]
        ├─ quality_tiers: [
        │    { tier: "warm", min: 31, max: 60, sla: "120min/48hr" },
        │    ...
        │  ]

  lead_deduplication_rules.json (Duplicate detection)
        │
        ├─ rules: [
        │    { type: "exact_email", confidence: 99 },
        │    { type: "phone_match", confidence: 95 },
        │    { type: "fuzzy_match", confidence: 70 }
        │  ]
```

---

## 📈 Data Relationships

```
companies (1) ─┬─ (N) users
               ├─ (N) teams
               ├─ (N) leads
               └─ (N) assignments

users (1) ─────┬─ (N) leads (assigned_to)
               ├─ (N) activities (created_by)
               └─ (N) teams (members)

teams (1) ─────┬─ (N) users (members)
               └─ (N) assignments

stages (1) ─┬─ (N) leads (stage_id)
            └─ (N) forms (required_forms)

forms (1) ──┬─ (N) submissions
            └─ (N) stage_form_assignments

leads (1) ──┬─ (N) activities
            ├─ (N) assignments
            ├─ (N) sla_tracking
            ├─ (N) form_submissions
            └─ (N) followups

lead_sources ─ (referenced_by) leads
routing_rules ─ (referenced_by) lead_sources
lead_scoring_rules ─ (algorithm_for) leads
lead_dedup_rules ─ (algorithm_for) leads
```

---

## 🎯 Usage Patterns

### On Lead Ingestion:

```
1. Create lead record in leads.json
2. Create lead_activity ("lead_created")
3. Match routing rule from routing_rules.json
4. Assign to user (create assignments.json entry)
5. Update assignment_queues.json capacity
6. Create sla_tracking.json record
7. Assign forms from stages.json
```

### On Stage Change:

```
1. Update lead.stage_id in leads.json
2. Create lead_activity ("stage_changed")
3. Update assignment if handler changed
4. Update sla_tracking if SLA tier changed
5. Create new followups if auto-generated
```

### On Form Submission:

```
1. Create form_submissions.json entry
2. Create lead_activity ("form_submitted")
3. Update lead.updated_at
4. Possibly trigger next stage/action
```

---

## 📊 Storage Estimate

```
File                         Size      Growth Pattern
─────────────────────────────────────────────────────
companies.json              2 KB      Static (rarely changes)
users.json                  3 KB      Static (rarely changes)
teams.json                  2 KB      Static (rarely changes)
leads.json                  5-50 KB   +5 KB per 100 leads
stages.json                 7 KB      Mostly static
forms.json                  3 KB      Mostly static
lead_sources.json           2 KB      Static
assignments.json            2-5 KB    +0.5 KB per 100 leads
assignment_queues.json      2 KB      Updates only
followups.json              3-10 KB   +10 KB per 100 leads
lead_activities.json        6-60 KB   +15 KB per 100 leads (biggest growth)
sla_tracking.json           2-5 KB    +0.5 KB per 100 leads
form_submissions.json       3-30 KB   +10 KB per 100 leads
lead_ingestion_logs.json    5-50 KB   +15 KB per 100 leads
routing_rules.json          3 KB      Static
lead_scoring_rules.json     5 KB      Static
lead_dedup_rules.json       4 KB      Static
─────────────────────────────────────────────────────
TOTAL (with 100 leads)      ~150-200 KB
TOTAL (with 1000 leads)     ~500-800 KB
TOTAL (with 10k leads)      ~3-5 MB
```

---

## ✅ When to Migrate to SQL Database

Migrate from JSON to PostgreSQL/MySQL when:

```
❌ Leads grow beyond 50,000+
❌ Activities exceed 1 million records
❌ Need complex querying (JOINs, aggregations)
❌ Multiple concurrent writes to same file
❌ Need full-text search
❌ Need geographic/spatial queries
❌ Require ACID transactions across multiple tables

✅ Current JSON structure supports: 5,000-10,000 leads comfortably
```

---

## 🚀 Your Database is Production-Ready!

16 JSON files = Complete, normalized database structure  
Perfect for: MVP, Small-to-Medium scale (up to 10k leads)  
Growth path: Easy migration to SQL when needed

**This is not "demo data" - this is your actual database.** ✅
