from typing import Any


class Executor:
    """
    Executes validated actions through the browser layer.
    """

    def __init__(self, browser):
        self.browser = browser

    async def execute(self, action: dict[str, Any]) -> dict[str, Any]:
        action_type = action.get("type")

        if not action_type:
            return {
                "success": False,
                "error": "Action type is missing.",
            }

        try:
            if action_type == "open_url":
                await self.browser.open_url(action["url"])

            elif action_type == "search":
                await self.browser.search(action["query"])

            elif action_type == "click":
                await self.browser.click(action["selector"])

            elif action_type == "extract":
                data = await self.browser.extract(
                    action.get("fields", [])
                )

                return {
                    "success": True,
                    "action": action,
                    "data": data,
                }

            elif action_type == "wait":
                await self.browser.wait(
                    action.get("seconds", 2)
                )

            else:
                return {
                    "success": False,
                    "error": f"Unsupported action: {action_type}",
                }

            return {
                "success": True,
                "action": action,
            }

        except Exception as exc:
            return {
                "success": False,
                "action": action,
                "error": str(exc),
            }