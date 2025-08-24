from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # 应用配置
    app_name: str = "Interview Analysis API"
    version: str = "1.0.0"
    debug: bool = True

    # 数据库配置
    database_url: str = "sqlite:///./interview_analysis.db"

    # JWT配置
    secret_key: str = "your-secret-key-here"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # CORS配置
    allowed_origins: list[str] = ["http://localhost:5173"]

    class Config:
        env_file = ".env"

settings = Settings()
