"""
LangGraph Simulation Agent for Sentinel-Zero

Implements AI-powered "what-if" scenario simulation using LangGraph.
Following Context7 best practices:
- TypedDict for state management
- @tool decorator for tools
- Annotated types with operator.add for list state
- create_react_agent for the agent
"""

from typing import TypedDict, Annotated, List, Dict, Any
import operator
from datetime import datetime

from langchain_core.tools import tool
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from langchain_anthropic import ChatAnthropic
from langgraph.prebuilt import create_react_agent
from pydantic import BaseModel, Field


# ============ State Definition (Context7 best practice: TypedDict) ============

class SimulationState(TypedDict):
    """State for the simulation agent workflow"""
    messages: Annotated[List[BaseMessage], operator.add]
    query: str
    affected_routes: List[str]
    disruption_scores: Dict[str, float]
    alternatives: List[Dict[str, Any]]
    cost_impact: float
    summary: str


# ============ Pydantic Models for Tool Inputs ============

class RouteQuery(BaseModel):
    """Input for finding affected routes"""
    region: str = Field(description="Geographic region to analyze (e.g., 'Taiwan', 'Red Sea')")
    product_type: str = Field(default="all", description="Product category to filter")


class DisruptionInput(BaseModel):
    """Input for calculating disruption"""
    route_id: str = Field(description="Route identifier")
    scenario: Dict[str, Any] = Field(description="Scenario parameters (e.g., {'tariff_increase': 50})")


class AlternativeQuery(BaseModel):
    """Input for finding alternatives"""
    product: str = Field(description="Product category to find alternatives for")
    exclude_regions: List[str] = Field(description="Regions to exclude from search")


# ============ Simulation Tools (Context7 best practice: @tool decorator) ============

@tool
def get_affected_routes(region: str, product_type: str = "all") -> Dict[str, Any]:
    """
    Find supply routes that pass through or are affected by the specified region.

    Args:
        region: Geographic region to analyze (e.g., 'Taiwan', 'Red Sea', 'China')
        product_type: Product category to filter (default: 'all')

    Returns:
        Dictionary with affected routes and their current status
    """
    # Simulated route database
    routes_db = {
        "Taiwan": [
            {"id": "tsmc-shenzhen", "name": "TSMC to Shenzhen", "product": "semiconductors", "current_risk": 72},
            {"id": "taiwan-japan", "name": "Taiwan to Japan", "product": "electronics", "current_risk": 65},
        ],
        "Red Sea": [
            {"id": "shanghai-rotterdam", "name": "Shanghai to Rotterdam", "product": "all", "current_risk": 68},
            {"id": "singapore-suez", "name": "Singapore to Suez", "product": "all", "current_risk": 70},
        ],
        "China": [
            {"id": "shenzhen-shanghai", "name": "Shenzhen to Shanghai", "product": "electronics", "current_risk": 45},
            {"id": "shanghai-la", "name": "Shanghai to Los Angeles", "product": "all", "current_risk": 35},
        ],
    }

    region_lower = region.lower()
    affected = []

    for r, route_list in routes_db.items():
        if region_lower in r.lower():
            for route in route_list:
                if product_type == "all" or product_type.lower() in route["product"].lower():
                    affected.append(route)

    return {
        "region": region,
        "product_filter": product_type,
        "affected_routes": affected,
        "count": len(affected)
    }


