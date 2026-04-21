from __future__ import annotations

from datetime import date, datetime

from werkzeug.security import check_password_hash, generate_password_hash

from .extensions import db


FIELD_STAGES = ["Planted", "Growing", "Ready", "Harvested"]


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    full_name = db.Column(db.String(120), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False)
    fields = db.relationship("Field", back_populates="assigned_agent")
    updates = db.relationship("FieldUpdate", back_populates="agent")

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "username": self.username,
            "fullName": self.full_name,
            "role": self.role,
        }


class Field(db.Model):
    __tablename__ = "fields"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    crop_type = db.Column(db.String(80), nullable=False)
    planting_date = db.Column(db.Date, nullable=False)
    current_stage = db.Column(db.String(20), nullable=False)
    assigned_agent_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    assigned_agent = db.relationship("User", back_populates="fields")
    updates = db.relationship(
        "FieldUpdate",
        back_populates="field",
        cascade="all, delete-orphan",
        order_by="desc(FieldUpdate.created_at)",
    )

    @property
    def days_since_planting(self) -> int:
        return (date.today() - self.planting_date).days

    @property
    def latest_update(self) -> FieldUpdate | None:
        return self.updates[0] if self.updates else None

    @property
    def days_since_last_update(self) -> int | None:
        if not self.latest_update:
            return None
        return (datetime.utcnow().date() - self.latest_update.created_at.date()).days

    @property
    def computed_status(self) -> str:
        if self.current_stage == "Harvested":
            return "Completed"
        if self.current_stage == "Ready" and self.days_since_last_update is not None and self.days_since_last_update > 10:
            return "At Risk"
        if self.current_stage == "Planted" and self.days_since_planting > 14:
            return "At Risk"
        if self.days_since_last_update is not None and self.days_since_last_update > 7:
            return "At Risk"
        return "Active"

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "cropType": self.crop_type,
            "plantingDate": self.planting_date.isoformat(),
            "currentStage": self.current_stage,
            "status": self.computed_status,
            "assignedAgent": self.assigned_agent.to_dict(),
            "lastUpdateAt": self.latest_update.created_at.isoformat() if self.latest_update else None,
            "daysSinceLastUpdate": self.days_since_last_update,
            "updates": [update.to_dict() for update in self.updates],
        }


class FieldUpdate(db.Model):
    __tablename__ = "field_updates"

    id = db.Column(db.Integer, primary_key=True)
    field_id = db.Column(db.Integer, db.ForeignKey("fields.id"), nullable=False)
    agent_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    stage = db.Column(db.String(20), nullable=False)
    note = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    field = db.relationship("Field", back_populates="updates")
    agent = db.relationship("User", back_populates="updates")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "fieldId": self.field_id,
            "agentId": self.agent_id,
            "agentName": self.agent.full_name,
            "stage": self.stage,
            "note": self.note,
            "createdAt": self.created_at.isoformat(),
        }
