from flask import Flask, request, jsonify, redirect, session
from flask_restx import Api, Resource, fields, Namespace
import msal
from graph_api_service import GraphAPIService, TokenManager
from microsoft_config import MicrosoftConfig
from datetime import datetime, timedelta

teams_ns = Namespace('teams', description='Microsoft Teams operations')
todo_ns = Namespace('todo', description='Microsoft To Do operations')
auth_ns = Namespace('auth', description='Authentication operations')

auth_response = auth_ns.model('AuthResponse', {
    'auth_url': fields.String(description='URL to redirect user for authentication'),
})

token_response = auth_ns.model('TokenResponse', {
    'access_token': fields.String(description='Access token'),
    'token_type': fields.String(description='Token type'),
    'expires_in': fields.Integer(description='Token expiration time in seconds'),
})

chat_message = teams_ns.model('ChatMessage', {
    'id': fields.String(description='Message ID'),
    'content': fields.String(description='Message content'),
    'sender': fields.String(description='Sender name'),
    'createdDateTime': fields.String(description='Message timestamp'),
})

send_message_input = teams_ns.model('SendMessageInput', {
    'chat_id': fields.String(required=True, description='Chat ID'),
    'message': fields.String(required=True, description='Message content'),
})

create_chat_input = teams_ns.model('CreateChatInput', {
    'user_id': fields.String(required=True, description='User ID to chat with'),
    'initial_message': fields.String(description='Optional initial message'),
})

todo_list_model = todo_ns.model('TodoList', {
    'id': fields.String(description='List ID'),
    'displayName': fields.String(description='List name'),
    'isOwner': fields.Boolean(description='Is current user owner'),
})

task_model = todo_ns.model('Task', {
    'id': fields.String(description='Task ID'),
    'title': fields.String(description='Task title'),
    'status': fields.String(description='Task status'),
    'importance': fields.String(description='Task importance'),
    'dueDateTime': fields.String(description='Due date'),
    'isReminderOn': fields.Boolean(description='Reminder enabled'),
})

create_task_input = todo_ns.model('CreateTaskInput', {
    'title': fields.String(required=True, description='Task title'),
    'body': fields.String(description='Task notes/description'),
    'dueDateTime': fields.String(description='Due date (ISO format)'),
    'reminderDateTime': fields.String(description='Reminder date (ISO format)'),
    'importance': fields.String(description='Importance: low, normal, high'),
    'isReminderOn': fields.Boolean(description='Enable reminder'),
})

@auth_ns.route('/login')
class Login(Resource):
    @auth_ns.doc('get_auth_url')
    @auth_ns.marshal_with(auth_response)
    def get(self):
        """Get Microsoft login URL"""
        msal_app = msal.ConfidentialClientApplication(
            MicrosoftConfig.CLIENT_ID,
            authority=MicrosoftConfig.AUTHORITY,
            client_credential=MicrosoftConfig.CLIENT_SECRET
        )
        
        auth_url = msal_app.get_authorization_request_url(
            scopes=MicrosoftConfig.SCOPES,
            redirect_uri=MicrosoftConfig.REDIRECT_URI
        )
        
        return {'auth_url': auth_url}


@auth_ns.route('/callback')
class AuthCallback(Resource):
    @auth_ns.doc('auth_callback')
    @auth_ns.marshal_with(token_response)
    def get(self):
        """Handle OAuth callback and exchange code for token"""
        auth_code = request.args.get('code')
        
        if not auth_code:
            return {'error': 'No authorization code provided'}, 400
        
        try:
            token_data = TokenManager.get_token_from_code(auth_code)
            
            return token_data
        
        except Exception as e:
            return {'error': str(e)}, 500


