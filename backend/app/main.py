from __future__ import annotations

from collections import Counter
from datetime import datetime

from flask import Flask, g, request
from flask_cors import CORS

from .auth import auth_required, create_token
from .config import Config
from .extensions import db
from .models import FIELD_STAGES, Field, FieldUpdate, User


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    register_routes(app)
    return app


def register_routes(app: Flask) -> None:
    @app.get("/api/health")
    def healthcheck():
        return {"status": "ok"}

    @app.post("/api/auth/login")
    def login():
        data = request.get_json() or {}
        username = (data.get("username") or "").strip()
        password = data.get("password") or ""

        user = User.query.filter_by(username=username).first()
        if not user or not user.check_password(password):
            return {"message": "Invalid username or password."}, 401

        return {
            "token": create_token(user),
            "user": user.to_dict(),
        }

    @app.get("/api/me")
    @auth_required()
    def current_user():
        return {"user": g.current_user.to_dict()}

    @app.get("/api/users/agents")
    @auth_required("admin")
    def list_agents():
        agents = User.query.filter_by(role="agent").order_by(User.full_name.asc()).all()
        return {"items": [agent.to_dict() for agent in agents]}

    @app.get("/api/fields")
    @auth_required()
    def list_fields():
        user = g.current_user
        query = Field.query.order_by(Field.planting_date.desc(), Field.name.asc())
        if user.role == "agent":
            query = query.filter_by(assigned_agent_id=user.id)
        fields = query.all()
        return {"items": [field.to_dict() for field in fields]}

    @app.post("/api/fields")
    @auth_required("admin")
    def create_field():
        data = request.get_json() or {}
        validate_field_payload(data, creation=True)

        field = Field(
            name=data["name"].strip(),
            crop_type=data["cropType"].strip(),
            planting_date=parse_date(data["plantingDate"]),
            current_stage=data["currentStage"],
            assigned_agent_id=int(data["assignedAgentId"]),
        )
        db.session.add(field)
        db.session.commit()
        return field.to_dict(), 201

    @app.put("/api/fields/<int:field_id>")
    @auth_required("admin")
    def update_field(field_id: int):
        field = Field.query.get_or_404(field_id)
        data = request.get_json() or {}
        validate_field_payload(data, creation=True)

        field.name = data["name"].strip()
        field.crop_type = data["cropType"].strip()
        field.planting_date = parse_date(data["plantingDate"])
        field.current_stage = data["currentStage"]
        field.assigned_agent_id = int(data["assignedAgentId"])

        db.session.commit()
        return field.to_dict()

    @app.post("/api/fields/<int:field_id>/updates")
    @auth_required("agent")
    def create_update(field_id: int):
        field = Field.query.get_or_404(field_id)
        user = g.current_user
        if field.assigned_agent_id != user.id:
            return {"message": "You can only update fields assigned to you."}, 403

        data = request.get_json() or {}
        stage = data.get("stage")
        note = (data.get("note") or "").strip()
        if stage not in FIELD_STAGES:
            return {"message": "Invalid stage."}, 400
        if not note:
            return {"message": "Observation note is required."}, 400

        field.current_stage = stage
        update = FieldUpdate(field_id=field.id, agent_id=user.id, stage=stage, note=note)
        db.session.add(update)
        db.session.commit()
        return field.to_dict(), 201

    @app.get("/api/dashboard")
    @auth_required()
    def dashboard():
        user = g.current_user
        query = Field.query
        recent_updates_query = FieldUpdate.query.order_by(FieldUpdate.created_at.desc())

        if user.role == "agent":
            query = query.filter_by(assigned_agent_id=user.id)
            recent_updates_query = recent_updates_query.filter_by(agent_id=user.id)

        fields = query.all()
        updates = recent_updates_query.limit(8).all()

        status_counts = Counter(field.computed_status for field in fields)
        stage_counts = Counter(field.current_stage for field in fields)
        risk_fields = [field.name for field in fields if field.computed_status == "At Risk"]

        return {
            "summary": {
                "totalFields": len(fields),
                "statusBreakdown": status_counts,
                "stageBreakdown": stage_counts,
                "riskFieldNames": risk_fields,
            },
            "recentUpdates": [serialize_update(update) for update in updates],
            "fields": [field.to_dict() for field in fields],
        }


def validate_field_payload(data: dict, creation: bool) -> None:
    required_fields = ["name", "cropType", "plantingDate", "currentStage", "assignedAgentId"]
    for key in required_fields:
        if not data.get(key):
            raise ApiValidationError(f"{key} is required.")
    if data["currentStage"] not in FIELD_STAGES:
        raise ApiValidationError("Invalid field stage.")
    parse_date(data["plantingDate"])


def parse_date(value: str):
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError as exc:
        raise ApiValidationError("Planting date must use YYYY-MM-DD format.") from exc


def serialize_update(update: FieldUpdate) -> dict:
    return {
        "id": update.id,
        "fieldName": update.field.name,
        "agentName": update.agent.full_name,
        "stage": update.stage,
        "note": update.note,
        "createdAt": update.created_at.isoformat(),
    }


class ApiValidationError(ValueError):
    pass


app = create_app()


@app.errorhandler(ApiValidationError)
def handle_validation_error(error: ApiValidationError):
    return {"message": str(error)}, 400
