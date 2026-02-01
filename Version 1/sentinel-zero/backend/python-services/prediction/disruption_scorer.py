"""
Disruption Scoring Service

Implements weighted scoring model for supply chain disruption prediction.
Formula: score = (0.25 × sentiment + 0.30 × disasters + 0.15 × vessels + 0.20 × tariffs + 0.10 × historical)

Following FastAPI best practices from Context7:
- Pydantic models for request/response validation
- Async endpoints
- Proper type annotations
- Dependency injection
"""

from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
import httpx
from datetime import datetime


# ============ Pydantic Models (Context7 best practice) ============

class RiskFactors(BaseModel):
    """Input factors for disruption calculation"""
    regional_sentiment: float = Field(ge=-100, le=100, description="GDELT sentiment score")
    active_disasters: float = Field(ge=0, le=1, description="Nearby disaster severity 0-1")
    vessel_anomalies: float = Field(ge=0, le=1, description="AIS behavior anomaly score 0-1")
    tariff_exposure: float = Field(ge=0, le=1, description="Trade policy impact 0-1")
    historical_rate: float = Field(ge=0, le=1, description="Historical disruption frequency 0-1")


class DisruptionScoreResponse(BaseModel):
    """Response model for disruption score"""
    route_id: str
    disruption_probability: float = Field(ge=0, le=100, description="Probability 0-100%")
    risk_level: str = Field(description="low, medium, high, critical")
    contributing_factors: dict[str, float]
    timestamp: datetime


class RouteRiskRequest(BaseModel):
    """Request model for route risk assessment"""
    route_id: str
    source_coordinates: tuple[float, float]
    destination_coordinates: tuple[float, float]
    transport_mode: str = "sea"


class RouteRiskResponse(BaseModel):
    """Response model for route risk assessment"""
    route_id: str
    disruption_probability: float
    risk_level: str
    factors: dict[str, float]
    recommendations: list[str]


# ============ Scoring Weights (from plan) ============

WEIGHTS = {
    "regional_sentiment": 0.25,
    "active_disasters": 0.30,
    "vessel_anomalies": 0.15,
    "tariff_exposure": 0.20,
    "historical_rate": 0.10,
}


# ============ Core Scoring Logic ============

def calculate_disruption_score(factors: RiskFactors) -> float:
    """
    Calculate disruption probability using weighted scoring formula.

    Formula: score = Σ(weight_i × factor_i) normalized to 0-100%

    Args:
        factors: RiskFactors containing all input signals

    Returns:
        Disruption probability as percentage (0-100)
    """
    # Normalize sentiment from -100,100 to 0,1 (negative sentiment = higher risk)
    normalized_sentiment = (100 - factors.regional_sentiment) / 200

    # Calculate weighted sum
    score = (
        WEIGHTS["regional_sentiment"] * normalized_sentiment +
        WEIGHTS["active_disasters"] * factors.active_disasters +
        WEIGHTS["vessel_anomalies"] * factors.vessel_anomalies +
        WEIGHTS["tariff_exposure"] * factors.tariff_exposure +
        WEIGHTS["historical_rate"] * factors.historical_rate
    )

    # Convert to percentage
    return min(100, max(0, score * 100))


def determine_risk_level(probability: float) -> str:
    """Determine risk level category from probability"""
    if probability >= 70:
        return "critical"
    elif probability >= 50:
        return "high"
    elif probability >= 30:
        return "medium"
    return "low"


def get_recommendations(probability: float, factors: RiskFactors) -> list[str]:
    """Generate recommendations based on risk factors"""
    recommendations = []

    if probability >= 60:
        recommendations.append("Consider activating alternative supplier routes")

    if factors.active_disasters > 0.5:
        recommendations.append("Monitor disaster situation - may require immediate rerouting")

    if factors.tariff_exposure > 0.5:
        recommendations.append("Review tariff impact on costs - consider alternative trade routes")

    if factors.regional_sentiment < -30:
        recommendations.append("Political instability detected - increase monitoring frequency")

    if factors.vessel_anomalies > 0.3:
        recommendations.append("Shipping anomalies detected - verify vessel status")

    if not recommendations:
        recommendations.append("Route operating within normal parameters")

    return recommendations