@auth_ns.route('/refresh')
class RefreshToken(Resource):
    @auth_ns.doc('refresh_token')
    @auth_ns.expect(auth_ns.model('RefreshInput', {
        'refresh_token': fields.String(required=True)
    }))
    @auth_ns.marshal_with(token_response)
    def post(self):
        """Refresh an expired access token"""
        refresh_token = request.json.get('refresh_token')
        
        if not refresh_token:
            return {'error': 'Refresh token required'}, 400
        
        try:
            token_data = TokenManager.refresh_token(refresh_token)
            return token_data
        
        except Exception as e:
            return {'error': str(e)}, 500

def get_graph_service():
    """Helper to get GraphAPIService from auth token"""
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None, {'error': 'Missing or invalid authorization token'}, 401
    
    access_token = auth_header.replace('Bearer ', '')
    return GraphAPIService(access_token), None, None


@teams_ns.route('/chats')
class Chats(Resource):
    @teams_ns.doc('get_chats', security='Bearer')
    def get(self):
        """Get all chats for current user"""
        graph_service, error, code = get_graph_service()
        if error:
            return error, code
        
        try:
            chats = graph_service.get_chats()
            return {'chats': chats}
        except Exception as e:
            return {'error': str(e)}, 500


@teams_ns.route('/chats/<string:chat_id>/messages')
class ChatMessages(Resource):
    @teams_ns.doc('get_chat_messages', security='Bearer')
    @teams_ns.param('chat_id', 'The chat ID')
    @teams_ns.param('limit', 'Number of messages to retrieve (default: 50)')
    def get(self, chat_id):
        """Get messages from a specific chat"""
        graph_service, error, code = get_graph_service()
        if error:
            return error, code
        
        limit = request.args.get('limit', 50, type=int)
        
        try:
            messages = graph_service.get_chat_messages(chat_id, limit)
            return {'messages': messages}
        except Exception as e:
            return {'error': str(e)}, 500


@teams_ns.route('/chats/send')
class SendMessage(Resource):
    @teams_ns.doc('send_message', security='Bearer')
    @teams_ns.expect(send_message_input)
    def post(self):
        """Send a message to a chat"""
        graph_service, error, code = get_graph_service()
        if error:
            return error, code
        
        data = request.json
        chat_id = data.get('chat_id')
        message = data.get('message')
        
        if not chat_id or not message:
            return {'error': 'chat_id and message are required'}, 400
        
        try:
            result = graph_service.send_chat_message(chat_id, message)
            return result
        except Exception as e:
            return {'error': str(e)}, 500


@teams_ns.route('/chats/create')
class CreateChat(Resource):
    @teams_ns.doc('create_chat', security='Bearer')
    @teams_ns.expect(create_chat_input)
    def post(self):
        """Create a new chat with a user"""
        graph_service, error, code = get_graph_service()
        if error:
            return error, code
        
        data = request.json
        user_id = data.get('user_id')
        initial_message = data.get('initial_message')
        
        if not user_id:
            return {'error': 'user_id is required'}, 400
        
        try:
            chat = graph_service.create_chat([user_id], initial_message)
            return chat
        except Exception as e:
            return {'error': str(e)}, 500


@teams_ns.route('/users/search')
class SearchUsers(Resource):
    @teams_ns.doc('search_users', security='Bearer')
    @teams_ns.param('query', 'Search query (name or email)')
    def get(self):
        """Search for users (e.g., professors)"""
        graph_service, error, code = get_graph_service()
        if error:
            return error, code
        
        query = request.args.get('query', '')
        
        if not query:
            return {'error': 'query parameter is required'}, 400
        
        try:
            users = graph_service.search_users(query)
            return {'users': users}
        except Exception as e:
            return {'error': str(e)}, 500


@teams_ns.route('/users/<string:user_id>/presence')
class UserPresence(Resource):
    @teams_ns.doc('get_presence', security='Bearer')
    @teams_ns.param('user_id', 'The user ID')
    def get(self, user_id):
        """Get user presence status (online/offline/busy)"""
        graph_service, error, code = get_graph_service()
        if error:
            return error, code
        
        try:
            presence = graph_service.get_user_presence(user_id)
            return presence
        except Exception as e:
            return {'error': str(e)}, 500


