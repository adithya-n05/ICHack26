"""Test Redis client."""
import pytest
from src.utils.redis_client import get_redis_client

def test_redis_client_created():
    """Test Redis client can be instantiated."""
    client = get_redis_client()
    assert client is not None
    assert hasattr(client, 'publish')
    assert hasattr(client, 'pubsub')
