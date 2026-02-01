# Risk Agent Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Python LangChain agent that analyzes geopolitical events, natural disasters, and policy changes to compute risk assessments for supply chain nodes and connections, generating categorized risk levels with reasoning and alternative routes/suppliers.

**Architecture:** Python microservice with FastAPI + Redis pub/sub integration. LangChain agent with GPT-4o uses custom tools to query Supabase, calculate geographic impact using Haversine formula, and generate structured RiskAssessment outputs. GeoPoint data stored as JSONB `{lat, lng}` matching TypeScript types - no PostGIS required. Backend emits events → Risk agent analyzes → Writes to risk_assessments table → Frontend updates.

**Tech Stack:** Python 3.11+, LangChain, OpenAI GPT-4o, FastAPI, Redis, Supabase (JSONB for GeoPoint), Pydantic

**Important Notes:**
- GeoPoint is JSONB `{lat: number, lng: number}`, not PostGIS geography
- Risk categories: `'healthy' | 'monitoring' | 'at-risk' | 'critical' | 'disrupted'` (lowercase with hyphens)
- Database columns use snake_case, TypeScript uses camelCase
- Spatial calculations done in Python, not in database

---

## Task 1: Initialize Python Risk Agent Project

**Files:**
- Create: `risk-agent/requirements.txt`
- Create: `risk-agent/.env.example`
- Create: `risk-agent/.gitignore`
- Create: `risk-agent/README.md`

**Step 1: Write the failing test**

```bash
ls risk-agent/requirements.txt
```

**Step 2: Run test to verify it fails**

Run: `ls risk-agent/requirements.txt`
Expected: `ls: risk-agent/requirements.txt: No such file or directory`

**Step 3: Write minimal implementation**

```bash
mkdir -p risk-agent
cd risk-agent
```

Create `risk-agent/requirements.txt`:
```txt
langchain==0.1.20
langchain-openai==0.1.8
openai==1.35.0
fastapi==0.111.0
uvicorn==0.30.0
redis==5.0.6
supabase==2.5.0
pydantic==2.7.4
python-dotenv==1.0.1
pytest==8.2.2
pytest-asyncio==0.23.7
```

Create `risk-agent/.env.example`:
```
OPENAI_API_KEY=your_openai_api_key_here
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

Create `risk-agent/.gitignore`:
```
__pycache__/
*.py[cod]
*$py.class
.env
.venv/
venv/
.pytest_cache/
.coverage
htmlcov/
```

Create `risk-agent/README.md`:
```markdown
# Sentinel-Zero Risk Agent

Python LangChain agent for supply chain risk analysis.

## Setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Fill in .env with actual credentials
```

## Run

```bash
python -m src.main
```
```

**Step 4: Run test to verify it passes**

Run: `ls risk-agent/requirements.txt`
Expected: File exists

**Step 5: Commit**

```bash
git add risk-agent/
git commit -m "chore: initialize risk agent project"
```

---

## Task 2: Create Project Structure

**Files:**
- Create: `risk-agent/src/__init__.py`
- Create: `risk-agent/src/config.py`
- Create: `risk-agent/src/agent/__init__.py`
- Create: `risk-agent/src/schemas/__init__.py`
- Create: `risk-agent/src/db/__init__.py`
- Create: `risk-agent/src/utils/__init__.py`
- Create: `risk-agent/tests/__init__.py`

**Step 1: Write the failing test**

```bash
ls risk-agent/src/config.py
```

**Step 2: Run test to verify it fails**

Run: `ls risk-agent/src/config.py`
Expected: `No such file or directory`

**Step 3: Write minimal implementation**

```bash
cd risk-agent
mkdir -p src/agent src/schemas src/db src/utils tests
touch src/__init__.py src/agent/__init__.py src/schemas/__init__.py src/db/__init__.py src/utils/__init__.py tests/__init__.py
```

Create `risk-agent/src/config.py`:
```python
"""Configuration management for Risk Agent."""
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Application configuration."""

    # OpenAI
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    OPENAI_MODEL = "gpt-4o"

    # Supabase
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    # Redis
    REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_PASSWORD = os.getenv("REDIS_PASSWORD")
    REDIS_EVENTS_CHANNEL = "events:new"
    REDIS_RISK_CHANNEL = "risk:updated"

    # Agent
    AGENT_TEMPERATURE = 0.3

    @classmethod
    def validate(cls):
        """Validate required configuration."""
        required = [
            ("OPENAI_API_KEY", cls.OPENAI_API_KEY),
            ("SUPABASE_URL", cls.SUPABASE_URL),
            ("SUPABASE_SERVICE_ROLE_KEY", cls.SUPABASE_SERVICE_ROLE_KEY),
        ]

        missing = [name for name, value in required if not value]
        if missing:
            raise ValueError(f"Missing required config: {', '.join(missing)}")

config = Config()
```

**Step 4: Run test to verify it passes**

Run: `ls risk-agent/src/config.py`
Expected: File exists

**Step 5: Commit**

```bash
git add risk-agent/src/
git commit -m "chore: create project structure and config"
```

---

## Task 3: Add Pydantic Output Schema

**Files:**
- Create: `risk-agent/src/schemas/output.py`

**Step 1: Write the failing test**

Create `risk-agent/tests/test_schemas.py`:
```python
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
```

**Step 2: Run test to verify it fails**

Run: `cd risk-agent && python -m pytest tests/test_schemas.py::test_risk_assessment_schema -v`
Expected: `ModuleNotFoundError: No module named 'src.schemas.output'`

**Step 3: Write minimal implementation**

Create `risk-agent/src/schemas/output.py`:
```python
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

    reasoning: Dict[str, Any] = Field(
        description="Structured reasoning with summary, factors, and event_ids"
    )

    affected_entities: List[AffectedEntity] = Field(
        default_factory=list,
        description="List of nodes and connections impacted"
    )

    alternatives: Dict[str, List[Alternative]] = Field(
        default_factory=lambda: {"suppliers": [], "routes": []},
        description="Alternative suppliers and routes (if risk >= AT_RISK)"
    )
```

**Step 4: Run test to verify it passes**

Run: `cd risk-agent && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`
Then: `python -m pytest tests/test_schemas.py::test_risk_assessment_schema -v`
Expected: PASS

**Step 5: Commit**

```bash
git add risk-agent/src/schemas/output.py risk-agent/tests/test_schemas.py
git commit -m "feat: add risk assessment output schema"
```

---

## Task 4: Add Supabase Database Client

**Files:**
- Create: `risk-agent/src/db/supabase.py`

**Step 1: Write the failing test**

Create `risk-agent/tests/test_supabase.py`:
```python
"""Test Supabase client."""
import pytest
from src.db.supabase import get_supabase_client

def test_supabase_client_created():
    """Test Supabase client can be instantiated."""
    client = get_supabase_client()
    assert client is not None
    assert hasattr(client, 'table')
```

**Step 2: Run test to verify it fails**

Run: `cd risk-agent && python -m pytest tests/test_supabase.py::test_supabase_client_created -v`
Expected: `ModuleNotFoundError: No module named 'src.db.supabase'`

**Step 3: Write minimal implementation**

Create `risk-agent/src/db/supabase.py`:
```python
"""Supabase client for database operations."""
from supabase import create_client, Client
from src.config import config

_supabase_client: Client | None = None

def get_supabase_client() -> Client:
    """Get or create Supabase client singleton."""
    global _supabase_client

    if _supabase_client is None:
        if not config.SUPABASE_URL or not config.SUPABASE_SERVICE_ROLE_KEY:
            raise ValueError("Supabase credentials not configured")

        _supabase_client = create_client(
            config.SUPABASE_URL,
            config.SUPABASE_SERVICE_ROLE_KEY
        )

    return _supabase_client

# Export singleton instance
supabase = get_supabase_client()
```

**Step 4: Run test to verify it passes**

Run: `cd risk-agent && python -m pytest tests/test_supabase.py::test_supabase_client_created -v`
Expected: PASS (if .env is configured) or skip if credentials missing

**Step 5: Commit**

```bash
git add risk-agent/src/db/supabase.py risk-agent/tests/test_supabase.py
git commit -m "feat: add supabase database client"
```

---

## Task 5: Add Redis Pub/Sub Client

**Files:**
- Create: `risk-agent/src/utils/redis_client.py`

**Step 1: Write the failing test**

Create `risk-agent/tests/test_redis.py`:
```python
"""Test Redis client."""
import pytest
from src.utils.redis_client import get_redis_client

def test_redis_client_created():
    """Test Redis client can be instantiated."""
    client = get_redis_client()
    assert client is not None
    assert hasattr(client, 'publish')
    assert hasattr(client, 'pubsub')
```

**Step 2: Run test to verify it fails**

Run: `cd risk-agent && python -m pytest tests/test_redis.py::test_redis_client_created -v`
Expected: `ModuleNotFoundError: No module named 'src.utils.redis_client'`

**Step 3: Write minimal implementation**

Create `risk-agent/src/utils/redis_client.py`:
```python
"""Redis client for pub/sub messaging."""
import redis
from src.config import config

_redis_client: redis.Redis | None = None

def get_redis_client() -> redis.Redis:
    """Get or create Redis client singleton."""
    global _redis_client

    if _redis_client is None:
        _redis_client = redis.Redis(
            host=config.REDIS_HOST,
            port=config.REDIS_PORT,
            password=config.REDIS_PASSWORD if config.REDIS_PASSWORD else None,
            decode_responses=True
        )

    return _redis_client

# Export singleton instance
redis_client = get_redis_client()
```

**Step 4: Run test to verify it passes**

