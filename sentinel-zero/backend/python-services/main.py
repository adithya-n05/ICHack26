"""
Sentinel-Zero Python API Server

FastAPI application combining prediction and simulation services.
Following Context7 best practices:
- Proper CORS configuration
- Lifespan context manager
- Response models
- Exception handling
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from datetime import datetime

# Import routers
from prediction.disruption_scorer import router as prediction_router
from agent.simulation_agent import router as simulation_router


# ============ Lifespan (Context7 best practice) ============

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown events"""
    # Startup
    print("Starting Sentinel-Zero Python services...")
    print("- Prediction service: OK")
    print("- Simulation agent: OK")
    yield
    # Shutdown
    print("Shutting down Sentinel-Zero Python services...")


# ============ FastAPI App ============

app = FastAPI(
    title="Sentinel-Zero API",
    description="Supply chain intelligence prediction and simulation services",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(prediction_router)
app.include_router(simulation_router)


# ============ Health & Info Endpoints ============

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    services: dict


@app.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.utcnow().isoformat(),
        services={
            "prediction": "ok",
            "simulation": "ok",
        }
    )


@app.get("/")
async def root():
    """Root endpoint with API info"""
    return {
        "name": "Sentinel-Zero Python API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "predictions": "/api/predictions/*",
            "simulation": "/api/simulate/*",
        }
    }


# ============ Run Server ============

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=3002,
        reload=True,
    )
