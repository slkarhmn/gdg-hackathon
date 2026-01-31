from flask import Flask, request
from flask_sqlalchemy import SQLAlchemy
from flask_restx import Api, Resource, fields, Namespace
from flask_cors import CORS
from datetime import datetime, timedelta
import json
import os

app = Flask(__name__)
CORS(app)

# Database configuration
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'study_app.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JSON_SORT_KEYS'] = False
app.config['RESTX_MASK_SWAGGER'] = False

# Initialize API with Swagger
api = Api(
    app,
    version='1.0',
    title='Study App API',
    description='REST API for managing study notes, plans, spaced repetition, and assignments',
    doc='/api/docs'  # Swagger UI will be at /api/docs
)

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
    content = db.Column(db.Text, nullable=False)
    subject = db.Column(db.String(255))
    tags = db.Column(db.Text)
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
    study_plan = db.Column(db.Text, nullable=False)
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
    repetition_dates = db.Column(db.Text)
    revision_count = db.Column(db.Integer, default=0)
    next_review_date = db.Column(db.DateTime, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
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
    """Assignments table with due dates, tags, grades, and weights"""
    __tablename__ = 'assignments'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)

    name = db.Column(db.String(255), nullable=False)
    due_date = db.Column(db.DateTime, nullable=False, index=True)

    tags = db.Column(db.Text)

    grade = db.Column(db.Float)  # Can be null until graded
    weight = db.Column(db.Float, nullable=False, default=0)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "tags": json.loads(self.tags) if self.tags else [],
            "grade": self.grade,
            "weight": self.weight,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }



# =============================================================================
# API MODELS (for Swagger documentation)
# =============================================================================

# Namespaces
ns_users = Namespace('users', description='User operations')
ns_notes = Namespace('notes', description='Note operations')
ns_study_plans = Namespace('study-plans', description='Study plan operations')
ns_spaced_reps = Namespace('spaced-repetitions', description='Spaced repetition operations')
ns_assignments = Namespace('assignments', description='Assignment operations')

api.add_namespace(ns_users, path='/api/users')
api.add_namespace(ns_notes, path='/api/notes')
api.add_namespace(ns_study_plans, path='/api/study-plans')
api.add_namespace(ns_spaced_reps, path='/api/spaced-repetitions')
api.add_namespace(ns_assignments, path='/api/assignments')

# User models
user_input = api.model('UserInput', {
    'microsoft_id': fields.String(required=True, description='Microsoft account ID'),
    'email': fields.String(required=True, description='User email address'),
    'display_name': fields.String(description='User display name')
})

user_output = api.model('User', {
    'id': fields.Integer(description='User ID'),
    'microsoft_id': fields.String(description='Microsoft account ID'),
    'email': fields.String(description='Email address'),
    'display_name': fields.String(description='Display name'),
    'created_at': fields.String(description='Creation timestamp'),
    'last_login': fields.String(description='Last login timestamp')
})

# Note models
note_input = api.model('NoteInput', {
    'content': fields.Raw(required=True, description='Note content (JSON object)'),
    'subject': fields.String(description='Note subject'),
    'tags': fields.List(fields.String, description='Tags')
})

note_output = api.model('Note', {
    'id': fields.Integer(description='Note ID'),
    'user_id': fields.Integer(description='User ID'),
    'content': fields.Raw(description='Note content'),
    'subject': fields.String(description='Subject'),
    'tags': fields.List(fields.String, description='Tags'),
    'created_at': fields.String(description='Creation timestamp'),
    'updated_at': fields.String(description='Update timestamp')
})

# Study plan models
study_plan_input = api.model('StudyPlanInput', {
    'study_plan': fields.Raw(required=True, description='Monthly study plan (JSON object)')
})

study_plan_output = api.model('StudyPlan', {
    'plan_id': fields.Integer(description='Plan ID'),
    'user_id': fields.Integer(description='User ID'),
    'study_plan': fields.Raw(description='Study plan data'),
    'created_at': fields.String(description='Creation timestamp'),
    'updated_at': fields.String(description='Update timestamp')
})

generate_plan_input = api.model('GeneratePlanInput', {
    'start_date': fields.String(required=True, description='Start date (YYYY-MM-DD)', example='2026-02-01')
})

