"""Test output schemas."""
from src.schemas.output import RiskAssessment, RiskCategory

def test_risk_assessment_schema():
    """Test RiskAssessment can be instantiated."""
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
            {"type": "node", "id": "node-456", "name": "Port of Kaohsiung"}
        ],
        alternatives={
            "suppliers": [],
            "routes": [{"hub_id": "hub-789", "name": "Port of Busan"}]
        }
    )

    assert assessment.risk_category == RiskCategory.AT_RISK
    assert assessment.severity_score == 6
    assert assessment.confidence == 0.85
