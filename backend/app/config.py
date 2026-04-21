import os


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "smartseason-secret")
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "postgresql://smartseason:smartseason@db:5432/smartseason",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_EXPIRES_HOURS = int(os.getenv("JWT_EXPIRES_HOURS", "12"))
