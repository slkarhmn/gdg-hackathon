from flask import Flask, request, send_file, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_restx import Api, Resource as RestxResource, fields, Namespace
from flask_cors import CORS
from datetime import datetime, timedelta
from werkzeug.utils import secure_filename
import json
import os
import logging
import uuid
import mimetypes

from dotenv import load_dotenv
from microsoft_routes import register_microsoft_routes
from ai_notes import (
    extract_text_from_note,
    generate_summary_and_questions,
    export_note_as_docx,
    export_note_as_pdf
)
from ai_chat import (
    initialize_openai,
    chat_with_ai,
    end_conversation_session,
    load_context,
    clear_context,
    get_context_stats
)

# Load environment variables once
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | app | %(message)s"
)
logger = logging.getLogger(__name__)

# Initialize OpenAI on startup
try:
    initialize_openai()
except Exception as e:
    print(f"Warning: Could not initialize OpenAI: {e}")

app = Flask(__name__)
# CORS(app)

CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:5173", "http://localhost:3000"],
        "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})
# Database configuration
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'study_app.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JSON_SORT_KEYS'] = False
app.config['RESTX_MASK_SWAGGER'] = False

# File upload configuration
# Use the resources folder at the project root (one level up from backend)
RESOURCES_FOLDER = os.path.join(os.path.dirname(basedir), 'resources')
os.makedirs(RESOURCES_FOLDER, exist_ok=True)
app.config['RESOURCES_FOLDER'] = RESOURCES_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500MB max file size

# Allowed file extensions and their types
ALLOWED_EXTENSIONS = {
    'pdf': 'pdf',
    'doc': 'document', 'docx': 'document', 'txt': 'document', 'rtf': 'document', 'odt': 'document',
    'ppt': 'document', 'pptx': 'document', 'xls': 'document', 'xlsx': 'document',
    'mp4': 'video', 'webm': 'video', 'avi': 'video', 'mov': 'video', 'mkv': 'video', 'wmv': 'video',
    'mp3': 'audio', 'wav': 'audio', 'ogg': 'audio', 'm4a': 'audio', 'flac': 'audio', 'aac': 'audio',
    'jpg': 'image', 'jpeg': 'image', 'png': 'image', 'gif': 'image', 'webp': 'image', 'svg': 'image',
    'zip': 'archive', 'rar': 'archive', '7z': 'archive', 'tar': 'archive', 'gz': 'archive'
}

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_file_type(filename):
    """Get file type category from extension"""
    if '.' in filename:
        ext = filename.rsplit('.', 1)[1].lower()
        return ALLOWED_EXTENSIONS.get(ext, 'other')
    return 'other'

# Initialize API with Swagger
api = Api(
    app,
    version='1.0',
    title='Study App API',
    description='REST API for managing study notes, plans, spaced repetition, and assignments',
    doc='/api/docs'  # Swagger UI will be at /api/docs
)

