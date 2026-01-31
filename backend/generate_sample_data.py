"""
Sample Data Generator for Study App (Updated)

Generates realistic test data for development and testing.

Compatible with the NEW clean replacement API:

✔ Users
✔ Notes
✔ Assignments (with grade + weight)

Spaced repetition + study plan endpoints are NOT included
in the current backend version, so they are skipped.
"""

import requests
from datetime import datetime, timedelta
import random

BASE_URL = "http://localhost:5000/api"

# =============================================================================
# SAMPLE DATA
# =============================================================================

SUBJECTS = [
    "Object Oriented Programming",
    "Computer Vision and Imaging",
    "Security and Networks",
    "Database Systems",
    "Machine Learning",
    "Web Development",
    "Algorithms and Data Structures",
    "Software Engineering",
]

TAGS = {
    "Object Oriented Programming": ["OOP", "Java", "Python", "Inheritance", "Polymorphism"],
    "Computer Vision and Imaging": ["CVI", "CNNs", "Image Processing", "OpenCV"],
    "Security and Networks": ["Security", "Networking", "Encryption", "Protocols"],
    "Database Systems": ["SQL", "NoSQL", "Database", "PostgreSQL", "MongoDB"],
    "Machine Learning": ["ML", "Neural Networks", "Deep Learning", "TensorFlow"],
    "Web Development": ["HTML", "CSS", "JavaScript", "React", "Node.js"],
    "Algorithms and Data Structures": ["Algorithms", "Data Structures", "Sorting", "Trees"],
    "Software Engineering": ["SDLC", "Agile", "Testing", "Design Patterns"],
}

NOTE_TEMPLATES = [
    "Key concepts include {concepts}",
    "Important topics: {concepts}",
    "Study focus: {concepts}",
    "Review these concepts: {concepts}",
    "Core principles: {concepts}",
]


# =============================================================================
# USER GENERATION
# =============================================================================

def create_sample_users(count=3):
    """Create sample users"""
    users = []

    for i in range(count):
        user_data = {
            "microsoft_id": f"ms_user_{i+1}",
            "email": f"student{i+1}@university.edu",
            "display_name": f"Student {i+1}",
        }

        response = requests.post(f"{BASE_URL}/users", json=user_data)

        if response.status_code in [200, 201]:
            user = response.json()
            users.append(user)
            print(f"✓ Created user: {user['email']}")
        else:
            print(f"✗ Failed to create user: {response.text}")

    return users


# =============================================================================
# NOTE GENERATION
# =============================================================================

def create_sample_notes(user_id, count=10):
    """Create sample notes for a user"""
    notes = []

    for i in range(count):
        subject = random.choice(SUBJECTS)
        subject_tags = TAGS[subject]

        selected_tags = random.sample(subject_tags, min(3, len(subject_tags)))
        concepts = ", ".join(selected_tags)

        content_text = random.choice(NOTE_TEMPLATES).format(concepts=concepts)

        note_data = {
            "content": {
                "text": content_text,
                "example": f"Example {i+1} for {subject}",
                "summary": f"Summary of {subject} concepts",
            },
            "subject": subject,
            "tags": selected_tags,
        }

        response = requests.post(
            f"{BASE_URL}/users/{user_id}/notes",
            json=note_data,
        )

        if response.status_code == 201:
            note = response.json()
            notes.append(note)
            print(f"  ✓ Created note: {note['subject']}")
        else:
            print(f"  ✗ Failed to create note: {response.text}")

    return notes


# =============================================================================
# ASSIGNMENT GENERATION (UPDATED FORMAT)
# =============================================================================

def create_sample_assignments(user_id, count=5):
    """
    Create assignments using NEW clean replacement format:

    ✔ name
    ✔ due_date
    ✔ tags
    ✔ grade
    ✔ weight
    """

    assignments = []

    assignment_templates = [
        ("Final Exam", 45, 40),
        ("Midterm Project", 30, 25),
        ("Lab Assignment", 14, 15),
        ("Research Paper", 21, 20),
        ("Quiz", 7, 10),
    ]

    for i in range(min(count, len(assignment_templates))):
        template_name, days_ahead, weight = assignment_templates[i]

        subject = random.choice(SUBJECTS)
        subject_tags = TAGS[subject]

        assignment_data = {
            "name": f"{subject} - {template_name}",
            "due_date": (datetime.now() + timedelta(days=days_ahead)).isoformat(),
            "tags": random.sample(subject_tags, min(3, len(subject_tags))),
            "grade": random.randint(60, 100),
            "weight": weight,
        }

        # ✅ Correct NEW endpoint
        response = requests.post(
            f"{BASE_URL}/assignments/user/{user_id}",
            json=assignment_data,
        )

        if response.status_code == 201:
            assignment = response.json()
            assignments.append(assignment)
            print(f"  ✓ Created assignment: {assignment['name']} (weight={weight}%)")
        else:
            print(f"  ✗ Failed to create assignment: {response.text}")

    return assignments


# =============================================================================
# WEIGHTED GRADE CHECK
# =============================================================================

def check_weighted_grade(user_id):
    """Call the weighted grade endpoint"""

    response = requests.get(
        f"{BASE_URL}/assignments/user/{user_id}/weighted-grade"
    )

    if response.status_code == 200:
        result = response.json()
        print(f"  📊 Weighted Grade: {result['weighted_grade']}")
    else:
        print(f"  ✗ Failed weighted grade check: {response.text}")


# =============================================================================
# MAIN GENERATION
# =============================================================================

def generate_all_sample_data():
    """Generate full sample dataset"""

    print("=" * 60)
    print("Study App Sample Data Generator (Updated)")
    print("=" * 60)

    print("\n📝 Creating users...")
    users = create_sample_users(count=3)

    if not users:
        print("❌ No users created. Make sure Flask is running.")
        return

    for user in users:
        print(f"\n👤 Setting up data for {user['display_name']}...")

        print("  📚 Creating notes...")
        create_sample_notes(user["id"], count=10)

        print("  📋 Creating assignments...")
        create_sample_assignments(user["id"], count=5)

        print("  📊 Checking weighted grade...")
        check_weighted_grade(user["id"])

    print("\n" + "=" * 60)
    print("✅ Sample data generation complete!")
    print("=" * 60)


# =============================================================================
# RUN SCRIPT
# =============================================================================

if __name__ == "__main__":
    try:
        response = requests.get(f"{BASE_URL}/health")

        if response.status_code == 200:
            generate_all_sample_data()
        else:
            print("❌ API is not responding correctly.")
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to API.")
        print("Start your Flask server first:")
        print("   python app.py")
