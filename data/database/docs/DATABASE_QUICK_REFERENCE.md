# 🗂️ JSON Database Files - Quick Reference Card

## All 16 Database Files (Keep These!)

| #   | File                         | Records | Purpose                        | Grows?    | Key Fields                                          |
| --- | ---------------------------- | ------- | ------------------------------ | --------- | --------------------------------------------------- |
| 1   | **companies.json**           | 2+      | Multi-tenant isolation         | ❌        | id, name, subscription                              |
| 2   | **users.json**               | 4+      | User directory + roles         | ❌        | id, name, role, email, permissions                  |
| 3   | **teams.json**               | 2+      | Team structure                 | ❌        | id, name, members[]                                 |
| 4   | **leads.json** ⭐            | 4+      | Primary lead data              | ✅ Fast   | id, name, email, stage_id, assigned_to, score       |
| 5   | **stages.json**              | 6       | Pipeline stages (CONSOLIDATED) | ❌        | id, name, handler, required_forms, next_stages      |
| 6   | **forms.json**               | 3+      | Form templates                 | ❌        | id, name, fields[]                                  |
| 7   | **lead_sources.json**        | 5       | Source definitions             | ❌        | id, name, type, routing_rule_id                     |
| 8   | **assignments.json**         | N       | Current lead-user mapping      | ✅ Medium | id, lead_id, user_id, strategy                      |
| 9   | **assignment_queues.json**   | 2+      | Team capacity tracking         | ✅ Medium | id, team_id, members[]{user_id, load, capacity}     |
| 10  | **followups.json**           | N       | Scheduled activities           | ✅ Medium | id, lead_id, type, scheduled_for, status            |
| 11  | **lead_activities.json** 📋  | N       | Audit trail (CRITICAL)         | ✅ Fast   | id, lead_id, type, created_by, created_at, data     |
| 12  | **sla_tracking.json**        | N       | Deadline tracking              | ✅ Medium | id, lead_id, first_response_deadline, breach_status |
| 13  | **form_submissions.json**    | N       | User form responses            | ✅ Medium | id, lead_id, form_id, submitted_by, data            |
| 14  | **lead_ingestion_logs.json** | N       | Ingestion logs                 | ✅ Fast   | id, lead_id, processing_steps, ingestion_at         |
| 15  | **routing_rules.json**       | 5       | Routing logic (static)         | ❌        | id, conditions, strategy, target_team_id, sla       |
| 16  | **lead_scoring_rules.json**  | -       | Scoring config (static)        | ❌        | factors[], quality_tiers[], weights                 |
| 17  | **lead_dedup_rules.json**    | 5+      | Dedup strategy (static)        | ❌        | id, match_fields, confidence, action                |

**Total: 16 core files + 3 rules files = 19 files** (some count dedup as optional)  
**Recommended minimum: 16 files**

---

## Files Getting CONSOLIDATED (3 → 1)

### ✅ Before (3 separate files)

```
stage_handlers.json           → Merged into stages.json
stage_form_assignments.json   → Merged into stages.json
stages.json                   → Becomes full stage definition
```

### ✅ After (1 file)

```
stages.json                   ← Contains everything:
  {
    "id": "...",
    "name": "...",
    "handler": { ... },          // From stage_handlers
    "required_forms": [ ... ],   // From stage_form_assignments
    "optional_forms": [ ... ],
    "next_stages": [ ... ]
  }
```

---

## Files Getting DELETED (2 JSON Files)

### ❌ Delete (They're Documentation, Not Database)

```
lead_ingestion_workflow.json      → Use LEAD_INGESTION_WORKFLOW.md instead
lead_ingestion_api_contract.json  → Convert to openapi.yaml instead
```

---

## Final Count

```
BEFORE:  21 JSON files (mixed database + docs)
AFTER:   16 JSON database files + 4 markdown + 1 OpenAPI YAML
SAVED:   5 files (consolidation + format conversion)
```

---

## Data Flow Summary

```
┌─────────────┐
│  New Lead   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────┐
│ 1. leads.json           │ (Create new lead)
│ 2. lead_activities.json │ (Log: "lead_created")
│ 3. lead_sources.json    │ (Get source info)
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ 4. routing_rules.json   │ (Match routing rule)
│ 5. lead_scoring_rules.json (Calculate score)
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ 6. assignment_queues.json   (Find available user)
│ 7. assignments.json         (Create assignment)
│ 8. lead_activities.json     (Log: "assigned")
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ 9. sla_tracking.json    │ (Create SLA record)
│ 10. stages.json         │ (Get stage forms)
└────────┬────────────────┘
         │
         ▼
    ✅ READY FOR FOLLOW-UP
    (In assignment queue)
```

