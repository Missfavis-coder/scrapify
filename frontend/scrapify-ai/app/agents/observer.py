
from typing import Any


class Observer:
    """
    Observes browser state and classifies the page for the agent.

    The observer detects security challenges but does not attempt
    to bypass them.
    """

    SECURITY_CHALLENGE_INDICATORS = [
        "just a moment",
        "checking your browser",
        "verify you are human",
        "verify that you are human",
        "performing security verification",
        "checking if the site connection is secure",
        "cf-chl-",
        "challenge-platform",
        "captcha",
    ]

    ACCESS_DENIED_INDICATORS = [
        "access denied",
        "you have been blocked",
        "request blocked",
        "error 1020",
        "sorry, you have been blocked",
    ]

    ERROR_INDICATORS = [
        "something went wrong",
        "page not found",
        "404 not found",
        "internal server error",
        "service unavailable",
    ]

    RESULT_INDICATORS = [
        "results",
        "products",
        "price",
        "items",
    ]

    def __init__(self, browser):
        self.browser = browser

    async def observe(self) -> dict[str, Any]:
        page_text = await self.browser.get_page_text() or ""
        url = await self.browser.get_current_url() or ""
        title = await self.browser.get_page_title() or ""

        page_state = self._classify_page(
            page_text=page_text,
            title=title,
            url=url,
        )

        is_security_challenge = page_state == "security_challenge"
        is_access_denied = page_state == "access_denied"

        return {
            "url": url,
            "title": title,
            "page_text": page_text,
            "page_state": page_state,
            "is_security_challenge": is_security_challenge,
            "is_access_denied": is_access_denied,
            "has_results": (
                page_state == "content"
                and self._detect_results(page_text)
            ),
            "has_error": page_state in {
                "security_challenge",
                "access_denied",
                "error",
                "empty",
            },
        }

    @classmethod
    def _classify_page(
        cls,
        page_text: str,
        title: str,
        url: str,
    ) -> str:
        """
        Classification priority matters:
        security restrictions must be checked before result indicators.
        """
        text = f"{title}\n{page_text}".lower()
        current_url = url.lower()

        if not text.strip():
            return "empty"

        if (
            "challenges.cloudflare.com" in current_url
            or "/cdn-cgi/challenge-platform/" in current_url
            or cls._contains_any(
                text, cls.SECURITY_CHALLENGE_INDICATORS
            )
        ):
            return "security_challenge"

        if cls._contains_any(text, cls.ACCESS_DENIED_INDICATORS):
            return "access_denied"

        if cls._contains_any(text, cls.ERROR_INDICATORS):
            return "error"

        return "content"

    @staticmethod
    def _contains_any(text: str, indicators: list[str]) -> bool:
        return any(indicator in text for indicator in indicators)

    @classmethod
    def _detect_results(cls, page_text: str) -> bool:
        if not page_text:
            return False

        return cls._contains_any(
            page_text.lower(),
            cls.RESULT_INDICATORS,
        )

    @classmethod
    def _detect_error(cls, page_text: str) -> bool:
        if not page_text:
            return False

        text = page_text.lower()

        return (
            cls._contains_any(text, cls.ERROR_INDICATORS)
            or cls._contains_any(
                text, cls.ACCESS_DENIED_INDICATORS
            )
            or cls._contains_any(
                text, cls.SECURITY_CHALLENGE_INDICATORS
            )
        )
