"""
Sample Data Generator for Study App
Generates realistic test data for development and testing
"""

import requests
import json
from datetime import datetime, timedelta
import random

BASE_URL = 'http://localhost:5000/api'

# Sample data
SUBJECTS = [
    'Object Oriented Programming',
    'Computer Vision and Imaging',
    'Security and Networks',
    'Database Systems',
    'Machine Learning',
    'Web Development',
    'Algorithms and Data Structures',
    'Software Engineering'
]

TAGS = {
    'Object Oriented Programming': ['OOP', 'Java', 'Python', 'Inheritance', 'Polymorphism'],
    'Computer Vision and Imaging': ['CVI', 'CNNs', 'Image Processing', 'OpenCV'],
    'Security and Networks': ['Security', 'Networking', 'Encryption', 'Protocols'],
    'Database Systems': ['SQL', 'NoSQL', 'Database', 'PostgreSQL', 'MongoDB'],
    'Machine Learning': ['ML', 'Neural Networks', 'Deep Learning', 'TensorFlow'],
    'Web Development': ['HTML', 'CSS', 'JavaScript', 'React', 'Node.js'],
    'Algorithms and Data Structures': ['Algorithms', 'Data Structures', 'Sorting', 'Trees'],
    'Software Engineering': ['SDLC', 'Agile', 'Testing', 'Design Patterns']
}

NOTE_TEMPLATES = [
    "Key concepts include {concepts}",
    "Important topics: {concepts}",
    "Study focus: {concepts}",
    "Review these concepts: {concepts}",
    "Core principles: {concepts}"
]


def create_sample_users(count=5):
    """Create sample users"""
    users = []
    
    for i in range(count):
        user_data = {
            'microsoft_id': f'ms_user_{i+1}',
            'email': f'student{i+1}@university.edu',
            'display_name': f'Student {i+1}'
        }
        
        response = requests.post(f'{BASE_URL}/users', json=user_data)
        if response.status_code in [200, 201]:
            user = response.json()
            users.append(user)
            print(f"✓ Created user: {user['email']}")
        else:
            print(f"✗ Failed to create user: {response.text}")
    
    return users


def create_sample_notes(user_id, count=20):
    """Create sample notes for a user"""
    notes = []
    
    for i in range(count):
        subject = random.choice(SUBJECTS)
        subject_tags = TAGS[subject]
        selected_tags = random.sample(subject_tags, min(3, len(subject_tags)))
        
        concepts = ', '.join(random.sample(subject_tags, min(3, len(subject_tags))))
        content_text = random.choice(NOTE_TEMPLATES).format(concepts=concepts)
        
        note_data = {
            'content': {
                'text': content_text,
                'examples': f'Example {i+1} for {subject}',
                'summary': f'Summary of {subject} concepts'
            },
            'subject': subject,
            'tags': selected_tags
        }
        
        response = requests.post(f'{BASE_URL}/users/{user_id}/notes', json=note_data)
        if response.status_code == 201:
            note = response.json()
            notes.append(note)
            print(f"  ✓ Created note: {note['subject']}")
        else:
            print(f"  ✗ Failed to create note: {response.text}")
    
    return notes


def create_sample_assignments(user_id, count=5):
    """Create sample assignments for a user"""
    assignments = []
    
    assignment_templates = [
        ('Final Exam', 45),
        ('Midterm Project', 30),
        ('Lab Assignment', 14),
        ('Research Paper', 21),
        ('Quiz', 7)
    ]
    
    for i in range(min(count, len(assignment_templates))):
        template_name, days_ahead = assignment_templates[i]
        subject = random.choice(SUBJECTS)
        subject_tags = TAGS[subject]
        
        assignment_data = {
            'name': f'{subject} - {template_name}',
            'due_date': (datetime.now() + timedelta(days=days_ahead)).isoformat(),
            'tags': random.sample(subject_tags, min(3, len(subject_tags))),
            'description': f'Complete the {template_name.lower()} for {subject}',
            'status': random.choice(['pending', 'in_progress']) if days_ahead > 7 else 'pending'
        }
        
        response = requests.post(f'{BASE_URL}/users/{user_id}/assignments', json=assignment_data)
        if response.status_code == 201:
            assignment = response.json()
            assignments.append(assignment)
            print(f"  ✓ Created assignment: {assignment['name']}")
        else:
            print(f"  ✗ Failed to create assignment: {response.text}")
    
    return assignments


def add_notes_to_spaced_repetition(user_id, notes, percentage=0.3):
    """Add some notes to spaced repetition"""
    sample_size = int(len(notes) * percentage)
    selected_notes = random.sample(notes, sample_size)
    
    for note in selected_notes:
        sr_data = {'note_id': note['id']}
        
        response = requests.post(
            f'{BASE_URL}/users/{user_id}/spaced-repetitions',
            json=sr_data
        )
        
        if response.status_code == 201:
            sr = response.json()
            print(f"  ✓ Added note to spaced repetition: {note['subject']}")
            
            # Simulate some reviews
            review_count = random.randint(1, 5)
            for _ in range(review_count):
                requests.post(f'{BASE_URL}/spaced-repetitions/{sr["id"]}/review')
        else:
            print(f"  ✗ Failed to add to spaced repetition: {response.text}")


def generate_study_plan(user_id):
    """Generate a study plan for a user"""
    plan_data = {
        'start_date': datetime.now().strftime('%Y-%m-%d')
    }
    
    response = requests.post(
        f'{BASE_URL}/users/{user_id}/study-plan/generate',
        json=plan_data
    )
    
    if response.status_code == 200:
        print(f"  ✓ Generated study plan")
    else:
        print(f"  ✗ Failed to generate study plan: {response.text}")


def generate_all_sample_data():
    """Generate complete sample dataset"""
    print("=" * 60)
    print("Study App Sample Data Generator")
    print("=" * 60)
    
    # Create users
    print("\n📝 Creating users...")
    users = create_sample_users(count=3)
    
    if not users:
        print("❌ Failed to create users. Make sure the Flask app is running.")
        return
    
    # For each user, create notes, assignments, and study plans
    for user in users:
        print(f"\n👤 Setting up data for {user['display_name']}...")
        
        # Create notes
        print("  📚 Creating notes...")
        notes = create_sample_notes(user['id'], count=15)
        
        # Create assignments
        print("  📋 Creating assignments...")
        assignments = create_sample_assignments(user['id'], count=5)
        
        # Add notes to spaced repetition
        if notes:
            print("  🔄 Adding notes to spaced repetition...")
            add_notes_to_spaced_repetition(user['id'], notes, percentage=0.4)
        
        # Generate study plan
        print("  📅 Generating study plan...")
        generate_study_plan(user['id'])
    
    print("\n" + "=" * 60)
    print("✅ Sample data generation complete!")
    print("=" * 60)
    print(f"\nCreated:")
    print(f"  - {len(users)} users")
    print(f"  - ~{len(users) * 15} notes")
    print(f"  - ~{len(users) * 5} assignments")
    print(f"  - {len(users)} study plans")
    print(f"  - Spaced repetitions for ~40% of notes")
    print("\nYou can now:")
    print("  1. Test the API endpoints")
    print("  2. Connect to Power BI")
    print("  3. Explore the database")
    print("\nDatabase location: study_app.db")


if __name__ == '__main__':
    try:
        # Test connection
        response = requests.get(f'{BASE_URL}/health')
        if response.status_code == 200:
            generate_all_sample_data()
        else:
            print("❌ Cannot connect to API. Make sure the Flask app is running on port 5000.")
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to API. Please start the Flask app first:")
        print("   python app.py")