# Assignment models
assignment_input = api.model('AssignmentInput', {
    'name': fields.String(required=True, description='Assignment name'),
    'due_date': fields.String(required=True, description='Due date (ISO format)'),
    'tags': fields.List(fields.String, description='Tags'),
    'grade': fields.Float(description='Grade received (0–100)'),
    'weight': fields.Float(required=True, description='Weight percentage of assignment')
})

assignment_output = api.model('Assignment', {
    'id': fields.Integer(description='Assignment ID'),
    'user_id': fields.Integer(description='User ID'),
    'name': fields.String(description='Name'),
    'due_date': fields.String(description='Due date'),
    'tags': fields.List(fields.String, description='Tags'),
    'grade': fields.Float(description='Grade received'),
    'weight': fields.Float(description='Weight percentage'),

    'created_at': fields.String(description='Creation timestamp')
})


# Spaced repetition models
spaced_rep_input = api.model('SpacedRepInput', {
    'note_id': fields.Integer(required=True, description='Note ID to add to spaced repetition')
})

spaced_rep_output = api.model('SpacedRepetition', {
    'id': fields.Integer(description='Spaced repetition ID'),
    'user_id': fields.Integer(description='User ID'),
    'note_id': fields.Integer(description='Note ID'),
    'repetition_dates': fields.List(fields.String, description='Review dates'),
    'revision_count': fields.Integer(description='Number of revisions'),
    'next_review_date': fields.String(description='Next review date'),
    'created_at': fields.String(description='Creation timestamp')
})


# =============================================================================
# API ENDPOINTS - USERS
# =============================================================================

@ns_users.route('')
class UserList(Resource):
    @ns_users.doc('create_user')
    @ns_users.expect(user_input)
    @ns_users.marshal_with(user_output, code=201)
    def post(self):
        """Create a new user"""
        data = request.json
        
        if not data or 'microsoft_id' not in data or 'email' not in data:
            api.abort(400, 'microsoft_id and email are required')
        
        existing_user = User.query.filter_by(microsoft_id=data['microsoft_id']).first()
        if existing_user:
            api.abort(409, 'User already exists')
        
        user = User(
            microsoft_id=data['microsoft_id'],
            email=data['email'],
            display_name=data.get('display_name', '')
        )
        
        db.session.add(user)
        db.session.commit()
        
        return user.to_dict(), 201


@ns_users.route('/<int:user_id>')
@ns_users.param('user_id', 'The user identifier')
class UserResource(Resource):
    @ns_users.doc('get_user')
    @ns_users.marshal_with(user_output)
    def get(self, user_id):
        """Get user by ID"""
        user = User.query.get_or_404(user_id)
        return user.to_dict()
    
    @ns_users.doc('update_user')
    @ns_users.expect(user_input)
    @ns_users.marshal_with(user_output)
    def put(self, user_id):
        """Update user information"""
        user = User.query.get_or_404(user_id)
        data = request.json
        
        if 'display_name' in data:
            user.display_name = data['display_name']
        user.last_login = datetime.utcnow()
        
        db.session.commit()
        return user.to_dict()


@ns_users.route('/<int:user_id>/notes')
@ns_users.param('user_id', 'The user identifier')
class UserNoteList(Resource):
    @ns_users.doc('get_user_notes')
    @ns_users.marshal_list_with(note_output)
    @ns_users.param('subject', 'Filter by subject')
    @ns_users.param('tag', 'Filter by tag')
    def get(self, user_id):
        """Get all notes for a user"""
        user = User.query.get_or_404(user_id)
        
        subject = request.args.get('subject')
        tag = request.args.get('tag')
        
        query = user.notes
        
        if subject:
            query = query.filter(Note.subject.like(f'%{subject}%'))
        
        notes = query.all()
        
        if tag:
            notes = [n for n in notes if tag in json.loads(n.tags)]
        
        return [note.to_dict() for note in notes]
    
    @ns_users.doc('create_note')
    @ns_users.expect(note_input)
    @ns_users.marshal_with(note_output, code=201)
    def post(self, user_id):
        """Create a new note for a user"""
        user = User.query.get_or_404(user_id)
        data = request.json
        
        if not data or 'content' not in data:
            api.abort(400, 'content is required')
        
        note = Note(
            user_id=user_id,
            content=json.dumps(data['content']),
            subject=data.get('subject', ''),
            tags=json.dumps(data.get('tags', []))
        )
        
        db.session.add(note)
        db.session.commit()
        
        return note.to_dict(), 201


