from functools import lru_cache

from app.agents.agent_loop import AgentLoop
from app.agents.planner import Planner
from app.controllers.agent_controller import (
    AgentController,
)
from app.controllers.planner_controller import (
    PlannerController,
)
from app.models.llm_client import LLMClient
from app.services.verification_service import (
    VerificationService,
)


@lru_cache
def get_llm_client() -> LLMClient:
    return LLMClient()


@lru_cache
def get_planner() -> Planner:

    return Planner(
        llm_client=get_llm_client()
    )


@lru_cache
def get_planner_controller() -> PlannerController:

    return PlannerController(
        planner=get_planner()
    )


def get_agent_controller() -> AgentController:
    """
    Creates the agent controller.

    The browser implementation will be supplied
    by the execution layer.
    """

    raise NotImplementedError(
        "Browser execution dependency must be "
        "provided by the backend/execution layer."
    )