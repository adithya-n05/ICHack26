"""Integration tests for risk agent."""
import pytest
import os
from src.schemas.output import RiskAssessment, RiskCategory


def test_risk_assessment_serialization():
    """Test RiskAssessment can be serialized for database storage."""
    from src.schemas.output import AffectedEntity, Alternative

    assessment = RiskAssessment(
        risk_category=RiskCategory.AT_RISK,
        severity_score=6,
        confidence=0.85,
        reasoning={
            "summary": "Port within typhoon path",
            "factors": ["proximity", "severity"],
            "event_ids": ["event-123"]
        },
        affected_entities=[
            AffectedEntity(type="node", id="node-456", name="Port of Kaohsiung", distance_km=45.2)
        ],
        alternatives={
            "suppliers": [],
            "routes": [
                Alternative(
                    id="hub-789",
                    name="Port of Busan",
                    type="port",
                    reason="Safe distance from event",
                    confidence=0.9
                )
            ]
        }
    )

    # Test Pydantic v2 model_dump()
    data = assessment.model_dump()

    assert data['risk_category'] == RiskCategory.AT_RISK
    assert data['severity_score'] == 6
    assert data['confidence'] == 0.85
    assert len(data['affected_entities']) == 1
    assert data['affected_entities'][0]['name'] == "Port of Kaohsiung"


@pytest.mark.skipif(
    not os.getenv("OPENAI_API_KEY"),
    reason="Requires OPENAI_API_KEY"
)
@pytest.mark.asyncio
async def test_analyze_event_risk_integration():
    """
    Integration test for full agent workflow.

    This test requires:
    - Valid OPENAI_API_KEY
    - Supabase connection with test data
    - An event in the database

    Run with: pytest tests/test_integration.py -v -s
    """
    # This is a placeholder - actual event_id would come from test database
    # For now, this tests that the import works

    from src.agent.agent import analyze_event_risk

    # Verify the function exists and is async
    import inspect
    assert inspect.iscoroutinefunction(analyze_event_risk)

    # Example usage (uncomment when database is seeded):
    # event_id = "your-test-event-uuid"
    # result = await analyze_event_risk(event_id)
    #
    # assert isinstance(result, RiskAssessment)
    # assert result.risk_category in RiskCategory
    # assert 1 <= result.severity_score <= 10
    # assert 0.0 <= result.confidence <= 1.0
    # assert 'summary' in result.reasoning

    assert True  # Placeholder