@tool
def calculate_disruption_score(route_id: str, tariff_change: float = 0, disaster_severity: float = 0) -> Dict[str, Any]:
    """
    Calculate updated disruption probability for a route under a simulated scenario.

    Args:
        route_id: Identifier of the route to analyze
        tariff_change: Percentage change in tariffs (e.g., 50 for 50% increase)
        disaster_severity: Disaster severity factor (0-1)

    Returns:
        Updated disruption score and breakdown
    """
    # Base scores for known routes
    base_scores = {
        "tsmc-shenzhen": {"base": 72, "sentiment": -40, "tariff": 0.3},
        "shanghai-la": {"base": 25, "sentiment": 20, "tariff": 0.2},
        "shanghai-rotterdam": {"base": 65, "sentiment": -20, "tariff": 0.4},
        "taiwan-japan": {"base": 55, "sentiment": -30, "tariff": 0.1},
    }

    route_data = base_scores.get(route_id, {"base": 30, "sentiment": 0, "tariff": 0.2})
    base = route_data["base"]

    # Apply scenario modifiers
    tariff_impact = (tariff_change / 100) * 25  # Tariff contributes up to 25 points
    disaster_impact = disaster_severity * 30  # Disaster contributes up to 30 points

    new_score = min(100, base + tariff_impact + disaster_impact)

    return {
        "route_id": route_id,
        "original_score": base,
        "new_score": round(new_score, 1),
        "change": round(new_score - base, 1),
        "factors": {
            "tariff_impact": round(tariff_impact, 1),
            "disaster_impact": round(disaster_impact, 1),
        },
        "risk_level": "critical" if new_score >= 70 else "high" if new_score >= 50 else "medium" if new_score >= 30 else "low"
    }


@tool
def find_alternative_suppliers(product: str, exclude_regions: List[str]) -> Dict[str, Any]:
    """
    Find alternative suppliers for a product category outside excluded regions.

    Args:
        product: Product category (e.g., 'semiconductors', 'electronics')
        exclude_regions: List of regions to exclude

    Returns:
        Ranked list of alternative suppliers with metrics
    """
    # Alternative supplier database
    alternatives_db = [
        {"name": "Samsung Foundry", "region": "South Korea", "product": "semiconductors",
         "risk_score": 23, "cost_delta": 8, "lead_time": 52, "capacity": 85},
        {"name": "Intel Foundry Services", "region": "USA", "product": "semiconductors",
         "risk_score": 12, "cost_delta": 22, "lead_time": 38, "capacity": 70},
        {"name": "GlobalFoundries Dresden", "region": "Germany", "product": "semiconductors",
         "risk_score": 18, "cost_delta": 15, "lead_time": 48, "capacity": 78},
        {"name": "SMIC", "region": "China", "product": "semiconductors",
         "risk_score": 55, "cost_delta": -5, "lead_time": 40, "capacity": 60},
        {"name": "Foxconn Mexico", "region": "Mexico", "product": "electronics",
         "risk_score": 25, "cost_delta": 10, "lead_time": 25, "capacity": 80},
        {"name": "Flex Malaysia", "region": "Malaysia", "product": "electronics",
         "risk_score": 20, "cost_delta": 5, "lead_time": 35, "capacity": 75},
    ]

    exclude_lower = [r.lower() for r in exclude_regions]

    # Filter by product and region
    candidates = [
        alt for alt in alternatives_db
        if product.lower() in alt["product"].lower() and
        not any(excl in alt["region"].lower() for excl in exclude_lower)
    ]

    # Rank by composite score: lower risk + lower cost + higher capacity
    for alt in candidates:
        alt["score"] = (100 - alt["risk_score"]) * 0.4 + (100 - alt["cost_delta"]) * 0.3 + alt["capacity"] * 0.3

    candidates.sort(key=lambda x: x["score"], reverse=True)

    # Add rank
    for i, alt in enumerate(candidates):
        alt["rank"] = i + 1

    return {
        "product": product,
        "excluded_regions": exclude_regions,
        "alternatives": candidates[:5],  # Top 5
        "count": len(candidates)
    }