# =============================================================================
# API ENDPOINTS - NOTES
# =============================================================================

@ns_notes.route('/<int:note_id>')
@ns_notes.param('note_id', 'The note identifier')
class NoteResource(Resource):
    @ns_notes.doc('get_note')
    @ns_notes.marshal_with(note_output)
    def get(self, note_id):
        """Get a specific note"""
        note = Note.query.get_or_404(note_id)
        return note.to_dict()
    
    @ns_notes.doc('update_note')
    @ns_notes.expect(note_input)
    @ns_notes.marshal_with(note_output)
    def put(self, note_id):
        """Update a note"""
        note = Note.query.get_or_404(note_id)
        data = request.json
        
        if 'content' in data:
            note.content = json.dumps(data['content'])
        if 'subject' in data:
            note.subject = data['subject']
        if 'tags' in data:
            note.tags = json.dumps(data['tags'])
        
        note.updated_at = datetime.utcnow()
        db.session.commit()
        
        return note.to_dict()
    
    @ns_notes.doc('delete_note')
    @ns_notes.response(200, 'Note deleted')
    def delete(self, note_id):
        """Delete a note"""
        note = Note.query.get_or_404(note_id)
        db.session.delete(note)
        db.session.commit()
        
        return {'message': 'Note deleted successfully'}, 200


# =============================================================================
# API ENDPOINTS - STUDY PLANS
# =============================================================================

@ns_study_plans.route('/user/<int:user_id>')
@ns_study_plans.param('user_id', 'The user identifier')
class StudyPlanResource(Resource):
    @ns_study_plans.doc('get_study_plan')
    @ns_study_plans.marshal_with(study_plan_output)
    def get(self, user_id):
        """Get study plan for a user"""
        user = User.query.get_or_404(user_id)
        study_plan = StudyPlan.query.filter_by(user_id=user_id).first()
        
        if not study_plan:
            api.abort(404, 'Study plan not found')
        
        return study_plan.to_dict()
    
    @ns_study_plans.doc('create_or_update_study_plan')
    @ns_study_plans.expect(study_plan_input)
    @ns_study_plans.marshal_with(study_plan_output)
    def post(self, user_id):
        """Create or update study plan for a user"""
        user = User.query.get_or_404(user_id)
        data = request.json
        
        if not data or 'study_plan' not in data:
            api.abort(400, 'study_plan is required')
        
        existing_plan = StudyPlan.query.filter_by(user_id=user_id).first()
        
        if existing_plan:
            existing_plan.study_plan = json.dumps(data['study_plan'])
            existing_plan.updated_at = datetime.utcnow()
            db.session.commit()
            return existing_plan.to_dict()
        else:
            study_plan = StudyPlan(
                user_id=user_id,
                study_plan=json.dumps(data['study_plan'])
            )
            db.session.add(study_plan)
            db.session.commit()
            return study_plan.to_dict(), 201


@ns_study_plans.route('/user/<int:user_id>/generate')
@ns_study_plans.param('user_id', 'The user identifier')
class GenerateStudyPlan(Resource):
    @ns_study_plans.doc('generate_study_plan')
    @ns_study_plans.expect(generate_plan_input)
    @ns_study_plans.marshal_with(study_plan_output)
    def post(self, user_id):
        """Generate a monthly study plan prioritizing assignments"""
        user = User.query.get_or_404(user_id)
        data = request.json
        
        start_date_str = data.get('start_date', datetime.now().strftime('%Y-%m-%d'))
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
        
        notes = Note.query.filter_by(user_id=user_id).all()
        assignments = Assignment.query.filter_by(user_id=user_id).filter(
            Assignment.due_date >= start_date
        ).all()
        
        monthly_plan = generate_monthly_plan_logic(
            start_date=start_date,
            notes=notes,
            assignments=assignments
        )
        
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
        return existing_plan.to_dict()