@todo_ns.route('/lists')
class TodoLists(Resource):
    @todo_ns.doc('get_todo_lists', security='Bearer')
    @todo_ns.marshal_list_with(todo_list_model)
    def get(self):
        """Get all To Do lists"""
        graph_service, error, code = get_graph_service()
        if error:
            return error, code
        
        try:
            lists = graph_service.get_todo_lists()
            return lists
        except Exception as e:
            return {'error': str(e)}, 500
    
    @todo_ns.doc('create_todo_list', security='Bearer')
    @todo_ns.expect(todo_ns.model('CreateListInput', {
        'name': fields.String(required=True, description='List name')
    }))
    def post(self):
        """Create a new To Do list"""
        graph_service, error, code = get_graph_service()
        if error:
            return error, code
        
        name = request.json.get('name')
        
        if not name:
            return {'error': 'name is required'}, 400
        
        try:
            result = graph_service.create_todo_list(name)
            return result
        except Exception as e:
            return {'error': str(e)}, 500


@todo_ns.route('/lists/<string:list_id>/tasks')
class Tasks(Resource):
    @todo_ns.doc('get_tasks', security='Bearer')
    @todo_ns.param('list_id', 'The list ID')
    @todo_ns.marshal_list_with(task_model)
    def get(self, list_id):
        """Get all tasks from a list"""
        graph_service, error, code = get_graph_service()
        if error:
            return error, code
        
        try:
            tasks = graph_service.get_tasks(list_id)
            return tasks
        except Exception as e:
            return {'error': str(e)}, 500
    
    @todo_ns.doc('create_task', security='Bearer')
    @todo_ns.param('list_id', 'The list ID')
    @todo_ns.expect(create_task_input)
    def post(self, list_id):
        """Create a new task"""
        graph_service, error, code = get_graph_service()
        if error:
            return error, code
        
        task_data = request.json
        
        if not task_data.get('title'):
            return {'error': 'title is required'}, 400
        
        try:
            task = graph_service.create_task(list_id, task_data)
            return task
        except Exception as e:
            return {'error': str(e)}, 500


@todo_ns.route('/lists/<string:list_id>/tasks/<string:task_id>')
class TaskDetail(Resource):
    @todo_ns.doc('update_task', security='Bearer')
    @todo_ns.param('list_id', 'The list ID')
    @todo_ns.param('task_id', 'The task ID')
    def patch(self, list_id, task_id):
        """Update a task"""
        graph_service, error, code = get_graph_service()
        if error:
            return error, code
        
        updates = request.json
        
        try:
            result = graph_service.update_task(list_id, task_id, updates)
            return result
        except Exception as e:
            return {'error': str(e)}, 500
    
    @todo_ns.doc('delete_task', security='Bearer')
    @todo_ns.param('list_id', 'The list ID')
    @todo_ns.param('task_id', 'The task ID')
    def delete(self, list_id, task_id):
        """Delete a task"""
        graph_service, error, code = get_graph_service()
        if error:
            return error, code
        
        try:
            result = graph_service.delete_task(list_id, task_id)
            return {'success': True}
        except Exception as e:
            return {'error': str(e)}, 500


@todo_ns.route('/lists/<string:list_id>/tasks/<string:task_id>/complete')
class CompleteTask(Resource):
    @todo_ns.doc('complete_task', security='Bearer')
    @todo_ns.param('list_id', 'The list ID')
    @todo_ns.param('task_id', 'The task ID')
    def post(self, list_id, task_id):
        """Mark a task as complete"""
        graph_service, error, code = get_graph_service()
        if error:
            return error, code
        
        try:
            result = graph_service.complete_task(list_id, task_id)
            return result
        except Exception as e:
            return {'error': str(e)}, 500

def register_microsoft_routes(api):
    """Register all Microsoft-related routes to the API"""
    api.add_namespace(auth_ns, path='/api/auth')
    api.add_namespace(teams_ns, path='/api/teams')
    api.add_namespace(todo_ns, path='/api/todo')
