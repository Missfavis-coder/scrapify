
import logging
from typing import Any

from .executor import Executor
from .observer import Observer

logger = logging.getLogger(__name__)


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
        self.history: list[dict[str, Any]] = []

    @staticmethod
    def _is_gemini_quota_error(exc: Exception) -> bool:
        """Identify Gemini quota errors without retrying the model."""

        module = type(exc).__module__
        message = str(exc).upper()

        code = getattr(exc, "code", None)
        status_code = getattr(exc, "status_code", None)

        is_gemini_error = (
            module.startswith("google.genai")
            or "RESOURCE_EXHAUSTED" in message
        )

        return is_gemini_error and (
            code == 429
            or status_code == 429
            or "RESOURCE_EXHAUSTED" in message
        )

    @staticmethod
    def _quota_message() -> str:
        return (
            "Gemini API quota exceeded. Scrapify stopped this run "
            "without retrying the model. Check your Gemini API "
            "quota and try again when requests are available."
        )

    @staticmethod
    def _security_challenge_reason(
        observation: dict[str, Any],
    ) -> str | None:
        state = observation.get("page_state")

        if state == "security_challenge":
            return (
                "The website presented a security verification "
                "challenge. Scrapify stopped automated actions."
            )

        if state == "access_denied":
            return (
                "The website denied access. Scrapify stopped "
                "automated actions."
            )

        return None

    @staticmethod
    def _blocked_result(result: dict[str, Any]) -> bool:
        return (
            result.get("status") == "blocked"
            or result.get("security_challenge") is True
        )

    def _finish_blocked(
        self,
        reason: str,
        observation: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        self.history.append({
            "step": len(self.history) + 1,
            "status": "blocked",
            "reason": reason,
            "observation": observation,
        })

        return {
            "success": False,
            "status": "blocked",
            "reason": reason,
            "history": self.history,
        }

    def _finish_error(self, reason: str) -> dict[str, Any]:
        return {
            "success": False,
            "status": "error",
            "reason": reason,
            "history": self.history,
        }

    async def run(self, task: str) -> dict[str, Any]:
        self.history = []
        extracted_data: list[Any] = []
        steps_executed = 0

        if not isinstance(task, str) or not task.strip():
            return self._finish_error(
                "Task must be a non-empty string."
            )

        task = task.strip()

        try:
            await self.browser.start()

            observation = await self.observer.observe()
            reason = self._security_challenge_reason(observation)

            if reason:
                return self._finish_blocked(reason, observation)

            # Initial Gemini planning request.
            plan = await self.planner.create_plan(task)

            if not isinstance(plan, list) or not plan:
                return self._finish_error(
                    "The planner returned an empty or invalid plan."
                )

            # Keep remaining actions in a queue so recovery does not
            # require generating another complete plan.
            action_queue = list(plan)

            while action_queue and steps_executed < self.MAX_STEPS:
                action = action_queue.pop(0)
                steps_executed += 1

                if not isinstance(action, dict):
                    self.history.append({
                        "step": steps_executed,
                        "action": action,
                        "success": False,
                        "error": "Planner returned an invalid action.",
                    })
                    continue

                result = await self._execute_with_retry(action)

                if self._blocked_result(result):
                    return self._finish_blocked(
                        result.get(
                            "error",
                            "Website access was blocked.",
                        ),
                        result.get("observation"),
                    )

                observation = await self.observer.observe()
                reason = self._security_challenge_reason(observation)

                self.history.append({
                    "step": steps_executed,
                    "action": action,
                    "result": result,
                    "observation": observation,
                })

                if reason:
                    return self._finish_blocked(reason, observation)

                if not result.get("success"):
                    # Do not use recovery if there is no step budget.
                    if steps_executed >= self.MAX_STEPS:
                        break

                    # This calls Gemini once for a recovery action.
                    recovery_result = await self._recover(
                        task=task,
                        failed_action=action,
                        observation=observation,
                    )

                    if recovery_result is None:
                        return self._finish_error(
                            "Agent could not recover from the failed action."
                        )

                    if self._blocked_result(recovery_result):
                        return self._finish_blocked(
                            recovery_result.get(
                                "error",
                                "Website access was blocked during recovery.",
                            ),
                            recovery_result.get("observation"),
                        )

                    steps_executed += 1
                    recovery_observation = await self.observer.observe()

                    recovery_reason = self._security_challenge_reason(
                        recovery_observation
                    )

                    if recovery_reason:
                        return self._finish_blocked(
                            recovery_reason,
                            recovery_observation,
                        )

                    self.history.append({
                        "step": steps_executed,
                        "action": recovery_result.get("action"),
                        "result": recovery_result,
                        "observation": recovery_observation,
                        "recovery": True,
                    })

                    if not recovery_result.get("success"):
                        return self._finish_error(
                            "Recovery action failed."
                        )

                    recovery_action = recovery_result.get("action", {})

                    if (
                        isinstance(recovery_action, dict)
                        and recovery_action.get("type")
                        in {"extract", "paginate"}
                    ):
                        extracted_data.append(
                            recovery_result.get("data")
                        )

                    # Recovery is a local browser action after the
                    # single recovery-planning request. Verify locally.
                    verification = await self.verifier.verify(
                        task=task,
                        observation=recovery_observation,
                        extracted_data=extracted_data,
                    )

                    if (
                        isinstance(verification, dict)
                        and verification.get("completed")
                    ):
                        return {
                            "success": True,
                            "status": "completed",
                             "extracted_data": extracted_data,
                            "result": verification.get("result"),
                            "history": self.history,
                        }

                    # Continue the existing plan instead of calling
                    # Gemini again to generate a continuation plan.
                    continue

                if action.get("type") in {"extract", "paginate"}:
                    extracted_data.append(result.get("data"))

                verification = await self.verifier.verify(
                    task=task,
                    observation=observation,
                    extracted_data=extracted_data,
                )

                if (
                    isinstance(verification, dict)
                    and verification.get("completed")
                ):
                    return {
                        "success": True,
                        "status": "completed",
                         "extracted_data": extracted_data,
                        "result": verification.get("result"),
                        "history": self.history,
                    }

            if steps_executed >= self.MAX_STEPS:
                reason = (
                    "Maximum agent steps reached before completion "
                    "could be verified."
                )
            else:
                reason = "Plan finished without verified completion."

            return {
                "success": False,
                "status": "incomplete",
                "reason": reason,
                "history": self.history,
            }

        except Exception as exc:
            if self._is_gemini_quota_error(exc):
                logger.warning(
                    "Gemini quota exhausted; stopping the current run."
                )
                return self._finish_error(self._quota_message())

            logger.exception("Scrapify agent run failed.")

            return self._finish_error(
                f"{type(exc).__name__}: {exc}"
            )

        finally:
            try:
                await self.browser.close()
            except Exception:
                logger.exception("Failed to close the browser cleanly.")

    async def _execute_with_retry(
        self,
        action: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Retry failed browser actions.

        These retries do not call Gemini themselves. If your executor
        later gains model calls, revisit this retry policy.
        """

        result: dict[str, Any] = {
            "success": False,
            "status": "error",
            "action": action,
            "error": "Action was not executed.",
        }

        for attempt in range(self.MAX_RETRIES + 1):
            result = await self.executor.execute(action)

            if self._blocked_result(result):
                return result

            if result.get("success"):
                return result

            if attempt < self.MAX_RETRIES:
                try:
                    observation = await self.observer.observe()
                except Exception:
                    continue

                reason = self._security_challenge_reason(observation)

                if reason:
                    return {
                        "success": False,
                        "status": "blocked",
                        "security_challenge": True,
                        "error": reason,
                        "observation": observation,
                        "action": action,
                    }

        return result

    async def _recover(
        self,
        task: str,
        failed_action: dict[str, Any],
        observation: dict[str, Any],
    ) -> dict[str, Any] | None:
        """
        Request one recovery action and execute it.

        Gemini quota errors propagate to run(), which stops the task
        without requesting another plan or recovery action.
        """

        try:
            recovery_action = await self.planner.replan(
                task=task,
                failed_action=failed_action,
                observation=observation,
                history=self.history,
            )

        except Exception as exc:
            if self._is_gemini_quota_error(exc):
                raise

            logger.exception("Failed to generate a recovery action.")

            return {
                "success": False,
                "status": "error",
                "action": failed_action,
                "error": (
                    f"Recovery planning failed: {type(exc).__name__}"
                ),
            }

        if not isinstance(recovery_action, dict):
            return None

        result = await self._execute_with_retry(recovery_action)

        if self._blocked_result(result):
            return result

        # Preserve the action so the caller can record it in history.
        result.setdefault("action", recovery_action)

        return result
