import requests
from datetime import datetime, timedelta
import random

BASE_URL = "http://localhost:5000/api"

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
        elif response.status_code == 409:
            # User already exists, try to get them
            print(f"  ⚠ User {user_data['email']} already exists, skipping...")
        else:
            print(f"✗ Failed to create user: {response.text}")

    return users

def create_sample_assignments(user_id, count=8):
    """
    Create assignments using the API.
    
    IMPORTANT: This creates tags automatically. Tags from assignments
    become available for use in notes.

    Fields:
    ✔ name
    ✔ due_date
    ✔ tags (auto-registered in Tags table)
    ✔ grade
    ✔ weight
    """

    assignments = []

    assignment_templates = [
        ("Final Exam", 45, 40, True),      
        ("Midterm Project", 30, 25, True),
        ("Lab Assignment 1", 14, 10, True),
        ("Lab Assignment 2", 21, 10, False),
        ("Research Paper", 28, 15, False),
        ("Quiz 1", 7, 5, True),
        ("Quiz 2", 10, 5, False),
        ("Homework", 5, 10, False),
    ]

    for i in range(min(count, len(assignment_templates))):
        template_name, days_ahead, weight, has_grade = assignment_templates[i]

        subject = SUBJECTS[i % len(SUBJECTS)]
        subject_tags = TAGS[subject]

        selected_tags = random.sample(subject_tags, min(3, len(subject_tags)))

        assignment_data = {
            "name": f"{subject} - {template_name}",
            "due_date": (datetime.now() + timedelta(days=days_ahead)).isoformat(),
            "tags": selected_tags,
            "weight": weight,
        }
        

        if has_grade:
            assignment_data["grade"] = random.randint(70, 100)

        response = requests.post(
            f"{BASE_URL}/assignments/user/{user_id}",
            json=assignment_data,
        )

        if response.status_code == 201:
            assignment = response.json()
            assignments.append(assignment)
            grade_str = f", grade={assignment_data.get('grade', 'N/A')}" if has_grade else ""
            print(f"  ✓ Created assignment: {assignment['name']} (weight={weight}%{grade_str})")
            print(f"    Tags registered: {selected_tags}")
        else:
            print(f"  ✗ Failed to create assignment: {response.text}")

    return assignments


def get_available_tags(user_id):
    """Get all available tags for a user (created from assignments)"""
    
    response = requests.get(f"{BASE_URL}/tags/user/{user_id}/names")
    
    if response.status_code == 200:
        result = response.json()
        return result.get('tags', [])
    else:
        print(f"  ✗ Failed to get tags: {response.text}")
        return []


def sync_tags_from_assignments(user_id):
    """Sync tags from existing assignments (useful for retroactive tag creation)"""
    
    response = requests.post(f"{BASE_URL}/tags/user/{user_id}/sync")
    
    if response.status_code == 200:
        result = response.json()
        print(f"  ✓ Tags synced: {result['total_tags']} total tags")
        if result['new_tags_created']:
            print(f"    New tags created: {result['new_tags_created']}")
        return result['all_tags']
    else:
        print(f"  ✗ Failed to sync tags: {response.text}")
        return []


def show_available_tags(user_id):
    """Display all available tags for a user"""
    
    response = requests.get(f"{BASE_URL}/tags/user/{user_id}")
    
    if response.status_code == 200:
        tags = response.json()
        print(f"  📏 Available tags ({len(tags)} total):")
        for tag in tags:
            source = f" (from assignment #{tag['source_assignment_id']})" if tag['source_assignment_id'] else ""
            print(f"    - {tag['name']}{source}")
        return tags
    else:
        print(f"  ✗ Failed to get tags: {response.text}")
        return []