db = SQLAlchemy(app)
register_microsoft_routes(api)

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
    tags = db.relationship('Tag', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    
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
    canvas_id = db.Column(db.Integer, index=True)

    name = db.Column(db.String(255), nullable=False)
    due_date = db.Column(db.DateTime, nullable=False, index=True)

    tags = db.Column(db.Text)

    grade = db.Column(db.Float)
    weight = db.Column(db.Float, nullable=False, default=0)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "canvas_id": self.canvas_id,
            "name": self.name,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "tags": json.loads(self.tags) if self.tags else [],
            "grade": self.grade,
            "weight": self.weight,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class Tag(db.Model):
    """Tags table - tracks all valid tags created from assignments"""
    __tablename__ = 'tags'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    source_assignment_id = db.Column(db.Integer, db.ForeignKey('assignments.id'), nullable=True, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Unique constraint: each user can only have one tag with a given name
    __table_args__ = (
        db.UniqueConstraint('user_id', 'name', name='unique_user_tag'),
    )

    source_assignment = db.relationship('Assignment', backref='tag_entries')

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "source_assignment_id": self.source_assignment_id,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class Course(db.Model):
    """Courses table - stores professor courses for organizing resources"""
    __tablename__ = 'courses'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    
    name = db.Column(db.String(255), nullable=False)
    code = db.Column(db.String(50), nullable=False)  # e.g., "CS 401"
    semester = db.Column(db.String(100), nullable=True)  # e.g., "Spring 2026"
    description = db.Column(db.Text, nullable=True)
    student_count = db.Column(db.Integer, default=0)
    total_weeks = db.Column(db.Integer, default=12)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = db.relationship('User', backref=db.backref('courses', lazy='dynamic', cascade='all, delete-orphan'))
    resources = db.relationship('Resource', backref='course', lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "code": self.code,
            "semester": self.semester,
            "description": self.description,
            "student_count": self.student_count,
            "total_weeks": self.total_weeks,
            "resource_count": self.resources.count() if self.resources else 0,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }


class Resource(db.Model):
    """Resources table - stores lecture materials (PDFs, videos, documents, etc.)"""
    __tablename__ = 'resources'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    
    # File information
    filename = db.Column(db.String(255), nullable=False)
    original_filename = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(512), nullable=False)
    file_size = db.Column(db.Integer, nullable=False)  # Size in bytes
    mime_type = db.Column(db.String(100), nullable=False)
    file_type = db.Column(db.String(50), nullable=False)  # 'pdf', 'video', 'audio', 'document', 'image', 'other'
    
    # Course organization - now references the courses table
    course_id = db.Column(db.Integer, db.ForeignKey('courses.id'), nullable=True, index=True)
    week_number = db.Column(db.Integer, nullable=True)
    
    # Metadata
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = db.relationship('User', backref=db.backref('resources', lazy='dynamic', cascade='all, delete-orphan'))

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "filename": self.filename,
            "original_filename": self.original_filename,
            "file_path": self.file_path,
            "file_size": self.file_size,
            "file_size_formatted": self.format_file_size(),
            "mime_type": self.mime_type,
            "file_type": self.file_type,
            "course_id": self.course_id,
            "course_name": self.course.name if self.course else None,
            "course_code": self.course.code if self.course else None,
            "week_number": self.week_number,
            "title": self.title,
            "description": self.description,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
    
    def format_file_size(self):
        """Format file size in human-readable format"""
        size = self.file_size
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024:
                return f"{size:.1f} {unit}"
            size /= 1024
        return f"{size:.1f} TB"


# =============================================================================
# API MODELS (for Swagger documentation)
# =============================================================================

# Namespaces
ns_users = Namespace('users', description='User operations')
ns_notes = Namespace('notes', description='Note operations')
ns_study_plans = Namespace('study-plans', description='Study plan operations')
ns_spaced_reps = Namespace('spaced-repetitions', description='Spaced repetition operations')
ns_assignments = Namespace('assignments', description='Assignment operations')
ns_tags = Namespace('tags', description='Tag operations')
ns_resources = Namespace('resources', description='Resource/lecture material operations')
ns_courses = Namespace('courses', description='Course operations')
ns_chat = Namespace('chat', description='AI Chat operations with context management')

# AI namespace — imported from ai_routes.py
from ai_routes import ns_ai

api.add_namespace(ns_users, path='/api/users')
api.add_namespace(ns_notes, path='/api/notes')
api.add_namespace(ns_study_plans, path='/api/study-plans')
api.add_namespace(ns_spaced_reps, path='/api/spaced-repetitions')
api.add_namespace(ns_assignments, path='/api/assignments')
api.add_namespace(ns_tags, path='/api/tags')
api.add_namespace(ns_resources, path='/api/resources')
api.add_namespace(ns_courses, path='/api/courses')
api.add_namespace(ns_chat, path='/api/chat')


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

# Tag models
tag_input = api.model('TagInput', {
    'name': fields.String(required=True, description='Tag name'),
    'source_assignment_id': fields.Integer(description='Assignment ID that created this tag')
})

tag_output = api.model('Tag', {
    'id': fields.Integer(description='Tag ID'),
    'user_id': fields.Integer(description='User ID'),
    'name': fields.String(description='Tag name'),
    'source_assignment_id': fields.Integer(description='Source assignment ID'),
    'created_at': fields.String(description='Creation timestamp')
})

# Resource models
resource_output = api.model('Resource', {
    'id': fields.Integer(description='Resource ID'),
    'user_id': fields.Integer(description='User ID'),
    'filename': fields.String(description='Stored filename'),
    'original_filename': fields.String(description='Original filename'),
    'file_path': fields.String(description='File path'),
    'file_size': fields.Integer(description='File size in bytes'),
    'file_size_formatted': fields.String(description='Human-readable file size'),
    'mime_type': fields.String(description='MIME type'),
    'file_type': fields.String(description='File type category'),
    'course_id': fields.Integer(description='Course ID'),
    'course_name': fields.String(description='Course name'),
    'course_code': fields.String(description='Course code'),
    'week_number': fields.Integer(description='Week number'),
    'title': fields.String(description='Resource title'),
    'description': fields.String(description='Resource description'),
    'created_at': fields.String(description='Creation timestamp'),
    'updated_at': fields.String(description='Update timestamp')
})

resource_update_input = api.model('ResourceUpdateInput', {
    'title': fields.String(description='Resource title'),
    'description': fields.String(description='Resource description'),
    'course_id': fields.Integer(description='Course ID'),
    'week_number': fields.Integer(description='Week number')
})

# Course models
course_input = api.model('CourseInput', {
    'name': fields.String(required=True, description='Course name'),
    'code': fields.String(required=True, description='Course code (e.g., CS 401)'),
    'semester': fields.String(description='Semester (e.g., Spring 2026)'),
    'description': fields.String(description='Course description'),
    'student_count': fields.Integer(description='Number of enrolled students'),
    'total_weeks': fields.Integer(description='Total weeks in the course')
})

course_output = api.model('Course', {
    'id': fields.Integer(description='Course ID'),
    'user_id': fields.Integer(description='User ID'),
    'name': fields.String(description='Course name'),
    'code': fields.String(description='Course code'),
    'semester': fields.String(description='Semester'),
    'description': fields.String(description='Course description'),
    'student_count': fields.Integer(description='Number of enrolled students'),
    'total_weeks': fields.Integer(description='Total weeks in the course'),
    'resource_count': fields.Integer(description='Number of resources in the course'),
    'created_at': fields.String(description='Creation timestamp'),
    'updated_at': fields.String(description='Update timestamp')
})

# Chat models
chat_message_input = api.model('ChatMessageInput', {
    'message': fields.String(required=True, description='User message to send to AI'),
    'conversation_history': fields.Raw(description='Optional conversation history from current session'),
    'source': fields.String(description='Optional context hint (e.g. "notes", "grades:assignment:X") for better responses'),
    'note_context': fields.String(description='Optional current note content when chatting from Notes view')
})

chat_response_output = api.model('ChatResponse', {
    'response': fields.String(description='AI assistant response'),
    'conversation_history': fields.Raw(description='Updated conversation history'),
    'tokens_used': fields.Integer(description='Number of tokens used in this request'),
    'timestamp': fields.String(description='Response timestamp')
})

chat_session_end_input = api.model('ChatSessionEndInput', {
    'conversation_history': fields.Raw(required=True, description='Full conversation history to summarize')
})

context_output = api.model('Context', {
    'user_id': fields.Integer(description='User ID'),
    'context_history': fields.Raw(description='List of context summaries'),
    'created_at': fields.String(description='Context file creation timestamp'),
    'updated_at': fields.String(description='Last update timestamp')
})

context_stats_output = api.model('ContextStats', {
    'user_id': fields.Integer(description='User ID'),
    'total_entries': fields.Integer(description='Number of context entries'),
    'created_at': fields.String(description='Context file creation timestamp'),
    'updated_at': fields.String(description='Last update timestamp'),
    'oldest_entry': fields.String(description='Timestamp of oldest entry'),
    'newest_entry': fields.String(description='Timestamp of newest entry')
})


# =============================================================================
# API ENDPOINTS - USERS
# =============================================================================

@ns_users.route('')
class UserList(RestxResource):
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
class UserResource(RestxResource):
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
class UserNoteList(RestxResource):
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
        """Create a new note for a user. Tags must exist from assignments."""
        user = User.query.get_or_404(user_id)
        data = request.json
        
        if not data or 'content' not in data:
            api.abort(400, 'content is required')
        
        # Validate tags - only allow tags that exist from assignments
        requested_tags = data.get('tags', [])
        if requested_tags:
            valid_tags, invalid_tags = validate_note_tags(user_id, requested_tags)
            if invalid_tags:
                valid_tag_names = get_valid_tags_for_user(user_id)
                api.abort(400, f'Invalid tags: {invalid_tags}. Tags must be created from assignments first. Valid tags: {valid_tag_names}')
            tags_to_save = valid_tags
        else:
            tags_to_save = []
        
        note = Note(
            user_id=user_id,
            content=json.dumps(data['content']),
            subject=data.get('subject', ''),
            tags=json.dumps(tags_to_save)
        )
        
        db.session.add(note)
        db.session.commit()
        
        return note.to_dict(), 201


# =============================================================================
# API ENDPOINTS - NOTES
# =============================================================================

@ns_notes.route('/<int:note_id>')
@ns_notes.param('note_id', 'The note identifier')
class NoteResource(RestxResource):
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
        """Update a note. Tags must exist from assignments."""
        note = Note.query.get_or_404(note_id)
        data = request.json
        
        if 'content' in data:
            note.content = json.dumps(data['content'])
        if 'subject' in data:
            note.subject = data['subject']
        if 'tags' in data:
            # Validate tags - only allow tags that exist from assignments
            requested_tags = data['tags']
            if requested_tags:
                valid_tags, invalid_tags = validate_note_tags(note.user_id, requested_tags)
                if invalid_tags:
                    valid_tag_names = get_valid_tags_for_user(note.user_id)
                    api.abort(400, f'Invalid tags: {invalid_tags}. Tags must be created from assignments first. Valid tags: {valid_tag_names}')
                note.tags = json.dumps(valid_tags)
            else:
                note.tags = json.dumps([])
        
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
class StudyPlanResource(RestxResource):
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
class GenerateStudyPlan(RestxResource):
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
class SpacedRepList(RestxResource):
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


@ns_spaced_reps.route('/user/<int:user_id>/record-review')
@ns_spaced_reps.param('user_id', 'The user identifier')
class RecordNoteReview(RestxResource):
    @ns_spaced_reps.doc('record_note_review')
    @ns_spaced_reps.expect(spaced_rep_input)
    @ns_spaced_reps.marshal_with(spaced_rep_output)
    def post(self, user_id):
        """Record opening a note as a repetition (creates SpacedRepetition for note if needed)."""
        user = User.query.get_or_404(user_id)
        data = request.json
        if not data or 'note_id' not in data:
            api.abort(400, 'note_id is required')
        note_id = data['note_id']
        Note.query.get_or_404(note_id)

        spaced_rep = SpacedRepetition.query.filter_by(
            user_id=user_id,
            note_id=note_id
        ).first()

        if not spaced_rep:
            spaced_rep = SpacedRepetition(
                user_id=user_id,
                note_id=note_id,
                repetition_dates=json.dumps([]),
                revision_count=0,
                next_review_date=datetime.utcnow() + timedelta(days=1)
            )
            db.session.add(spaced_rep)
            db.session.flush()

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


@ns_spaced_reps.route('/user/<int:user_id>/note/<int:note_id>')
@ns_spaced_reps.param('user_id', 'The user identifier')
@ns_spaced_reps.param('note_id', 'The note identifier')
class SpacedRepByNote(RestxResource):
    @ns_spaced_reps.doc('remove_note_from_spaced_repetition')
    def delete(self, user_id, note_id):
        """Remove a note from spaced repetition (unmark for spaced repetition)."""
        spaced_rep = SpacedRepetition.query.filter_by(
            user_id=user_id,
            note_id=note_id
        ).first()
        if spaced_rep:
            db.session.delete(spaced_rep)
            db.session.commit()
        return '', 204


@ns_spaced_reps.route('/user/<int:user_id>/heatmap')
@ns_spaced_reps.param('user_id', 'The user identifier')
@ns_spaced_reps.param('year', 'Year for heatmap (default: current year)', _in='query')
class SpacedRepHeatmap(RestxResource):
    @ns_spaced_reps.doc('get_heatmap_counts')
    def get(self, user_id):
        """Get daily repetition counts for heatmap (reviews per calendar day, optionally for a year)."""
        user = User.query.get_or_404(user_id)
        year_arg = request.args.get('year', type=int)
        year = year_arg if year_arg else datetime.utcnow().year

        spaced_reps = SpacedRepetition.query.filter_by(user_id=user_id).all()
        daily_counts = {}

        for sr in spaced_reps:
            rep_dates = json.loads(sr.repetition_dates) if sr.repetition_dates else []
            for date_str in rep_dates:
                try:
                    dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                    if dt.year == year:
                        date_key = dt.strftime('%Y-%m-%d')
                        daily_counts[date_key] = daily_counts.get(date_key, 0) + 1
                except (ValueError, TypeError):
                    continue

        return {'year': year, 'daily_counts': daily_counts}, 200


@ns_spaced_reps.route('/<int:rep_id>/review')
@ns_spaced_reps.param('rep_id', 'The spaced repetition identifier')
class ReviewSpacedRep(RestxResource):
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
class AssignmentList(RestxResource):

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
        """Create a new assignment. Tags provided will be automatically registered in the tags table."""

        User.query.get_or_404(user_id)
        data = request.json

        if not data or 'name' not in data or 'due_date' not in data:
            api.abort(400, 'name and due_date are required')

        tag_list = data.get('tags', [])

        assignment = Assignment(
            user_id=user_id,
            name=data['name'],
            due_date=datetime.fromisoformat(data['due_date'].replace("Z", "+00:00")),
            tags=json.dumps(tag_list),
            grade=data.get("grade"),
            weight=data.get("weight", 0)
        )

        db.session.add(assignment)
        db.session.flush()  # Get the assignment ID before committing

        # Sync tags from this assignment
        sync_tags_from_assignment(user_id, assignment.id, tag_list)

        db.session.commit()

        return assignment.to_dict(), 201



@ns_assignments.route('/<int:assignment_id>')
@ns_assignments.param('assignment_id', 'The assignment identifier')
class AssignmentResource(RestxResource):
    @ns_assignments.doc('update_assignment')
    @ns_assignments.expect(assignment_input)
    @ns_assignments.marshal_with(assignment_output)
    def put(self, assignment_id):
        """Update an assignment. New tags will be automatically registered."""
        assignment = Assignment.query.get_or_404(assignment_id)
        data = request.json
        
        if 'name' in data:
            assignment.name = data['name']
        if 'due_date' in data:
            assignment.due_date = datetime.fromisoformat(data['due_date'].replace('Z', '+00:00'))
        if 'tags' in data:
            tag_list = data['tags']
            assignment.tags = json.dumps(tag_list)
            # Sync any new tags from this assignment
            sync_tags_from_assignment(assignment.user_id, assignment.id, tag_list)
        if 'grade' in data:
            assignment.grade = data['grade']
        if 'weight' in data:
            assignment.weight = data['weight']
        
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
class WeightedGrade(RestxResource):

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
# API ENDPOINTS - TAGS
# =============================================================================

@ns_tags.route('/user/<int:user_id>')
@ns_tags.param('user_id', 'The user identifier')
class TagList(RestxResource):
    @ns_tags.doc('get_tags')
    @ns_tags.marshal_list_with(tag_output)
    def get(self, user_id):
        """Get all tags for a user (tags created from assignments)"""
        User.query.get_or_404(user_id)
        tags = Tag.query.filter_by(user_id=user_id).order_by(Tag.name).all()
        return [tag.to_dict() for tag in tags]
    
    @ns_tags.doc('create_tag')
    @ns_tags.expect(tag_input)
    @ns_tags.marshal_with(tag_output, code=201)
    def post(self, user_id):
        """
        Manually create a tag for a user.
        Note: Tags are typically created automatically when assignments are created.
        This endpoint allows manual tag creation if needed.
        """
        User.query.get_or_404(user_id)
        data = request.json
        
        if not data or 'name' not in data:
            api.abort(400, 'name is required')
        
        tag_name = data['name'].strip()
        if not tag_name:
            api.abort(400, 'Tag name cannot be empty')
        
        # Check if tag already exists
        existing_tag = Tag.query.filter_by(user_id=user_id, name=tag_name).first()
        if existing_tag:
            api.abort(409, f'Tag "{tag_name}" already exists')
        
        tag = Tag(
            user_id=user_id,
            name=tag_name,
            source_assignment_id=data.get('source_assignment_id')
        )
        
        db.session.add(tag)
        db.session.commit()
        
        return tag.to_dict(), 201


@ns_tags.route('/<int:tag_id>')
@ns_tags.param('tag_id', 'The tag identifier')
class TagResource(RestxResource):
    @ns_tags.doc('get_tag')
    @ns_tags.marshal_with(tag_output)
    def get(self, tag_id):
        """Get a specific tag"""
        tag = Tag.query.get_or_404(tag_id)
        return tag.to_dict()
    
    @ns_tags.doc('delete_tag')
    @ns_tags.response(200, 'Tag deleted')
    def delete(self, tag_id):
        """
        Delete a tag.
        Warning: This will make the tag invalid for notes.
        Notes with this tag will keep the tag, but it won't be valid for new notes.
        """
        tag = Tag.query.get_or_404(tag_id)
        db.session.delete(tag)
        db.session.commit()
        
        return {'message': 'Tag deleted successfully'}, 200


@ns_tags.route('/user/<int:user_id>/names')
@ns_tags.param('user_id', 'The user identifier')
class TagNameList(RestxResource):
    @ns_tags.doc('get_tag_names')
    def get(self, user_id):
        """Get just the tag names for a user (useful for autocomplete)"""
        User.query.get_or_404(user_id)
        tags = Tag.query.filter_by(user_id=user_id).order_by(Tag.name).all()
        return {
            'user_id': user_id,
            'tags': [tag.name for tag in tags],
            'count': len(tags)
        }


@ns_tags.route('/user/<int:user_id>/sync')
@ns_tags.param('user_id', 'The user identifier')
class SyncTags(RestxResource):
    @ns_tags.doc('sync_tags')
    def post(self, user_id):
        """
        Sync all tags from existing assignments.
        This is useful if assignments were created before the tag system was in place.
        """
        User.query.get_or_404(user_id)
        
        # Get all assignments for this user
        assignments = Assignment.query.filter_by(user_id=user_id).all()
        
        created_tags = []
        for assignment in assignments:
            tag_list = json.loads(assignment.tags) if assignment.tags else []
            new_tags = sync_tags_from_assignment(user_id, assignment.id, tag_list)
            created_tags.extend(new_tags)
        
        db.session.commit()
        
        # Get all tags after sync
        all_tags = Tag.query.filter_by(user_id=user_id).order_by(Tag.name).all()
        
        return {
            'message': 'Tags synced successfully',
            'new_tags_created': created_tags,
            'total_tags': len(all_tags),
            'all_tags': [tag.name for tag in all_tags]
        }


# =============================================================================
# API ENDPOINTS - COURSES
# =============================================================================

@ns_courses.route('/user/<int:user_id>')
@ns_courses.param('user_id', 'The user identifier')
class CourseList(RestxResource):
    @ns_courses.doc('get_courses')
    @ns_courses.marshal_list_with(course_output)
    def get(self, user_id):
        """Get all courses for a user"""
        User.query.get_or_404(user_id)
        courses = Course.query.filter_by(user_id=user_id).order_by(Course.created_at.desc()).all()
        return [c.to_dict() for c in courses]
    
    @ns_courses.doc('create_course')
    @ns_courses.expect(course_input)
    @ns_courses.marshal_with(course_output, code=201)
    def post(self, user_id):
        """Create a new course"""
        User.query.get_or_404(user_id)
        data = request.json
        
        if not data or 'name' not in data or 'code' not in data:
            api.abort(400, 'name and code are required')
        
        course = Course(
            user_id=user_id,
            name=data['name'],
            code=data['code'],
            semester=data.get('semester'),
            description=data.get('description'),
            student_count=data.get('student_count', 0),
            total_weeks=data.get('total_weeks', 12)
        )
        
        db.session.add(course)
        db.session.commit()
        
        return course.to_dict(), 201


@ns_courses.route('/<int:course_id>')
@ns_courses.param('course_id', 'The course identifier')
class CourseItem(RestxResource):
    @ns_courses.doc('get_course')
    @ns_courses.marshal_with(course_output)
    def get(self, course_id):
        """Get a specific course"""
        course = Course.query.get_or_404(course_id)
        return course.to_dict()
    
    @ns_courses.doc('update_course')
    @ns_courses.expect(course_input)
    @ns_courses.marshal_with(course_output)
    def put(self, course_id):
        """Update a course"""
        course = Course.query.get_or_404(course_id)
        data = request.json
        
        if 'name' in data:
            course.name = data['name']
        if 'code' in data:
            course.code = data['code']
        if 'semester' in data:
            course.semester = data['semester']
        if 'description' in data:
            course.description = data['description']
        if 'student_count' in data:
            course.student_count = data['student_count']
        if 'total_weeks' in data:
            course.total_weeks = data['total_weeks']
        
        course.updated_at = datetime.utcnow()
        db.session.commit()
        
        return course.to_dict()
    
    @ns_courses.doc('delete_course')
    @ns_courses.response(200, 'Course deleted')
    def delete(self, course_id):
        """Delete a course and all its resources"""
        course = Course.query.get_or_404(course_id)
        
        # Delete all resource files associated with this course
        for resource in course.resources:
            if os.path.exists(resource.file_path):
                try:
                    os.remove(resource.file_path)
                except OSError as e:
                    print(f"Error deleting file {resource.file_path}: {e}")
        
        db.session.delete(course)
        db.session.commit()
        
        return {'message': 'Course deleted successfully'}, 200


@ns_courses.route('/<int:course_id>/resources')
@ns_courses.param('course_id', 'The course identifier')
class CourseResources(RestxResource):
    @ns_courses.doc('get_course_resources')
    @ns_courses.marshal_list_with(resource_output)
    @ns_courses.param('week_number', 'Filter by week number')
    def get(self, course_id):
        """Get all resources for a course"""
        course = Course.query.get_or_404(course_id)
        
        query = Resource.query.filter_by(course_id=course_id)
        
        week_number = request.args.get('week_number', type=int)
        if week_number:
            query = query.filter_by(week_number=week_number)
        
        resources = query.order_by(Resource.week_number, Resource.created_at.desc()).all()
        return [r.to_dict() for r in resources]


# =============================================================================
# API ENDPOINTS - RESOURCES
# =============================================================================

@ns_resources.route('/user/<int:user_id>/upload')
@ns_resources.param('user_id', 'The user identifier')
class ResourceUpload(RestxResource):
    @ns_resources.doc('upload_resource')
    @ns_resources.marshal_with(resource_output, code=201)
    def post(self, user_id):
        """Upload a new resource file (lecture material)"""
        User.query.get_or_404(user_id)
        
        if 'file' not in request.files:
            api.abort(400, 'No file provided')
        
        file = request.files['file']
        
        if file.filename == '':
            api.abort(400, 'No file selected')
        
        if not allowed_file(file.filename):
            api.abort(400, f'File type not allowed. Allowed types: {", ".join(ALLOWED_EXTENSIONS.keys())}')
        
        # Get metadata from form data
        title = request.form.get('title', file.filename)
        description = request.form.get('description', '')
        course_id = request.form.get('course_id')
        week_number = request.form.get('week_number')
        
        # Parse course_id as integer
        if course_id:
            try:
                course_id = int(course_id)
                # Verify course exists
                Course.query.get_or_404(course_id)
            except ValueError:
                course_id = None
        
        if week_number:
            try:
                week_number = int(week_number)
            except ValueError:
                week_number = None
        
        # Generate unique filename
        original_filename = secure_filename(file.filename)
        file_extension = original_filename.rsplit('.', 1)[1].lower() if '.' in original_filename else ''
        unique_filename = f"{uuid.uuid4().hex}.{file_extension}" if file_extension else uuid.uuid4().hex
        
        # Create user directory if it doesn't exist
        user_folder = os.path.join(app.config['RESOURCES_FOLDER'], str(user_id))
        os.makedirs(user_folder, exist_ok=True)
        
        # Save the file
        file_path = os.path.join(user_folder, unique_filename)
        file.save(file_path)
        
        # Get file size and mime type
        file_size = os.path.getsize(file_path)
        mime_type = mimetypes.guess_type(original_filename)[0] or 'application/octet-stream'
        file_type = get_file_type(original_filename)
        
        # Create resource record
        resource = Resource(
            user_id=user_id,
            filename=unique_filename,
            original_filename=original_filename,
            file_path=file_path,
            file_size=file_size,
            mime_type=mime_type,
            file_type=file_type,
            course_id=course_id,
            week_number=week_number,
            title=title,
            description=description
        )
        
        db.session.add(resource)
        db.session.commit()
        
        return resource.to_dict(), 201


@ns_resources.route('/user/<int:user_id>')
@ns_resources.param('user_id', 'The user identifier')
class ResourceList(RestxResource):
    @ns_resources.doc('get_resources')
    @ns_resources.marshal_list_with(resource_output)
    @ns_resources.param('course_id', 'Filter by course ID')
    @ns_resources.param('week_number', 'Filter by week number')
    @ns_resources.param('file_type', 'Filter by file type (pdf, video, audio, document, image, archive, other)')
    def get(self, user_id):
        """Get all resources for a user"""
        User.query.get_or_404(user_id)
        
        query = Resource.query.filter_by(user_id=user_id)
        
        course_id = request.args.get('course_id')
        week_number = request.args.get('week_number', type=int)
        file_type = request.args.get('file_type')
        
        if course_id:
            query = query.filter_by(course_id=course_id)
        if week_number:
            query = query.filter_by(week_number=week_number)
        if file_type:
            query = query.filter_by(file_type=file_type)
        
        resources = query.order_by(Resource.created_at.desc()).all()
        return [r.to_dict() for r in resources]


@ns_resources.route('/<int:resource_id>')
@ns_resources.param('resource_id', 'The resource identifier')
class ResourceItem(RestxResource):
    @ns_resources.doc('get_resource')
    @ns_resources.marshal_with(resource_output)
    def get(self, resource_id):
        """Get a specific resource metadata"""
        resource = Resource.query.get_or_404(resource_id)
        return resource.to_dict()
    
    @ns_resources.doc('update_resource')
    @ns_resources.expect(resource_update_input)
    @ns_resources.marshal_with(resource_output)
    def put(self, resource_id):
        """Update resource metadata"""
        resource = Resource.query.get_or_404(resource_id)
        data = request.json
        
        if 'title' in data:
            resource.title = data['title']
        if 'description' in data:
            resource.description = data['description']
        if 'course_id' in data:
            resource.course_id = data['course_id']
        if 'course_name' in data:
            resource.course_name = data['course_name']
        if 'week_number' in data:
            resource.week_number = data['week_number']
        
        resource.updated_at = datetime.utcnow()
        db.session.commit()
        
        return resource.to_dict()
    
    @ns_resources.doc('delete_resource')
    @ns_resources.response(200, 'Resource deleted')
    def delete(self, resource_id):
        """Delete a resource and its file"""
        resource = Resource.query.get_or_404(resource_id)
        
        # Delete the file from disk
        if os.path.exists(resource.file_path):
            try:
                os.remove(resource.file_path)
            except OSError as e:
                # Log error but continue with database deletion
                print(f"Error deleting file {resource.file_path}: {e}")
        
        db.session.delete(resource)
        db.session.commit()
        
        return {'message': 'Resource deleted successfully'}, 200


@ns_resources.route('/<int:resource_id>/file')
@ns_resources.param('resource_id', 'The resource identifier')
class ResourceFile(RestxResource):
    @ns_resources.doc('get_resource_file')
    def get(self, resource_id):
        """Download/view the resource file"""
        resource = Resource.query.get_or_404(resource_id)
        
        if not os.path.exists(resource.file_path):
            api.abort(404, 'File not found on disk')
        
        # Determine if we should send as attachment or inline
        download = request.args.get('download', 'false').lower() == 'true'
        
        return send_file(
            resource.file_path,
            mimetype=resource.mime_type,
            as_attachment=download,
            download_name=resource.original_filename
        )


@ns_resources.route('/user/<int:user_id>/courses')
@ns_resources.param('user_id', 'The user identifier')
class ResourceCourses(RestxResource):
    @ns_resources.doc('get_resource_courses')
    def get(self, user_id):
        """Get all unique courses that have resources"""
        User.query.get_or_404(user_id)
        
        resources = Resource.query.filter_by(user_id=user_id).filter(
            Resource.course_id.isnot(None)
        ).all()
        
        courses = {}
        for r in resources:
            if r.course_id and r.course_id not in courses:
                courses[r.course_id] = {
                    'course_id': r.course_id,
                    'course_name': r.course_name or r.course_id,
                    'resource_count': 0,
                    'weeks': set()
                }
            if r.course_id:
                courses[r.course_id]['resource_count'] += 1
                if r.week_number:
                    courses[r.course_id]['weeks'].add(r.week_number)
        
        # Convert sets to lists for JSON serialization
        result = []
        for course in courses.values():
            course['weeks'] = sorted(list(course['weeks']))
            result.append(course)
        
        return {'courses': result}


@ns_resources.route('/user/<int:user_id>/batch-delete')
@ns_resources.param('user_id', 'The user identifier')
class ResourceBatchDelete(RestxResource):
    @ns_resources.doc('batch_delete_resources')
    def post(self, user_id):
        """Delete multiple resources at once"""
        User.query.get_or_404(user_id)
        data = request.json
        
        if not data or 'resource_ids' not in data:
            api.abort(400, 'resource_ids is required')
        
        resource_ids = data['resource_ids']
        deleted_count = 0
        errors = []
        
        for resource_id in resource_ids:
            resource = Resource.query.filter_by(id=resource_id, user_id=user_id).first()
            if resource:
                # Delete file
                if os.path.exists(resource.file_path):
                    try:
                        os.remove(resource.file_path)
                    except OSError as e:
                        errors.append(f"Error deleting file for resource {resource_id}: {e}")
                
                db.session.delete(resource)
                deleted_count += 1
        
        db.session.commit()
        
        return {
            'message': f'Deleted {deleted_count} resources',
            'deleted_count': deleted_count,
            'errors': errors if errors else None
        }


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def sync_tags_from_assignment(user_id, assignment_id, tag_names):
    """
    Create tags from an assignment's tag list.
    Tags are only created if they don't already exist for the user.
    """
    created_tags = []
    for tag_name in tag_names:
        tag_name = tag_name.strip()
        if not tag_name:
            continue
        
        # Check if tag already exists for this user
        existing_tag = Tag.query.filter_by(user_id=user_id, name=tag_name).first()
        if not existing_tag:
            new_tag = Tag(
                user_id=user_id,
                name=tag_name,
                source_assignment_id=assignment_id
            )
            db.session.add(new_tag)
            created_tags.append(tag_name)
    
    return created_tags


def validate_note_tags(user_id, tag_names):
    """
    Validate that all tags exist for this user (were created from assignments).
    Returns a tuple of (valid_tags, invalid_tags).
    """
    valid_tags = []
    invalid_tags = []
    
    for tag_name in tag_names:
        tag_name = tag_name.strip()
        if not tag_name:
            continue
        
        existing_tag = Tag.query.filter_by(user_id=user_id, name=tag_name).first()
        if existing_tag:
            valid_tags.append(tag_name)
        else:
            invalid_tags.append(tag_name)
    
    return valid_tags, invalid_tags


def get_valid_tags_for_user(user_id):
    """Get all valid tag names for a user."""
    tags = Tag.query.filter_by(user_id=user_id).all()
    return [tag.name for tag in tags]


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
# API ENDPOINTS - AI CHAT (CORRECTED VERSION)
# =============================================================================
# Replace the chat endpoints section in app.py with this corrected version

@ns_chat.route('/user/<int:user_id>/message')
@ns_chat.param('user_id', 'The user identifier')
@ns_chat.response(404, 'User not found')
@ns_chat.response(500, 'Server error')
class ChatMessage(RestxResource):
    @ns_chat.doc('send_chat_message')
    @ns_chat.expect(chat_message_input)
    @ns_chat.marshal_with(chat_response_output)
    def post(self, user_id):
        """Send a message to the AI assistant"""
        # Import here to avoid circular imports
        try:
            from ai_chat import chat_with_ai
        except ImportError:
            api.abort(500, 'AI chat module not properly configured. Ensure ai_chat.py is in the project directory.')
        
        # Verify user exists
        user = User.query.get(user_id)
        if not user:
            api.abort(404, f'User {user_id} not found')
        
        data = request.json
        
        if not data or 'message' not in data:
            api.abort(400, 'message is required')
        
        user_message = data['message']
        conversation_history = data.get('conversation_history', [])
        source = data.get('source')
        note_context = data.get('note_context')
        
        try:
            result = chat_with_ai(user_id, user_message, conversation_history, source=source, note_context=note_context)
            
            return {
                'response': result['response'],
                'conversation_history': result['conversation_history'],
                'tokens_used': result['tokens_used'],
                'timestamp': datetime.utcnow().isoformat()
            }
        
        except Exception as e:
            api.abort(500, f'Error communicating with AI: {str(e)}')


@ns_chat.route('/user/<int:user_id>/session/end')
@ns_chat.param('user_id', 'The user identifier')
@ns_chat.response(404, 'User not found')
@ns_chat.response(500, 'Server error')
class ChatSessionEnd(RestxResource):
    @ns_chat.doc('end_chat_session')
    @ns_chat.expect(chat_session_end_input)
    def post(self, user_id):
        """End a chat session and save conversation summary to context"""
        try:
            from ai_chat import end_conversation_session
        except ImportError:
            api.abort(500, 'AI chat module not properly configured')
        
        user = User.query.get(user_id)
        if not user:
            api.abort(404, f'User {user_id} not found')
        
        data = request.json
        
        if not data or 'conversation_history' not in data:
            api.abort(400, 'conversation_history is required')
        
        conversation_history = data['conversation_history']
        
        try:
            context_entry = end_conversation_session(user_id, conversation_history)
            
            if context_entry:
                return {
                    'message': 'Session ended and context saved',
                    'context_entry': context_entry
                }, 200
            else:
                return {
                    'message': 'Session ended (no conversation to save)'
                }, 200
        
        except Exception as e:
            api.abort(500, f'Error ending session: {str(e)}')


@ns_chat.route('/user/<int:user_id>/context')
@ns_chat.param('user_id', 'The user identifier')
@ns_chat.response(404, 'User not found')
@ns_chat.response(500, 'Server error')
class ChatContext(RestxResource):
    @ns_chat.doc('get_chat_context')
    @ns_chat.marshal_with(context_output)
    def get(self, user_id):
        """Get the full context history for a user"""
        try:
            from ai_chat import load_context
        except ImportError:
            api.abort(500, 'AI chat module not properly configured')
        
        user = User.query.get(user_id)
        if not user:
            api.abort(404, f'User {user_id} not found')
        
        try:
            context = load_context(user_id)
            return context
        
        except Exception as e:
            api.abort(500, f'Error loading context: {str(e)}')
    
    @ns_chat.doc('clear_chat_context')
    def delete(self, user_id):
        """Clear all context history for a user"""
        try:
            from ai_chat import clear_context
        except ImportError:
            api.abort(500, 'AI chat module not properly configured')
        
        user = User.query.get(user_id)
        if not user:
            api.abort(404, f'User {user_id} not found')
        
        try:
            context = clear_context(user_id)
            return {
                'message': 'Context cleared successfully',
                'context': context
            }, 200
        
        except Exception as e:
            api.abort(500, f'Error clearing context: {str(e)}')


@ns_chat.route('/user/<int:user_id>/context/stats')
@ns_chat.param('user_id', 'The user identifier')
@ns_chat.response(404, 'User not found')
@ns_chat.response(500, 'Server error')
class ChatContextStats(RestxResource):
    @ns_chat.doc('get_context_stats')
    @ns_chat.marshal_with(context_stats_output)
    def get(self, user_id):
        """Get statistics about the user's context history"""
        try:
            from ai_chat import get_context_stats
        except ImportError:
            api.abort(500, 'AI chat module not properly configured')
        
        user = User.query.get(user_id)
        if not user:
            api.abort(404, f'User {user_id} not found')
        
        try:
            stats = get_context_stats(user_id)
            return stats
        
        except Exception as e:
            api.abort(500, f'Error getting context stats: {str(e)}')

# =============================================================================
# HEALTH CHECK
# =============================================================================

@api.route('/api/health')
class HealthCheck(RestxResource):
    def get(self):
        """Health check endpoint"""
        return {'status': 'healthy', 'timestamp': datetime.utcnow().isoformat()}, 200

# =============================================================================
# API ENDPOINTS - AI NOTES GENERATION
# =============================================================================

print("OPENAI_API_KEY is:", os.environ.get("OPENAI_API_KEY"))


# @app.route('/api/users/<int:user_id>/generate-ai-note', methods=['POST'])
# def generate_ai_note(user_id):
#     data = request.get_json()
#     note_id = data.get("note_id")
#     note = Note.query.get_or_404(note_id)
#     lecture_text = extract_text_from_note(note)
#     summary, questions = generate_summary_and_questions(lecture_text)
#     return jsonify({
#         "summary": summary,
#         "questions": questions,
#         "note_id": note_id,
#         "subject": note.subject,
#         "tags": json.loads(note.tags) if note.tags else []
#         #TODO  Ask chatgpt to add logging to see which part is failing exactly
#     })
@app.route('/api/users/<int:user_id>/generate-ai-note', methods=['POST'])
def generate_ai_note(user_id):
    logger.info(f"AI note generation requested for user_id={user_id}")

    data = request.get_json()
    if not data or "note_id" not in data:
        logger.error("note_id missing in request body")
        return jsonify({"error": "note_id is required"}), 400

    note_id = data["note_id"]
    logger.info(f"Fetching note ID={note_id}")


    try:
        note = Note.query.get_or_404(note_id)
        print(note)
        lecture_text = extract_text_from_note(note)

        logger.info("Calling AI generation function")
        summary, questions = generate_summary_and_questions(lecture_text)

        logger.info("AI generation successful")

        return jsonify({
            "summary": summary,
            "questions": questions,
            "note_id": note_id,
            "subject": note.subject,
            "tags": json.loads(note.tags) if note.tags else []
        })

    except Exception as e:
        logger.exception("AI note generation FAILED")
        return jsonify({
            "error": "Failed to generate AI notes",
            "details": str(e)
        }), 500


@app.route('/api/notes/<int:note_id>/export', methods=['GET'])
def export_note(note_id):
    fmt = request.args.get("format", "pdf")
    note = Note.query.get_or_404(note_id)
    content_dict = json.loads(note.content)
    summary = content_dict.get("summary", "")
    questions = content_dict.get("questions", "")

    if fmt == "docx":
        temp = export_note_as_docx(note, summary, questions)
        return send_file(temp.name, as_attachment=True, download_name=f"{note.subject or 'note'}.docx")
    else:
        temp = export_note_as_pdf(note, summary, questions)
        return send_file(temp.name, as_attachment=True, download_name=f"{note.subject or 'note'}.pdf")



# =============================================================================
# MAIN
# =============================================================================

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, host='0.0.0.0', port=5000)