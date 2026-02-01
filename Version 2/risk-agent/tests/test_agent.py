"""Test risk agent creation."""
import pytest
from src.agent.agent import create_risk_agent

def test_create_risk_agent():
    """Test agent can be created."""
    agent = create_risk_agent()

    assert agent is not None
    # Check agent has invoke method
    assert hasattr(agent, 'invoke')
