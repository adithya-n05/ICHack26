"""Deterministic risk analysis with LLM-based assessment."""
from langchain_openai import ChatOpenAI
from typing import Dict, Any

from src.config import config
from src.schemas.output import RiskAssessment
from src.agent.data_gathering import gather_risk_context, update_affected_entities_status

# Simplified prompt for deterministic approach
ASSESSMENT_PROMPT = """You are a supply chain risk analyst. Based on the complete context provided below, generate a risk assessment.

## Event Context
{event_context}

## Risk Categories
- healthy: No impact, normal operations
- monitoring: Minor concern, watching situation
- at-risk: Significant risk, disruption possible
- critical: Imminent disruption, high probability
- disrupted: Confirmed disruption, route/supplier blocked

## Your Task
Analyze the data and provide:
1. **risk_category**: Choose one of the 5 categories above
2. **severity_score**: 1-10 numerical score
3. **confidence**: 0.0-1.0 (how certain are you?)
4. **reasoning**: Clear explanation (2-3 sentences) of why you chose this category
5. **affected_entities**: List of impacted nodes and connections (already provided in context)
6. **alternatives**: List of suggested alternatives (already provided in context)

Be data-driven and conservative - when in doubt, escalate the risk category.

Return your assessment in JSON format matching the RiskAssessment schema."""

async def analyze_event_risk(event_id: str) -> RiskAssessment:
    """
    Main entry point: analyze supply chain risk for a new event.

    Uses deterministic data gathering followed by a single LLM call.

    Args:
        event_id: UUID of the event to analyze

    Returns:
        Structured RiskAssessment output
    """
    # Step 1: Gather all context deterministically
    print(f"[Risk Agent] Gathering context for event {event_id}...")
    context = await gather_risk_context(event_id)

    print(f"[Risk Agent] Found {context['summary_stats']['total_affected_nodes']} affected nodes, "
          f"{context['summary_stats']['total_affected_connections']} affected connections")

    # Step 2: Format context for LLM
    event_context = f"""
**Event Details:**
- Type: {context['event']['type']}
- Title: {context['event']['title']}
- Severity: {context['event']['severity']}/10
- Location: {context['event']['location']}
- Impact Radius: {context['impact_radius_km']}km

**Affected Nodes ({len(context['affected_nodes'])}):**
{_format_nodes(context['affected_nodes'])}

**Affected Connections ({len(context['affected_connections'])}):**
{_format_connections(context['affected_connections'])}

**Alternative Suppliers Available ({len(context['alternative_supplier_candidates'])}):**
{_format_alternatives(context['alternative_supplier_candidates'])}

**Alternative Routes Available ({len(context['alternative_route_candidates'])}):**
{_format_route_alternatives(context['alternative_route_candidates'])}
"""

    # Step 3: Make single LLM call for assessment
    llm = ChatOpenAI(
        model=config.OPENAI_MODEL,
        temperature=config.AGENT_TEMPERATURE,
        api_key=config.OPENAI_API_KEY
    )

    prompt = ASSESSMENT_PROMPT.format(event_context=event_context)

    # Use function calling instead of structured output (more compatible with complex schemas)
    structured_llm = llm.with_structured_output(RiskAssessment, method="function_calling")
    assessment = structured_llm.invoke(prompt)

    # Step 4: Populate affected_entities from gathered data
    affected_entities = []

    # Add affected nodes
    for node in context['affected_nodes']:
        affected_entities.append({
            'type': 'node',
            'id': node['id'],
            'name': node['name'],
            'distance_km': node['distance_km'],
            'status': assessment.risk_category
        })

    # Add affected connections
    for conn in context['affected_connections']:
        affected_entities.append({
            'type': 'connection',
            'id': conn['id'],
            'name': f"{conn['from_node_id']} → {conn['to_node_id']}",
            'status': assessment.risk_category
        })

    assessment.affected_entities = affected_entities

    # Add alternatives as simple dict
    assessment.alternatives = {
        'suppliers': context['alternative_supplier_candidates'][:5],
        'routes': context['alternative_route_candidates'][:5]
    }

    print(f"[Risk Agent] Assessment complete: {assessment.risk_category} (confidence: {assessment.confidence})")

    # Step 5: Update database with affected entity statuses
    await update_affected_entities_status(affected_entities, assessment.risk_category)

    return assessment


def _format_nodes(nodes):
    if not nodes:
        return "None"
    return "\n".join([
        f"  - {node['name']} ({node['type']}) - {node['distance_km']}km away"
        for node in nodes[:10]  # Limit to top 10
    ])


def _format_connections(connections):
    if not connections:
        return "None"
    return "\n".join([
        f"  - {conn['id']}: {conn['from_node_id']} → {conn['to_node_id']} ({conn['transport_mode']})"
        for conn in connections[:10]
    ])


def _format_alternatives(alternatives):
    if not alternatives:
        return "None"
    return "\n".join([
        f"  - {alt['name']} ({alt['type']}) - {alt['distance_km']}km away, score: {alt['similarity_score']}"
        for alt in alternatives[:5]
    ])


def _format_route_alternatives(alternatives):
    if not alternatives:
        return "None"
    return "\n".join([
        f"  - {alt['id']}: {alt['from_node_id']} → {alt['to_node_id']} ({alt['transport_mode']}) - {alt['min_distance_from_event_km']}km from event"
        for alt in alternatives[:5]
    ])
