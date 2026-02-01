"""LangChain risk analysis agent."""
from langchain.agents import create_agent
from langchain.agents.structured_output import ToolStrategy
from langchain_openai import ChatOpenAI
from typing import Dict, Any

from src.config import config
from src.schemas.output import RiskAssessment
from src.agent.prompts import RISK_ANALYSIS_SYSTEM_PROMPT
from src.agent.tools import (
    get_event_details,
    calculate_impact_radius_tool,
    query_affected_nodes,
    query_affected_connections,
    find_alternative_suppliers,
    find_alternative_routes,
    get_connection_details,
    get_supplier_materials,
    calculate_distance_tool
)

def create_risk_agent():
    """
    Create LangChain agent with tools and structured output.

    Returns:
        Configured LangChain agent
    """
    llm = ChatOpenAI(
        model=config.OPENAI_MODEL,
        temperature=config.AGENT_TEMPERATURE,
        api_key=config.OPENAI_API_KEY
    )

    tools = [
        get_event_details,
        calculate_impact_radius_tool,
        query_affected_nodes,
        query_affected_connections,
        find_alternative_suppliers,
        find_alternative_routes,
        get_connection_details,
        get_supplier_materials,
        calculate_distance_tool
    ]

    agent = create_agent(
        model=llm,
        tools=tools,
        system_prompt=RISK_ANALYSIS_SYSTEM_PROMPT,
        response_format=ToolStrategy(RiskAssessment)
    )

    return agent

async def analyze_event_risk(event_id: str) -> RiskAssessment:
    """
    Main entry point: analyze supply chain risk for a new event.

    Args:
        event_id: UUID of the event to analyze

    Returns:
        Structured RiskAssessment output
    """
    agent = create_risk_agent()

    result = agent.invoke({
        "messages": [{
            "role": "user",
            "content": f"Analyze supply chain risk for event_id: {event_id}. Identify all affected nodes and connections, categorize the risk, provide reasoning, and suggest alternatives if needed."
        }]
    })

    return result["structured_response"]
