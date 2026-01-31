import unittest
import json
from datetime import datetime, timedelta
from app import app, db, User, Note, StudyPlan, SpacedRepetition, Assignment


class StudyAppTestCase(unittest.TestCase):
    """Test case for Study App API"""
    
    def setUp(self):
        """Set up test client and database"""
        app.config['TESTING'] = True
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        self.app = app
        self.client = app.test_client()
        
        with app.app_context():
            db.create_all()
    
    def tearDown(self):
        """Clean up after tests"""
        with app.app_context():
            db.session.remove()
            db.drop_all()
    
    def test_health_check(self):
        """Test health check endpoint"""
        response = self.client.get('/api/health')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['status'], 'healthy')
    
    def test_create_user(self):
        """Test user creation"""
        user_data = {
            'microsoft_id': 'ms_test_123',
            'email': 'test@example.com',
            'display_name': 'Test User'
        }
        
        response = self.client.post(
            '/api/users',
            data=json.dumps(user_data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        self.assertEqual(data['email'], 'test@example.com')
        self.assertEqual(data['microsoft_id'], 'ms_test_123')
    
    def test_create_duplicate_user(self):
        """Test that duplicate users are rejected"""
        user_data = {
            'microsoft_id': 'ms_test_123',
            'email': 'test@example.com',
            'display_name': 'Test User'
        }
        
        # Create first user
        self.client.post(
            '/api/users',
            data=json.dumps(user_data),
            content_type='application/json'
        )
        
        # Try to create duplicate
        response = self.client.post(
            '/api/users',
            data=json.dumps(user_data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 409)
    
    def test_create_note(self):
        """Test note creation"""
        # First create a user
        user_data = {
            'microsoft_id': 'ms_test_123',
            'email': 'test@example.com',
            'display_name': 'Test User'
        }
        user_response = self.client.post(
            '/api/users',
            data=json.dumps(user_data),
            content_type='application/json'
        )
        user_id = json.loads(user_response.data)['id']
        
        # Create a note
        note_data = {
            'content': {'text': 'Test note content'},
            'subject': 'Test Subject',
            'tags': ['test', 'sample']
        }
        
        response = self.client.post(
            f'/api/users/{user_id}/notes',
            data=json.dumps(note_data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        self.assertEqual(data['subject'], 'Test Subject')
        self.assertEqual(data['tags'], ['test', 'sample'])
    
    def test_get_user_notes(self):
        """Test retrieving user notes"""
        # Create user
        user_data = {
            'microsoft_id': 'ms_test_123',
            'email': 'test@example.com',
            'display_name': 'Test User'
        }
        user_response = self.client.post(
            '/api/users',
            data=json.dumps(user_data),
            content_type='application/json'
        )
        user_id = json.loads(user_response.data)['id']
        
        # Create multiple notes
        for i in range(3):
            note_data = {
                'content': {'text': f'Note {i}'},
                'subject': f'Subject {i}',
                'tags': ['test']
            }
            self.client.post(
                f'/api/users/{user_id}/notes',
                data=json.dumps(note_data),
                content_type='application/json'
            )
        
        # Get all notes
        response = self.client.get(f'/api/users/{user_id}/notes')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(len(data), 3)
    
    def test_create_assignment(self):
        """Test assignment creation"""
        # Create user
        user_data = {
            'microsoft_id': 'ms_test_123',
            'email': 'test@example.com',
            'display_name': 'Test User'
        }
        user_response = self.client.post(
            '/api/users',
            data=json.dumps(user_data),
            content_type='application/json'
        )
        user_id = json.loads(user_response.data)['id']
        
        # Create assignment
        assignment_data = {
            'name': 'Test Assignment',
            'due_date': (datetime.now() + timedelta(days=30)).isoformat(),
            'tags': ['test', 'assignment'],
            'description': 'Test description'
        }
        
        response = self.client.post(
            f'/api/users/{user_id}/assignments',
            data=json.dumps(assignment_data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        self.assertEqual(data['name'], 'Test Assignment')
        self.assertEqual(data['tags'], ['test', 'assignment'])
    
    def test_generate_study_plan(self):
        """Test study plan generation"""
        # Create user
        user_data = {
            'microsoft_id': 'ms_test_123',
            'email': 'test@example.com',
            'display_name': 'Test User'
        }
        user_response = self.client.post(
            '/api/users',
            data=json.dumps(user_data),
            content_type='application/json'
        )
        user_id = json.loads(user_response.data)['id']
        
        # Create notes with tags
        for i in range(5):
            note_data = {
                'content': {'text': f'Note {i}'},
                'subject': f'Subject {i}',
                'tags': ['OOP', 'Java'] if i % 2 == 0 else ['Security']
            }
            self.client.post(
                f'/api/users/{user_id}/notes',
                data=json.dumps(note_data),
                content_type='application/json'
            )
        
        # Create assignment with OOP tag
        assignment_data = {
            'name': 'OOP Exam',
            'due_date': (datetime.now() + timedelta(days=15)).isoformat(),
            'tags': ['OOP', 'Java']
        }
        self.client.post(
            f'/api/users/{user_id}/assignments',
            data=json.dumps(assignment_data),
            content_type='application/json'
        )
        
        # Generate study plan
        plan_data = {
            'start_date': datetime.now().strftime('%Y-%m-%d')
        }
        response = self.client.post(
            f'/api/users/{user_id}/study-plan/generate',
            data=json.dumps(plan_data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('study_plan', data)
        
        # Verify study plan has entries
        study_plan = data['study_plan']
        self.assertTrue(len(study_plan) > 0)
    
    def test_spaced_repetition(self):
        """Test spaced repetition functionality"""
        # Create user
        user_data = {
            'microsoft_id': 'ms_test_123',
            'email': 'test@example.com',
            'display_name': 'Test User'
        }
        user_response = self.client.post(
            '/api/users',
            data=json.dumps(user_data),
            content_type='application/json'
        )
        user_id = json.loads(user_response.data)['id']
        
        # Create note
        note_data = {
            'content': {'text': 'Test note'},
            'subject': 'Test Subject',
            'tags': ['test']
        }
        note_response = self.client.post(
            f'/api/users/{user_id}/notes',
            data=json.dumps(note_data),
            content_type='application/json'
        )
        note_id = json.loads(note_response.data)['id']
        
        # Add to spaced repetition
        sr_data = {'note_id': note_id}
        response = self.client.post(
            f'/api/users/{user_id}/spaced-repetitions',
            data=json.dumps(sr_data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        self.assertEqual(data['note_id'], note_id)
        self.assertEqual(data['revision_count'], 0)
        
        # Mark as reviewed
        sr_id = data['id']
        review_response = self.client.post(
            f'/api/spaced-repetitions/{sr_id}/review',
            content_type='application/json'
        )
        
        self.assertEqual(review_response.status_code, 200)
        review_data = json.loads(review_response.data)
        self.assertEqual(review_data['revision_count'], 1)


if __name__ == '__main__':
    unittest.main()
