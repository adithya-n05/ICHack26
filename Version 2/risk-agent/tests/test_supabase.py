"""Test Supabase client."""
import pytest
from src.db.supabase import get_supabase_client

def test_supabase_client_created():
    """Test Supabase client can be instantiated."""
    client = get_supabase_client()
    assert client is not None
    assert hasattr(client, 'table')
