from typing import Any

from app.models.llm_client import LLMClient


class Planner:
    """
    Converts natural-language tasks into validated browser actions
    and generates recovery actions when execution fails.
    """

    SUPPORTED_ACTIONS = {
        "navigate",
        "open_url",
        "search",
        "click",
        "fill",
        "extract",
        "paginate",
        "scroll",
        "wait",
        "download",
    }

    def __init__(self, llm_client: LLMClient):
        self.llm = llm_client

    @classmethod
    def _validate_action(
        cls,
        action: Any,
        index: int | None = None,
    ) -> dict[str, Any]:
        """Validate an action's structure before execution."""

        location = (
            f" at index {index}" if index is not None else ""
        )

        if not isinstance(action, dict):
            raise ValueError(
                f"Planner action{location} must be an object."
            )

        action_type = action.get("type")

        if not isinstance(action_type, str) or not action_type.strip():
            raise ValueError(
                f"Planner action{location} has no valid type."
            )

        action_type = action_type.strip().lower()

        if action_type not in cls.SUPPORTED_ACTIONS:
            raise ValueError(
                f"Unsupported action type{location}: {action_type}"
            )

        parameters = action.get("parameters", {})

        if not isinstance(parameters, dict):
            raise ValueError(
                f"Action parameters{location} must be an object."
            )

        validated_action = dict(action)
        validated_action["type"] = action_type
        validated_action["parameters"] = parameters

        return validated_action

    async def create_plan(
        self,
        task: str,
    ) -> list[dict[str, Any]]:
        """Generate and validate a sequence of browser actions."""

        if not isinstance(task, str) or not task.strip():
            raise ValueError("Task cannot be empty.")

        actions = await self.llm.generate_plan(task.strip())

        if not isinstance(actions, list) or not actions:
            raise ValueError(
                "The LLM returned an empty or invalid action plan."
            )

        return [
            self._validate_action(action, index)
            for index, action in enumerate(actions)
        ]

    async def replan(
        self,
        task: str,
        failed_action: dict[str, Any],
        observation: dict[str, Any],
        history: list[dict[str, Any]],
    ) -> dict[str, Any] | None:
        """Generate and validate one recovery action."""

        if not isinstance(task, str) or not task.strip():
            raise ValueError("Recovery task cannot be empty.")

        if not isinstance(failed_action, dict):
            raise ValueError("Failed action must be an object.")

        if not isinstance(observation, dict):
            raise ValueError("Recovery observation must be an object.")

        if not isinstance(history, list):
            raise ValueError("Recovery history must be a list.")

        action = await self.llm.generate_recovery_action(
            task=task,
            failed_action=failed_action,
            observation=observation,
            history=history,
        )

        if action is None:
            return None

        return self._validate_action(action)