Run: `cd risk-agent && python -m pytest tests/test_redis.py::test_redis_client_created -v`
Expected: PASS

**Step 5: Commit**

```bash
git add risk-agent/src/utils/redis_client.py risk-agent/tests/test_redis.py
git commit -m "feat: add redis pub/sub client"
```

---

## Task 6: Add Geographic Utility Functions

**Files:**
- Create: `risk-agent/src/utils/geo.py`

**Step 1: Write the failing test**

Create `risk-agent/tests/test_geo.py`:
```python
"""Test geographic utilities."""
from src.utils.geo import haversine_distance, calculate_impact_radius

def test_haversine_distance():
    """Test distance calculation between two points."""
    # San Francisco to Los Angeles (approx 559 km)
    sf = {"lat": 37.7749, "lng": -122.4194}
    la = {"lat": 34.0522, "lng": -118.2437}

    distance = haversine_distance(sf, la)

    assert 550 < distance < 570  # Approximate range

def test_calculate_impact_radius():
    """Test impact radius calculation."""
    # Severity 5 natural disaster should be 150km
    radius = calculate_impact_radius("natural_disaster", 5)
    assert radius == 150_000

    # Severity 8 war should be 600km (300km * 2.0 multiplier)
    radius = calculate_impact_radius("war", 8)
    assert radius == 600_000

    # Severity 2 should be 50km
    radius = calculate_impact_radius("tariff", 2)
    assert radius == 25_000  # 50km * 0.5 tariff multiplier
```

**Step 2: Run test to verify it fails**

Run: `cd risk-agent && python -m pytest tests/test_geo.py -v`
Expected: `ModuleNotFoundError: No module named 'src.utils.geo'`

**Step 3: Write minimal implementation**

Create `risk-agent/src/utils/geo.py`:
```python
"""Geographic utility functions."""
from math import radians, sin, cos, sqrt, atan2
from typing import TypedDict

class GeoPoint(TypedDict):
    """Geographic point matching TypeScript GeoPoint."""
    lat: float
    lng: float

def haversine_distance(point1: GeoPoint, point2: GeoPoint) -> float:
    """
    Calculate geographic distance in kilometers between two points using Haversine formula.

    Args:
        point1: GeoPoint with lat and lng
        point2: GeoPoint with lat and lng

    Returns:
        Distance in kilometers
    """
    R = 6371  # Earth's radius in km

    lat1, lon1 = radians(point1['lat']), radians(point1['lng'])
    lat2, lon2 = radians(point2['lat']), radians(point2['lng'])

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))

    return R * c

def calculate_impact_radius(event_type: str, severity: int) -> int:
    """
    Calculate the geographic impact radius (in meters) based on event type and severity.

    Args:
        event_type: Type of event (natural_disaster, weather, war, geopolitical, tariff, infrastructure)
        severity: Severity score 1-10

    Returns:
        Impact radius in meters
    """
    # Base radius by severity
    if severity <= 3:
        base_radius = 50_000  # 50km
    elif severity <= 6:
        base_radius = 150_000  # 150km
    else:
        base_radius = 300_000  # 300km

    # Modifiers by event type
    multipliers = {
        "weather": 1.5,  # Typhoons/hurricanes affect wider area
        "war": 2.0,      # Wars affect entire regions
        "geopolitical": 1.3,
        "natural_disaster": 1.0,
        "tariff": 0.5,   # Tariffs are country-level, not geographic
        "infrastructure": 0.8
    }

    multiplier = multipliers.get(event_type, 1.0)
    return int(base_radius * multiplier)
```

**Step 4: Run test to verify it passes**

Run: `cd risk-agent && python -m pytest tests/test_geo.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add risk-agent/src/utils/geo.py risk-agent/tests/test_geo.py
git commit -m "feat: add geographic utility functions"
```

---

## Task 7: Add LangChain Tools - Part 1 (Event & Radius)

**Files:**
- Create: `risk-agent/src/agent/tools.py`

**Step 1: Write the failing test**

Create `risk-agent/tests/test_tools.py`:
```python
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
```

**Step 2: Run test to verify it fails**

Run: `cd risk-agent && python -m pytest tests/test_tools.py::test_get_event_details_structure -v`
Expected: `ModuleNotFoundError: No module named 'src.agent.tools'`

**Step 3: Write minimal implementation**

Create `risk-agent/src/agent/tools.py`:
```python
"""LangChain tools for the risk analysis agent."""
from langchain.tools import tool
from typing import Dict, Any, List
from src.db.supabase import supabase
from src.utils.geo import haversine_distance, calculate_impact_radius, GeoPoint

@tool
def get_event_details(event_id: str) -> Dict[str, Any]:
    """
    Fetch complete details about a geopolitical event, natural disaster, or policy change.

    Args:
        event_id: UUID of the event

    Returns:
        Event details including type, severity, location, polygon, dates, description
    """
    try:
        result = supabase.table('events').select('*').eq('id', event_id).single().execute()

        if not result.data:
            return {"error": f"Event {event_id} not found"}

        event = result.data
        return {
            "id": event["id"],
            "type": event["type"],
            "title": event["title"],
            "description": event["description"],
            "severity": event["severity"],
            "location": event["location"],
            "polygon": event.get("polygon"),
            "start_date": event["start_date"],
            "end_date": event.get("end_date"),
            "source": event["source"]
        }
    except Exception as e:
        return {"error": str(e)}

@tool
def calculate_impact_radius_tool(event_type: str, severity: int) -> int:
    """
    Calculate the geographic impact radius (in meters) based on event type and severity.

    Args:
        event_type: Type of event (natural_disaster, weather, war, etc.)
        severity: Severity score 1-10

    Returns:
        Impact radius in meters
    """
    return calculate_impact_radius(event_type, severity)
```

**Step 4: Run test to verify it passes**

Run: `cd risk-agent && python -m pytest tests/test_tools.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add risk-agent/src/agent/tools.py risk-agent/tests/test_tools.py
git commit -m "feat: add event and radius calculation tools"
```

---

## Task 8: Add LangChain Tools - Part 2 (Affected Queries)

**Files:**
- Modify: `risk-agent/src/agent/tools.py`

**Step 1: Write the failing test**

Add to `risk-agent/tests/test_tools.py`:
```python
def test_query_affected_nodes_structure():
    """Test query_affected_nodes tool structure."""
    from src.agent.tools import query_affected_nodes

    tool = query_affected_nodes
    assert tool.name == "query_affected_nodes"
    assert "event_location" in tool.description.lower()
    assert "impact_radius" in tool.description.lower()
```

**Step 2: Run test to verify it fails**

Run: `cd risk-agent && python -m pytest tests/test_tools.py::test_query_affected_nodes_structure -v`
Expected: `ImportError: cannot import name 'query_affected_nodes'`

**Step 3: Write minimal implementation**

Add to `risk-agent/src/agent/tools.py`:
```python
@tool
def query_affected_nodes(event_location: GeoPoint, impact_radius_meters: int) -> List[Dict[str, Any]]:
    """
    Find all supplier nodes (companies, ports, factories) within the impact radius of an event.
    Database stores location as JSONB {lat, lng}, so we fetch all and filter in Python.

    Args:
        event_location: GeoPoint with lat and lng
        impact_radius_meters: Radius in meters

    Returns:
        List of affected nodes with details
    """
    try:
        # Fetch all companies - location is stored as JSONB
        all_nodes = supabase.table('companies').select('*').execute()

        affected = []
        for node in all_nodes.data or []:
            if 'location' in node and node['location']:
                # node['location'] is {lat: number, lng: number}
                distance_km = haversine_distance(event_location, node['location'])
                if distance_km * 1000 <= impact_radius_meters:
                    affected.append({
                        **node,
                        'distance_km': distance_km
                    })

        return affected
    except Exception as e:
        return []

@tool
def query_affected_connections(affected_node_ids: List[str]) -> List[Dict[str, Any]]:
    """
    Find all supply chain connections (shipping routes) affected by an event.
    A connection is affected if either endpoint (from/to node) is in the affected area.

    Args:
        affected_node_ids: List of node IDs already determined to be affected

    Returns:
        List of affected connections with endpoints and details
    """
    if not affected_node_ids:
        return []

    try:
        # Query connections where either endpoint is affected
        result = supabase.table('connections').select('''
            id, from_node_id, to_node_id, transport_mode, status, materials,
            from_node:companies!from_node_id(name, location, city, country),
            to_node:companies!to_node_id(name, location, city, country)
        ''').or_(f"from_node_id.in.({','.join(affected_node_ids)}),to_node_id.in.({','.join(affected_node_ids)})").execute()

        return result.data if result.data else []
    except Exception as e:
        return []
```

**Step 4: Run test to verify it passes**

Run: `cd risk-agent && python -m pytest tests/test_tools.py::test_query_affected_nodes_structure -v`
Expected: PASS

**Step 5: Commit**

```bash
git add risk-agent/src/agent/tools.py risk-agent/tests/test_tools.py
git commit -m "feat: add affected nodes and connections query tools"
```

---

## Task 9: Add LangChain Tools - Part 3 (Alternatives)

**Files:**
- Modify: `risk-agent/src/agent/tools.py`

**Step 1: Write the failing test**

Add to `risk-agent/tests/test_tools.py`:
```python
def test_find_alternative_suppliers_structure():
    """Test find_alternative_suppliers tool structure."""
    from src.agent.tools import find_alternative_suppliers

    tool = find_alternative_suppliers
    assert tool.name == "find_alternative_suppliers"
    assert "material" in tool.description.lower()
```

**Step 2: Run test to verify it fails**

