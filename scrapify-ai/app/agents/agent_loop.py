
from typing import Any

from .executor import Executor
from .observer import Observer


class AgentLoop:
    """
    Coordinates planning, browser execution, observation,
    recovery, and verification for a single task.
    """

    MAX_STEPS = 15
    MAX_RETRIES = 2

    def __init__(self, browser, planner, verifier):
        self.browser = browser
        self.planner = planner
        self.verifier = verifier

        self.observer = Observer(browser)
        self.executor = Executor(browser)

        # History belongs to this task, not the agent instance.
        self.history: list[dict[str, Any]] = []

    async def run(self, task: str) -> dict[str, Any]:
        self.history = []
        extracted_data: list[Any] = []

        try:
            # Start the browser if this runtime has not started yet.
            await self.browser.start()

            plan = await self.planner.create_plan(task)

            if not plan:
                return {
                    "success": False,
                    "reason": "The planner returned an empty plan.",
                    "history": self.history,
                }

            for step_number, action in enumerate(
                plan[: self.MAX_STEPS],
                start=1,
            ):
                result = await self._execute_with_retry(action)

                # Preserve data returned by successful extract actions.
                
                if result.get("success") and action.get("type") in (
                    "extract",
                    "paginate",
                ):
                    extracted_data.append(result.get("data"))


                observation = await self.observer.observe()

                history_item = {
                    "step": step_number,
                    "action": action,
                    "result": result,
                    "observation": observation,
                }
                self.history.append(history_item)

                if not result.get("success"):
                    recovered = await self._recover(
                        task=task,
                        failed_action=action,
                        observation=observation,
                    )

                    if not recovered:
                        return {
                            "success": False,
                            "reason": "Agent could not recover.",
                            "history": self.history,
                        }

                    # Recovery succeeded. Continue to the next
                    # planned action rather than repeating the
                    # failed action indefinitely.
                    continue

                verification = await self.verifier.verify(
                    task=task,
                    observation=observation,
                    extracted_data=extracted_data,
                )

                if verification.get("completed"):
                    return {
                        "success": True,
                        "result": verification.get("result"),
                        "history": self.history,
                    }

            return {
                "success": False,
                "reason": (
                    "Maximum agent steps reached."
                    if len(plan) > self.MAX_STEPS
                    else "Plan finished without verified completion."
                ),
                "history": self.history,
            }

        finally:
            # Each run owns its browser session.
            await self.browser.close()

    async def _execute_with_retry(
        self,
        action: dict[str, Any],
    ) -> dict[str, Any]:
        result: dict[str, Any] = {
            "success": False,
            "action": action,
            "error": "Action was not executed.",
        }

        for _ in range(self.MAX_RETRIES + 1):
            result = await self.executor.execute(action)

            if result.get("success"):
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

        result = await self.executor.execute(recovery_action)

        self.history.append({
            "step": len(self.history) + 1,
            "action": recovery_action,
            "result": result,
            "recovery": True,
        })

        return bool(result.get("success"))
