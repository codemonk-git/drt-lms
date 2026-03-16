import json
import re
from datetime import datetime

with open('backend/data/activities.json') as f:
    data = json.load(f)

activities = data['activities']
cs_acts = [a for a in activities if a.get('activity_type') == 'lead_call_status_changed']

desc_re = re.compile(r'Call status changed to (.+)', re.IGNORECASE)

def fmt(s):
    """Convert snake_case to Title Case for display."""
    if not s:
        return s
    return ' '.join(w.capitalize() for w in s.replace('_', ' ').split())

def parse_dt(s):
    try:
        return datetime.fromisoformat(str(s).replace('Z', '+00:00'))
    except Exception:
        return datetime.min

# Step 1: Extract new_call_status from description where missing
for a in cs_acts:
    meta = a.get('metadata') or {}
    if not meta.get('new_call_status') and a.get('description'):
        m = desc_re.search(a['description'])
        if m:
            meta['new_call_status'] = m.group(1).strip()
            a['metadata'] = meta

# Step 2: Chain per lead to fill old_call_status
leads_acts = {}
for a in cs_acts:
    lead_id = a.get('entity_id')
    if lead_id:
        leads_acts.setdefault(lead_id, []).append(a)

filled = 0
for lead_id, acts in leads_acts.items():
    acts.sort(key=lambda a: parse_dt(a.get('created_at', '')))
    for i, a in enumerate(acts):
        meta = a.get('metadata') or {}
        if not meta.get('old_call_status'):
            if i == 0:
                meta['old_call_status'] = 'not_called'
            else:
                prev_meta = acts[i-1].get('metadata') or {}
                if prev_meta.get('new_call_status'):
                    meta['old_call_status'] = prev_meta['new_call_status']
            a['metadata'] = meta
            filled += 1

data['activities'] = activities
with open('backend/data/activities.json', 'w') as f:
    json.dump(data, f, indent=2)

has_old = sum(1 for a in cs_acts if (a.get('metadata') or {}).get('old_call_status'))
has_new = sum(1 for a in cs_acts if (a.get('metadata') or {}).get('new_call_status'))
print(f'Done. {len(cs_acts)} total, {has_new} with new_call_status, {has_old} with old_call_status')
