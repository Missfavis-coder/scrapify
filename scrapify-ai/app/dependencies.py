
from functools import lru_cache

from app.agents.agent_loop import AgentLoop
from app.agents.planner import Planner
from app.controllers.agent_controller import AgentController
from app.controllers.planner_controller import PlannerController
from app.models.llm_client import LLMClient
from app.services.verification_service import VerificationService
from app.tools.browser_runtime import BrowserRuntime


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
    browser = BrowserRuntime()
    planner = get_planner()
    verifier = VerificationService()

    agent = AgentLoop(
        browser=browser,
        planner=planner,
        verifier=verifier,
    )

    return AgentController(agent=agent)
