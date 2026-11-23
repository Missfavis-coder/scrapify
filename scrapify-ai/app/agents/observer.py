from typing import Any


class Observer:
    """
    Observes the current browser state and converts it into
    useful information for the agent.
    """

    def __init__(self, browser):
        self.browser = browser

    async def observe(self) -> dict[str, Any]:
        page_text = await self.browser.get_page_text()
        url = await self.browser.get_current_url()
        title = await self.browser.get_page_title()

        return {
            "url": url,
            "title": title,
            "page_text": page_text,
            "has_results": self._detect_results(page_text),
            "has_error": self._detect_error(page_text),
        }

    @staticmethod
    def _detect_results(page_text: str) -> bool:
        if not page_text:
            return False

        indicators = [
            "results",
            "products",
            "price",
            "items",
        ]

        text = page_text.lower()
        return any(word in text for word in indicators)

    @staticmethod
    def _detect_error(page_text: str) -> bool:
        if not page_text:
            return False

        indicators = [
            "error",
            "not found",
            "something went wrong",
            "try again",
        ]

        text = page_text.lower()
        return any(word in text for word in indicators)