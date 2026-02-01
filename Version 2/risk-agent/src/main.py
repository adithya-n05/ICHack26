"""Main entry point for Risk Agent microservice."""
import asyncio
import json
import logging
from fastapi import FastAPI, BackgroundTasks, HTTPException
from contextlib import asynccontextmanager
from typing import Optional

from src.config import config
from src.utils.redis_client import get_redis_client
from src.agent.agent import analyze_event_risk
from src.db.supabase import get_supabase_client
from src.schemas.output import RiskAssessment

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global flag for Redis listener
_listener_task: Optional[asyncio.Task] = None


def serialize_assessment(assessment: RiskAssessment) -> dict:
    """Serialize RiskAssessment to database-compatible dict."""
    data = assessment.model_dump()
    # Convert enum to string value
    data['risk_category'] = assessment.risk_category.value
    return data


async def save_risk_assessment(event_id: str, assessment: RiskAssessment) -> None:
    """Save risk assessment to Supabase."""
    try:
        supabase = get_supabase_client()

        # Serialize the assessment using Pydantic v2 model_dump()
        assessment_data = serialize_assessment(assessment)

        supabase.table('risk_assessments').insert({
            'event_id': event_id,
            'risk_category': assessment_data['risk_category'],
            'severity_score': assessment_data['severity_score'],
            'confidence': assessment_data['confidence'],
            'reasoning': assessment_data['reasoning'],
            'affected_entities': assessment_data['affected_entities'],
            'alternatives': assessment_data['alternatives']
        }).execute()

        logger.info(f"Risk assessment saved for event {event_id}")
    except Exception as e:
        logger.error(f"Error saving risk assessment: {e}", exc_info=True)
        raise


async def process_event(event_id: str) -> None:
    """Process a single event: analyze risk, save, and publish update."""
    try:
        logger.info(f"Processing event: {event_id}")

        # Analyze risk using the agent
        assessment = await analyze_event_risk(event_id)

        # Save to database
        await save_risk_assessment(event_id, assessment)

        # Publish risk update notification
        redis_client = get_redis_client()
        redis_client.publish(
            config.REDIS_RISK_CHANNEL,
            json.dumps({
                "event_id": event_id,
                "status": "updated",
                "risk_category": assessment.risk_category.value,
                "severity_score": assessment.severity_score
            })
        )

        logger.info(f"Risk assessment completed for event {event_id}: {assessment.risk_category.value}")

    except Exception as e:
        logger.error(f"Error processing event {event_id}: {e}", exc_info=True)


async def redis_event_listener() -> None:
    """Listen for new events on Redis pub/sub channel."""
    logger.info(f"Starting Redis listener on channel: {config.REDIS_EVENTS_CHANNEL}")

    redis_client = get_redis_client()
    pubsub = redis_client.pubsub()
    pubsub.subscribe(config.REDIS_EVENTS_CHANNEL)

    try:
        while True:
            message = pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if message is not None and message['type'] == 'message':
                try:
                    data = json.loads(message['data'])
                    event_id = data.get('event_id')

                    if event_id:
                        logger.info(f"Received new event: {event_id}")
                        # Process in background to not block listener
                        asyncio.create_task(process_event(event_id))
                    else:
                        logger.warning(f"Received message without event_id: {data}")

                except json.JSONDecodeError as e:
                    logger.error(f"Invalid JSON in message: {e}")
                except Exception as e:
                    logger.error(f"Error processing message: {e}", exc_info=True)

            # Small delay to prevent busy loop
            await asyncio.sleep(0.1)

    except asyncio.CancelledError:
        logger.info("Redis listener cancelled")
    finally:
        pubsub.unsubscribe()
        pubsub.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle."""
    global _listener_task

    # Startup
    try:
        config.validate()
    except ValueError as e:
        logger.warning(f"Config validation warning: {e}")

    logger.info("Risk Agent starting...")

    # Start Redis listener in background
    _listener_task = asyncio.create_task(redis_event_listener())

    yield

    # Shutdown
    logger.info("Risk Agent shutting down...")
    if _listener_task:
        _listener_task.cancel()
        try:
            await _listener_task
        except asyncio.CancelledError:
            pass


# Create FastAPI app
app = FastAPI(
    title="Sentinel-Zero Risk Agent",
    description="Supply chain risk analysis agent powered by LangChain and GPT-4o",
    version="1.0.0",
    lifespan=lifespan
)


@app.get("/health")
async def health():
    """Health check endpoint."""
    redis_ok = False
    try:
        redis_client = get_redis_client()
        redis_ok = redis_client.ping()
    except Exception:
        pass

    return {
        "status": "ok",
        "service": "risk-agent",
        "redis": "connected" if redis_ok else "disconnected"
    }


@app.post("/analyze/{event_id}")
async def analyze_event(event_id: str, background_tasks: BackgroundTasks):
    """
    Manually trigger risk analysis for a specific event.
    Useful for testing or re-analyzing past events.
    """
    background_tasks.add_task(process_event, event_id)
    return {
        "message": f"Analysis started for event {event_id}",
        "event_id": event_id
    }


@app.get("/analyze/{event_id}/sync")
async def analyze_event_sync(event_id: str):
    """
    Synchronously analyze an event and return the result.
    Useful for testing and debugging.
    """
    try:
        assessment = await analyze_event_risk(event_id)
        return {
            "event_id": event_id,
            "assessment": serialize_assessment(assessment)
        }
    except Exception as e:
        logger.error(f"Error analyzing event {event_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