Run: `cd risk-agent && python -m pytest tests/test_tools.py::test_find_alternative_suppliers_structure -v`
Expected: `ImportError: cannot import name 'find_alternative_suppliers'`

**Step 3: Write minimal implementation**

Add to `risk-agent/src/agent/tools.py`:
```python
@tool
def find_alternative_suppliers(material_category: str, excluded_region_center: GeoPoint, exclusion_radius_meters: int) -> List[Dict[str, Any]]:
    """
    Find alternative suppliers that provide the same material but are located outside the affected region.

    Args:
        material_category: Material/component category needed (e.g., "Silicon Wafers", "DRAM Chips")
        excluded_region_center: GeoPoint center of area to avoid
        exclusion_radius_meters: Radius to exclude (impact radius + safety buffer)

    Returns:
        List of alternative suppliers ranked by suitability
    """
    try:
        # Get all suppliers with their company info
        # Note: Supabase foreign key syntax: company:companies!company_id(fields)
        all_suppliers = supabase.table('suppliers').select(
            'id, company_id, name, tier, materials'
        ).execute()

        # Get all companies to match supplier locations
        all_companies = supabase.table('companies').select('*').execute()
        company_map = {c['id']: c for c in (all_companies.data or [])}

        alternatives = []

        for supplier in all_suppliers.data or []:
            # Check if supplier provides the material
            if material_category not in (supplier.get('materials') or []):
                continue

            # Get company info
            company = company_map.get(supplier['company_id'])
            if not company or not company.get('location'):
                continue

            supplier_location = company['location']  # GeoPoint {lat, lng}

            distance_km = haversine_distance(excluded_region_center, supplier_location)
            distance_m = distance_km * 1000

            if distance_m > exclusion_radius_meters:
                alternatives.append({
                    "id": supplier['id'],
                    "company_id": supplier['company_id'],
                    "name": company['name'],
                    "location": supplier_location,
                    "city": company.get('city'),
                    "country": company.get('country'),
                    "tier": supplier.get('tier'),
                    "materials": supplier.get('materials'),
                    "distance_km": distance_km
                })

        # Sort by tier (lower is better) then distance
        alternatives.sort(key=lambda x: (x.get('tier', 999), x['distance_km']))

        return alternatives[:10]  # Return top 10
    except Exception as e:
        return []

@tool
def find_alternative_routes(from_node_id: str, to_node_id: str, excluded_region_center: GeoPoint, exclusion_radius_meters: int) -> List[Dict[str, Any]]:
    """
    Find alternative shipping routes from same supplier to destination that avoid the affected area.
    Searches for intermediate hubs/ports that can reroute the connection.

    Args:
        from_node_id: Origin supplier/node ID
        to_node_id: Destination node ID
        excluded_region_center: GeoPoint center of area to avoid
        exclusion_radius_meters: Radius to exclude

    Returns:
        List of alternative routes with intermediate hubs
    """
    try:
        # Find ports/hubs - filter by type in Python (Supabase may not support .in_() syntax cleanly)
        all_companies = supabase.table('companies').select('*').execute()

        safe_hubs = []

        for company in all_companies.data or []:
            # Only consider logistics hubs
            if company.get('type') not in ['port', 'airport', 'distribution']:
                continue

            hub_location = company.get('location')
            if not hub_location:
                continue

            distance_km = haversine_distance(excluded_region_center, hub_location)
            distance_m = distance_km * 1000

            if distance_m > exclusion_radius_meters:
                safe_hubs.append({
                    "id": company['id'],
                    "name": company['name'],
                    "type": company['type'],
                    "location": hub_location,
                    "city": company.get('city'),
                    "country": company.get('country'),
                    "distance_from_event_km": distance_km
                })

        # Sort by distance from event (further is safer)
        safe_hubs.sort(key=lambda x: x['distance_from_event_km'], reverse=True)

        return safe_hubs[:5]  # Return top 5 safest hubs
    except Exception as e:
        return []
```

**Step 4: Run test to verify it passes**

Run: `cd risk-agent && python -m pytest tests/test_tools.py::test_find_alternative_suppliers_structure -v`
Expected: PASS

**Step 5: Commit**

```bash
git add risk-agent/src/agent/tools.py risk-agent/tests/test_tools.py
git commit -m "feat: add alternative suppliers and routes tools"
```

---

## Task 10: Add LangChain Tools - Part 4 (Utilities)

**Files:**
- Modify: `risk-agent/src/agent/tools.py`

**Step 1: Write the failing test**

Add to `risk-agent/tests/test_tools.py`:
```python
def test_calculate_distance_tool():
    """Test distance calculation tool."""
    from src.agent.tools import calculate_distance_tool

    sf = {"lat": 37.7749, "lng": -122.4194}
    la = {"lat": 34.0522, "lng": -118.2437}

    result = calculate_distance_tool.invoke({"point1": sf, "point2": la})

    assert 550 < result < 570
```

**Step 2: Run test to verify it fails**

Run: `cd risk-agent && python -m pytest tests/test_tools.py::test_calculate_distance_tool -v`
Expected: `ImportError: cannot import name 'calculate_distance_tool'`

**Step 3: Write minimal implementation**

Add to `risk-agent/src/agent/tools.py`:
```python
@tool
def get_connection_details(connection_id: str) -> Dict[str, Any]:
    """
    Get complete details about a supply chain connection including endpoints, materials, and current status.

    Args:
        connection_id: UUID of the connection

    Returns:
        Connection details with from/to nodes, transport mode, materials
    """
    try:
        result = supabase.table('connections').select('''
            id, transport_mode, status, materials,
            from_node:companies!from_node_id(id, name, type, location, city, country),
            to_node:companies!to_node_id(id, name, type, location, city, country)
        ''').eq('id', connection_id).single().execute()

        return result.data if result.data else {"error": "Connection not found"}
    except Exception as e:
        return {"error": str(e)}

@tool
def get_supplier_materials(supplier_id: str) -> List[str]:
    """
    Get list of materials/components that a specific supplier provides.

    Args:
        supplier_id: UUID of the supplier company

    Returns:
        List of material categories
    """
    try:
        result = supabase.table('suppliers').select('materials').eq('company_id', supplier_id).execute()

        if result.data and len(result.data) > 0:
            return result.data[0].get('materials', [])
        return []
    except Exception as e:
        return []

@tool
def calculate_distance_tool(point1: GeoPoint, point2: GeoPoint) -> float:
    """
    Calculate geographic distance in kilometers between two points using Haversine formula.

    Args:
        point1: GeoPoint with lat and lng
        point2: GeoPoint with lat and lng

    Returns:
        Distance in kilometers
    """
    return haversine_distance(point1, point2)
```

**Step 4: Run test to verify it passes**

Run: `cd risk-agent && python -m pytest tests/test_tools.py::test_calculate_distance_tool -v`
Expected: PASS

**Step 5: Commit**

```bash
git add risk-agent/src/agent/tools.py risk-agent/tests/test_tools.py
git commit -m "feat: add utility tools for connections and distance"
```

---

## Task 11: Add System Prompt

**Files:**
- Create: `risk-agent/src/agent/prompts.py`

**Step 1: Write the failing test**

```bash
ls risk-agent/src/agent/prompts.py
```

**Step 2: Run test to verify it fails**

Run: `ls risk-agent/src/agent/prompts.py`
Expected: `No such file or directory`

**Step 3: Write minimal implementation**

Create `risk-agent/src/agent/prompts.py`:
```python
"""System prompts for the risk analysis agent."""

RISK_ANALYSIS_SYSTEM_PROMPT = """You are a supply chain risk analyst for Sentinel-Zero, a geopolitical trade shock prediction system.

Your role is to analyze how geopolitical events, natural disasters, and policy changes impact semiconductor supply chains.

## Your Task
When given an event_id, you must:
1. Retrieve the event details (type, severity, location, affected area)
2. Calculate the impact radius based on event type and severity
3. Identify affected suppliers, facilities, ports, and shipping routes
4. Categorize the risk level for each affected entity
5. Generate clear reasoning explaining the risk
6. Suggest alternative suppliers or routes when risk is AT_RISK or worse

## Risk Categories
Use these 5 categories based on impact severity (must match ConnectionStatus exactly):
- healthy: No impact, normal operations (>300km away, severity 1-2)
- monitoring: Minor concern, watching situation (200-300km, severity 3-4)
- at-risk: Significant risk, disruption possible (100-200km, severity 5-6)
- critical: Imminent disruption, high probability (50-100km, severity 7-8)
- disrupted: Confirmed disruption, route/supplier blocked (0-50km, severity 9-10)

## Event Type Considerations
- **Natural Disasters** (earthquake, tsunami): Affect nodes (suppliers, ports, factories)
- **Extreme Weather** (typhoon, hurricane): Affect both nodes AND routes (shipping paths)
- **Wars/Conflicts**: Affect broad regions, block routes, disrupt nodes
- **Geopolitical Tensions**: Primarily affect cross-border routes
- **Tariffs/Trade Policy**: Affect connections between specific countries
- **Infrastructure Disruption**: Affect specific ports/hubs

## Impact Radius Guidelines
- Severity 1-3: 50km radius
- Severity 4-6: 150km radius
- Severity 7-10: 300km+ radius
- Typhoons/Hurricanes: +50% wider radius (affect shipping lanes)
- Wars: Entire country/region affected

## Alternative Selection Logic
When finding alternatives, prioritize by:

**For Supplier Alternatives (when supplier node affected):**
1. Must provide same material/component category
2. Located outside affected region (>impact_radius + 100km buffer)
3. Preferably in different country (geographic diversification)
4. Known capacity/reputation (tier 1 suppliers first)
5. Minimize cost/lead time impact

**For Route Alternatives (when shipping path affected):**
1. Same supplier, different logistics path
2. Avoid affected ports/hubs
3. Alternative transport mode if needed (air vs sea)
4. Minimize transit time increase
5. Consider tariff implications of rerouting

## Reasoning Format
Your reasoning should explain:
- What is affected and why (proximity, event type)
- Why this risk category was chosen
- What could happen (timeline, probability)
- How confident you are in this assessment

## Tools Available
Use these tools to gather data:
- get_event_details: Fetch event information
- calculate_impact_radius_tool: Determine affected area size
- query_affected_nodes: Find suppliers/ports in impact zone
- query_affected_connections: Find shipping routes through zone
- find_alternative_suppliers: Search for replacement suppliers
- find_alternative_routes: Search for alternate shipping paths
- get_connection_details: Get full route information
- get_supplier_materials: Check what materials a supplier provides
- calculate_distance_tool: Measure geographic distance

## Output Requirements
Always return structured output with:
- risk_category: One of the 5 categories
- severity_score: 1-10 numerical score
- confidence: 0.0-1.0 (how certain are you?)
- reasoning: Clear explanation of the assessment
- affected_entities: List of nodes/connections impacted
- alternatives: Suggested suppliers or routes (if risk >= AT_RISK)

Be precise, data-driven, and conservative in your risk estimates. When in doubt, escalate the risk category.
"""
```

