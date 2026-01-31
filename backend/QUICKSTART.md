# Quick Start Guide

## Setup & Installation

### Option 1: Local Development

1. **Install Python 3.11+**

2. **Clone or download the project files**

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Run the application**
```bash
python app.py
```

5. **Verify it's running**
```bash
curl http://localhost:5000/api/health
```

You should see: `{"status":"healthy","timestamp":"..."}`

### Option 2: Docker

1. **Build and run with Docker Compose**
```bash
docker-compose up -d
```

2. **Check status**
```bash
docker-compose ps
```

3. **View logs**
```bash
docker-compose logs -f
```

## Quick Test

### 1. Create a user
```bash
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "microsoft_id": "test_user_1",
    "email": "test@example.com",
    "display_name": "Test User"
  }'
```

Response: `{"id":1,"microsoft_id":"test_user_1",...}`

### 2. Create a note
```bash
curl -X POST http://localhost:5000/api/users/1/notes \
  -H "Content-Type: application/json" \
  -d '{
    "content": {"text": "My first note about OOP"},
    "subject": "Object Oriented Programming",
    "tags": ["OOP", "Java"]
  }'
```

### 3. Create an assignment
```bash
curl -X POST http://localhost:5000/api/users/1/assignments \
  -H "Content-Type: application/json" \
  -d '{
    "name": "OOP Final Exam",
    "due_date": "2026-03-01T10:00:00",
    "tags": ["OOP", "Java"]
  }'
```

### 4. Generate a study plan
```bash
curl -X POST http://localhost:5000/api/users/1/study-plan/generate \
  -H "Content-Type: application/json" \
  -d '{
    "start_date": "2026-02-01"
  }'
```

## Generate Sample Data

For testing and demonstration:

```bash
python generate_sample_data.py
```

This creates:
- 3 sample users
- ~45 notes across various subjects
- ~15 assignments
- Study plans for each user
- Spaced repetition entries

## Connect to Power BI

### Quick Connection

1. **Open Power BI Desktop**

2. **Get Data → SQLite**
   - File: `study_app.db`
   - Tables: Select all

3. **Load the tables**

4. **Create relationships** (if not auto-detected):
   - users → notes (id → user_id)
   - users → assignments (id → user_id)
   - notes → spaced_repetitions (id → note_id)

5. **Start building visualizations!**

See `POWERBI_GUIDE.md` for detailed DAX measures and templates.

## API Documentation

Full API documentation is in `README.md`, but here are the key endpoints:

### Users
- `POST /api/users` - Create user
- `GET /api/users/{id}` - Get user
- `PUT /api/users/{id}` - Update user

### Notes
- `POST /api/users/{id}/notes` - Create note
- `GET /api/users/{id}/notes` - Get all notes
- `GET /api/notes/{id}` - Get specific note
- `PUT /api/notes/{id}` - Update note
- `DELETE /api/notes/{id}` - Delete note

### Study Plans
- `POST /api/users/{id}/study-plan` - Create/update plan
- `GET /api/users/{id}/study-plan` - Get plan
- `POST /api/users/{id}/study-plan/generate` - Auto-generate plan

### Spaced Repetition
- `POST /api/users/{id}/spaced-repetitions` - Add note to SR
- `GET /api/users/{id}/spaced-repetitions` - Get all SR entries
- `POST /api/spaced-repetitions/{id}/review` - Mark as reviewed

### Assignments
- `POST /api/users/{id}/assignments` - Create assignment
- `GET /api/users/{id}/assignments` - Get all assignments
- `PUT /api/assignments/{id}` - Update assignment
- `DELETE /api/assignments/{id}` - Delete assignment

## Common Tasks

### Add a note to spaced repetition
```bash
# First, get the note ID from creating or listing notes
# Then:
curl -X POST http://localhost:5000/api/users/1/spaced-repetitions \
  -H "Content-Type: application/json" \
  -d '{"note_id": 1}'
```

### Mark a note as reviewed
```bash
# Get the spaced repetition ID, then:
curl -X POST http://localhost:5000/api/spaced-repetitions/1/review
```

### Filter notes by tag
```bash
curl "http://localhost:5000/api/users/1/notes?tag=OOP"
```

### Get upcoming assignments
```bash
curl "http://localhost:5000/api/users/1/assignments?upcoming=true"
```

## Troubleshooting

### Port already in use
Change the port in `app.py`:
```python
app.run(debug=True, host='0.0.0.0', port=5001)  # Changed to 5001
```

### Database locked
If you get "database is locked" errors:
```bash
# Close any programs accessing the database
# Or restart the Flask app
```

### Import errors
Make sure all dependencies are installed:
```bash
pip install -r requirements.txt --upgrade
```

### Test the API
Run the test suite:
```bash
python -m unittest test_app.py
```

## Next Steps

1. ✅ **Set up Microsoft Authentication**
   - Add OAuth configuration
   - Implement login endpoints
   - Secure API with JWT tokens

2. ✅ **Customize the study plan algorithm**
   - Adjust time slots
   - Modify priority calculations
   - Add more sophisticated scheduling

3. ✅ **Build a frontend**
   - React/Vue.js web app
   - Mobile app with React Native
   - Desktop app with Electron

4. ✅ **Deploy to production**
   - Use PostgreSQL instead of SQLite
   - Add Redis for caching
   - Deploy on Azure/AWS
   - Set up CI/CD

5. ✅ **Enhance analytics**
   - Build Power BI dashboards
   - Create automated reports
   - Add predictive analytics

## Support

For issues or questions:
1. Check `README.md` for detailed documentation
2. Review `POWERBI_GUIDE.md` for BI integration
3. Examine the code comments in `app.py`
4. Run tests with `test_app.py`

Happy studying! 📚
