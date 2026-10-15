from typing import Any

from pydantic import BaseModel, Field


class Action(BaseModel):
    type: str = Field(
        ...,
        description="Browser action type.",
    )

    parameters: dict[str, Any] = Field(
        default_factory=dict
    )


class ActionPlan(BaseModel):
    actions: list[Action]