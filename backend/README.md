# Study App REST API with Flask and SQLAlchemy

A comprehensive REST API for managing user notes, study plans, spaced repetition, and assignments with Microsoft product integration support (Power BI, Fabric, etc.).

## Features

- **Microsoft Authentication Support**: User table designed for Microsoft OAuth integration
- **Notes Management**: JSON-formatted notes with tags and metadata
- **Smart Study Plans**: Monthly study plans that prioritize notes based on upcoming assignments
- **Spaced Repetition**: Intelligent review scheduling for long-term retention
- **Assignments Tracking**: Track assignments with due dates and tags
- **Power BI Compatible**: SQLite database structure optimized for Microsoft BI tools

## Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run the application:
```bash
python app.py
```

The API will be available at `http://localhost:5000`

## Database Schema

### Users Table
Stores user data from Microsoft authentication:
- `id`: Primary key
- `microsoft_id`: Unique Microsoft account ID
- `email`: User email
- `display_name`: User's display name
- `created_at`: Account creation timestamp
- `last_login`: Last login timestamp

### Notes Table
Stores user notes in JSON format:
- `id`: Unique note ID
- `user_id`: Foreign key to users
- `content`: JSON formatted note content
- `subject`: Note subject/title
- `tags`: JSON array of tags
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

### Study Plans Table
One study plan per user containing monthly schedule:
- `plan_id`: Unique plan ID
- `user_id`: Foreign key to users (unique)
- `study_plan`: JSON formatted monthly study schedule
- `created_at`: Plan creation timestamp
- `updated_at`: Last update timestamp

### Spaced Repetition Table
Tracks spaced repetition for notes:
- `id`: Primary key
- `user_id`: Foreign key to users
- `note_id`: Foreign key to notes
- `repetition_dates`: JSON array of review dates
- `revision_count`: Number of times reviewed
- `next_review_date`: Next scheduled review
- `created_at`: Creation timestamp

### Assignments Table
Tracks user assignments:
- `id`: Primary key
- `user_id`: Foreign key to users
- `name`: Assignment name
- `due_date`: Assignment due date
- `tags`: JSON array of tags
- `description`: Assignment description
- `status`: Assignment status (pending/in_progress/completed)
- `created_at`: Creation timestamp

## API Endpoints

### Users

#### Create User
```http
POST /api/users
Content-Type: application/json

{
  "microsoft_id": "ms_12345",
  "email": "user@example.com",
  "display_name": "John Doe"
}
```

#### Get User
```http
GET /api/users/{user_id}
```

#### Update User
```http
PUT /api/users/{user_id}
Content-Type: application/json

{
  "display_name": "Jane Doe",
  "last_login": true
}
```

### Notes

#### Create Note
```http
POST /api/users/{user_id}/notes
Content-Type: application/json

{
  "content": {
    "text": "Object Oriented Programming concepts",
    "details": "Key concepts include inheritance, polymorphism, encapsulation"
  },
  "subject": "Object Oriented Programming",
  "tags": ["OOP", "Java", "Programming"]
}
```

#### Get User Notes
```http
GET /api/users/{user_id}/notes
GET /api/users/{user_id}/notes?subject=OOP
GET /api/users/{user_id}/notes?tag=Java
```

#### Get Specific Note
```http
GET /api/notes/{note_id}
```

#### Update Note
```http
PUT /api/notes/{note_id}
Content-Type: application/json

{
  "content": {
    "text": "Updated content"
  },
  "tags": ["OOP", "Java", "Advanced"]
}
```

#### Delete Note
```http
DELETE /api/notes/{note_id}
```

### Study Plans

#### Create/Update Study Plan
```http
POST /api/users/{user_id}/study-plan
Content-Type: application/json

{
  "study_plan": {
    "01/01/2026": {
      "09:00": {
        "subject": ["Object Oriented Programming"],
        "tags": ["OOP", "Java"],
        "associated_notes": [1, 2, 3]
      },
      "11:00": {
        "subject": ["Computer Vision"],
        "tags": ["CVI", "CNNs"],
        "associated_notes": [4, 5]
      }
    }
  }
}
```

#### Get Study Plan
```http
GET /api/users/{user_id}/study-plan
```

#### Generate Smart Study Plan
Automatically generates a monthly study plan that prioritizes notes with tags matching upcoming assignments:
```http
POST /api/users/{user_id}/study-plan/generate
Content-Type: application/json

{
  "start_date": "2026-01-01"
}
```

**Algorithm Logic:**
- Identifies assignments due within the next month
- Extracts tags from upcoming assignments as "priority tags"
- Categorizes notes as "priority" (matching assignment tags) or "regular"
- Allocates study slots based on proximity to assignments:
  - 7 days before assignment: 80% priority notes, 20% regular
  - 8-14 days before: 60% priority, 40% regular
  - 15-21 days before: 40% priority, 60% regular
  - 22+ days before: 20% priority, 80% regular

### Spaced Repetition

#### Add Note to Spaced Repetition
```http
POST /api/users/{user_id}/spaced-repetitions
Content-Type: application/json

{
  "note_id": 1
}
```

#### Get Spaced Repetitions
```http
GET /api/users/{user_id}/spaced-repetitions
```

#### Mark as Reviewed
```http
POST /api/spaced-repetitions/{rep_id}/review
```

