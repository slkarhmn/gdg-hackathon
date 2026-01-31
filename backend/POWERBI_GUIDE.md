# Power BI Integration Guide

## Overview
This guide explains how to connect your Study App database to Microsoft Power BI for advanced analytics and visualization.

## Connection Setup

### Method 1: Direct SQLite Connection

1. **Install SQLite ODBC Driver**
   - Download from: http://www.ch-werner.de/sqliteodbc/
   - Install the appropriate version (32-bit or 64-bit based on your Power BI version)

2. **Connect in Power BI Desktop**
   - Open Power BI Desktop
   - Click "Get Data" → "Database" → "ODBC"
   - Select your SQLite ODBC driver
   - Browse to your `study_app.db` file
   - Select tables to import

3. **Recommended Tables**
   - `users` - User information
   - `notes` - All study notes
   - `study_plans` - Monthly study schedules
   - `spaced_repetitions` - Review tracking
   - `assignments` - Assignment tracking

### Method 2: Export to CSV/Excel

If you prefer not to use ODBC:

```python
# export_to_powerbi.py
import sqlite3
import pandas as pd
from datetime import datetime

def export_all_tables():
    conn = sqlite3.connect('study_app.db')
    
    # Export users
    users = pd.read_sql_query("""
        SELECT 
            id,
            microsoft_id,
            email,
            display_name,
            created_at,
            last_login
        FROM users
    """, conn)
    users.to_csv('powerbi_users.csv', index=False)
    
    # Export notes with flattened JSON
    notes = pd.read_sql_query("""
        SELECT 
            id,
            user_id,
            content,
            subject,
            tags,
            created_at,
            updated_at
        FROM notes
    """, conn)
    notes.to_csv('powerbi_notes.csv', index=False)
    
    # Export assignments
    assignments = pd.read_sql_query("""
        SELECT 
            id,
            user_id,
            name,
            due_date,
            tags,
            description,
            status,
            created_at
        FROM assignments
    """, conn)
    assignments.to_csv('powerbi_assignments.csv', index=False)
    
    # Export spaced repetitions
    spaced_reps = pd.read_sql_query("""
        SELECT 
            id,
            user_id,
            note_id,
            repetition_dates,
            revision_count,
            next_review_date,
            created_at
        FROM spaced_repetitions
    """, conn)
    spaced_reps.to_csv('powerbi_spaced_repetitions.csv', index=False)
    
    conn.close()
    print("Export completed!")

if __name__ == '__main__':
    export_all_tables()
```

## Data Model Setup

### Relationships

Create these relationships in Power BI:

1. **users[id]** → **notes[user_id]** (One-to-Many)
2. **users[id]** → **study_plans[user_id]** (One-to-One)
3. **users[id]** → **assignments[user_id]** (One-to-Many)
4. **users[id]** → **spaced_repetitions[user_id]** (One-to-Many)
5. **notes[id]** → **spaced_repetitions[note_id]** (One-to-Many)

### Transform JSON Columns

For JSON columns like `tags` and `content`, use Power Query:

```m
// Transform tags column
let
    Source = notes,
    ParsedTags = Table.AddColumn(Source, "TagsList", each 
        try Json.Document([tags]) otherwise {}
    ),
    ExpandedTags = Table.ExpandListColumn(ParsedTags, "TagsList")
in
    ExpandedTags

// Transform note content
let
    Source = notes,
    ParsedContent = Table.AddColumn(Source, "ContentParsed", each 
        try Json.Document([content]) otherwise [text = ""]
    ),
    ExpandedContent = Table.ExpandRecordColumn(ParsedContent, "ContentParsed", {"text"}, {"NoteText"})
in
    ExpandedContent
```

## DAX Measures

### User Analytics

```dax
// Total Active Users
Total Users = COUNTROWS(users)

// New Users This Month
New Users This Month = 
CALCULATE(
    COUNTROWS(users),
    users[created_at] >= EOMONTH(TODAY(), -1) + 1,
    users[created_at] <= EOMONTH(TODAY(), 0)
)

// Active Users (logged in last 30 days)
Active Users = 
CALCULATE(
    COUNTROWS(users),
    users[last_login] >= TODAY() - 30
)

// User Retention Rate
Retention Rate = 
DIVIDE(
    [Active Users],
    [Total Users],
    0
)
```