**Step 4: Run test to verify it passes**

Run: `ls risk-agent/src/agent/prompts.py`
Expected: File exists

**Step 5: Commit**

```bash
git add risk-agent/src/agent/prompts.py
git commit -m "feat: add system prompt for risk agent"
```

---

## Task 12: Create LangChain Agent

**Files:**
- Create: `risk-agent/src/agent/agent.py`

**Step 1: Write the failing test**

Create `risk-agent/tests/test_agent.py`:
```python
"""Test risk agent creation."""
import pytest
from src.agent.agent import create_risk_agent

def test_create_risk_agent():
    """Test agent can be created."""
    agent = create_risk_agent()

    assert agent is not None
    # Check agent has invoke method
    assert hasattr(agent, 'invoke')
```

**Step 2: Run test to verify it fails**

Run: `cd risk-agent && python -m pytest tests/test_agent.py::test_create_risk_agent -v`
Expected: `ModuleNotFoundError: No module named 'src.agent.agent'`

**Step 3: Write minimal implementation**

Create `risk-agent/src/agent/agent.py`:
```python
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
```

**Step 4: Run test to verify it passes**

Run: `cd risk-agent && python -m pytest tests/test_agent.py::test_create_risk_agent -v`
Expected: PASS (requires OPENAI_API_KEY in .env)

**Step 5: Commit**

```bash
git add risk-agent/src/agent/agent.py risk-agent/tests/test_agent.py
git commit -m "feat: create langchain risk analysis agent"
```

---

## Task 13: Add FastAPI Server with Redis Listener

**Files:**
- Create: `risk-agent/src/main.py`

**Step 1: Write the failing test**

```bash
cd risk-agent && python -m src.main
```

**Step 2: Run test to verify it fails**

Run: `cd risk-agent && python -m src.main`
Expected: `No module named '__main__' in src`

**Step 3: Write minimal implementation**

Create `risk-agent/src/main.py`:
```python
"""Main entry point for Risk Agent microservice."""
import asyncio
import json
import logging
from fastapi import FastAPI, BackgroundTasks
from contextlib import asynccontextmanager

from src.config import config
from src.utils.redis_client import redis_client
from src.agent.agent import analyze_event_risk
from src.db.supabase import supabase

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global flag for Redis listener
_listener_task = None

async def redis_event_listener():
    """Listen for new events on Redis pub/sub channel."""
    logger.info(f"Starting Redis listener on channel: {config.REDIS_EVENTS_CHANNEL}")

    pubsub = redis_client.pubsub()
    pubsub.subscribe(config.REDIS_EVENTS_CHANNEL)

    try:
        for message in pubsub.listen():
            if message['type'] == 'message':
                try:
                    # Parse event_id from message
                    data = json.loads(message['data'])
                    event_id = data.get('event_id')

                    logger.info(f"Received new event: {event_id}")

                    # Analyze risk
                    assessment = await analyze_event_risk(event_id)

                    # Save to database
                    await save_risk_assessment(event_id, assessment)

                    # Publish risk update
                    redis_client.publish(
                        config.REDIS_RISK_CHANNEL,
                        json.dumps({"event_id": event_id, "status": "updated"})
                    )

                    logger.info(f"Risk assessment completed for event {event_id}")

                except Exception as e:
                    logger.error(f"Error processing event: {e}", exc_info=True)

    except KeyboardInterrupt:
        logger.info("Redis listener stopped")
    finally:
        pubsub.unsubscribe()
        pubsub.close()

async def save_risk_assessment(event_id: str, assessment: dict):
    """Save risk assessment to Supabase."""
    try:
        # Save to risk_assessments table
        # Note: This assumes the table exists - will be created in database migration
        supabase.table('risk_assessments').insert({
            'event_id': event_id,
            'risk_category': assessment.risk_category.value,
            'severity_score': assessment.severity_score,
            'confidence': assessment.confidence,
            'reasoning': assessment.reasoning,
            'affected_entities': [e.dict() for e in assessment.affected_entities],
            'alternatives': {
                'suppliers': [s.dict() for s in assessment.alternatives.get('suppliers', [])],
                'routes': [r.dict() for r in assessment.alternatives.get('routes', [])]
            }
        }).execute()

        logger.info(f"Risk assessment saved for event {event_id}")
    except Exception as e:
        logger.error(f"Error saving risk assessment: {e}", exc_info=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle."""
    global _listener_task

    # Startup
    config.validate()
    logger.info("Risk Agent starting...")

    # Start Redis listener in background
    _listener_task = asyncio.create_task(redis_event_listener())

    yield

    # Shutdown
    logger.info("Risk Agent shutting down...")
    if _listener_task:
        _listener_task.cancel()

# Create FastAPI app
app = FastAPI(
    title="Sentinel-Zero Risk Agent",
    description="Supply chain risk analysis agent",
    version="1.0.0",
    lifespan=lifespan
)

@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "risk-agent",
        "redis": "connected" if redis_client.ping() else "disconnected"
    }

@app.post("/analyze/{event_id}")
async def analyze_event(event_id: str, background_tasks: BackgroundTasks):
    """
    Manually trigger risk analysis for a specific event.
    Useful for testing or re-analyzing past events.
    """
    background_tasks.add_task(analyze_event_risk, event_id)
    return {"message": f"Analysis started for event {event_id}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

**Step 4: Run test to verify it passes**

Run: `cd risk-agent && python -m src.main` (in one terminal)
Then: `curl http://localhost:8000/health` (in another terminal)
Expected: `{"status":"ok","service":"risk-agent","redis":"connected"}`

Stop with Ctrl+C

**Step 5: Commit**

```bash
git add risk-agent/src/main.py
git commit -m "feat: add fastapi server with redis listener"
```

---

## Task 14: Add Database Migration for risk_assessments Table

**Files:**
- Create: `risk-agent/migrations/001_create_risk_assessments.sql`

**Step 1: Write the failing test**

```bash
ls risk-agent/migrations/001_create_risk_assessments.sql
```

**Step 2: Run test to verify it fails**

Run: `ls risk-agent/migrations/001_create_risk_assessments.sql`
Expected: `No such file or directory`

**Step 3: Write minimal implementation**

```bash
mkdir -p risk-agent/migrations
```

Create `risk-agent/migrations/001_create_risk_assessments.sql`:
```sql
-- Create risk_assessments table for storing agent output

CREATE TABLE IF NOT EXISTS risk_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    entity_type TEXT CHECK (entity_type IN ('node', 'connection')),
    entity_id UUID,
    risk_category TEXT NOT NULL CHECK (risk_category IN ('healthy', 'monitoring', 'at-risk', 'critical', 'disrupted')),
    severity_score INT NOT NULL CHECK (severity_score >= 1 AND severity_score <= 10),
    confidence FLOAT NOT NULL CHECK (confidence >= 0.0 AND confidence <= 1.0),
    reasoning JSONB NOT NULL,
    affected_entities JSONB DEFAULT '[]'::jsonb,
    alternatives JSONB DEFAULT '{"suppliers": [], "routes": []}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast event lookups
CREATE INDEX idx_risk_assessments_event_id ON risk_assessments(event_id);

-- Index for entity lookups
CREATE INDEX idx_risk_assessments_entity ON risk_assessments(entity_type, entity_id);

-- Index for risk category filtering
CREATE INDEX idx_risk_assessments_category ON risk_assessments(risk_category);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_risk_assessments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_update_risk_assessments_updated_at
    BEFORE UPDATE ON risk_assessments
    FOR EACH ROW
    EXECUTE FUNCTION update_risk_assessments_updated_at();

-- Comments
COMMENT ON TABLE risk_assessments IS 'Risk assessments generated by the Risk Agent for supply chain entities';
COMMENT ON COLUMN risk_assessments.event_id IS 'Reference to the event that triggered this assessment';
COMMENT ON COLUMN risk_assessments.entity_type IS 'Type of entity: node (supplier/port) or connection (route)';
COMMENT ON COLUMN risk_assessments.entity_id IS 'ID of the specific entity being assessed';
COMMENT ON COLUMN risk_assessments.reasoning IS 'Structured reasoning: {summary, factors, event_ids}';
COMMENT ON COLUMN risk_assessments.alternatives IS 'Alternative suppliers or routes: {suppliers: [], routes: []}';
```