# =============================================================================
# API ENDPOINTS - SPACED REPETITION
# =============================================================================

@ns_spaced_reps.route('/user/<int:user_id>')
@ns_spaced_reps.param('user_id', 'The user identifier')
class SpacedRepList(Resource):
    @ns_spaced_reps.doc('get_spaced_repetitions')
    @ns_spaced_reps.marshal_list_with(spaced_rep_output)
    def get(self, user_id):
        """Get all spaced repetitions for a user"""
        user = User.query.get_or_404(user_id)
        spaced_reps = SpacedRepetition.query.filter_by(user_id=user_id).all()
        return [sr.to_dict() for sr in spaced_reps]
    
    @ns_spaced_reps.doc('add_to_spaced_repetition')
    @ns_spaced_reps.expect(spaced_rep_input)
    @ns_spaced_reps.marshal_with(spaced_rep_output, code=201)
    def post(self, user_id):
        """Add a note to spaced repetition"""
        user = User.query.get_or_404(user_id)
        data = request.json
        
        if not data or 'note_id' not in data:
            api.abort(400, 'note_id is required')
        
        note_id = data['note_id']
        note = Note.query.get_or_404(note_id)
        
        existing = SpacedRepetition.query.filter_by(
            user_id=user_id,
            note_id=note_id
        ).first()
        
        if existing:
            api.abort(409, 'Note already in spaced repetition')
        
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
        
        return spaced_rep.to_dict(), 201


@ns_spaced_reps.route('/<int:rep_id>/review')
@ns_spaced_reps.param('rep_id', 'The spaced repetition identifier')
class ReviewSpacedRep(Resource):
    @ns_spaced_reps.doc('mark_reviewed')
    @ns_spaced_reps.marshal_with(spaced_rep_output)
    def post(self, rep_id):
        """Mark a spaced repetition as reviewed"""
        spaced_rep = SpacedRepetition.query.get_or_404(rep_id)
        
        spaced_rep.revision_count += 1
        
        rep_dates = json.loads(spaced_rep.repetition_dates) if spaced_rep.repetition_dates else []
        rep_dates.append(datetime.utcnow().isoformat())
        spaced_rep.repetition_dates = json.dumps(rep_dates)
        
        intervals = [1, 3, 7, 14, 30, 60, 90]
        interval_index = min(spaced_rep.revision_count - 1, len(intervals) - 1)
        next_interval = intervals[interval_index]
        
        spaced_rep.next_review_date = datetime.utcnow() + timedelta(days=next_interval)
        
        db.session.commit()
        
        return spaced_rep.to_dict()


# =============================================================================
# API ENDPOINTS - ASSIGNMENTS
# =============================================================================

@ns_assignments.route('/user/<int:user_id>')
@ns_assignments.param('user_id', 'The user identifier')
class AssignmentList(Resource):

    @ns_assignments.doc('get_assignments')
    @ns_assignments.marshal_list_with(assignment_output)
    @ns_assignments.param('upcoming', 'Show only upcoming (true/false)')
    def get(self, user_id):
        """Get all assignments for a user"""

        User.query.get_or_404(user_id)

        upcoming = request.args.get('upcoming', 'false').lower() == 'true'

        query = Assignment.query.filter_by(user_id=user_id)

        if upcoming:
            query = query.filter(Assignment.due_date >= datetime.utcnow())

        assignments = query.order_by(Assignment.due_date).all()
        return [a.to_dict() for a in assignments]

    @ns_assignments.doc('create_assignment')
    @ns_assignments.expect(assignment_input)
    @ns_assignments.marshal_with(assignment_output, code=201)
    def post(self, user_id):
        """Create a new assignment"""

        User.query.get_or_404(user_id)
        data = request.json

        if not data or 'name' not in data or 'due_date' not in data:
            api.abort(400, 'name and due_date are required')

        assignment = Assignment(
            user_id=user_id,
            name=data['name'],
            due_date=datetime.fromisoformat(data['due_date'].replace("Z", "+00:00")),
            tags=json.dumps(data.get('tags', [])),
            grade=data.get("grade"),
            weight=data.get("weight", 0)
        )

        db.session.add(assignment)
        db.session.commit()

        return assignment.to_dict(), 201