### Note Analytics

```dax
// Total Notes
Total Notes = COUNTROWS(notes)

// Notes per User
Notes per User = 
DIVIDE(
    [Total Notes],
    [Total Users],
    0
)

// Notes Created This Week
Notes This Week = 
CALCULATE(
    COUNTROWS(notes),
    notes[created_at] >= TODAY() - WEEKDAY(TODAY(), 2) + 1
)

// Notes by Tag Count
Notes by Tag = 
CALCULATE(
    COUNTROWS(notes),
    FILTER(
        notes,
        CONTAINSSTRING(notes[tags], "OOP")
    )
)

// Average Note Age (Days)
Average Note Age = 
AVERAGE(
    DATEDIFF(notes[created_at], TODAY(), DAY)
)
```

### Study Plan Analytics

```dax
// Users with Study Plans
Users with Plans = 
CALCULATE(
    COUNTROWS(users),
    NOT(ISBLANK(RELATED(study_plans[plan_id])))
)

// Study Plan Adoption Rate
Plan Adoption Rate = 
DIVIDE(
    [Users with Plans],
    [Total Users],
    0
)

// Average Sessions per Day
Avg Sessions per Day = 
// This requires parsing the JSON study plan
// See advanced section below
```

### Assignment Analytics

```dax
// Total Assignments
Total Assignments = COUNTROWS(assignments)

// Completed Assignments
Completed Assignments = 
CALCULATE(
    COUNTROWS(assignments),
    assignments[status] = "completed"
)

// Pending Assignments
Pending Assignments = 
CALCULATE(
    COUNTROWS(assignments),
    assignments[status] = "pending"
)

// Overdue Assignments
Overdue Assignments = 
CALCULATE(
    COUNTROWS(assignments),
    assignments[due_date] < TODAY(),
    assignments[status] <> "completed"
)

// Assignment Completion Rate
Completion Rate = 
DIVIDE(
    [Completed Assignments],
    [Total Assignments],
    0
)

// Average Time to Complete (Days)
Avg Completion Time = 
CALCULATE(
    AVERAGE(
        DATEDIFF(assignments[created_at], assignments[due_date], DAY)
    ),
    assignments[status] = "completed"
)

// Assignments Due This Week
Assignments Due This Week = 
CALCULATE(
    COUNTROWS(assignments),
    assignments[due_date] >= TODAY(),
    assignments[due_date] < TODAY() + 7,
    assignments[status] <> "completed"
)
```

### Spaced Repetition Analytics

```dax
// Total Active Repetitions
Active Repetitions = COUNTROWS(spaced_repetitions)

// Average Revision Count
Avg Revisions = AVERAGE(spaced_repetitions[revision_count])

// Reviews Due Today
Reviews Due Today = 
CALCULATE(
    COUNTROWS(spaced_repetitions),
    spaced_repetitions[next_review_date] = TODAY()
)

// Reviews Overdue
Reviews Overdue = 
CALCULATE(
    COUNTROWS(spaced_repetitions),
    spaced_repetitions[next_review_date] < TODAY()
)

// Completion Rate (notes with 7+ reviews)
Mastery Rate = 
DIVIDE(
    CALCULATE(
        COUNTROWS(spaced_repetitions),
        spaced_repetitions[revision_count] >= 7
    ),
    [Active Repetitions],
    0
)
```

### Time-based Measures

```dax
// Create a Calendar Table first
Calendar = 
ADDCOLUMNS(
    CALENDAR(DATE(2024, 1, 1), DATE(2027, 12, 31)),
    "Year", YEAR([Date]),
    "Month", FORMAT([Date], "MMM"),
    "MonthNum", MONTH([Date]),
    "Quarter", "Q" & QUARTER([Date]),
    "WeekNum", WEEKNUM([Date]),
    "DayOfWeek", FORMAT([Date], "DDD")
)

// Notes Created by Month
Notes by Month = 
CALCULATE(
    COUNTROWS(notes),
    USERELATIONSHIP(Calendar[Date], notes[created_at])
)

// Assignments by Due Date
Assignments by Due Date = 
CALCULATE(
    COUNTROWS(assignments),
    USERELATIONSHIP(Calendar[Date], assignments[due_date])
)
```