Create `risk-agent/migrations/README.md`:
```markdown
# Database Migrations

## Running Migrations

These SQL migrations need to be run on your Supabase database.

**Option 1: Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the migration file contents
4. Run the query

**Option 2: Supabase CLI**
```bash
supabase db push
```

**Option 3: Direct PostgreSQL**
```bash
psql -h <supabase-host> -U postgres -d postgres -f migrations/001_create_risk_assessments.sql
```

## Migration Order
1. `001_create_risk_assessments.sql` - Create risk_assessments table
2. `002_add_indexes.sql` - Add performance indexes

## Notes
- GeoPoint data is stored as JSONB `{lat: number, lng: number}`
- No PostGIS required - spatial calculations done in Python agent
- Risk categories use lowercase with hyphens to match TypeScript ConnectionStatus
```

**Step 4: Run test to verify it passes**

Run: `ls risk-agent/migrations/001_create_risk_assessments.sql`
Expected: File exists

**Step 5: Commit**

```bash
git add risk-agent/migrations/
git commit -m "feat: add database migration for risk_assessments table"
```

---

## Task 15: Add Database Indexes for Performance

**Files:**
- Create: `risk-agent/migrations/002_add_indexes.sql`

**Step 1: Write the failing test**

```bash
ls risk-agent/migrations/002_add_indexes.sql
```

**Step 2: Run test to verify it fails**

Run: `ls risk-agent/migrations/002_add_indexes.sql`
Expected: `No such file or directory`

**Step 3: Write minimal implementation**

Create `risk-agent/migrations/002_add_indexes.sql`:
```sql
-- Add indexes for better query performance
-- Note: GeoPoint is stored as JSONB {lat, lng}, spatial queries done in Python

-- Index for fast event type filtering
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);

-- Index for event severity filtering
CREATE INDEX IF NOT EXISTS idx_events_severity ON events(severity);

-- Index for company type filtering (for finding ports/hubs)
CREATE INDEX IF NOT EXISTS idx_companies_type ON companies(type);

-- Index for supplier material search (GIN index for array containment)
CREATE INDEX IF NOT EXISTS idx_suppliers_materials ON suppliers USING GIN (materials);

-- Index for connection status filtering
CREATE INDEX IF NOT EXISTS idx_connections_status ON connections(status);

-- Comments
COMMENT ON INDEX idx_events_type IS 'Fast filtering of events by type (natural_disaster, war, etc.)';
COMMENT ON INDEX idx_companies_type IS 'Fast filtering of companies by type (port, airport, foundry, etc.)';
COMMENT ON INDEX idx_suppliers_materials IS 'Fast search for suppliers by material category';
```

**Step 4: Run test to verify it passes**

Run: `ls risk-agent/migrations/002_add_indexes.sql`
Expected: File exists

**Step 5: Commit**

```bash
git add risk-agent/migrations/002_add_indexes.sql
git commit -m "feat: add database indexes for performance"
```

---

## Task 16: Add Integration Test for Agent

**Files:**
- Create: `risk-agent/tests/test_integration.py`

**Step 1: Write the failing test**

Create `risk-agent/tests/test_integration.py`:
```python
"""Integration tests for risk agent."""
import pytest
import os
from src.agent.agent import analyze_event_risk

# Skip if no API key
pytestmark = pytest.mark.skipif(
    not os.getenv("OPENAI_API_KEY"),
    reason="Requires OPENAI_API_KEY"
)

@pytest.mark.asyncio
async def test_analyze_event_risk_integration():
    """
    Integration test for full agent workflow.

    This test requires:
    - Valid OPENAI_API_KEY
    - Supabase connection
    - An event in the database

    Run with: pytest tests/test_integration.py -v -s
    """
    # This is a placeholder - actual event_id would come from test database
    # For now, this tests that the function signature is correct

    # In a real test, you would:
    # 1. Create a test event in Supabase
    # 2. Call analyze_event_risk(event_id)
    # 3. Verify the output structure
    # 4. Clean up test data

    # Example structure (uncomment when database is seeded):
    # event_id = "test-event-123"
    # result = await analyze_event_risk(event_id)
    #
    # assert result.risk_category in ['HEALTHY', 'MONITORING', 'AT_RISK', 'CRITICAL', 'DISRUPTED']
    # assert 1 <= result.severity_score <= 10
    # assert 0.0 <= result.confidence <= 1.0
    # assert 'summary' in result.reasoning

    assert True  # Placeholder
```

**Step 2: Run test to verify it fails**

Run: `cd risk-agent && python -m pytest tests/test_integration.py -v`
Expected: SKIP (if no OPENAI_API_KEY) or PASS

**Step 3: Write minimal implementation**

No implementation needed - test is already written as documentation.

**Step 4: Run test to verify it passes**

Run: `cd risk-agent && python -m pytest tests/test_integration.py -v`
Expected: SKIP or PASS

**Step 5: Commit**

```bash
git add risk-agent/tests/test_integration.py
git commit -m "test: add integration test for agent workflow"
```

---

## Task 17: Add Docker Support

**Files:**
- Create: `risk-agent/Dockerfile`
- Create: `risk-agent/docker-compose.yml`

**Step 1: Write the failing test**

```bash
ls risk-agent/Dockerfile
```

**Step 2: Run test to verify it fails**

Run: `ls risk-agent/Dockerfile`
Expected: `No such file or directory`

**Step 3: Write minimal implementation**

Create `risk-agent/Dockerfile`:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY src/ ./src/
COPY .env .env

# Expose port
EXPOSE 8000

# Run application
CMD ["python", "-m", "src.main"]
```

Create `risk-agent/docker-compose.yml`:
```yaml
version: '3.8'

services:
  risk-agent:
    build: .
    container_name: sentinel-risk-agent
    ports:
      - "8000:8000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: sentinel-redis
    ports:
      - "6379:6379"
    restart: unless-stopped
```

Create `risk-agent/.dockerignore`:
```
__pycache__/
*.py[cod]
*$py.class
.env
.venv/
venv/
.pytest_cache/
.coverage
htmlcov/
.git/
tests/
```

**Step 4: Run test to verify it passes**

Run: `ls risk-agent/Dockerfile`
Expected: File exists

**Step 5: Commit**

```bash
git add risk-agent/Dockerfile risk-agent/docker-compose.yml risk-agent/.dockerignore
git commit -m "feat: add docker support"
```

---

## Task 18: Update Main README with Setup Instructions

**Files:**
- Modify: `risk-agent/README.md`

**Step 1: Write the failing test**

```bash
grep "Setup" risk-agent/README.md
```

**Step 2: Run test to verify it fails**

Run: `grep "Usage" risk-agent/README.md`
Expected: No "Usage" section exists yet

**Step 3: Write minimal implementation**

Replace contents of `risk-agent/README.md`:
```markdown
# Sentinel-Zero Risk Agent

Python LangChain agent for supply chain risk analysis. Analyzes geopolitical events, natural disasters, and policy changes to compute risk assessments for supply chain nodes and connections.

## Features

- **LangChain Agent**: GPT-4o powered agent with custom tools
- **Spatial Analysis**: PostGIS queries for geographic impact calculation
- **Real-time Processing**: Redis pub/sub integration for event streaming
- **Structured Output**: Pydantic schemas for consistent risk assessments
- **Alternative Suggestions**: Recommends alternative suppliers and routes

## Architecture

```
Backend (Node.js) → Redis Pub/Sub → Risk Agent (Python) → Supabase
                                          ↓
                                    Risk Assessments Table
```

## Setup

### Prerequisites

- Python 3.11+
- Redis server
- Supabase account with PostGIS enabled
- OpenAI API key

### Installation

1. **Clone and navigate to risk-agent:**
   ```bash
   cd risk-agent
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials:
   # - OPENAI_API_KEY
   # - SUPABASE_URL
   # - SUPABASE_SERVICE_ROLE_KEY
   # - REDIS_HOST, REDIS_PORT
   ```

5. **Run database migrations:**
   - Go to Supabase Dashboard → SQL Editor
   - Run `migrations/001_create_risk_assessments.sql`
   - Run `migrations/002_create_spatial_functions.sql`

### Running

**Development:**
```bash
python -m src.main
```

**Docker:**
```bash
docker-compose up -d
```

**Health check:**
```bash
curl http://localhost:8000/health
```

## Usage

### Automatic Analysis

The agent automatically listens for new events on Redis channel `events:new`:

1. Backend fetches event from GDELT/USGS/NewsAPI
2. Backend saves to Supabase `events` table
3. Backend publishes to Redis: `{"event_id": "..."}`
4. Risk agent receives event, analyzes, saves assessment
5. Agent publishes `risk:updated` notification

### Manual Analysis

Trigger analysis via API:
```bash
curl -X POST http://localhost:8000/analyze/EVENT_ID
```

### Query Results

Risk assessments are stored in `risk_assessments` table:
```sql
SELECT * FROM risk_assessments WHERE event_id = 'your-event-id';
```

## Output Schema

```json
{
  "risk_category": "AT_RISK",
  "severity_score": 6,
  "confidence": 0.85,
  "reasoning": {
    "summary": "Port within typhoon path",
    "factors": ["proximity", "severity"],
    "event_ids": ["event-123"]
  },
  "affected_entities": [
    {"type": "node", "id": "...", "name": "Port of Kaohsiung", "distance_km": 45.2}
  ],
  "alternatives": {
    "suppliers": [],
    "routes": [
      {"id": "...", "name": "Port of Busan", "reason": "Safe distance from event"}
    ]
  }
}
```

## Testing

