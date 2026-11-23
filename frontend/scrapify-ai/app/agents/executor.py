from typing import Any


class Executor:
    """
    Executes validated actions through BrowserRuntime.

    Detects security challenges and access-denied pages without
    attempting to bypass website security controls.
    """

    MAX_PAGES = 20
    MAX_WAIT_SECONDS = 60

    CHALLENGE_INDICATORS = (
        "just a moment",
        "checking your browser",
        "verify you are human",
        "verify that you are human",
        "performing security verification",
        "security verification",
        "challenge-platform",
        "cf-chl-",
        "captcha",
    )

    ACCESS_DENIED_INDICATORS = (
        "access denied",
        "you have been blocked",
        "request blocked",
        "error 1020",
        "403 forbidden",
    )

    def __init__(self, browser):
        self.browser = browser

    @staticmethod
    def _failure(
        action: dict[str, Any],
        error: str,
        status: str = "error",
    ) -> dict[str, Any]:
        return {
            "success": False,
            "status": status,
            "action": action,
            "error": error,
        }

    @staticmethod
    def _success(
        action: dict[str, Any],
        data: Any = None,
    ) -> dict[str, Any]:
        result = {
            "success": True,
            "status": "success",
            "action": action,
        }

        if data is not None:
            result["data"] = data

        return result

    async def _check_page_access(self) -> dict[str, Any] | None:
        """
        Detect security challenges and access-denied pages.

        Returns a blocked result when a challenge is detected.
        Returns None when the page can be inspected normally.
        """
        try:
            page_text = await self.browser.get_page_text() or ""
            title = await self.browser.get_page_title() or ""
            url = await self.browser.get_current_url() or ""

        except Exception:
            # Allow the action itself to report browser/runtime errors.
            return None

        text = f"{title}\n{page_text}".lower()
        current_url = url.lower()

        challenge_detected = (
            "challenges.cloudflare.com" in current_url
            or "/cdn-cgi/challenge-platform/" in current_url
            or any(
                indicator in text
                for indicator in self.CHALLENGE_INDICATORS
            )
        )

        if challenge_detected:
            return {
                "success": False,
                "status": "blocked",
                "error": (
                    "A website security challenge was detected. "
                    "Scrapify stopped automated interaction."
                ),
            }

        if any(
            indicator in text
            for indicator in self.ACCESS_DENIED_INDICATORS
        ):
            return {
                "success": False,
                "status": "blocked",
                "error": (
                    "The website denied access. "
                    "Scrapify stopped automated interaction."
                ),
            }

        return None

    async def _execute_page_action(
        self,
        action: dict[str, Any],
        operation,
        *args,
        data_expected: bool = False,
    ) -> dict[str, Any]:
        """Run an action and check the resulting page state."""
        result = await operation(*args)

        blocked = await self._check_page_access()

        if blocked:
            return {
                **blocked,
                "action": action,
            }

        if data_expected:
            return self._success(action, result)

        return self._success(action)

    async def execute(
        self,
        action: dict[str, Any],
    ) -> dict[str, Any]:
        if not isinstance(action, dict):
            return self._failure(
                {},
                "Action must be an object.",
            )

        action_type = action.get("type")

        if not isinstance(action_type, str) or not action_type.strip():
            return self._failure(
                action,
                "Action type is missing or invalid.",
            )

        action_type = action_type.strip().lower()
        parameters = action.get("parameters", {})

        if not isinstance(parameters, dict):
            return self._failure(
                action,
                "Action parameters must be an object.",
            )

        # Navigation is allowed from a blocked page so the agent can
        # navigate away. BrowserRuntime still validates the destination.
        if action_type not in {"navigate", "open_url"}:
            blocked = await self._check_page_access()

            if blocked:
                return {
                    **blocked,
                    "action": action,
                }

        try:
            if action_type in {"navigate", "open_url"}:
                url = parameters.get("url") or action.get("url")

                if not isinstance(url, str) or not url.strip():
                    raise ValueError(
                        "Navigate action requires a valid URL."
                    )

                await self.browser.open_url(url.strip())

                blocked = await self._check_page_access()

                if blocked:
                    return {
                        **blocked,
                        "action": action,
                    }

                return self._success(action)

            elif action_type == "search":
                query = parameters.get("query") or action.get("query")

                if not isinstance(query, str) or not query.strip():
                    raise ValueError(
                        "Search action requires a non-empty query."
                    )

                return await self._execute_page_action(
                    action,
                    self.browser.search,
                    query.strip(),
                )

            elif action_type == "click":
                selector = (
                    parameters.get("selector")
                    or action.get("selector")
                )

                if not isinstance(selector, str) or not selector.strip():
                    raise ValueError(
                        "Click action requires a valid selector."
                    )

                return await self._execute_page_action(
                    action,
                    self.browser.click,
                    selector.strip(),
                )

            elif action_type == "fill":
                selector = (
                    parameters.get("selector")
                    or action.get("selector")
                )
                value = (
                    parameters.get("value")
                    if "value" in parameters
                    else action.get("value")
                )

                if not isinstance(selector, str) or not selector.strip():
                    raise ValueError(
                        "Fill action requires a valid selector."
                    )

                if not isinstance(value, str):
                    raise ValueError(
                        "Fill action requires a string value."
                    )

                return await self._execute_page_action(
                    action,
                    self.browser.fill,
                    selector.strip(),
                    value,
                )

            elif action_type == "extract":
                fields = parameters.get("fields", ["text"])

                if (
                    not isinstance(fields, list)
                    or not all(
                        isinstance(field, str) and field.strip()
                        for field in fields
                    )
                ):
                    raise ValueError(
                        "Extract fields must be a list of "
                        "non-empty strings."
                    )

                return await self._execute_page_action(
                    action,
                    self.browser.extract,
                    fields,
                    data_expected=True,
                )

            elif action_type == "paginate":
                fields = parameters.get("fields", ["products"])
                next_selector = parameters.get("next_selector")
                max_pages = parameters.get("max_pages", 5)

                if (
                    not isinstance(fields, list)
                    or not all(
                        isinstance(field, str) and field.strip()
                        for field in fields
                    )
                ):
                    raise ValueError(
                        "Paginate fields must be a list of "
                        "non-empty strings."
                    )

                if next_selector is not None and (
                    not isinstance(next_selector, str)
                    or not next_selector.strip()
                ):
                    raise ValueError(
                        "next_selector must be a non-empty selector "
                        "or None."
                    )

                if (
                    isinstance(max_pages, bool)
                    or not isinstance(max_pages, int)
                    or not 1 <= max_pages <= self.MAX_PAGES
                ):
                    raise ValueError(
                        f"max_pages must be an integer between "
                        f"1 and {self.MAX_PAGES}."
                    )

                result = await self.browser.paginate(
                    fields=fields,
                    next_selector=next_selector,
                    max_pages=max_pages,
                )

                blocked = await self._check_page_access()

                if blocked:
                    return {
                        **blocked,
                        "action": action,
                    }

                return self._success(action, result)

            elif action_type == "scroll":
                direction = parameters.get("direction", "down")

                if direction not in {"up", "down"}:
                    raise ValueError(
                        "Scroll direction must be 'up' or 'down'."
                    )

                return await self._execute_page_action(
                    action,
                    self.browser.scroll,
                    direction,
                )

            elif action_type == "wait":
                seconds = parameters.get("seconds", 2)

                if (
                    isinstance(seconds, bool)
                    or not isinstance(seconds, (int, float))
                    or seconds < 0
                    or seconds > self.MAX_WAIT_SECONDS
                ):
                    raise ValueError(
                        f"Wait seconds must be between 0 and "
                        f"{self.MAX_WAIT_SECONDS}."
                    )

                await self.browser.wait(seconds)

                blocked = await self._check_page_access()

                if blocked:
                    return {
                        **blocked,
                        "action": action,
                    }

                return self._success(action)

            elif action_type == "download":
                selector = parameters.get("selector")
                save_path = parameters.get("save_path")

                if not isinstance(selector, str) or not selector.strip():
                    raise ValueError(
                        "Download action requires a valid selector."
                    )

                if not isinstance(save_path, str) or not save_path.strip():
                    raise ValueError(
                        "Download action requires a save_path."
                    )

                result = await self.browser.download(
                    selector.strip(),
                    save_path.strip(),
                )

                return self._success(action, result)

            else:
                return self._failure(
                    action,
                    f"Unsupported action: {action_type}",
                )

        except Exception as exc:
            return self._failure(
                action,
                f"{type(exc).__name__}: {exc}",
            )