@tool
def generate_simulation_summary(
    query: str,
    affected_routes: List[str],
    risk_changes: Dict[str, float],
    alternatives: List[Dict[str, Any]]
) -> str:
    """
    Generate a natural language summary of the simulation results.

    Args:
        query: Original user query
        affected_routes: List of affected route IDs
        risk_changes: Dictionary of route_id -> risk change percentage
        alternatives: List of recommended alternative suppliers

    Returns:
        Human-readable summary of the simulation
    """
    summary_parts = [f"**Simulation Analysis: {query}**\n"]

    if affected_routes:
        summary_parts.append(f"**Affected Routes:** {len(affected_routes)} routes identified")
        for route_id in affected_routes[:3]:
            change = risk_changes.get(route_id, 0)
            direction = "increased" if change > 0 else "decreased"
            summary_parts.append(f"  - {route_id}: Risk {direction} by {abs(change):.1f}%")

    if alternatives:
        summary_parts.append(f"\n**Recommended Alternatives:**")
        for alt in alternatives[:3]:
            summary_parts.append(
                f"  {alt['rank']}. {alt['name']} ({alt['region']}) - "
                f"Risk: {alt['risk_score']}%, Cost: +{alt['cost_delta']}%"
            )

    avg_increase = sum(risk_changes.values()) / len(risk_changes) if risk_changes else 0
    summary_parts.append(f"\n**Overall Impact:** Average risk increase of {avg_increase:.1f}%")

    if avg_increase > 20:
        summary_parts.append("**Recommendation:** Immediate action recommended to diversify supply chain")
    elif avg_increase > 10:
        summary_parts.append("**Recommendation:** Monitor situation and prepare contingency plans")
    else:
        summary_parts.append("**Recommendation:** Maintain current monitoring levels")

    return "\n".join(summary_parts)


# ============ Agent Creation (Context7 best practice: create_react_agent) ============

def create_simulation_agent(anthropic_api_key: str | None = None):
    """
    Create the LangGraph simulation agent.

    Args:
        anthropic_api_key: Optional API key (uses env var if not provided)

    Returns:
        Compiled LangGraph agent
    """
    # Initialize the model
    model = ChatAnthropic(
        model="claude-3-5-sonnet-20241022",
        temperature=0.1,
        api_key=anthropic_api_key
    )

    # Define the tools
    tools = [
        get_affected_routes,
        calculate_disruption_score,
        find_alternative_suppliers,
        generate_simulation_summary,
    ]

    # System prompt for the agent
    system_prompt = """You are a supply chain simulation assistant for Sentinel-Zero.
Your role is to analyze "what-if" scenarios and provide actionable insights.

When a user asks about a scenario (e.g., "What if 50% tariff on Taiwan semiconductors?"):
1. First, identify affected routes using get_affected_routes
2. Calculate new disruption scores using calculate_disruption_score for each affected route
3. Find alternative suppliers using find_alternative_suppliers
4. Generate a comprehensive summary using generate_simulation_summary

Always provide specific, actionable recommendations based on the data.
Be concise but thorough in your analysis."""

    # Create the agent using create_react_agent (Context7 best practice)
    agent = create_react_agent(
        model=model,
        tools=tools,
        prompt=system_prompt,
    )

    return agent


# ============ Simulation Runner ============

async def run_simulation(query: str, api_key: str | None = None) -> Dict[str, Any]:
    """
    Run a simulation for the given query.

    Args:
        query: User's "what-if" scenario query
        api_key: Optional Anthropic API key

    Returns:
        Simulation results including affected routes, new scores, and recommendations
    """
    agent = create_simulation_agent(api_key)

    # Run the agent
    result = await agent.ainvoke({
        "messages": [HumanMessage(content=query)]
    })

    # Extract the final response
    messages = result.get("messages", [])
    final_message = messages[-1] if messages else None

    return {
        "query": query,
        "response": final_message.content if final_message else "No response generated",
        "timestamp": datetime.utcnow().isoformat(),
        "success": True
    }


# ============ FastAPI Router ============

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel


class SimulationRequest(BaseModel):
    """Request model for simulation"""
    query: str = Field(description="What-if scenario query")


class SimulationResponse(BaseModel):
    """Response model for simulation"""
    query: str
    response: str
    timestamp: str
    success: bool


router = APIRouter(prefix="/api/simulate", tags=["Simulation"])


@router.post("/", response_model=SimulationResponse)
async def simulate_scenario(request: SimulationRequest) -> SimulationResponse:
    """
    Run a what-if simulation scenario.

    Example queries:
    - "What if 50% tariff on Taiwan semiconductors?"
    - "What if earthquake disrupts Japan ports?"
    - "What if Red Sea conflict continues for 6 months?"
    """
    try:
        result = await run_simulation(request.query)
        return SimulationResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")


@router.get("/health")
async def simulation_health():
    """Check if simulation service is available"""
    return {"status": "ok", "service": "simulation_agent"}
