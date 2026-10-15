from typing import Any

from .observer import Observer
from .executor import Executor


class AgentLoop:
    """
    Main browser-agent reasoning loop.

    Flow:
    PLAN → ACT → OBSERVE → REASON → VERIFY
    """

    MAX_STEPS = 15
    MAX_RETRIES = 2

    def __init__(self, browser, planner, verifier):
        self.browser = browser
        self.planner = planner
        self.verifier = verifier

        self.observer = Observer(browser)
        self.executor = Executor(browser)

        self.history: list[dict[str, Any]] = []

    async def run(self, task: str) -> dict[str, Any]:
        plan = await self.planner.create_plan(task)

        for step_number in range(self.MAX_STEPS):

            if step_number >= len(plan):
                break

            action = plan[step_number]

            result = await self._execute_with_retry(action)

            observation = await self.observer.observe()

            self.history.append({
                "step": step_number + 1,
                "action": action,
                "result": result,
                "observation": observation,
            })

            if not result["success"]:
                recovered = await self._recover(
                    task,
                    action,
                    observation,
                )

                if not recovered:
                    return {
                        "success": False,
                        "reason": "Agent could not recover.",
                        "history": self.history,
                    }

            verification = await self.verifier.verify(
                task=task,
                observation=observation,
            )

            if verification.get("completed"):
                return {
                    "success": True,
                    "result": verification.get("result"),
                    "history": self.history,
                }

        return {
            "success": False,
            "reason": "Maximum agent steps reached.",
            "history": self.history,
        }

    async def _execute_with_retry(
        self,
        action: dict[str, Any],
    ) -> dict[str, Any]:

        for attempt in range(self.MAX_RETRIES + 1):

            result = await self.executor.execute(action)

            if result["success"]:
                return result

        return result

    async def _recover(
        self,
        task: str,
        failed_action: dict[str, Any],
        observation: dict[str, Any],
    ) -> bool:

        recovery_action = await self.planner.replan(
            task=task,
            failed_action=failed_action,
            observation=observation,
            history=self.history,
        )

        if not recovery_action:
            return False

        result = await self.executor.execute(
            recovery_action
        )

        return result["success"]