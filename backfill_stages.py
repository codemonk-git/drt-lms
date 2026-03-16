import json
import re
from datetime import datetime

with open('backend/data/activities.json') as f:
    data = json.load(f)

activities = data['activities']
stage_acts = [a for a in activities if a.get('activity_type') == 'lead_stage_changed']

# Step 1: Build comprehensive stage_id -> name map from ALL activity metadata
stage_map = {}
for a in stage_acts:
    meta = a.get('metadata') or {}
    if meta.get('new_stage_id') and meta.get('new_stage_name'):
        stage_map[meta['new_stage_id']] = meta['new_stage_name']
    if meta.get('old_stage_id') and meta.get('old_stage_name'):
        stage_map[meta['old_stage_id']] = meta['old_stage_name']

# Step 2: Fill missing new_stage_name from description
desc_re = re.compile(r'(?:Pipeline stage|Stage) changed to (.+)', re.IGNORECASE)
for a in stage_acts:
    meta = a.get('metadata') or {}
    if not meta.get('new_stage_name') and a.get('description'):
        m = desc_re.match(a['description'])
        if m:
            meta['new_stage_name'] = m.group(1).strip()
            if meta.get('new_stage_id'):
                stage_map[meta['new_stage_id']] = meta['new_stage_name']
            a['metadata'] = meta

# Step 3: Fill old_stage_name from map where old_stage_id is known
for a in stage_acts:
    meta = a.get('metadata') or {}
    if not meta.get('old_stage_name') and meta.get('old_stage_id') and meta['old_stage_id'] in stage_map:
        meta['old_stage_name'] = stage_map[meta['old_stage_id']]
        a['metadata'] = meta

# Step 4: Chain approach per lead - propagate new_stage_name[i-1] -> old_stage_name[i]
leads_acts = {}
for a in stage_acts:
    lead_id = a.get('entity_id')
    if lead_id:
        leads_acts.setdefault(lead_id, []).append(a)

def parse_dt(s):
    try:
        return datetime.fromisoformat(str(s).replace('Z', '+00:00'))
    except Exception:
        return datetime.min

chained = 0
for lead_id, acts in leads_acts.items():
    acts.sort(key=lambda a: parse_dt(a.get('created_at', '')))
    for i, a in enumerate(acts):
        meta = a.get('metadata') or {}
        if not meta.get('old_stage_name'):
            if i == 0:
                meta['old_stage_name'] = 'New'
                chained += 1
            else:
                prev_meta = acts[i-1].get('metadata') or {}
                if prev_meta.get('new_stage_name'):
                    meta['old_stage_name'] = prev_meta['new_stage_name']
                    chained += 1
            a['metadata'] = meta

data['activities'] = activities
with open('backend/data/activities.json', 'w') as f:
    json.dump(data, f, indent=2)

stage_acts2 = [a for a in activities if a.get('activity_type') == 'lead_stage_changed']
has_old = sum(1 for a in stage_acts2 if (a.get('metadata') or {}).get('old_stage_name'))
print(f'Chain-filled {chained} more. Total with old_stage_name: {has_old}/{len(stage_acts2)}')