## Sample Visualizations

### 1. User Dashboard
- **Card**: Total Users
- **Card**: Active Users (last 30 days)
- **Line Chart**: New Users Over Time
- **Gauge**: Retention Rate

### 2. Notes Dashboard
- **Card**: Total Notes
- **Card**: Notes This Week
- **Bar Chart**: Notes by Subject
- **Bar Chart**: Top 10 Tags
- **Line Chart**: Notes Created Over Time

### 3. Study Plan Dashboard
- **Card**: Users with Study Plans
- **Gauge**: Plan Adoption Rate
- **Calendar Visual**: Study Sessions by Date
- **Heatmap**: Study Time Distribution

### 4. Assignment Dashboard
- **Card**: Total Assignments
- **Card**: Assignments Due This Week
- **Gauge**: Completion Rate
- **Stacked Bar**: Assignments by Status
- **Line Chart**: Assignment Completion Trend

### 5. Spaced Repetition Dashboard
- **Card**: Active Repetitions
- **Card**: Reviews Due Today
- **Card**: Reviews Overdue
- **Histogram**: Revision Count Distribution
- **Line Chart**: Review Activity Over Time

## Advanced: Parsing JSON Study Plans

For detailed study plan analysis:

```python
# Create a flattened study sessions table
import sqlite3
import pandas as pd
import json
from datetime import datetime

def flatten_study_plans():
    conn = sqlite3.connect('study_app.db')
    
    # Get all study plans
    plans = pd.read_sql_query("""
        SELECT plan_id, user_id, study_plan, created_at
        FROM study_plans
    """, conn)
    
    sessions = []
    
    for _, row in plans.iterrows():
        plan = json.loads(row['study_plan'])
        
        for date_str, time_slots in plan.items():
            for time, session in time_slots.items():
                sessions.append({
                    'plan_id': row['plan_id'],
                    'user_id': row['user_id'],
                    'session_date': date_str,
                    'session_time': time,
                    'subject': session.get('subject', [''])[0],
                    'tags': ','.join(session.get('tags', [])),
                    'note_count': len(session.get('associated_notes', []))
                })
    
    df_sessions = pd.DataFrame(sessions)
    df_sessions.to_csv('powerbi_study_sessions.csv', index=False)
    
    conn.close()
    print(f"Exported {len(sessions)} study sessions")

if __name__ == '__main__':
    flatten_study_plans()
```

## Report Templates

### Executive Summary Report
1. **Overview**
   - Total users, notes, assignments
   - Key performance indicators
   - Monthly trends

2. **User Engagement**
   - Active users
   - New user growth
   - Retention metrics

3. **Learning Metrics**
   - Notes created
   - Study plan adoption
   - Spaced repetition effectiveness

### Student Performance Report
1. **Assignment Tracking**
   - Upcoming assignments
   - Completion rates
   - Overdue items

2. **Study Habits**
   - Study time distribution
   - Subject focus
   - Session frequency

3. **Review Performance**
   - Spaced repetition progress
   - Mastery levels
   - Review adherence

## Scheduled Refresh

For automatic updates:

1. **Power BI Service**
   - Publish report to Power BI Service
   - Configure scheduled refresh
   - Set refresh frequency (daily/weekly)

2. **Gateway Setup** (for on-premises database)
   - Install Power BI Gateway
   - Configure data source
   - Set up credentials

3. **Python Script Automation**
   - Schedule export script with Windows Task Scheduler
   - Update CSV files automatically
   - Power BI refreshes from updated CSVs

## Best Practices

1. **Performance Optimization**
   - Use import mode instead of DirectQuery
   - Create aggregated tables for large datasets
   - Use query folding where possible

2. **Data Refresh**
   - Schedule refreshes during off-peak hours
   - Incremental refresh for large tables
   - Monitor refresh failures

3. **Security**
   - Use Row-Level Security (RLS) for multi-user scenarios
   - Secure database credentials
   - Implement proper access controls

4. **Visualization**
   - Use bookmarks for different views
   - Create drill-through pages for details
   - Add tooltips for additional context
