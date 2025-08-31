"""
配置文件
"""

from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    app_name: str = "Interview Analysis API"
    version: str = "1.0.0"
    allowed_origins: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173"
    ]
    
    # 数据库配置（如果需要）
    database_url: str = "sqlite:///./interview_analysis.db"
    
    # FunASR配置
    funasr_host: str = "localhost"
    funasr_port: int = 10096
    funasr_use_ssl: bool = False
    
    class Config:
        env_file = ".env"

settings = Settings()