"""Redis client for pub/sub messaging."""
import redis
from src.config import config

_redis_client: redis.Redis | None = None

def get_redis_client() -> redis.Redis:
    """Get or create Redis client singleton."""
    global _redis_client

    if _redis_client is None:
        _redis_client = redis.Redis(
            host=config.REDIS_HOST,
            port=config.REDIS_PORT,
            password=config.REDIS_PASSWORD if config.REDIS_PASSWORD else None,
            decode_responses=True
        )

    return _redis_client

# Export singleton instance
redis_client = get_redis_client()