---

## Key Statistics

| Metric                     | Value    | Note                                                  |
| -------------------------- | -------- | ----------------------------------------------------- |
| Core Database Files        | 16       | All essential                                         |
| Optional Rule Files        | 3        | Usually static, could be hardcoded                    |
| Growing Files              | 6        | lead_activities, sla_tracking, form_submissions, etc. |
| Static Files               | 10       | companies, users, stages, forms, rules                |
| Total Records (startup)    | ~50-100  | companies, users, stages, forms, rules                |
| Total Records (1000 leads) | ~20,000+ | Activities + logs grow fastest                        |
| Recommended Max Leads      | 10,000   | Before migrating to SQL DB                            |

---

## File Dependencies

```
companies.json              ← Referenced by ALL files (company_id)
  ├── users.json
  ├── teams.json
  ├── leads.json
  ├── assignments.json
  └── ... (all others)

lead_sources.json           ← Referenced by leads, routing_rules
  └── routing_rules.json

routing_rules.json          ← Referenced by ingestion logic
  └── assignment_queues.json

stages.json                 ← Referenced by leads, forms
  ├── forms.json
  ├── lead_activities.json (stage_changed event)
  └── sla_tracking.json

leads.json                  ← Referenced by everything
  ├── assignments.json
  ├── lead_activities.json
  ├── sla_tracking.json
  ├── form_submissions.json
  ├── followups.json
  └── lead_ingestion_logs.json
```

---

## Operations Checklist

### Creating a Lead:

- [ ] Add record to leads.json
- [ ] Log to lead_activities.json
- [ ] Create assignment in assignments.json
- [ ] Update assignment_queues.json (capacity)
- [ ] Create sla_tracking.json record

### Changing Stage:

- [ ] Update leads.json (stage_id)
- [ ] Log to lead_activities.json
- [ ] Update assignments if handler changed
- [ ] Update sla_tracking.json
- [ ] Update next stage options

### Submitting Form:

- [ ] Add to form_submissions.json
- [ ] Log to lead_activities.json
- [ ] Update leads.json (updated_at)
- [ ] Check for auto-transitions

### Assignment Round-Robin:

- [ ] Query assignment_queues.json
- [ ] Find next member (last_assignment_at)
- [ ] Check capacity < max
- [ ] Create assignment
- [ ] Update last_assignment_at

---

## Important Rules

### ✅ DO:

- Always include `company_id` for multi-tenant isolation
- Always include timestamps (created_at, updated_at)
- Always create audit log entry (lead_activities)
- Use UUIDs for IDs, not auto-increment
- Validate foreign key references before saving

### ❌ DON'T:

- Delete records (use soft delete via deleted_at)
- Modify lead_activities (append-only log)
- Manually update assignment_queues (auto-managed)
- Store derived data (calculate on read)
- Assume file consistency (check before save)

---

## Migration Path (When Needed)

### Current

```
16 JSON files (flat file storage)
Works for: 1-10k leads
```

### Phase 1: SQLite

```
Same schema, SQLite storage
Works for: 10k-100k leads
Easy transition (JSON → SQL)
```

### Phase 2: PostgreSQL

```
Same schema, PostgreSQL storage
Works for: 100k+ leads
Full ACID, horizontal scaling
```

**Good news:** Your schema is ready for this progression! ✅

---

## Support & Maintenance

### Regular Tasks:

- **Backup JSON files** - Daily or after major updates
- **Monitor growth** - Track file sizes, especially lead_activities.json
- **Archive old logs** - Move old records from ingestion_logs, activities
- **Update rules** - Adjust routing_rules, scoring_rules as needed

### Performance Tips:

- Keep JSON files < 50 MB for good read/write performance
- Consider archiving activities older than 6 months
- Index frequently-queried fields mentally (company_id, lead_id)
- Use pagination when loading large arrays

---

## Quick Command Reference

```bash
# View all database files
ls -lh /data/*.json | grep -v CONSOLIDATED

# Count total records (rough)
wc -l /data/*.json | tail -1

# Check database size
du -sh /data/

# Find a specific lead
grep -l "lead-001" /data/*.json

# View all activities for a lead
grep -A5 '"lead_id": "lead-001"' /data/lead_activities.json

# Pretty-print a file
jq . /data/leads.json | head -50
```

---

**This is your complete JSON database.** All 16 files work together to create a fully normalized, production-ready data store. No further reduction needed! ✅
