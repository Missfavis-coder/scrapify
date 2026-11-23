from typing import Any

from pydantic import BaseModel, Field


class TaskResult(BaseModel):
    success: bool

    result: Any | None = None

    error: str | None = None

    steps_completed: int = Field(default=0)

    execution_history: list[dict[str, Any]] = Field(
        default_factory=list
    )