from typing import Any

from app.agents.planner import Planner


class PlannerController:
    """Coordinates planner requests and returns a consistent response."""

    def __init__(self, planner: Planner):
        self.planner = planner

    async def create_plan(self, task: str) -> dict[str, Any]:
        if not isinstance(task, str) or not task.strip():
            return {
                "success": False,
                "actions": [],
                "error": "Task must be a non-empty string.",
            }

        try:
            actions = await self.planner.create_plan(task.strip())

            if not isinstance(actions, list) or not actions:
                return {
                    "success": False,
                    "actions": [],
                    "error": "Planner returned an empty or invalid plan.",
                }

            invalid_actions = [
                index
                for index, action in enumerate(actions)
                if not isinstance(action, dict)
                or not isinstance(action.get("type"), str)
                or not action["type"].strip()
            ]

            if invalid_actions:
                return {
                    "success": False,
                    "actions": [],
                    "error": (
                        "Planner returned invalid actions at indexes: "
                        f"{invalid_actions}"
                    ),
                }

            return {
                "success": True,
                "actions": actions,
            }

        except Exception as exc:
            return {
                "success": False,
                "actions": [],
                "error": f"{type(exc).__name__}: {exc}",
            }