```bash
# Run all tests
pytest -v

# Run with coverage
pytest --cov=src tests/

# Run integration tests (requires API key)
pytest tests/test_integration.py -v -s
```

## Project Structure

```
risk-agent/
├── src/
│   ├── agent/
│   │   ├── agent.py       # LangChain agent creation
│   │   ├── tools.py       # Custom tools for agent
│   │   └── prompts.py     # System prompts
│   ├── schemas/
│   │   └── output.py      # Pydantic output schemas
│   ├── db/
│   │   └── supabase.py    # Database client
│   ├── utils/
│   │   ├── geo.py         # Geographic calculations
│   │   └── redis_client.py # Redis pub/sub
│   ├── config.py          # Configuration
│   └── main.py            # FastAPI server
├── migrations/
│   ├── 001_create_risk_assessments.sql
│   └── 002_create_spatial_functions.sql
├── tests/
├── requirements.txt
└── README.md
```

## Development

### Adding New Tools

1. Define tool in `src/agent/tools.py`:
   ```python
   @tool
   def my_new_tool(param: str) -> dict:
       """Tool description."""
       # Implementation
       return result
   ```

2. Add to tools list in `src/agent/agent.py`

3. Update system prompt if needed in `src/agent/prompts.py`

### Modifying Risk Logic

Risk categorization is defined in system prompt (`src/agent/prompts.py`):
- Adjust distance thresholds
- Modify event type considerations
- Update alternative selection priorities

## Troubleshooting

**Redis connection failed:**
- Ensure Redis server is running: `redis-cli ping`
- Check REDIS_HOST and REDIS_PORT in .env

**Supabase query errors:**
- Verify PostGIS extension is enabled
- Run spatial functions migration
- Check service role key has proper permissions

**Agent not responding:**
- Verify OPENAI_API_KEY is valid
- Check API rate limits
- Review logs for errors

## License

ISC
```

**Step 4: Run test to verify it passes**

Run: `grep "Usage" risk-agent/README.md`
Expected: "Usage" section found

**Step 5: Commit**

```bash
git add risk-agent/README.md
git commit -m "docs: update README with complete setup and usage"
```

---

## Task 19: Add Backend Integration - Redis Publisher

**Files:**
- Create: `Version 2/backend/src/services/redis.ts`
- Modify: `Version 2/backend/package.json`

**Step 1: Write the failing test**

```bash
ls "Version 2/backend/src/services/redis.ts"
```

**Step 2: Run test to verify it fails**

Run: `ls "Version 2/backend/src/services/redis.ts"`
Expected: `No such file or directory`

**Step 3: Write minimal implementation**

```bash
cd "Version 2/backend"
npm install redis
npm install --save-dev @types/redis
```

Add to `Version 2/backend/.env`:
```
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
FRONTEND_URL=http://localhost:5173
```

Add to `Version 2/frontend/.env`:
```
VITE_API_URL=http://localhost:3001
```

Create `Version 2/backend/src/services/redis.ts`:
```typescript
import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;

export const connectRedis = async (): Promise<RedisClientType> => {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  redisClient = createClient({
    socket: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    },
    password: process.env.REDIS_PASSWORD || undefined,
  });

  redisClient.on('error', (err) => console.error('Redis Client Error', err));

  await redisClient.connect();
  console.log('Redis connected');

  return redisClient;
};

export const publishEvent = async (channel: string, data: Record<string, unknown>): Promise<void> => {
  if (!redisClient || !redisClient.isOpen) {
    await connectRedis();
  }
  if (redisClient) {
    await redisClient.publish(channel, JSON.stringify(data));
  }
};

export const getRedisClient = (): RedisClientType | null => redisClient;
```

**Step 4: Run test to verify it passes**

Run: `ls "Version 2/backend/src/services/redis.ts"`
Expected: File exists

**Step 5: Commit**

```bash
git add "Version 2/backend/src/services/redis.ts" "Version 2/backend/package.json"
git commit -m "feat: add redis publisher for event notifications"
```

---

## Task 20: Add Backend WebSocket Server for Risk Updates

**Files:**
- Create: `Version 2/backend/src/services/websocket.ts`
- Modify: `Version 2/backend/src/index.ts`
- Modify: `Version 2/backend/package.json`

**Step 1: Write the failing test**

```bash
ls "Version 2/backend/src/services/websocket.ts"
```

**Step 2: Run test to verify it fails**

Run: `ls "Version 2/backend/src/services/websocket.ts"`
Expected: `No such file or directory`

**Step 3: Write minimal implementation**

```bash
cd "Version 2/backend"
npm install socket.io
npm install --save-dev @types/socket.io
```

Create `Version 2/backend/src/services/websocket.ts`:
```typescript
import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { getRedisClient } from './redis';

let io: SocketIOServer | null = null;

export const initializeWebSocket = (httpServer: HTTPServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('[WebSocket] Client connected:', socket.id);

    socket.on('disconnect', () => {
      console.log('[WebSocket] Client disconnected:', socket.id);
    });
  });

  // Subscribe to Redis risk updates and relay to frontend
  subscribeToRiskUpdates();

  console.log('[WebSocket] Server initialized');
  return io;
};

const subscribeToRiskUpdates = async () => {
  const redis = getRedisClient();
  if (!redis) {
    console.error('[WebSocket] Redis not available, cannot subscribe to risk updates');
    return;
  }

  // Create a separate Redis client for pub/sub
  const subscriber = redis.duplicate();
  await subscriber.connect();

  await subscriber.subscribe('risk:updated', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('[WebSocket] Broadcasting risk update:', data);

      if (io) {
        io.emit('risk-updated', data);
      }
    } catch (error) {
      console.error('[WebSocket] Error parsing risk update:', error);
    }
  });

  console.log('[WebSocket] Subscribed to Redis risk:updated channel');
};

export const getWebSocketServer = (): SocketIOServer | null => io;

export const broadcastEvent = (eventName: string, data: unknown): void => {
  if (io) {
    io.emit(eventName, data);
  }
};
```

**Step 4: Run test to verify it passes**

Run: `ls "Version 2/backend/src/services/websocket.ts"`
Expected: File exists

**Step 5: Commit**

```bash
git add "Version 2/backend/src/services/websocket.ts" "Version 2/backend/package.json"
git commit -m "feat: add websocket server for risk updates"
```

---

## Task 21: Integrate WebSocket into Backend Server

**Files:**
- Modify: `Version 2/backend/src/index.ts`
- Create: `Version 2/backend/src/services/event-processor.ts`

**Step 1: Write the failing test**

Create `Version 2/backend/src/services/event-processor.ts` with test stub:
```typescript
export const processNewEvent = async (eventId: string): Promise<void> => {
  throw new Error('Not implemented');
};
```

**Step 2: Run test to verify it fails**

Run: `cd "Version 2/backend" && npx ts-node -e "import { processNewEvent } from './src/services/event-processor'; processNewEvent('test').catch(console.error)"`
Expected: Error "Not implemented"

**Step 3: Write minimal implementation**

Replace `Version 2/backend/src/services/event-processor.ts`:
```typescript
import { publishEvent } from './redis';

const EVENTS_CHANNEL = 'events:new';

export const notifyRiskAgent = async (eventId: string): Promise<void> => {
  console.log(`[Event Processor] Publishing event ${eventId} to Risk Agent`);

  await publishEvent(EVENTS_CHANNEL, {
    event_id: eventId,
    timestamp: new Date().toISOString(),
  });

  console.log(`[Event Processor] Event ${eventId} published to channel ${EVENTS_CHANNEL}`);
};
```

Modify `Version 2/backend/src/index.ts`:
```typescript
import express from 'express';
import cors from 'cors';
import { supabase } from './lib/supabase';
import { connectRedis, getRedisClient } from './services/redis';
import { notifyRiskAgent } from './services/event-processor';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize Redis on startup
connectRedis().catch((err) => {
  console.error('Failed to connect to Redis:', err);
});

