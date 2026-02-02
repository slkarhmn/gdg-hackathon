"""
AI StudyBot routes — flask_restx Namespace.

Usage in app.py / app_swagger.py:
    from ai_routes import ns_ai
    api.add_namespace(ns_ai, path='/api/ai')

No database access needed — conversation state lives in an in-memory dict.
"""

from flask_restx import Namespace, Resource, fields
from flask import request
import os
import openai_service as ai

ns_ai = Namespace('ai', description='AI Study-Plan Chatbot (StudyBot)')

chat_input = ns_ai.model('AIChatInput', {
    'user_id':     fields.Integer(required=True,  description='User ID'),
    'message':     fields.String(required=True,   description='User message'),
    'assignments': fields.List(fields.Raw(),      description='Assignments list (sent on first message for context)')
})

chat_output = ns_ai.model('AIChatOutput', {
    'reply': fields.String(description='Assistant reply text'),
    'plan':  fields.Raw(   description='Parsed study-plan JSON, or null')
})

reset_input = ns_ai.model('AIResetInput', {
    'user_id': fields.Integer(required=True, description='User ID')
})

history_output = ns_ai.model('AIHistoryOutput', {
    'messages': fields.List(fields.Raw(), description='Visible message history (system messages hidden)')
})

health_output = ns_ai.model('AIHealthOutput', {
    'status':                fields.String(),
    'openai_key_configured': fields.Boolean()
})

parse_files_input = ns_ai.model('ParseFilesInput', {
    'files': fields.List(fields.Raw(), required=True, description='List of files with {type, base64, filename}')
})

parse_files_output = ns_ai.model('ParseFilesOutput', {
    'extracted_text': fields.String(description='Extracted course info from files')
})

generate_plan_input = ns_ai.model('GeneratePlanInput', {
    'modules': fields.List(fields.Raw(), required=True, description='List of modules'),
    'deadlines': fields.List(fields.Raw(), required=True, description='List of deadlines'),
    'preferences': fields.Raw(required=True, description='Study preferences'),
    'timezone': fields.String(description='IANA timezone (default: Asia/Dubai)')
})

_conversations: dict[int, list[dict[str, str]]] = {}


def _get_or_create_session(user_id: int) -> list[dict[str, str]]:
    if user_id not in _conversations:
        _conversations[user_id] = [
            {"role": "system", "content": ai.SYSTEM_PROMPT}
        ]
    return _conversations[user_id]


@ns_ai.route('/chat')
class AIChatResource(Resource):
    @ns_ai.doc('send_message')
    @ns_ai.expect(chat_input)
    @ns_ai.marshal_with(chat_output)
    def post(self):
        """Send a message to StudyBot and get a reply (+ optional generated plan)."""
        data = request.get_json(force=True) or {}
        user_id:      int  = data.get("user_id", 1)
        user_message: str  = (data.get("message") or "").strip()
        assignments:  list = data.get("assignments", [])

        if not user_message:
            ns_ai.abort(400, "message is required")

        session = _get_or_create_session(user_id)

        if len(session) == 1 and assignments:
            context = ai.build_context_message(assignments, existing_plan=None)
            session.append({
                "role": "system",
                "content": f"[Student context — use this to tailor the study plan]\n{context}"
            })

        session.append({"role": "user", "content": user_message})

        try:
            reply = ai.chat(session)
        except Exception as exc:
            session.pop() 
            ns_ai.abort(500, str(exc))

        session.append({"role": "assistant", "content": reply})
        plan = ai.extract_json_plan(reply)

        return {"reply": reply, "plan": plan}, 200


@ns_ai.route('/chat/history')
class AIChatHistoryResource(Resource):
    @ns_ai.doc('get_history')
    @ns_ai.param('user_id', 'User ID', _in='query', type=int)
    @ns_ai.marshal_with(history_output)
    def get(self):
        """Return visible message history (system messages are filtered out)."""
        user_id = request.args.get("user_id", 1, type=int)
        session = _conversations.get(user_id, [])
        visible = [m for m in session if m["role"] != "system"]
        return {"messages": visible}, 200


@ns_ai.route('/chat/reset')
class AIChatResetResource(Resource):
    @ns_ai.doc('reset_chat')
    @ns_ai.expect(reset_input)
    def post(self):
        """Wipe the conversation for a user so they can start fresh."""
        data = request.get_json(force=True) or {}
        user_id: int = data.get("user_id", 1)
        _conversations.pop(user_id, None)
        return {"success": True}, 200


@ns_ai.route('/parse-files')
class AIParseFilesResource(Resource):
    @ns_ai.doc('parse_uploaded_files')
    @ns_ai.expect(parse_files_input)
    @ns_ai.marshal_with(parse_files_output)
    def post(self):
        """Parse uploaded files (images/PDFs) to extract modules and deadlines using GPT-4 Vision."""
        data = request.get_json(force=True) or {}
        files = data.get("files", [])  # [{"type": "image", "base64": "...", "filename": "..."}, ...]
        
        if not files:
            ns_ai.abort(400, "No files provided")
        
        try:
            extracted_text = ai.parse_uploaded_files(files)
            return {"extracted_text": extracted_text}, 200
        except Exception as exc:
            ns_ai.abort(500, str(exc))


@ns_ai.route('/generate-plan')
class AIGeneratePlanResource(Resource):
    @ns_ai.doc('generate_study_plan')
    @ns_ai.expect(generate_plan_input)
    def post(self):
        """Generate a structured study plan JSON from modules, deadlines, and preferences."""
        data = request.get_json(force=True) or {}
        
        modules = data.get("modules", [])
        deadlines = data.get("deadlines", [])
        preferences = data.get("preferences", {})
        timezone = data.get("timezone", "Asia/Dubai")
        
        if not modules or not deadlines or not preferences:
            ns_ai.abort(400, "modules, deadlines, and preferences are required")
        
        try:
            plan = ai.generate_study_plan_json(modules, deadlines, preferences, timezone)
            return plan, 200
        except Exception as exc:
            ns_ai.abort(500, str(exc))


@ns_ai.route('/health')
class AIHealthResource(Resource):
    @ns_ai.doc('ai_health')
    @ns_ai.marshal_with(health_output)
    def get(self):
        """Check that the AI service is up and the OpenAI key is configured."""
        return {
            "status": "ok",
            "openai_key_configured": bool(os.getenv("OPENAI_API_KEY"))
        }, 200