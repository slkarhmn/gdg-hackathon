from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
from typing import List, Dict
import json
import os

app = Flask(__name__)

# Database configuration
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'study_app.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JSON_SORT_KEYS'] = False

db = SQLAlchemy(app)

# =============================================================================
# MODELS
# =============================================================================

class User(db.Model):
    """User table storing Microsoft authentication data"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    microsoft_id = db.Column(db.String(255), unique=True, nullable=False, index=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    display_name = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    notes = db.relationship('Note', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    study_plan = db.relationship('StudyPlan', backref='user', uselist=False, cascade='all, delete-orphan')
    spaced_repetitions = db.relationship('SpacedRepetition', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    assignments = db.relationship('Assignment', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'microsoft_id': self.microsoft_id,
            'email': self.email,
            'display_name': self.display_name,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None
        }


class Note(db.Model):
    """Notes table with JSON content and metadata"""
    __tablename__ = 'notes'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    content = db.Column(db.Text, nullable=False)  # JSON formatted content
    subject = db.Column(db.String(255))
    tags = db.Column(db.Text)  # JSON array of tags
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'content': json.loads(self.content) if self.content else {},
            'subject': self.subject,
            'tags': json.loads(self.tags) if self.tags else [],
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class StudyPlan(db.Model):
    """Study plan table - one per user, contains monthly schedule"""
    __tablename__ = 'study_plans'
    
    plan_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True, index=True)
    study_plan = db.Column(db.Text, nullable=False)  # JSON formatted monthly plan
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'plan_id': self.plan_id,
            'user_id': self.user_id,
            'study_plan': json.loads(self.study_plan) if self.study_plan else {},
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class SpacedRepetition(db.Model):
    """Spaced repetition tracking for notes"""
    __tablename__ = 'spaced_repetitions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    note_id = db.Column(db.Integer, db.ForeignKey('notes.id'), nullable=False, index=True)
    repetition_dates = db.Column(db.Text)  # JSON array of dates when note appears in study plan
    revision_count = db.Column(db.Integer, default=0)
    next_review_date = db.Column(db.DateTime, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship to note
    note = db.relationship('Note', backref='spaced_repetitions')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'note_id': self.note_id,
            'repetition_dates': json.loads(self.repetition_dates) if self.repetition_dates else [],
            'revision_count': self.revision_count,
            'next_review_date': self.next_review_date.isoformat() if self.next_review_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Assignment(db.Model):
    """Assignments table with due dates and tags"""
    __tablename__ = 'assignments'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    due_date = db.Column(db.DateTime, nullable=False, index=True)
    tags = db.Column(db.Text)  # JSON array of tags
    description = db.Column(db.Text)
    status = db.Column(db.String(50), default='pending')  # pending, in_progress, completed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'tags': json.loads(self.tags) if self.tags else [],
            'description': self.description,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


# =============================================================================
# API ENDPOINTS - USERS
# =============================================================================

@app.route('/api/users', methods=['POST'])
def create_user():
    """Create a new user"""
    data = request.get_json()
    
    if not data or 'microsoft_id' not in data or 'email' not in data:
        return jsonify({'error': 'microsoft_id and email are required'}), 400
    
    # Check if user already exists
    existing_user = User.query.filter_by(microsoft_id=data['microsoft_id']).first()
    if existing_user:
        return jsonify({'error': 'User already exists'}), 409
    
    user = User(
        microsoft_id=data['microsoft_id'],
        email=data['email'],
        display_name=data.get('display_name', '')
    )
    
    db.session.add(user)
    db.session.commit()
    
    return jsonify(user.to_dict()), 201


@app.route('/api/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    """Get user by ID"""
    user = User.query.get_or_404(user_id)
    return jsonify(user.to_dict())


@app.route('/api/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    """Update user information"""
    user = User.query.get_or_404(user_id)
    data = request.get_json()
    
    if 'display_name' in data:
        user.display_name = data['display_name']
    if 'last_login' in data:
        user.last_login = datetime.utcnow()
    
    db.session.commit()
    return jsonify(user.to_dict())


# =============================================================================
# API ENDPOINTS - NOTES
# =============================================================================

@app.route('/api/users/<int:user_id>/notes', methods=['POST'])
def create_note(user_id):
    """Create a new note for a user"""
    user = User.query.get_or_404(user_id)
    data = request.get_json()
    
    if not data or 'content' not in data:
        return jsonify({'error': 'content is required'}), 400
    
    note = Note(
        user_id=user_id,
        content=json.dumps(data['content']),
        subject=data.get('subject', ''),
        tags=json.dumps(data.get('tags', []))
    )
    
    db.session.add(note)
    db.session.commit()
    
    return jsonify(note.to_dict()), 201


@app.route('/api/users/<int:user_id>/notes', methods=['GET'])
def get_user_notes(user_id):
    """Get all notes for a user with optional filtering"""
    user = User.query.get_or_404(user_id)
    
    # Optional filters
    subject = request.args.get('subject')
    tag = request.args.get('tag')
    
    query = user.notes
    
    if subject:
        query = query.filter(Note.subject.like(f'%{subject}%'))
    
    notes = query.all()
    
    # Filter by tag if specified
    if tag:
        notes = [n for n in notes if tag in json.loads(n.tags)]
    
    return jsonify([note.to_dict() for note in notes])


@app.route('/api/notes/<int:note_id>', methods=['GET'])
def get_note(note_id):
    """Get a specific note"""
    note = Note.query.get_or_404(note_id)
    return jsonify(note.to_dict())


@app.route('/api/notes/<int:note_id>', methods=['PUT'])
def update_note(note_id):
    """Update a note"""
    note = Note.query.get_or_404(note_id)
    data = request.get_json()
    
    if 'content' in data:
        note.content = json.dumps(data['content'])
    if 'subject' in data:
        note.subject = data['subject']
    if 'tags' in data:
        note.tags = json.dumps(data['tags'])
    
    note.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify(note.to_dict())


@app.route('/api/notes/<int:note_id>', methods=['DELETE'])
def delete_note(note_id):
    """Delete a note"""
    note = Note.query.get_or_404(note_id)
    db.session.delete(note)
    db.session.commit()
    
    return jsonify({'message': 'Note deleted successfully'}), 200


# =============================================================================
# API ENDPOINTS - STUDY PLANS
# =============================================================================

@app.route('/api/users/<int:user_id>/study-plan', methods=['POST'])
def create_study_plan(user_id):
    """Create or update study plan for a user"""
    user = User.query.get_or_404(user_id)
    data = request.get_json()
    
    if not data or 'study_plan' not in data:
        return jsonify({'error': 'study_plan is required'}), 400
    
    # Check if user already has a study plan
    existing_plan = StudyPlan.query.filter_by(user_id=user_id).first()
    
    if existing_plan:
        # Update existing plan
        existing_plan.study_plan = json.dumps(data['study_plan'])
        existing_plan.updated_at = datetime.utcnow()
        db.session.commit()
        return jsonify(existing_plan.to_dict())
    else:
        # Create new plan
        study_plan = StudyPlan(
            user_id=user_id,
            study_plan=json.dumps(data['study_plan'])
        )
        db.session.add(study_plan)
        db.session.commit()
        return jsonify(study_plan.to_dict()), 201


@app.route('/api/users/<int:user_id>/study-plan', methods=['GET'])
def get_study_plan(user_id):
    """Get study plan for a user"""
    user = User.query.get_or_404(user_id)
    study_plan = StudyPlan.query.filter_by(user_id=user_id).first()
    
    if not study_plan:
        return jsonify({'error': 'Study plan not found'}), 404
    
    return jsonify(study_plan.to_dict())


@app.route('/api/users/<int:user_id>/study-plan/generate', methods=['POST'])
def generate_study_plan(user_id):
    """Generate a monthly study plan prioritizing assignments"""
    user = User.query.get_or_404(user_id)
    data = request.get_json()
    
    start_date_str = data.get('start_date', datetime.now().strftime('%Y-%m-%d'))
    start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
    
    # Get all notes and assignments for the user
    notes = Note.query.filter_by(user_id=user_id).all()
    assignments = Assignment.query.filter_by(user_id=user_id).filter(
        Assignment.due_date >= start_date
    ).all()
    
    # Generate monthly plan
    monthly_plan = generate_monthly_plan_logic(
        start_date=start_date,
        notes=notes,
        assignments=assignments
    )
    
    # Save or update the study plan
    existing_plan = StudyPlan.query.filter_by(user_id=user_id).first()
    
    if existing_plan:
        existing_plan.study_plan = json.dumps(monthly_plan)
        existing_plan.updated_at = datetime.utcnow()
    else:
        existing_plan = StudyPlan(
            user_id=user_id,
            study_plan=json.dumps(monthly_plan)
        )
        db.session.add(existing_plan)
    
    db.session.commit()
    return jsonify(existing_plan.to_dict())


# =============================================================================
# API ENDPOINTS - SPACED REPETITION
# =============================================================================

@app.route('/api/users/<int:user_id>/spaced-repetitions', methods=['POST'])
def add_to_spaced_repetition(user_id):
    """Add a note to spaced repetition"""
    user = User.query.get_or_404(user_id)
    data = request.get_json()
    
    if not data or 'note_id' not in data:
        return jsonify({'error': 'note_id is required'}), 400
    
    note_id = data['note_id']
    note = Note.query.get_or_404(note_id)
    
    # Check if this note is already in spaced repetition for this user
    existing = SpacedRepetition.query.filter_by(
        user_id=user_id,
        note_id=note_id
    ).first()
    
    if existing:
        return jsonify({'error': 'Note already in spaced repetition'}), 409
    
    # Calculate next review date (using spaced repetition algorithm)
    next_review = datetime.utcnow() + timedelta(days=1)
    
    spaced_rep = SpacedRepetition(
        user_id=user_id,
        note_id=note_id,
        repetition_dates=json.dumps([]),
        revision_count=0,
        next_review_date=next_review
    )
    
    db.session.add(spaced_rep)
    db.session.commit()
    
    return jsonify(spaced_rep.to_dict()), 201


@app.route('/api/users/<int:user_id>/spaced-repetitions', methods=['GET'])
def get_spaced_repetitions(user_id):
    """Get all spaced repetitions for a user"""
    user = User.query.get_or_404(user_id)
    spaced_reps = SpacedRepetition.query.filter_by(user_id=user_id).all()
    
    return jsonify([sr.to_dict() for sr in spaced_reps])


@app.route('/api/spaced-repetitions/<int:rep_id>/review', methods=['POST'])
def mark_reviewed(rep_id):
    """Mark a spaced repetition as reviewed and update schedule"""
    spaced_rep = SpacedRepetition.query.get_or_404(rep_id)
    data = request.get_json()
    
    # Update revision count
    spaced_rep.revision_count += 1
    
    # Add current date to repetition dates
    rep_dates = json.loads(spaced_rep.repetition_dates) if spaced_rep.repetition_dates else []
    rep_dates.append(datetime.utcnow().isoformat())
    spaced_rep.repetition_dates = json.dumps(rep_dates)
    
    # Calculate next review date based on spaced repetition intervals
    # Intervals: 1 day, 3 days, 7 days, 14 days, 30 days, etc.
    intervals = [1, 3, 7, 14, 30, 60, 90]
    interval_index = min(spaced_rep.revision_count - 1, len(intervals) - 1)
    next_interval = intervals[interval_index]
    
    spaced_rep.next_review_date = datetime.utcnow() + timedelta(days=next_interval)
    
    db.session.commit()
    
    return jsonify(spaced_rep.to_dict())


# =============================================================================
# API ENDPOINTS - ASSIGNMENTS
# =============================================================================

@app.route('/api/users/<int:user_id>/assignments', methods=['POST'])
def create_assignment(user_id):
    """Create a new assignment"""
    user = User.query.get_or_404(user_id)
    data = request.get_json()
    
    if not data or 'name' not in data or 'due_date' not in data:
        return jsonify({'error': 'name and due_date are required'}), 400
    
    due_date = datetime.fromisoformat(data['due_date'].replace('Z', '+00:00'))
    
    assignment = Assignment(
        user_id=user_id,
        name=data['name'],
        due_date=due_date,
        tags=json.dumps(data.get('tags', [])),
        description=data.get('description', ''),
        status=data.get('status', 'pending')
    )
    
    db.session.add(assignment)
    db.session.commit()
    
    return jsonify(assignment.to_dict()), 201


@app.route('/api/users/<int:user_id>/assignments', methods=['GET'])
def get_assignments(user_id):
    """Get all assignments for a user"""
    user = User.query.get_or_404(user_id)
    
    # Optional filters
    status = request.args.get('status')
    upcoming = request.args.get('upcoming', 'false').lower() == 'true'
    
    query = Assignment.query.filter_by(user_id=user_id)
    
    if status:
        query = query.filter_by(status=status)
    
    if upcoming:
        query = query.filter(Assignment.due_date >= datetime.utcnow())
    
    assignments = query.order_by(Assignment.due_date).all()
    
    return jsonify([a.to_dict() for a in assignments])


@app.route('/api/assignments/<int:assignment_id>', methods=['PUT'])
def update_assignment(assignment_id):
    """Update an assignment"""
    assignment = Assignment.query.get_or_404(assignment_id)
    data = request.get_json()
    
    if 'name' in data:
        assignment.name = data['name']
    if 'due_date' in data:
        assignment.due_date = datetime.fromisoformat(data['due_date'].replace('Z', '+00:00'))
    if 'tags' in data:
        assignment.tags = json.dumps(data['tags'])
    if 'description' in data:
        assignment.description = data['description']
    if 'status' in data:
        assignment.status = data['status']
    
    db.session.commit()
    
    return jsonify(assignment.to_dict())


@app.route('/api/assignments/<int:assignment_id>', methods=['DELETE'])
def delete_assignment(assignment_id):
    """Delete an assignment"""
    assignment = Assignment.query.get_or_404(assignment_id)
    db.session.delete(assignment)
    db.session.commit()
    
    return jsonify({'message': 'Assignment deleted successfully'}), 200


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def generate_monthly_plan_logic(start_date, notes, assignments):
    """
    Generate a monthly study plan that prioritizes notes with tags
    matching assignments due within the next month
    """
    monthly_plan = {}
    
    # Get assignments due in the next month
    end_date = start_date + timedelta(days=30)
    upcoming_assignments = [
        a for a in assignments 
        if start_date <= a.due_date <= end_date
    ]
    
    # Extract priority tags from upcoming assignments
    priority_tags = set()
    for assignment in upcoming_assignments:
        tags = json.loads(assignment.tags) if assignment.tags else []
        priority_tags.update(tags)
    
    # Categorize notes by whether they match priority tags
    priority_notes = []
    regular_notes = []
    
    for note in notes:
        note_tags = json.loads(note.tags) if note.tags else []
        if any(tag in priority_tags for tag in note_tags):
            priority_notes.append(note)
        else:
            regular_notes.append(note)
    
    # Generate schedule for 30 days
    time_slots = ["09:00", "11:00", "14:00", "16:00", "19:00"]
    
    priority_index = 0
    regular_index = 0
    
    for day_offset in range(30):
        current_date = start_date + timedelta(days=day_offset)
        date_str = current_date.strftime('%m/%d/%Y')
        
        monthly_plan[date_str] = {}
        
        # Determine ratio of priority to regular notes based on proximity to assignments
        days_to_nearest_assignment = min(
            [(a.due_date - current_date).days for a in upcoming_assignments],
            default=30
        )
        
        # Closer to assignment = more priority notes
        if days_to_nearest_assignment <= 7:
            priority_slots = 4  # 4 out of 5 slots for priority notes
        elif days_to_nearest_assignment <= 14:
            priority_slots = 3  # 3 out of 5 slots
        elif days_to_nearest_assignment <= 21:
            priority_slots = 2  # 2 out of 5 slots
        else:
            priority_slots = 1  # 1 out of 5 slots
        
        for slot_index, time_slot in enumerate(time_slots):
            # Decide whether to use priority or regular note
            if slot_index < priority_slots and priority_notes:
                note = priority_notes[priority_index % len(priority_notes)]
                priority_index += 1
            elif regular_notes:
                note = regular_notes[regular_index % len(regular_notes)]
                regular_index += 1
            else:
                # Fall back to priority notes if no regular notes
                if priority_notes:
                    note = priority_notes[priority_index % len(priority_notes)]
                    priority_index += 1
                else:
                    continue
            
            note_tags = json.loads(note.tags) if note.tags else []
            
            monthly_plan[date_str][time_slot] = {
                "subject": [note.subject or "Study Session"],
                "tags": note_tags,
                "associated_notes": [note.id]
            }
    
    return monthly_plan


# =============================================================================
# DATABASE INITIALIZATION
# =============================================================================

@app.route('/api/init-db', methods=['POST'])
def init_database():
    """Initialize the database (use with caution in production)"""
    db.create_all()
    return jsonify({'message': 'Database initialized successfully'}), 200


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'timestamp': datetime.utcnow().isoformat()}), 200


# =============================================================================
# MAIN
# =============================================================================

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, host='0.0.0.0', port=5000)
