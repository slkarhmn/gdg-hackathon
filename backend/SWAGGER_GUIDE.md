# Swagger UI Testing Guide

## Setup

1. **Install the new dependencies:**
```bash
pip install flask-restx flask-cors
```

2. **Run the Swagger-enabled version:**
```bash
python app_swagger.py
```

3. **Open your browser and go to:**
```
http://localhost:5000/api/docs
```

You'll see the interactive Swagger UI with all your endpoints!

## How to Use Swagger UI

### 1. **View All Endpoints**
The Swagger UI groups endpoints by category:
- **users** - User management
- **notes** - Note operations
- **study-plans** - Study plan management
- **spaced-repetitions** - Spaced repetition tracking
- **assignments** - Assignment management

### 2. **Test an Endpoint**

#### Example: Create a User

1. Click on **users** to expand the section
2. Click on **POST /api/users** (Create a new user)
3. Click **"Try it out"** button
4. You'll see a text editor with example JSON:
```json
{
  "microsoft_id": "string",
  "email": "string",
  "display_name": "string"
}
```

5. Edit it to something like:
```json
{
  "microsoft_id": "test_user_1",
  "email": "test@example.com",
  "display_name": "Test User"
}
```

6. Click **"Execute"**

7. You'll see the response below with:
   - Response code (201 Created)
   - Response body (the created user data)
   - Response headers

### 3. **Complete Workflow Example**

Let me walk you through a complete test:

#### Step 1: Create a User
- Endpoint: `POST /api/users`
- Body:
```json
{
  "microsoft_id": "student_123",
  "email": "student@university.edu",
  "display_name": "John Doe"
}
```
- **Note the `id` in the response** (e.g., `"id": 1`)

#### Step 2: Create Some Notes
- Endpoint: `POST /api/users/{user_id}/notes`
- Enter `1` for user_id parameter
- Body:
```json
{
  "content": {
    "text": "Object-oriented programming principles",
    "details": "Encapsulation, Inheritance, Polymorphism"
  },
  "subject": "Object Oriented Programming",
  "tags": ["OOP", "Java", "Programming"]
}
```

Create another note:
```json
{
  "content": {
    "text": "Computer vision fundamentals",
    "details": "Image processing, CNNs, feature detection"
  },
  "subject": "Computer Vision",
  "tags": ["CVI", "Deep Learning", "CNNs"]
}
```

#### Step 3: Create an Assignment
- Endpoint: `POST /api/assignments/user/{user_id}`
- Enter `1` for user_id parameter
- Body:
```json
{
  "name": "OOP Final Exam",
  "due_date": "2026-02-15T10:00:00",
  "tags": ["OOP", "Java"],
  "description": "Comprehensive OOP exam covering all concepts",
  "status": "pending"
}
```

#### Step 4: Generate a Study Plan
- Endpoint: `POST /api/study-plans/user/{user_id}/generate`
- Enter `1` for user_id parameter
- Body:
```json
{
  "start_date": "2026-02-01"
}
```

The API will generate a smart 30-day study plan that prioritizes OOP notes!

#### Step 5: View the Study Plan
- Endpoint: `GET /api/study-plans/user/{user_id}`
- Enter `1` for user_id parameter
- Click Execute
- See your generated monthly plan!

#### Step 6: Add Note to Spaced Repetition
- First, note a note ID from step 2 (e.g., `"id": 1`)
- Endpoint: `POST /api/spaced-repetitions/user/{user_id}`
- Enter `1` for user_id
- Body:
```json
{
  "note_id": 1
}
```

#### Step 7: Mark as Reviewed
- Note the spaced repetition ID from step 6
- Endpoint: `POST /api/spaced-repetitions/{rep_id}/review`
- Enter the rep_id
- Click Execute
- Watch the revision_count increase and next_review_date update!

## Swagger UI Features

### **Schemas**
At the bottom of the page, you can see all data models with their fields and types.

### **Authorization**
If you add authentication later, you can configure it here.

### **Try Different HTTP Methods**
Each endpoint shows what methods are available:
- **GET** (green) - Retrieve data
- **POST** (blue) - Create new data
- **PUT** (orange) - Update data
- **DELETE** (red) - Delete data

### **Query Parameters**
Some endpoints have query parameters. For example:
- `GET /api/notes/user/{user_id}/notes?tag=OOP&subject=Programming`

In Swagger, you can fill these in separately.

### **Response Codes**
Swagger shows all possible response codes:
- **200** - Success
- **201** - Created
- **400** - Bad Request (missing required fields)
- **404** - Not Found
- **409** - Conflict (duplicate)

## Tips

1. **Execute endpoints in order** - Create a user before creating notes!

2. **Copy IDs** - After creating a user, note, or assignment, copy the ID for use in other endpoints

3. **Check examples** - Each model shows example values

4. **Expand/collapse sections** - Click on the section headers to organize your view

5. **Download OpenAPI spec** - Click the link at the top to download the API specification

## Alternative: Use Postman or Insomnia

You can also import the OpenAPI spec into tools like Postman:
1. In Swagger UI, find the OpenAPI spec link (usually `/swagger.json`)
2. Copy: `http://localhost:5000/swagger.json`
3. In Postman: Import → Link → Paste URL

## Troubleshooting

**"Try it out" button doesn't work?**
- Make sure the app is running on port 5000
- Check browser console for CORS errors (CORS is enabled in app_swagger.py)

**Can't create user?**
- Make sure all required fields are filled
- Check that microsoft_id and email are unique

**404 errors?**
- Make sure you're using the correct IDs
- Create dependencies first (user before notes, etc.)

## Quick Test Script

Want to test everything at once? Here's a Python script:

```python
import requests

BASE_URL = 'http://localhost:5000/api'

# 1. Create user
user = requests.post(f'{BASE_URL}/users', json={
    'microsoft_id': 'test_123',
    'email': 'test@test.com',
    'display_name': 'Test User'
}).json()
print(f"Created user: {user['id']}")

# 2. Create note
note = requests.post(f'{BASE_URL}/users/{user["id"]}/notes', json={
    'content': {'text': 'Test note'},
    'subject': 'Test',
    'tags': ['test']
}).json()
print(f"Created note: {note['id']}")

# 3. Create assignment
assignment = requests.post(f'{BASE_URL}/assignments/user/{user["id"]}', json={
    'name': 'Test Assignment',
    'due_date': '2026-03-01T10:00:00',
    'tags': ['test']
}).json()
print(f"Created assignment: {assignment['id']}")

# 4. Generate plan
plan = requests.post(f'{BASE_URL}/study-plans/user/{user["id"]}/generate', json={
    'start_date': '2026-02-01'
}).json()
print(f"Generated plan with {len(plan['study_plan'])} days")

print("\n✅ All tests passed! Check Swagger UI for details.")
```

Save as `test_swagger.py` and run: `python test_swagger.py`

Happy testing! 🚀