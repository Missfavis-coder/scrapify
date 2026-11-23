from typing import Any, Literal

from pydantic import BaseModel, Field


class TaskResult(BaseModel):
    success: bool

    status: Literal[
        "completed",
        "incomplete",
        "blocked",
        "error",
    ] = "error"

    result: Any | None = None

    error: str | None = None

    steps_completed: int = Field(default=0, ge=0)

    execution_history: list[dict[str, Any]] = Field(
        default_factory=list
    )