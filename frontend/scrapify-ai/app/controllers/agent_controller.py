
import logging
from typing import Any

from app.agents.agent_loop import AgentLoop

logger = logging.getLogger(__name__)

VALID_STATUSES = {
    "completed",
    "incomplete",
    "blocked",
    "error",
}


class AgentController:
    """Coordinates agent execution and formats API responses."""

    def __init__(self, agent: AgentLoop):
        self.agent = agent

    @staticmethod
    def _is_quota_error(exc: Exception) -> bool:
        """Detect common Gemini quota and rate-limit errors."""

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
    def _response(
        *,
        success: bool,
        status: str,
        result: Any = None,
        error: str | None = None,
        history: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        """Build a consistent API response."""

        history = history or []

        steps_completed = sum(
            1
            for entry in history
            if isinstance(entry, dict)
            and isinstance(entry.get("step"), int)
            and not isinstance(entry.get("step"), bool)
            and entry.get("action") is not None
        )

        return {
            "success": success,
            "status": status,
            "result": result,
            "error": error,
            "steps_completed": steps_completed,
            "execution_history": history,
        }

    async def run(self, task: str) -> dict[str, Any]:
        """Run a browser task and format the result."""

        if not isinstance(task, str) or not task.strip():
            return self._response(
                success=False,
                status="error",
                error="Task must be a non-empty string.",
            )

        try:
            result = await self.agent.run(task.strip())

            if not isinstance(result, dict):
                logger.error("Agent returned an invalid result.")
                return self._response(
                    success=False,
                    status="error",
                    error="The agent returned an invalid response.",
                )

            history = result.get("history", [])
            if not isinstance(history, list):
                history = []

            success = result.get("success") is True

            status = result.get("status")
            if status not in VALID_STATUSES:
                status = "completed" if success else "error"

            # Never report success for a non-completed status.
            if status != "completed":
                success = False

            error = result.get("reason")
            if not success and not isinstance(error, str):
                error = "The browser task did not complete successfully."

            return self._response(
                success=success,
                status=status,
                result=result.get("result"),
                error=error,
                history=history,
            )

        except Exception as exc:
            if self._is_quota_error(exc):
                logger.warning(
                    "Gemini quota error reached AgentController."
                )
                return self._response(
                    success=False,
                    status="error",
                    error=(
                        "Gemini API quota or rate limit reached. "
                        "The task was stopped. Check your Gemini "
                        "quota before trying again."
                    ),
                )

            logger.exception("Agent execution failed.")

            return self._response(
                success=False,
                status="error",
                error="An unexpected error occurred during agent execution.",
            )
