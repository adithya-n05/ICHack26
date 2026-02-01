"""Pydantic schemas for structured output."""
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Literal, TypedDict
from enum import Enum

class GeoPoint(TypedDict):
    """Geographic point matching TypeScript GeoPoint interface."""
    lat: float
    lng: float

class RiskCategory(str, Enum):
    """Risk categories matching ConnectionStatus from TypeScript types."""
    HEALTHY = "healthy"
    MONITORING = "monitoring"
    AT_RISK = "at-risk"
    CRITICAL = "critical"
    DISRUPTED = "disrupted"

class AffectedEntity(BaseModel):
    """An affected supply chain entity (node or connection)."""
    type: Literal["node", "connection"]
    id: str
    name: str
    distance_km: float | None = None

class Alternative(BaseModel):
    """An alternative supplier or route."""
    id: str
    name: str
    type: str
    location: GeoPoint | None = None
    reason: str
    confidence: float

class RiskAssessment(BaseModel):
    """Complete risk assessment output from agent."""

    risk_category: RiskCategory = Field(
        description="Risk level: HEALTHY, MONITORING, AT_RISK, CRITICAL, or DISRUPTED"
    )

    severity_score: int = Field(
        ge=1, le=10,
        description="Numerical severity score from 1 (minimal) to 10 (catastrophic)"
    )

    confidence: float = Field(
        ge=0.0, le=1.0,
        description="Confidence in this assessment from 0.0 to 1.0"
    )

    reasoning: str = Field(
        default="",
        description="Clear explanation of the assessment (2-3 sentences)"
    )

    affected_entities: List[AffectedEntity] = Field(
        default_factory=list,
        description="List of nodes and connections impacted"
    )

    alternatives: Dict[str, Any] = Field(
        default_factory=dict,
        description="Alternative suppliers and routes (if risk >= AT_RISK)"
    )
