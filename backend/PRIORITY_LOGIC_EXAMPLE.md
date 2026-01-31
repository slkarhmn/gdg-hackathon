# Assignment Priority Logic - Example

## How the Study Plan Prioritizes Notes

The study plan generation algorithm automatically prioritizes notes based on upcoming assignments. Here's how it works:

## Algorithm Overview

1. **Identify Upcoming Assignments** (next 30 days)
2. **Extract Priority Tags** from those assignments
3. **Categorize Notes** as "priority" or "regular" based on tag matching
4. **Allocate Study Slots** based on proximity to assignment due dates

## Priority Allocation Rules

| Days Until Assignment | Priority Note Slots | Regular Note Slots |
|----------------------|---------------------|-------------------|
| 1-7 days             | 4 out of 5 (80%)    | 1 out of 5 (20%)  |
| 8-14 days            | 3 out of 5 (60%)    | 2 out of 5 (40%)  |
| 15-21 days           | 2 out of 5 (40%)    | 3 out of 5 (60%)  |
| 22+ days             | 1 out of 5 (20%)    | 4 out of 5 (80%)  |

## Example Scenario

### Setup

**Today's Date:** February 1, 2026

**User's Notes:**
```python
notes = [
    {"id": 1, "subject": "OOP Basics", "tags": ["OOP", "Java"]},
    {"id": 2, "subject": "Inheritance", "tags": ["OOP", "Java", "Advanced"]},
    {"id": 3, "subject": "Polymorphism", "tags": ["OOP", "Design"]},
    {"id": 4, "subject": "CNNs", "tags": ["CVI", "Deep Learning"]},
    {"id": 5, "subject": "Image Processing", "tags": ["CVI", "OpenCV"]},
    {"id": 6, "subject": "Encryption", "tags": ["Security", "Crypto"]},
    {"id": 7, "subject": "SQL Injection", "tags": ["Security", "Database"]},
]
```

**Upcoming Assignments:**
```python
assignments = [
    {
        "name": "OOP Final Exam",
        "due_date": "2026-02-15T10:00:00",  # 14 days away
        "tags": ["OOP", "Java"]
    },
    {
        "name": "Security Project",
        "due_date": "2026-02-28T23:59:59",  # 27 days away
        "tags": ["Security", "Networking"]
    }
]
```

### Step-by-Step Processing

#### Step 1: Extract Priority Tags
```python
priority_tags = {"OOP", "Java", "Security", "Networking"}
```

#### Step 2: Categorize Notes

**Priority Notes** (match assignment tags):
- Note 1: OOP Basics (tags: OOP, Java) ✓
- Note 2: Inheritance (tags: OOP, Java, Advanced) ✓
- Note 3: Polymorphism (tags: OOP, Design) ✓
- Note 6: Encryption (tags: Security, Crypto) ✓
- Note 7: SQL Injection (tags: Security, Database) ✓

**Regular Notes** (no tag match):
- Note 4: CNNs (tags: CVI, Deep Learning)
- Note 5: Image Processing (tags: CVI, OpenCV)

#### Step 3: Generate Daily Schedule

**February 1 (14 days before OOP exam)**
- Using 3 priority slots + 2 regular slots (60/40 split)

```json
{
  "02/01/2026": {
    "09:00": {
      "subject": ["OOP Basics"],
      "tags": ["OOP", "Java"],
      "associated_notes": [1]
    },
    "11:00": {
      "subject": ["Inheritance"],
      "tags": ["OOP", "Java", "Advanced"],
      "associated_notes": [2]
    },
    "14:00": {
      "subject": ["Polymorphism"],
      "tags": ["OOP", "Design"],
      "associated_notes": [3]
    },
    "16:00": {
      "subject": ["CNNs"],
      "tags": ["CVI", "Deep Learning"],
      "associated_notes": [4]
    },
    "19:00": {
      "subject": ["Image Processing"],
      "tags": ["CVI", "OpenCV"],
      "associated_notes": [5]
    }
  }
}
```

**February 8 (7 days before OOP exam)**
- Using 4 priority slots + 1 regular slot (80/20 split)

```json
{
  "02/08/2026": {
    "09:00": {
      "subject": ["OOP Basics"],
      "tags": ["OOP", "Java"],
      "associated_notes": [1]
    },
    "11:00": {
      "subject": ["Inheritance"],
      "tags": ["OOP", "Java", "Advanced"],
      "associated_notes": [2]
    },
    "14:00": {
      "subject": ["Encryption"],
      "tags": ["Security", "Crypto"],
      "associated_notes": [6]
    },
    "16:00": {
      "subject": ["Polymorphism"],
      "tags": ["OOP", "Design"],
      "associated_notes": [3]
    },
    "19:00": {
      "subject": ["CNNs"],
      "tags": ["CVI", "Deep Learning"],
      "associated_notes": [4]
    }
  }
}
```

**February 16 (after OOP exam, 12 days before Security project)**
- Using 3 priority slots + 2 regular slots (60/40 split)
- Now prioritizes Security-tagged notes