@ns_assignments.route('/<int:assignment_id>')
@ns_assignments.param('assignment_id', 'The assignment identifier')
class AssignmentResource(Resource):
    @ns_assignments.doc('update_assignment')
    @ns_assignments.expect(assignment_input)
    @ns_assignments.marshal_with(assignment_output)
    def put(self, assignment_id):
        """Update an assignment"""
        assignment = Assignment.query.get_or_404(assignment_id)
        data = request.json
        
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
        
        return assignment.to_dict()
    
    @ns_assignments.doc('delete_assignment')
    @ns_assignments.response(200, 'Assignment deleted')
    def delete(self, assignment_id):
        """Delete an assignment"""
        assignment = Assignment.query.get_or_404(assignment_id)
        db.session.delete(assignment)
        db.session.commit()
        
        return {'message': 'Assignment deleted successfully'}, 200

@ns_assignments.route('/user/<int:user_id>/weighted-grade')
@ns_assignments.param('user_id', 'The user identifier')
class WeightedGrade(Resource):

    @ns_assignments.doc('get_weighted_grade')
    def get(self, user_id):
        """Calculate weighted grade average for a user"""

        User.query.get_or_404(user_id)

        assignments = Assignment.query.filter_by(user_id=user_id).all()

        total_weight = 0
        weighted_sum = 0

        for a in assignments:
            if a.grade is not None and a.weight > 0:
                weighted_sum += a.grade * a.weight
                total_weight += a.weight

        if total_weight == 0:
            return {
                "user_id": user_id,
                "weighted_grade": None,
                "message": "No graded assignments with weight available."
            }, 200

        final_grade = weighted_sum / total_weight

        return {
            "user_id": user_id,
            "weighted_grade": round(final_grade, 2),
            "total_weight_used": total_weight
        }, 200


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def generate_monthly_plan_logic(start_date, notes, assignments):
    """Generate a monthly study plan that prioritizes notes with tags matching assignments"""
    monthly_plan = {}
    
    end_date = start_date + timedelta(days=30)
    upcoming_assignments = [
        a for a in assignments 
        if start_date <= a.due_date <= end_date
    ]
    
    priority_tags = set()
    for assignment in upcoming_assignments:
        tags = json.loads(assignment.tags) if assignment.tags else []
        priority_tags.update(tags)
    
    priority_notes = []
    regular_notes = []
    
    for note in notes:
        note_tags = json.loads(note.tags) if note.tags else []
        if any(tag in priority_tags for tag in note_tags):
            priority_notes.append(note)
        else:
            regular_notes.append(note)
    
    time_slots = ["09:00", "11:00", "14:00", "16:00", "19:00"]
    
    priority_index = 0
    regular_index = 0
    
    for day_offset in range(30):
        current_date = start_date + timedelta(days=day_offset)
        date_str = current_date.strftime('%m/%d/%Y')
        
        monthly_plan[date_str] = {}
        
        days_to_nearest_assignment = min(
            [(a.due_date - current_date).days for a in upcoming_assignments],
            default=30
        )
        
        if days_to_nearest_assignment <= 7:
            priority_slots = 4
        elif days_to_nearest_assignment <= 14:
            priority_slots = 3
        elif days_to_nearest_assignment <= 21:
            priority_slots = 2
        else:
            priority_slots = 1
        
        for slot_index, time_slot in enumerate(time_slots):
            if slot_index < priority_slots and priority_notes:
                note = priority_notes[priority_index % len(priority_notes)]
                priority_index += 1
            elif regular_notes:
                note = regular_notes[regular_index % len(regular_notes)]
                regular_index += 1
            else:
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
# HEALTH CHECK
# =============================================================================

@api.route('/api/health')
class HealthCheck(Resource):
    def get(self):
        """Health check endpoint"""
        return {'status': 'healthy', 'timestamp': datetime.utcnow().isoformat()}, 200


# =============================================================================
# MAIN
# =============================================================================

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, host='0.0.0.0', port=5000)