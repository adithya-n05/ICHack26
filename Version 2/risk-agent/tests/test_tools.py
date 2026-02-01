"""Test LangChain tools."""
import pytest
from src.agent.tools import get_event_details, calculate_impact_radius_tool

def test_get_event_details_structure():
    """Test get_event_details tool returns correct structure."""
    # This is a structural test - we'll mock the DB call
    tool = get_event_details
    assert tool.name == "get_event_details"
    assert "event_id" in tool.description.lower()

def test_calculate_impact_radius_tool():
    """Test impact radius calculation tool."""
    result = calculate_impact_radius_tool.invoke({"event_type": "war", "severity": 8})
    assert result == 600_000

def test_query_affected_nodes_structure():
    """Test query_affected_nodes tool structure."""
    from src.agent.tools import query_affected_nodes

    tool = query_affected_nodes
    assert tool.name == "query_affected_nodes"
    assert "event_location" in tool.description.lower()
    assert "impact_radius" in tool.description.lower()

def test_find_alternative_suppliers_structure():
    """Test find_alternative_suppliers tool structure."""
    from src.agent.tools import find_alternative_suppliers

    tool = find_alternative_suppliers
    assert tool.name == "find_alternative_suppliers"
    assert "material" in tool.description.lower()

def test_calculate_distance_tool():
    """Test distance calculation tool."""
    from src.agent.tools import calculate_distance_tool

    sf = {"lat": 37.7749, "lng": -122.4194}
    la = {"lat": 34.0522, "lng": -118.2437}

    result = calculate_distance_tool.invoke({"point1": sf, "point2": la})

    assert 550 < result < 570
