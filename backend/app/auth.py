from __future__ import annotations

from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
from flask import current_app, g, request

from .models import User


def create_token(user: User) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(hours=current_app.config["JWT_EXPIRES_HOURS"])
    payload = {
        "sub": str(user.id),
        "role": user.role,
        "exp": expires_at,
    }
    return jwt.encode(payload, current_app.config["SECRET_KEY"], algorithm="HS256")


def auth_required(role: str | None = None):
    def decorator(view):
        @wraps(view)
        def wrapped(*args, **kwargs):
            header = request.headers.get("Authorization", "")
            if not header.startswith("Bearer "):
                return {"message": "Authentication required."}, 401
            token = header.split(" ", 1)[1]
            try:
                payload = jwt.decode(token, current_app.config["SECRET_KEY"], algorithms=["HS256"])
            except jwt.PyJWTError:
                return {"message": "Invalid or expired token."}, 401

            user = User.query.get(int(payload["sub"]))
            if not user:
                return {"message": "User not found."}, 401
            if role and user.role != role:
                return {"message": "Access denied."}, 403

            g.current_user = user
            return view(*args, **kwargs)

        return wrapped

    return decorator
