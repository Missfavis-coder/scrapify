from typing import Literal

from pydantic import BaseModel, Field


class TaskRequest(BaseModel):
    task: str = Field(
        ...,
        min_length=1,
        max_length=5000,
        description="Natural-language browser automation task.",
    )


class TaskResponse(BaseModel):
    task_id: str
    status: Literal[
        "queued",
        "running",
        "completed",
        "incomplete",
        "blocked",
        "error",
    ]