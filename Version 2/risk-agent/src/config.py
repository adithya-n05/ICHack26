"""Configuration management for Risk Agent."""
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Application configuration."""

    # OpenAI
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    OPENAI_MODEL = "gpt-4o"

    # Supabase
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    # Redis
    REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_PASSWORD = os.getenv("REDIS_PASSWORD")
    REDIS_EVENTS_CHANNEL = "events:new"
    REDIS_RISK_CHANNEL = "risk:updated"

    # Agent
    AGENT_TEMPERATURE = 0.3

    @classmethod
    def validate(cls):
        """Validate required configuration."""
        required = [
            ("OPENAI_API_KEY", cls.OPENAI_API_KEY),
            ("SUPABASE_URL", cls.SUPABASE_URL),
            ("SUPABASE_SERVICE_ROLE_KEY", cls.SUPABASE_SERVICE_ROLE_KEY),
        ]

        missing = [name for name, value in required if not value]
        if missing:
            raise ValueError(f"Missing required config: {', '.join(missing)}")

config = Config()
