from fastapi import FastAPI

from app.api.routes import (
    health,
    planner,
    agent,
)


app = FastAPI(
    title="Scrapify AI",
    description=(
        "AI planning and browser-agent intelligence "
        "service for Scrapify."
    ),
    version="1.0.0",
)


app.include_router(
    health.router
)

app.include_router(
    planner.router
)

app.include_router(
    agent.router
)


@app.get("/")
async def root():
    return {
        "service": "Scrapify AI",
        "status": "running",
    }