def create_sample_notes(user_id, count=10):
    """
    Create sample notes for a user.
    
    IMPORTANT: Notes can only use tags that exist from assignments.
    This function first fetches available tags, then creates notes
    using only those valid tags.
    """
    
    available_tags = get_available_tags(user_id)
    
    if not available_tags:
        print("  ⚠ No tags available. Create assignments first!")
        return []
    
    print(f"  📏 Using {len(available_tags)} available tags: {available_tags[:5]}{'...' if len(available_tags) > 5 else ''}")
    
    notes = []

    for i in range(count):
        subject = random.choice(SUBJECTS)
        
        subject_related_tags = [t for t in available_tags if any(
            t.lower() in tag.lower() or tag.lower() in t.lower() 
            for tag in TAGS.get(subject, [])
        )]
        
        if not subject_related_tags:
            subject_related_tags = available_tags
        
        num_tags = min(random.randint(1, 3), len(subject_related_tags))
        selected_tags = random.sample(subject_related_tags, num_tags)
        
        concepts = ", ".join(selected_tags)
        content_text = random.choice(NOTE_TEMPLATES).format(concepts=concepts)

        note_data = {
            "content": {
                "title": f"{subject} - Note {i+1}",
                "body": content_text + f"\n\nSummary of {subject} concepts.\nExample {i+1} for {subject}.",
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
            print(f"  ✓ Created note: {note['subject']} (tags: {selected_tags})")
        else:
            print(f"  ✗ Failed to create note: {response.text}")

    return notes


def check_weighted_grade(user_id):
    """Call the weighted grade endpoint"""

    response = requests.get(
        f"{BASE_URL}/assignments/user/{user_id}/weighted-grade"
    )

    if response.status_code == 200:
        result = response.json()
        if result['weighted_grade'] is not None:
            print(f"Weighted Grade: {result['weighted_grade']}%")
        else:
            print(f"Weighted Grade: No graded assignments yet")
    else:
        print(f"  ✗ Failed weighted grade check: {response.text}")


def generate_all_sample_data():
    """
    Generate full sample dataset.
    
    ORDER MATTERS:
    1. Create users
    2. Create assignments (this registers tags)
    3. Create notes (using valid tags from assignments)
    """

    print("=" * 60)
    print("Study App Sample Data Generator (with Tags System)")
    print("=" * 60)

    print("\n📝 Creating users...")
    users = create_sample_users(count=3)

    if not users:
        print("No users created. Make sure Flask is running.")
        return

    for user in users:
        print(f"\n Setting up data for {user['display_name']}...")

        print("Creating assignments (this registers tags)...")
        create_sample_assignments(user["id"], count=8)

        print("Checking available tags...")
        show_available_tags(user["id"])

        print("Creating notes (using valid tags)...")
        create_sample_notes(user["id"], count=10)

        print("Checking weighted grade...")
        check_weighted_grade(user["id"])

    print("\n" + "=" * 60)
    print("Sample data generation complete!")
    print("=" * 60)


def generate_for_existing_user(user_id):
    """Generate sample data for an existing user"""
    
    print(f"Generating data for user ID: {user_id}")
    
    print("Syncing existing tags...")
    sync_tags_from_assignments(user_id)
    
    print("\n  📋 Creating assignments...")
    create_sample_assignments(user_id, count=5)
    
    print("\n  🏷️  Available tags:")
    show_available_tags(user_id)
    
    print("\n  📚 Creating notes...")
    create_sample_notes(user_id, count=8)

    print("\n  📊 Weighted grade:")
    check_weighted_grade(user_id)


if __name__ == "__main__":
    import sys
    
    try:
        response = requests.get(f"{BASE_URL}/health")

        if response.status_code == 200:
            if len(sys.argv) > 1:
                try:
                    user_id = int(sys.argv[1])
                    generate_for_existing_user(user_id)
                except ValueError:
                    print(f"Invalid user ID: {sys.argv[1]}")
            else:
                generate_all_sample_data()
        else:
            print("API is not responding correctly.")
    except requests.exceptions.ConnectionError:
        print("Cannot connect to API.")
        print("Start your Flask server first:")
        print("   python app.py")