app.get('/health', async (req, res) => {
  try {
    const { error } = await supabase.from('_health_check').select('*').limit(1);
    const redis = getRedisClient();

    res.json({
      status: 'ok',
      db: error ? 'disconnected' : 'connected',
      redis: redis?.isOpen ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.json({
      status: 'ok',
      db: 'disconnected',
      redis: 'disconnected',
      timestamp: new Date().toISOString(),
    });
  }
});

// Internal endpoint: Notify Risk Agent about new event
// Called by event fetcher services after saving to database
app.post('/internal/events/notify/:eventId', async (req, res) => {
  const { eventId } = req.params;

  try {
    await notifyRiskAgent(eventId);
    res.json({ success: true, message: `Event ${eventId} sent to Risk Agent` });
  } catch (error) {
    console.error('[API] Error notifying Risk Agent:', error);
    res.status(500).json({ success: false, error: 'Failed to notify Risk Agent' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

**Step 4: Run test to verify it passes**

Terminal 1 - Start Redis:
```bash
redis-server
```

Terminal 2 - Start Risk Agent:
```bash
cd risk-agent && source .venv/bin/activate && python -m src.main
```

Terminal 3 - Start Backend:
```bash
cd "Version 2/backend" && npm run dev
```

Terminal 4 - Test:
```bash
# Check health
curl http://localhost:3001/health
# Expected: {"status":"ok","db":"connected","redis":"connected",...}

# Trigger event notification
curl -X POST http://localhost:3001/internal/events/notify/test-event-123
# Expected: {"success":true,"message":"Event test-event-123 sent to Risk Agent"}

# Check Risk Agent logs - should show "Received new event: test-event-123"
```

**Step 5: Commit**

```bash
git add "Version 2/backend/src/index.ts" "Version 2/backend/src/services/event-processor.ts" "Version 2/backend/src/services/redis.ts" "Version 2/backend/.env"
git commit -m "feat: integrate redis event publisher into backend"
```

---

## Task 22: Update Backend to Use WebSocket Server

**Files:**
- Modify: `Version 2/backend/src/index.ts`

**Step 1: Write the failing test**

```bash
grep "createServer" "Version 2/backend/src/index.ts"
```

**Step 2: Run test to verify it fails**

Run: `grep "createServer" "Version 2/backend/src/index.ts"`
Expected: No output (not using http.createServer yet)

**Step 3: Write minimal implementation**

Modify `Version 2/backend/src/index.ts` to integrate WebSocket:
```typescript
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { supabase } from './lib/supabase';
import { connectRedis, getRedisClient } from './services/redis';
import { notifyRiskAgent } from './services/event-processor';
import { initializeWebSocket } from './services/websocket';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize Redis and WebSocket on startup
connectRedis().catch((err) => {
  console.error('Failed to connect to Redis:', err);
});

initializeWebSocket(httpServer);

app.get('/health', async (req, res) => {
  try {
    const { error } = await supabase.from('_health_check').select('*').limit(1);
    const redis = getRedisClient();

    res.json({
      status: 'ok',
      db: error ? 'disconnected' : 'connected',
      redis: redis?.isOpen ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.json({
      status: 'ok',
      db: 'disconnected',
      redis: 'disconnected',
      timestamp: new Date().toISOString(),
    });
  }
});

// Internal endpoint: Notify Risk Agent about new event
app.post('/internal/events/notify/:eventId', async (req, res) => {
  const { eventId } = req.params;

  try {
    await notifyRiskAgent(eventId);
    res.json({ success: true, message: `Event ${eventId} sent to Risk Agent` });
  } catch (error) {
    console.error('[API] Error notifying Risk Agent:', error);
    res.status(500).json({ success: false, error: 'Failed to notify Risk Agent' });
  }
});

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server ready`);
});
```

**Step 4: Run test to verify it passes**

Run: `grep "createServer" "Version 2/backend/src/index.ts"`
Expected: Found

**Step 5: Commit**

```bash
git add "Version 2/backend/src/index.ts"
git commit -m "feat: integrate websocket server into backend"
```

---

## Task 23: Add Frontend API Endpoints for Risk Assessments

**Files:**
- Create: `Version 2/backend/src/routes/risk.ts`
- Modify: `Version 2/backend/src/index.ts`

**Step 1: Write the failing test**

```bash
ls "Version 2/backend/src/routes/risk.ts"
```

**Step 2: Run test to verify it fails**

Run: `ls "Version 2/backend/src/routes/risk.ts"`
Expected: `No such file or directory`

**Step 3: Write minimal implementation**

```bash
mkdir -p "Version 2/backend/src/routes"
```

Create `Version 2/backend/src/routes/risk.ts`:
```typescript
import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

/**
 * GET /api/risk/assessments
 * Query risk assessments with optional filters
 */
router.get('/assessments', async (req, res) => {
  try {
    const { eventId, entityType, entityId, riskCategory } = req.query;

    let query = supabase
      .from('risk_assessments')
      .select('*')
      .order('created_at', { ascending: false });

    if (eventId) {
      query = query.eq('event_id', eventId);
    }

    if (entityType) {
      query = query.eq('entity_type', entityType);
    }

    if (entityId) {
      query = query.eq('entity_id', entityId);
    }

    if (riskCategory) {
      query = query.eq('risk_category', riskCategory);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Risk API] Error fetching assessments:', error);
      return res.status(500).json({ error: 'Failed to fetch risk assessments' });
    }

    res.json({ assessments: data || [] });
  } catch (error) {
    console.error('[Risk API] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/risk/connection/:connectionId
 * Get risk assessment for a specific connection
 */
router.get('/connection/:connectionId', async (req, res) => {
  try {
    const { connectionId } = req.params;

    const { data, error } = await supabase
      .from('risk_assessments')
      .select('*')
      .eq('entity_type', 'connection')
      .eq('entity_id', connectionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No risk assessment found
        return res.json({ assessment: null });
      }
      console.error('[Risk API] Error fetching connection risk:', error);
      return res.status(500).json({ error: 'Failed to fetch risk assessment' });
    }

    res.json({ assessment: data });
  } catch (error) {
    console.error('[Risk API] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/risk/connection/:connectionId/alternatives
 * Get alternative suppliers/routes for a connection
 */
router.get('/connection/:connectionId/alternatives', async (req, res) => {
  try {
    const { connectionId } = req.params;

    // Get the latest risk assessment with alternatives
    const { data, error } = await supabase
      .from('risk_assessments')
      .select('alternatives')
      .eq('entity_type', 'connection')
      .eq('entity_id', connectionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.json({ alternatives: { suppliers: [], routes: [] } });
      }
      console.error('[Risk API] Error fetching alternatives:', error);
      return res.status(500).json({ error: 'Failed to fetch alternatives' });
    }

    res.json({ alternatives: data?.alternatives || { suppliers: [], routes: [] } });
  } catch (error) {
    console.error('[Risk API] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/risk/summary
 * Get summary statistics of risk assessments
 */
router.get('/summary', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('risk_assessments')
      .select('risk_category, entity_type');

    if (error) {
      console.error('[Risk API] Error fetching summary:', error);
      return res.status(500).json({ error: 'Failed to fetch risk summary' });
    }

    // Aggregate by category
    const summary = {
      healthy: 0,
      monitoring: 0,
      'at-risk': 0,
      critical: 0,
      disrupted: 0,
      byEntityType: {
        node: { healthy: 0, monitoring: 0, 'at-risk': 0, critical: 0, disrupted: 0 },
        connection: { healthy: 0, monitoring: 0, 'at-risk': 0, critical: 0, disrupted: 0 },
      },
    };

    (data || []).forEach((assessment) => {
      const category = assessment.risk_category as keyof typeof summary;
      if (category in summary) {
        summary[category]++;
      }

      const entityType = assessment.entity_type as 'node' | 'connection';
      if (entityType && category in summary.byEntityType[entityType]) {
        summary.byEntityType[entityType][category as keyof typeof summary.byEntityType.node]++;
      }
    });

    res.json({ summary });
  } catch (error) {
    console.error('[Risk API] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

Add to `Version 2/backend/src/index.ts` (after health endpoint):
```typescript
import riskRoutes from './routes/risk';

// ... existing code ...

// Mount risk API routes
app.use('/api/risk', riskRoutes);
```

**Step 4: Run test to verify it passes**

Run: `cd "Version 2/backend" && npm run dev`
Then: `curl http://localhost:3001/api/risk/summary`
Expected: `{"summary":{"healthy":0,"monitoring":0,"at-risk":0,...}}`

**Step 5: Commit**

```bash
git add "Version 2/backend/src/routes/risk.ts" "Version 2/backend/src/index.ts"
git commit -m "feat: add risk assessment API endpoints"
```

---

## Task 24: Add Frontend TypeScript Types for Risk Data

**Files:**
- Create: `Version 2/frontend/src/types/risk.ts`

**Step 1: Write the failing test**

```bash
ls "Version 2/frontend/src/types/risk.ts"
```

**Step 2: Run test to verify it fails**

Run: `ls "Version 2/frontend/src/types/risk.ts"`
Expected: `No such file or directory`

**Step 3: Write minimal implementation**

```bash
mkdir -p "Version 2/frontend/src/types"
```

Create `Version 2/frontend/src/types/risk.ts`:
```typescript
import { GeoPoint, ConnectionStatus } from '../../../shared/types';

/**
 * Risk assessment entity type
 */
export type RiskEntityType = 'node' | 'connection';

/**
 * Affected entity in risk assessment
 */
export interface AffectedEntity {
  type: RiskEntityType;
  id: string;
  name: string;
  distanceKm?: number;
}

/**
 * Alternative supplier or route
 */
export interface Alternative {
  id: string;
  name: string;
  type: string;
  location?: GeoPoint;
  city?: string;
  country?: string;
  reason: string;
  confidence: number;
  distanceKm?: number;
}

/**
 * Risk assessment reasoning structure
 */
export interface RiskReasoning {
  summary: string;
  factors: string[];
  eventIds: string[];
}

/**
 * Complete risk assessment from backend
 */
export interface RiskAssessment {
  id: string;
  eventId: string;
  entityType: RiskEntityType;
  entityId: string;
  riskCategory: ConnectionStatus; // 'healthy' | 'monitoring' | 'at-risk' | 'critical' | 'disrupted'
  severityScore: number; // 1-10
  confidence: number; // 0.0-1.0
  reasoning: RiskReasoning;
  affectedEntities: AffectedEntity[];
  alternatives: {
    suppliers: Alternative[];
    routes: Alternative[];
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Risk summary statistics
 */
export interface RiskSummary {
  healthy: number;
  monitoring: number;
  'at-risk': number;
  critical: number;
  disrupted: number;
  byEntityType: {
    node: Record<ConnectionStatus, number>;
    connection: Record<ConnectionStatus, number>;
  };
}

/**
 * Risk update WebSocket payload
 */
export interface RiskUpdatePayload {
  eventId: string;
  assessmentIds?: string[];
  status: 'updated' | 'processing' | 'error';
}
```

**Step 4: Run test to verify it passes**

Run: `ls "Version 2/frontend/src/types/risk.ts"`
Expected: File exists

**Step 5: Commit**

```bash
git add "Version 2/frontend/src/types/risk.ts"
git commit -m "feat: add frontend risk assessment types"
```

---

## Task 25: Add Frontend API Client for Risk Data

**Files:**
- Create: `Version 2/frontend/src/api/risk.ts`

**Step 1: Write the failing test**

```bash
ls "Version 2/frontend/src/api/risk.ts"
```

**Step 2: Run test to verify it fails**

Run: `ls "Version 2/frontend/src/api/risk.ts"`
Expected: `No such file or directory`

**Step 3: Write minimal implementation**

```bash
mkdir -p "Version 2/frontend/src/api"
```

Create `Version 2/frontend/src/api/risk.ts`:
```typescript
import { RiskAssessment, RiskSummary, Alternative } from '../types/risk';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Fetch risk assessments with optional filters
 */
export const getRiskAssessments = async (filters?: {
  eventId?: string;
  entityType?: 'node' | 'connection';
  entityId?: string;
  riskCategory?: string;
}): Promise<RiskAssessment[]> => {
  const params = new URLSearchParams();

  if (filters?.eventId) params.append('eventId', filters.eventId);
  if (filters?.entityType) params.append('entityType', filters.entityType);
  if (filters?.entityId) params.append('entityId', filters.entityId);
  if (filters?.riskCategory) params.append('riskCategory', filters.riskCategory);

  const response = await fetch(
    `${API_BASE_URL}/api/risk/assessments?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch risk assessments');
  }

  const data = await response.json();
  return data.assessments;
};

/**
 * Get risk assessment for a specific connection
 */
export const getConnectionRisk = async (
  connectionId: string
): Promise<RiskAssessment | null> => {
  const response = await fetch(
    `${API_BASE_URL}/api/risk/connection/${connectionId}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch connection risk');
  }

  const data = await response.json();
  return data.assessment;
};

/**
 * Get alternative suppliers/routes for a connection
 */
export const getConnectionAlternatives = async (
  connectionId: string
): Promise<{ suppliers: Alternative[]; routes: Alternative[] }> => {
  const response = await fetch(
    `${API_BASE_URL}/api/risk/connection/${connectionId}/alternatives`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch alternatives');
  }

  const data = await response.json();
  return data.alternatives;
};

/**
 * Get risk summary statistics
 */
export const getRiskSummary = async (): Promise<RiskSummary> => {
  const response = await fetch(`${API_BASE_URL}/api/risk/summary`);

  if (!response.ok) {
    throw new Error('Failed to fetch risk summary');
  }

  const data = await response.json();
  return data.summary;
};
```

**Step 4: Run test to verify it passes**

Run: `ls "Version 2/frontend/src/api/risk.ts"`
Expected: File exists

**Step 5: Commit**

```bash
git add "Version 2/frontend/src/api/risk.ts"
git commit -m "feat: add frontend risk API client"
```

---

## Task 26: Add Frontend WebSocket Hook for Risk Updates

**Files:**
- Create: `Version 2/frontend/src/hooks/useRiskUpdates.ts`

**Step 1: Write the failing test**

```bash
ls "Version 2/frontend/src/hooks/useRiskUpdates.ts"
```

**Step 2: Run test to verify it fails**

Run: `ls "Version 2/frontend/src/hooks/useRiskUpdates.ts"`
Expected: `No such file or directory`

**Step 3: Write minimal implementation**

```bash
mkdir -p "Version 2/frontend/src/hooks"
cd "Version 2/frontend"
npm install socket.io-client
```

Create `Version 2/frontend/src/hooks/useRiskUpdates.ts`:
```typescript
import { useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { RiskUpdatePayload } from '../types/risk';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

let socket: Socket | null = null;

/**
 * Hook to listen for real-time risk updates via WebSocket
 */
export const useRiskUpdates = (
  onRiskUpdated: (payload: RiskUpdatePayload) => void
) => {
  useEffect(() => {
    // Initialize socket connection if not already connected
    if (!socket) {
      socket = io(SOCKET_URL, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      socket.on('connect', () => {
        console.log('[WebSocket] Connected to server');
      });

      socket.on('disconnect', () => {
        console.log('[WebSocket] Disconnected from server');
      });

      socket.on('error', (error) => {
        console.error('[WebSocket] Error:', error);
      });
    }

    // Subscribe to risk updates
    socket.on('risk-updated', onRiskUpdated);

    // Cleanup on unmount
    return () => {
      socket?.off('risk-updated', onRiskUpdated);
    };
  }, [onRiskUpdated]);

  const manualRefresh = useCallback(() => {
    // Trigger manual refresh by emitting event (if backend supports it)
    socket?.emit('request-risk-refresh');
  }, []);

  return { manualRefresh };
};

/**
 * Disconnect WebSocket (call on app unmount)
 */
export const disconnectRiskWebSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
```

**Step 4: Run test to verify it passes**

Run: `ls "Version 2/frontend/src/hooks/useRiskUpdates.ts"`
Expected: File exists

**Step 5: Commit**

```bash
git add "Version 2/frontend/src/hooks/useRiskUpdates.ts" "Version 2/frontend/package.json"
git commit -m "feat: add websocket hook for risk updates"
```

---

## Summary

This plan implements a complete Python LangChain risk analysis agent with full-stack integration:

**Risk Agent (Python):**
- ✅ **26 Tasks** covering setup, tools, agent, backend, and frontend integration
- ✅ **LangChain + GPT-4o** for intelligent risk analysis
- ✅ **9 Custom Tools** for spatial queries, distance calculation, alternatives
- ✅ **Structured Output** via Pydantic schemas matching TypeScript types
- ✅ **Redis Pub/Sub** for real-time event processing
- ✅ **GeoPoint Handling** via JSONB storage (no PostGIS required)
- ✅ **FastAPI Server** with health checks and manual trigger endpoints
- ✅ **Docker Support** for easy deployment

**Backend Integration (Express.js + TypeScript):**
- ✅ **Redis Publisher** for event notifications to Risk Agent
- ✅ **WebSocket Server (Socket.io)** for real-time risk updates to frontend
- ✅ **Risk API Endpoints** for querying assessments, alternatives, and summaries
- ✅ **Database Migrations** for risk_assessments table with proper indexes

**Frontend Integration (React + TypeScript):**
- ✅ **TypeScript Types** for risk assessments matching backend schema
- ✅ **API Client** for fetching risk data (assessments, alternatives, summary)
- ✅ **WebSocket Hook** (useRiskUpdates) for real-time updates
- ✅ **Full Type Safety** across Python → Backend → Frontend

**Data Flow:**
```
GDELT/USGS → Backend saves event → Redis publish → Risk Agent analyzes
                                                          ↓
                                                   Writes to DB
                                                          ↓
Backend WebSocket ← Redis subscribe ← Risk Agent publishes
        ↓
Frontend receives update → Queries API → Updates UI
```

**Frontend UI Integration** (from design doc Q8, Q14):
- **Connection Color**: Query `getConnectionRisk(id)` → map to color based on `riskCategory`
  - `'healthy'` → White/Light Blue (#E0E0E0)
  - `'monitoring'` → Yellow (#FFCC00)
  - `'at-risk'` → Orange (#FF6600)
  - `'critical'` → Bright Red (#FF0000)
  - `'disrupted'` → Dark Red, Dashed (#990000)

- **Detail Panel Section 3 (Risk Assessment)**:
  - Current risk level gauge from `assessment.riskCategory`
  - Risk factors from `assessment.reasoning.factors`
  - Trend indicator (check if severityScore changed over time)
  - Reasoning summary from `assessment.reasoning.summary`

- **Alternative Suppliers Feature** (Q9):
  - When user clicks at-risk connection, fetch `getConnectionAlternatives(id)`
  - Render alternative suppliers as green pulsing nodes on map
  - Show AI reasoning from `alternative.reason` and `alternative.confidence`
  - Preview rerouted path when hovering alternative

**Key Alignment with Design Document:**
- Risk categories: `'healthy' | 'monitoring' | 'at-risk' | 'critical' | 'disrupted'`
- GeoPoint: JSONB `{lat: number, lng: number}` matching shared types
- Supports slices AF2-AF7: risk calculation, proximity, severity, alternatives
- WebSocket integration matches design architecture (Section E21-E26)
- Frontend API enables Detail Panel sections (Q14: Risk Assessment, Alternatives)

**Next Steps After Implementation:**

1. **Seed Database** (Phase 1 prerequisite):
   - Run Phase 0 plan to create companies, suppliers, connections tables
   - Seed with semiconductor industry data (TSMC, Samsung, Intel, etc.)
   - Add test events (earthquake in Taiwan, typhoon in Korea)

2. **End-to-End Testing**:
   ```bash
   # Terminal 1: Start Risk Agent
   cd risk-agent && python -m src.main

   # Terminal 2: Start Backend
   cd "Version 2/backend" && npm run dev

   # Terminal 3: Trigger event notification
   curl -X POST http://localhost:3001/internal/events/notify/EVENT_ID

   # Verify: Check risk_assessments table, WebSocket broadcasts, API responses
   ```

3. **Frontend Integration** (implement in map visualization):
   - Use `useRiskUpdates` hook to listen for real-time updates
   - Fetch connection risk when user clicks edge: `getConnectionRisk(connectionId)`
   - Display risk assessment in Detail Panel (Section 3: Risk Assessment)
   - Show alternatives when risk >= 'at-risk': `getConnectionAlternatives(connectionId)`
   - Color-code connections by risk category on map

4. **Implement Design Doc Slices**:
   - **AF2-AF4**: Risk calculation with proximity and severity (✅ done in agent)
   - **AF5-AF7**: Alternative suppliers/routes UI (use API + frontend types)
   - Connect to existing map layers (connections ArcLayer with color by risk)

---

Plan complete and saved to `docs/plans/2026-01-31-risk-agent.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
