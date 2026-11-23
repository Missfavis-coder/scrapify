from functools import lru_cache

from app.agents.agent_loop import AgentLoop
from app.agents.planner import Planner
from app.controllers.agent_controller import AgentController
from app.controllers.planner_controller import PlannerController
from app.models.llm_client import LLMClient
from app.services.verification_service import VerificationService
from app.tools.browser_runtime import BrowserRuntime


@lru_cache(maxsize=1)
def get_llm_client() -> LLMClient:
    """Reuse the LLM client across requests."""
    return LLMClient()


@lru_cache(maxsize=1)
def get_planner() -> Planner:
    """Reuse the stateless planner across requests."""
    return Planner(
        llm_client=get_llm_client()
    )


@lru_cache(maxsize=1)
def get_planner_controller() -> PlannerController:
    """Provide the planner controller for planner-related routes."""
    return PlannerController(
        planner=get_planner()
    )


def get_verification_service() -> VerificationService:
    """Create the verification service."""
    return VerificationService()


def get_agent_controller() -> AgentController:
    """
    Create a fresh browser and agent for each controller request.

    AgentLoop is stateful, so it should not be cached across tasks.
    """
    browser = BrowserRuntime(headless=True)

    agent = AgentLoop(
        browser=browser,
        planner=get_planner(),
        verifier=get_verification_service(),
    )

    return AgentController(agent=agent)