```json
{
  "02/16/2026": {
    "09:00": {
      "subject": ["Encryption"],
      "tags": ["Security", "Crypto"],
      "associated_notes": [6]
    },
    "11:00": {
      "subject": ["SQL Injection"],
      "tags": ["Security", "Database"],
      "associated_notes": [7]
    },
    "14:00": {
      "subject": ["OOP Basics"],
      "tags": ["OOP", "Java"],
      "associated_notes": [1]
    },
    "16:00": {
      "subject": ["CNNs"],
      "tags": ["CVI", "Deep Learning"],
      "associated_notes": [4]
    },
    "19:00": {
      "subject": ["Image Processing"],
      "tags": ["CVI", "OpenCV"],
      "associated_notes": [5]
    }
  }
}
```

## Real API Example

Here's how to use this in practice:

### 1. Create User and Notes

```bash
# Create user
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "microsoft_id": "student_123",
    "email": "student@university.edu",
    "display_name": "John Doe"
  }'

# Create OOP notes
curl -X POST http://localhost:5000/api/users/1/notes \
  -H "Content-Type: application/json" \
  -d '{
    "content": {"text": "Classes, objects, methods"},
    "subject": "OOP Basics",
    "tags": ["OOP", "Java"]
  }'

# Create more notes with different tags...
```

### 2. Create Assignments

```bash
# Create OOP exam (2 weeks away)
curl -X POST http://localhost:5000/api/users/1/assignments \
  -H "Content-Type: application/json" \
  -d '{
    "name": "OOP Final Exam",
    "due_date": "2026-02-15T10:00:00",
    "tags": ["OOP", "Java"]
  }'

# Create Security project (4 weeks away)
curl -X POST http://localhost:5000/api/users/1/assignments \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Security Project",
    "due_date": "2026-02-28T23:59:59",
    "tags": ["Security", "Networking"]
  }'
```

### 3. Generate Smart Study Plan

```bash
curl -X POST http://localhost:5000/api/users/1/study-plan/generate \
  -H "Content-Type: application/json" \
  -d '{
    "start_date": "2026-02-01"
  }'
```

The API will automatically:
1. ✅ Identify that you have assignments in 14 and 27 days
2. ✅ Find all notes tagged with "OOP", "Java", "Security", or "Networking"
3. ✅ Create a 30-day plan that progressively prioritizes relevant notes
4. ✅ Allocate more study time to OOP in the first 2 weeks
5. ✅ Shift focus to Security after the OOP exam
6. ✅ Maintain some diversity with regular notes

## Benefits

1. **Automatic Focus**: No manual scheduling needed
2. **Dynamic Adjustment**: Plan adapts to assignment deadlines
3. **Balanced Learning**: Still includes non-priority topics
4. **Spaced Repetition**: Notes appear multiple times
5. **Microsoft Integration**: Easy to visualize in Power BI

## Customization

You can adjust the priority ratios in `app.py`:

```python
def generate_monthly_plan_logic(start_date, notes, assignments):
    # ...
    days_to_nearest_assignment = min(...)
    
    # Customize these thresholds
    if days_to_nearest_assignment <= 7:
        priority_slots = 4  # Change to 5 for 100% priority
    elif days_to_nearest_assignment <= 14:
        priority_slots = 3  # Change to 2 for 40% priority
    # ... etc
```

## Viewing in Power BI

After generating the plan, you can:

1. Connect Power BI to the database
2. Parse the JSON study plan (see POWERBI_GUIDE.md)
3. Create visualizations showing:
   - Tag distribution over time
   - Priority vs. regular note allocation
   - Study time per subject
   - Correlation with assignment dates

## Complete Workflow Example

```python
# Python script to set up and generate a smart study plan

import requests
import json
from datetime import datetime, timedelta

BASE_URL = 'http://localhost:5000/api'

# 1. Create user
user = requests.post(f'{BASE_URL}/users', json={
    'microsoft_id': 'student_456',
    'email': 'jane@university.edu',
    'display_name': 'Jane Smith'
}).json()

user_id = user['id']

# 2. Create notes across different subjects
subjects = [
    ("OOP", ["OOP", "Java"]),
    ("OOP Advanced", ["OOP", "Design Patterns"]),
    ("Security", ["Security", "Encryption"]),
    ("Databases", ["SQL", "Database"]),
    ("Web Dev", ["HTML", "CSS", "JavaScript"])
]

for subject, tags in subjects:
    requests.post(f'{BASE_URL}/users/{user_id}/notes', json={
        'content': {'text': f'Notes on {subject}'},
        'subject': subject,
        'tags': tags
    })

# 3. Create assignments with strategic deadlines
assignments = [
    ("OOP Exam", 10, ["OOP", "Java"]),
    ("Security Project", 25, ["Security", "Encryption"]),
]

for name, days_ahead, tags in assignments:
    due_date = (datetime.now() + timedelta(days=days_ahead)).isoformat()
    requests.post(f'{BASE_URL}/users/{user_id}/assignments', json={
        'name': name,
        'due_date': due_date,
        'tags': tags
    })

# 4. Generate intelligent study plan
response = requests.post(
    f'{BASE_URL}/users/{user_id}/study-plan/generate',
    json={'start_date': datetime.now().strftime('%Y-%m-%d')}
)

plan = response.json()
print("Study plan generated successfully!")
print(f"Plan covers {len(plan['study_plan'])} days")
```

This creates a complete, intelligent study system that adapts to your assignment schedule!
