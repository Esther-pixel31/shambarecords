from __future__ import annotations

from datetime import date, datetime, timedelta

from .main import create_app
from .extensions import db
from .models import Field, FieldUpdate, User


def seed() -> None:
    app = create_app()
    with app.app_context():
        db.create_all()

        if User.query.count() > 0:
            return

        admin = User(username="admin", full_name="Coordinator One", role="admin")
        admin.set_password("admin123")

        alice = User(username="agent.alice", full_name="Alice Wanjiku", role="agent")
        alice.set_password("agent123")

        brian = User(username="agent.brian", full_name="Brian Otieno", role="agent")
        brian.set_password("agent123")

        db.session.add_all([admin, alice, brian])
        db.session.flush()

        fields = [
            Field(name="North Plot", crop_type="Maize", planting_date=date.today() - timedelta(days=27), current_stage="Growing", assigned_agent_id=alice.id),
            Field(name="River Bend", crop_type="Beans", planting_date=date.today() - timedelta(days=18), current_stage="Planted", assigned_agent_id=alice.id),
            Field(name="Sunrise Block", crop_type="Tomatoes", planting_date=date.today() - timedelta(days=48), current_stage="Ready", assigned_agent_id=brian.id),
            Field(name="Hill Top", crop_type="Sorghum", planting_date=date.today() - timedelta(days=90), current_stage="Harvested", assigned_agent_id=brian.id),
        ]
        db.session.add_all(fields)
        db.session.flush()

        now = datetime.utcnow()
        updates = [
            FieldUpdate(field_id=fields[0].id, agent_id=alice.id, stage="Growing", note="Good stand count and even emergence.", created_at=now - timedelta(days=2)),
            FieldUpdate(field_id=fields[1].id, agent_id=alice.id, stage="Planted", note="Replanting may be required on a small western patch.", created_at=now - timedelta(days=9)),
            FieldUpdate(field_id=fields[2].id, agent_id=brian.id, stage="Ready", note="Fruit set is strong. Harvest team should prepare this week.", created_at=now - timedelta(days=12)),
            FieldUpdate(field_id=fields[3].id, agent_id=brian.id, stage="Harvested", note="Harvest completed and bags moved to storage.", created_at=now - timedelta(days=1)),
        ]
        db.session.add_all(updates)
        db.session.commit()


if __name__ == "__main__":
    seed()