# ============ Router (FastAPI) ============

router = APIRouter(prefix="/api/predictions", tags=["Predictions"])


@router.post("/disruption", response_model=DisruptionScoreResponse)
async def calculate_route_disruption(
    route_id: str,
    factors: RiskFactors
) -> DisruptionScoreResponse:
    """
    Calculate disruption probability for a specific route.

    Uses weighted scoring model combining multiple risk signals.
    """
    probability = calculate_disruption_score(factors)
    risk_level = determine_risk_level(probability)

    # Calculate individual factor contributions
    normalized_sentiment = (100 - factors.regional_sentiment) / 200
    contributing_factors = {
        "sentiment": WEIGHTS["regional_sentiment"] * normalized_sentiment * 100,
        "disasters": WEIGHTS["active_disasters"] * factors.active_disasters * 100,
        "vessels": WEIGHTS["vessel_anomalies"] * factors.vessel_anomalies * 100,
        "tariffs": WEIGHTS["tariff_exposure"] * factors.tariff_exposure * 100,
        "historical": WEIGHTS["historical_rate"] * factors.historical_rate * 100,
    }

    return DisruptionScoreResponse(
        route_id=route_id,
        disruption_probability=round(probability, 2),
        risk_level=risk_level,
        contributing_factors=contributing_factors,
        timestamp=datetime.utcnow()
    )


@router.post("/route-risk", response_model=RouteRiskResponse)
async def assess_route_risk(request: RouteRiskRequest) -> RouteRiskResponse:
    """
    Comprehensive route risk assessment.

    Fetches real-time data from various sources and calculates disruption probability.
    """
    # TODO: In production, fetch real data from:
    # - GDELT API for sentiment
    # - USGS for earthquakes near route
    # - AISStream for vessel anomalies
    # - Trade policy databases for tariffs

    # For now, use simulated data based on coordinates
    # High risk for Taiwan Strait region
    lat = request.source_coordinates[1]
    lng = request.source_coordinates[0]

    # Simulate risk factors based on geography
    is_asia_pacific = 100 < lng < 140 and 10 < lat < 40
    is_red_sea = 30 < lng < 50 and 10 < lat < 30

    factors = RiskFactors(
        regional_sentiment=-40 if is_asia_pacific else 20,
        active_disasters=0.7 if is_asia_pacific else 0.2,
        vessel_anomalies=0.5 if is_red_sea else 0.1,
        tariff_exposure=0.6 if is_asia_pacific else 0.2,
        historical_rate=0.4 if is_asia_pacific else 0.1,
    )

    probability = calculate_disruption_score(factors)

    return RouteRiskResponse(
        route_id=request.route_id,
        disruption_probability=round(probability, 2),
        risk_level=determine_risk_level(probability),
        factors={
            "sentiment": factors.regional_sentiment,
            "disasters": factors.active_disasters,
            "vessels": factors.vessel_anomalies,
            "tariffs": factors.tariff_exposure,
            "historical": factors.historical_rate,
        },
        recommendations=get_recommendations(probability, factors)
    )


@router.get("/batch")
async def get_batch_predictions(route_ids: str) -> dict:
    """
    Get disruption predictions for multiple routes.

    Args:
        route_ids: Comma-separated list of route IDs
    """
    ids = [r.strip() for r in route_ids.split(",")]

    # Simulated predictions for demo
    predictions = {}
    for route_id in ids:
        # Vary risk based on route ID for demo
        if "taiwan" in route_id.lower() or "tsmc" in route_id.lower():
            predictions[route_id] = {"probability": 72, "risk_level": "critical"}
        elif "red-sea" in route_id.lower() or "rotterdam" in route_id.lower():
            predictions[route_id] = {"probability": 65, "risk_level": "high"}
        else:
            predictions[route_id] = {"probability": 25, "risk_level": "low"}

    return {
        "success": True,
        "count": len(predictions),
        "predictions": predictions,
        "timestamp": datetime.utcnow().isoformat()
    }
