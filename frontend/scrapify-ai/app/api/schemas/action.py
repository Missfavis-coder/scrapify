
from typing import Any

from pydantic import BaseModel, Field


class Action(BaseModel):
    type: str = Field(
        ...,
        min_length=1,
        description="Browser action type.",
    )
    parameters: dict[str, Any] = Field(
        default_factory=dict
    )


class ActionPlan(BaseModel):
    success: bool = True
    actions: list[Action] = Field(
        default_factory=list
    )
    error: str | None = None