**Spaced Repetition Intervals:**
- 1st review: 1 day later
- 2nd review: 3 days later
- 3rd review: 7 days later
- 4th review: 14 days later
- 5th review: 30 days later
- 6th review: 60 days later
- 7th+ review: 90 days later

### Assignments

#### Create Assignment
```http
POST /api/users/{user_id}/assignments
Content-Type: application/json

{
  "name": "OOP Final Project",
  "due_date": "2026-02-15T23:59:59",
  "tags": ["OOP", "Java", "Project"],
  "description": "Implement a complex OOP system",
  "status": "pending"
}
```

#### Get Assignments
```http
GET /api/users/{user_id}/assignments
GET /api/users/{user_id}/assignments?status=pending
GET /api/users/{user_id}/assignments?upcoming=true
```

#### Update Assignment
```http
PUT /api/assignments/{assignment_id}
Content-Type: application/json

{
  "status": "in_progress",
  "description": "Updated description"
}
```

#### Delete Assignment
```http
DELETE /api/assignments/{assignment_id}
```

### Utility Endpoints

#### Health Check
```http
GET /api/health
```

#### Initialize Database
```http
POST /api/init-db
```

## Microsoft Product Integration

### Power BI Integration

1. **Connect to SQLite Database:**
   - In Power BI Desktop, select "Get Data" → "Database" → "SQLite"
   - Browse to `study_app.db` file
   - Select the tables you want to import

2. **Recommended Tables for Analysis:**
   - `users`: User demographics and activity
   - `notes`: Note creation and tagging patterns
   - `study_plans`: Study schedule adherence
   - `assignments`: Assignment completion tracking
   - `spaced_repetitions`: Review effectiveness metrics

3. **Sample DAX Measures:**

```dax
-- Total Active Users
Active Users = COUNTROWS(users)

-- Notes per User
Notes per User = DIVIDE(COUNTROWS(notes), COUNTROWS(users))

-- Assignment Completion Rate
Completion Rate = 
DIVIDE(
    COUNTROWS(FILTER(assignments, assignments[status] = "completed")),
    COUNTROWS(assignments)
)

-- Average Revision Count
Avg Revisions = AVERAGE(spaced_repetitions[revision_count])
```

### Microsoft Fabric Integration

1. **Lakehouse Integration:**
   - Export SQLite data to Parquet format
   - Upload to Fabric Lakehouse
   - Create shortcuts for real-time access

2. **Data Pipeline:**
   - Set up scheduled data refresh
   - Transform JSON columns using Fabric notebooks
   - Create semantic models for reporting

### Excel Integration

1. **Power Query Connection:**
   - Use ODBC driver for SQLite
   - Import tables into Excel
   - Set up automatic refresh

2. **JSON Data Handling:**
```excel
= Json.Document([content])
```

## Example Workflow

1. **Create a user:**
```bash
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "microsoft_id": "ms_12345",
    "email": "student@university.edu",
    "display_name": "Student Name"
  }'
```

2. **Create notes:**
```bash
curl -X POST http://localhost:5000/api/users/1/notes \
  -H "Content-Type: application/json" \
  -d '{
    "content": {"text": "OOP principles"},
    "subject": "Object Oriented Programming",
    "tags": ["OOP", "Java"]
  }'
```

3. **Create an assignment:**
```bash
curl -X POST http://localhost:5000/api/users/1/assignments \
  -H "Content-Type: application/json" \
  -d '{
    "name": "OOP Exam",
    "due_date": "2026-02-15T10:00:00",
    "tags": ["OOP", "Java"]
  }'
```

4. **Generate smart study plan:**
```bash
curl -X POST http://localhost:5000/api/users/1/study-plan/generate \
  -H "Content-Type: application/json" \
  -d '{
    "start_date": "2026-01-15"
  }'
```

The system will automatically create a study plan that prioritizes OOP notes in the month leading up to the exam.

## Data Export for Power BI

To export data for Power BI analysis:

```python
import sqlite3
import pandas as pd

# Connect to database
conn = sqlite3.connect('study_app.db')

# Export users
df_users = pd.read_sql_query("SELECT * FROM users", conn)
df_users.to_csv('users_export.csv', index=False)

# Export notes with parsed JSON
df_notes = pd.read_sql_query("SELECT * FROM notes", conn)
df_notes.to_csv('notes_export.csv', index=False)

# Export study plans
df_plans = pd.read_sql_query("SELECT * FROM study_plans", conn)
df_plans.to_csv('study_plans_export.csv', index=False)

conn.close()
```

## Best Practices

1. **Index Optimization**: The database includes indexes on frequently queried fields (user_id, created_at, due_date)
2. **JSON Storage**: All JSON data is stored as TEXT for SQLite compatibility
3. **Cascading Deletes**: User deletion automatically removes all associated data
4. **Timestamp Tracking**: All tables include creation and update timestamps
5. **Tag Normalization**: Consider creating a separate tags table for better normalization in production

## Security Considerations

For production deployment:

1. Add authentication middleware (Microsoft OAuth)
2. Implement rate limiting
3. Add input validation and sanitization
4. Use environment variables for configuration
5. Enable HTTPS
6. Add CORS configuration
7. Implement proper error handling
8. Add logging and monitoring

## Performance Optimization

For large datasets:

1. Consider PostgreSQL instead of SQLite
2. Add database connection pooling
3. Implement caching (Redis)
4. Use pagination for list endpoints
5. Add database query optimization
6. Consider denormalization for reporting tables

## License

This project is provided as-is for educational purposes.
