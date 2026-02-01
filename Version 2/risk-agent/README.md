# Sentinel-Zero Risk Agent

Python LangChain agent for supply chain risk analysis. Analyzes geopolitical events, natural disasters, and policy changes to compute risk assessments for supply chain nodes and connections.

## Features

- **LangChain Agent**: GPT-4o powered agent with 9 custom tools
- **Spatial Analysis**: Haversine formula for geographic impact calculation (no PostGIS)
- **Real-time Processing**: Redis pub/sub integration for event streaming
- **Structured Output**: Pydantic v2 schemas for consistent risk assessments
- **Alternative Suggestions**: Recommends alternative suppliers and routes

## Architecture

```
Backend (Node.js) → Redis (events:new) → Risk Agent (Python) → Supabase
                                               ↓
                                         risk_assessments table
                                               ↓
                                   Redis (risk:updated) → Frontend
```

### Agent Tools

| Tool | Purpose |
|------|---------|
| `get_event_details` | Fetch event info (type, severity, location) |
| `calculate_impact_radius_tool` | Determine affected area size |
| `query_affected_nodes` | Find suppliers/ports in impact zone |
| `query_affected_connections` | Find shipping routes through zone |
| `find_alternative_suppliers` | Search for replacement suppliers |
| `find_alternative_routes` | Search for alternate shipping paths |
| `get_connection_details` | Get full route information |
| `get_supplier_materials` | Check what materials a supplier provides |
| `calculate_distance_tool` | Measure geographic distance |

## Setup

### Prerequisites

- Python 3.11+
- Redis server (local or Docker)
- Supabase account
- OpenAI API key (GPT-4o access)

### Installation

1. **Navigate to risk-agent:**
   ```bash
   cd "Version 2/risk-agent"
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
   # Edit .env with your credentials
   ```

5. **Run database migrations:**
   - Go to Supabase Dashboard → SQL Editor
   - Run `migrations/001_create_risk_assessments.sql`
   - Run `migrations/002_add_indexes.sql`

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

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check with Redis status |
| `/analyze/{event_id}` | POST | Async trigger risk analysis |
| `/analyze/{event_id}/sync` | GET | Sync analyze and return result |

## Usage

### Automatic Analysis

The agent automatically listens for new events on Redis channel `events:new`:

1. Backend fetches event from news/weather APIs
2. Backend saves to Supabase `events` table
3. Backend publishes to Redis: `{"event_id": "..."}`
4. Risk agent receives event, analyzes, saves assessment
5. Agent publishes to `risk:updated` channel

### Manual Analysis

```bash
# Async (returns immediately)
curl -X POST http://localhost:8000/analyze/EVENT_UUID

# Sync (waits for result)
curl http://localhost:8000/analyze/EVENT_UUID/sync
```

## Output Schema

```json
{
  "risk_category": "at-risk",
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
      {"id": "...", "name": "Port of Busan", "type": "port", "reason": "Safe distance", "confidence": 0.9}
    ]
  }
}
```

### Risk Categories

| Category | Description | Typical Conditions |
|----------|-------------|-------------------|
| `healthy` | No impact | >300km away, severity 1-2 |
| `monitoring` | Minor concern | 200-300km, severity 3-4 |
| `at-risk` | Significant risk | 100-200km, severity 5-6 |
| `critical` | Imminent disruption | 50-100km, severity 7-8 |
| `disrupted` | Confirmed disruption | 0-50km, severity 9-10 |

## Testing

```bash
# Run all tests
pytest -v

# Run with coverage
pytest --cov=src tests/

# Run specific test
pytest tests/test_schemas.py -v
```

## Project Structure

```
risk-agent/
├── src/
│   ├── agent/
│   │   ├── agent.py       # LangChain agent + analyze_event_risk()
│   │   ├── tools.py       # 9 custom tools
│   │   └── prompts.py     # System prompt
│   ├── schemas/
│   │   └── output.py      # RiskAssessment, AffectedEntity, Alternative
│   ├── db/
│   │   └── supabase.py    # Database client
│   ├── utils/
│   │   ├── geo.py         # haversine_distance, calculate_impact_radius
│   │   └── redis_client.py
│   ├── config.py          # Configuration
│   └── main.py            # FastAPI server
├── migrations/
│   ├── 001_create_risk_assessments.sql
│   └── 002_add_indexes.sql
├── tests/
├── requirements.txt
├── Dockerfile
└── docker-compose.yml
```

## Troubleshooting

**Redis connection failed:**
```bash
# Check if Redis is running
redis-cli ping
# Or start with Docker
docker run -d -p 6379:6379 redis:7-alpine
```

**OpenAI API errors:**
- Verify `OPENAI_API_KEY` is valid
- Check you have GPT-4o access
- Review rate limits

**Supabase query errors:**
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Check migrations have been run
- Ensure tables have data

## License

ISC
