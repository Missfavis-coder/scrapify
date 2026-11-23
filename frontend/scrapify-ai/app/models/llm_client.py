import json
import logging
from typing import Any

from google import genai
from google.genai import types
from google.genai.errors import ServerError

from app.core.config import settings
from app.core.exceptions import ModelResponseError
from app.services.quota_manager import GeminiQuotaManager

logger = logging.getLogger(__name__)

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

SUPPORTED_EXTRACTION_FIELDS = {
    "title",
    "url",
    "text",
    "page_text",
    "links",
    "images",
    "products",
}

FIELD_ALIASES = {
    "product": "products",
    "product_name": "products",
    "product_names": "products",
    "product_details": "products",
    "product_price": "products",
    "product_prices": "products",
    "price": "products",
    "prices": "products",
    "product_url": "products",
    "product_urls": "products",
    "product_image": "products",
    "product_images": "products",
    "link": "links",
    "image": "images",
}

FALLBACK_MODEL = "gemini-flash-latest"
MAX_WAIT_SECONDS = 60
MAX_PAGES = 20


class LLMClient:
    """Gemini client for Scrapify planning and recovery."""

    def __init__(self):
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is not configured.")

        self.client = genai.Client(
            api_key=settings.GEMINI_API_KEY
        )

        self.quota_manager = GeminiQuotaManager()

    @staticmethod
    def _is_quota_error(exc: Exception) -> bool:
        """Recognize quota and rate-limit errors across SDK exceptions."""

        code = getattr(exc, "code", None)
        status_code = getattr(exc, "status_code", None)
        message = str(exc).upper()

        return (
            code == 429
            or status_code == 429
            or "RESOURCE_EXHAUSTED" in message
            or "QUOTA EXCEEDED" in message
            or "RATE LIMIT" in message
            or "TOO MANY REQUESTS" in message
        )

    @staticmethod
    def _is_retryable_server_error(exc: Exception) -> bool:
        """Only temporary server errors may trigger a fallback model."""

        code = getattr(exc, "code", None)
        status_code = getattr(exc, "status_code", None)
        status = code if code is not None else status_code

        return (
            isinstance(exc, ServerError)
            and status in {500, 502, 503, 504}
        )

    async def _call_model(
        self,
        *,
        model: str,
        contents: Any,
        config: types.GenerateContentConfig,
    ):
        """Reserve one local quota slot before making one API request."""

        # This raises locally if the daily limit or cooldown is active.
        # No Gemini request is made when reservation fails.
        self.quota_manager.reserve_request()

        try:
            return await self.client.aio.models.generate_content(
                model=model,
                contents=contents,
                config=config,
            )

        except Exception as exc:
            if self._is_quota_error(exc):
                self.quota_manager.activate_cooldown()

            raise

    async def _generate_content(
        self,
        *,
        contents: Any,
        config: types.GenerateContentConfig,
    ):
        """
        Generate content within Scrapify's local Gemini request budget.

        Each API attempt reserves a separate request slot. Quota errors
        activate cooldown and never trigger a fallback request.
        Only temporary 5xx server errors can use the fallback model.
        """

        primary_model = settings.GEMINI_MODEL

        try:
            return await self._call_model(
                model=primary_model,
                contents=contents,
                config=config,
            )

        except Exception as exc:
            # Never make another API request after a quota error.
            if self._is_quota_error(exc):
                raise

            # Do not fall back for authentication, invalid requests,
            # local quota errors, or other non-retryable exceptions.
            if not self._is_retryable_server_error(exc):
                raise

            if primary_model == FALLBACK_MODEL:
                raise

            logger.warning(
                "Gemini model %s returned server error %s. "
                "Checking the local request budget before trying %s.",
                primary_model,
                getattr(
                    exc,
                    "code",
                    getattr(exc, "status_code", "unknown"),
                ),
                FALLBACK_MODEL,
            )

            # The fallback is a separate API request, so _call_model
            # reserves another slot before making that request.
            return await self._call_model(
                model=FALLBACK_MODEL,
                contents=contents,
                config=config,
            )

    async def generate_plan(
        self,
        task: str,
    ) -> list[dict[str, Any]]:
        """Generate and validate a browser action plan."""

        if not isinstance(task, str) or not task.strip():
            raise ValueError("Task cannot be empty.")

        system_instruction = """
You are Scrapify's browser-task planning component.

Convert the user's task into a safe, structured browser plan.

Return only a JSON array. Each action must contain:
- "type": a supported action name
- "parameters": an object

SUPPORTED ACTIONS

Navigate:
{"type":"navigate","parameters":{"url":"https://example.com"}}

Open URL:
{"type":"open_url","parameters":{"url":"https://example.com"}}

Search:
{"type":"search","parameters":{"query":"search terms"}}

Click:
{"type":"click","parameters":{"selector":"CSS_SELECTOR"}}

Fill:
{"type":"fill","parameters":{"selector":"CSS_SELECTOR","value":"TEXT"}}

Extract:
{"type":"extract","parameters":{"fields":["title","products"]}}

Paginate:
{"type":"paginate","parameters":{"fields":["products"],"max_pages":5}}

Scroll:
{"type":"scroll","parameters":{"direction":"down"}}

Wait:
{"type":"wait","parameters":{"seconds":2}}

Download:
{"type":"download","parameters":{"selector":"CSS_SELECTOR","save_path":"downloads/file.ext"}}

SUPPORTED EXTRACTION FIELDS
- title
- url
- text
- page_text
- links
- images
- products

PLANNING RULES

- Use only supported actions and valid parameters.
- Use search only when a search query is appropriate for the current page.
- Use CSS selectors supported by the browser runtime.
- For product names, prices, URLs, images, and details, use "products".
- Use "links" when the user separately requests page links.
- Use "images" when the user separately requests page images.
- Combine extraction fields when needed.
- Use "extract" for single-page extraction.
- Use "paginate" for multiple pages.
- Extraction fields must be non-empty and supported.
- Pagination max_pages must be between 1 and 20.
- If no page limit is specified for a multi-page task, use 5.
- Use next_selector only when there is evidence for a suitable selector.
- Wait seconds must be between 0 and 60.
- A download requires a selector and save_path.
- Do not invent website URLs, selectors, products, prices,
  or page content.
- Never make purchases, submit payments, or make consequential
  commitments as an implicit step.
- Do not bypass security challenges, CAPTCHA, access controls,
  or anti-bot protections.
- Successful navigation does not prove task completion.
- Return only valid JSON, without Markdown or explanations.
"""

        response = await self._generate_content(
            contents=task.strip(),
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
            ),
        )

        response_text = getattr(response, "text", None)

        if not response_text or not response_text.strip():
            raise ModelResponseError(
                "Gemini returned an empty plan."
            )

        return self._parse_plan(response_text)

    async def generate_recovery_action(
        self,
        task: str,
        failed_action: dict[str, Any],
        observation: dict[str, Any],
        history: list[dict[str, Any]],
    ) -> dict[str, Any] | None:
        """Generate one safe recovery action, or None."""

        if not isinstance(task, str) or not task.strip():
            raise ValueError("Recovery task cannot be empty.")

        if not isinstance(failed_action, dict):
            raise ValueError("Failed action must be an object.")

        if not isinstance(observation, dict):
            raise ValueError("Observation must be an object.")

        if not isinstance(history, list):
            raise ValueError("History must be a list.")

        prompt = f"""
Original task:
{json.dumps(task, ensure_ascii=False)}

Failed action:
{json.dumps(failed_action, ensure_ascii=False, default=str)}

Current browser observation:
{json.dumps(observation, ensure_ascii=False, default=str)}

Action history:
{json.dumps(history, ensure_ascii=False, default=str)}

Choose one safe recovery action supported by current evidence.

Return either:
- One JSON object containing "type" and "parameters".
- JSON null if no safe recovery action is appropriate.

Do not repeat a failed action without a reason.
Do not invent selectors, URLs, or page content.
Do not claim that an action has succeeded.
Do not bypass security challenges or access controls.
"""

        system_instruction = """
You are Scrapify's browser-agent recovery component.

Supported actions:
navigate, open_url, search, click, fill, extract, paginate,
scroll, wait, download.

Return exactly one valid JSON action object or JSON null.

Rules:
- Every action must contain a string type and object parameters.
- URLs must be supplied by the task or grounded in the observation.
- Search requires a non-empty query.
- Extraction fields must be a non-empty list of supported strings.
- Product extraction uses the products field.
- Pagination max_pages must be an integer from 1 to 20.
- Wait seconds must be between 0 and 60.
- A download requires a selector and save_path.
- Never bypass security challenges or access controls.
"""

        response = await self._generate_content(
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
            ),
        )

        response_text = getattr(response, "text", None)

        if not response_text or not response_text.strip():
            raise ModelResponseError(
                "Gemini returned an empty recovery response."
            )

        return self._parse_action(response_text)

    @staticmethod
    def _load_json(text: str) -> Any:
        """Parse JSON, tolerating surrounding Markdown fences."""

        if not isinstance(text, str) or not text.strip():
            raise ModelResponseError(
                "Gemini returned an empty response."
            )

        cleaned = text.strip()

        if cleaned.startswith("```"):
            lines = cleaned.splitlines()

            if lines and lines[0].strip().startswith("```"):
                lines = lines[1:]

            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]

            cleaned = "\n".join(lines).strip()

            if cleaned.startswith("json"):
                cleaned = cleaned[4:].lstrip()

        try:
            return json.loads(cleaned)

        except json.JSONDecodeError as exc:
            raise ModelResponseError(
                "Gemini returned invalid JSON."
            ) from exc

    @staticmethod
    def _normalize_action(action: Any) -> Any:
        """Normalize action names and extraction-field aliases."""

        if not isinstance(action, dict):
            return action

        action = dict(action)

        action_type = action.get("type")

        if isinstance(action_type, str):
            action_type = action_type.strip().lower()
            action["type"] = action_type

            if action_type == "open_url":
                action["type"] = "navigate"

        parameters = action.get("parameters")

        if not isinstance(parameters, dict):
            return action

        parameters = dict(parameters)
        action["parameters"] = parameters

        if action.get("type") not in {"extract", "paginate"}:
            return action

        fields = parameters.get("fields")

        if not isinstance(fields, list):
            return action

        normalized_fields = []
        seen = set()

        for field in fields:
            if not isinstance(field, str):
                normalized_fields.append(field)
                continue

            cleaned = field.strip()

            canonical = FIELD_ALIASES.get(
                cleaned.lower(),
                cleaned.lower(),
            )

            if canonical and canonical not in seen:
                normalized_fields.append(canonical)
                seen.add(canonical)

        parameters["fields"] = normalized_fields

        return action

    @classmethod
    def _validate_extraction_fields(
        cls,
        fields: Any,
        index: int,
        action_type: str,
    ) -> None:
        """Reject empty or unsupported extraction fields."""

        if (
            not isinstance(fields, list)
            or not fields
            or not all(
                isinstance(field, str) and field.strip()
                for field in fields
            )
        ):
            raise ModelResponseError(
                f"{action_type} action at index {index} requires "
                "a non-empty list of string fields."
            )

        unsupported = set(fields) - SUPPORTED_EXTRACTION_FIELDS

        if unsupported:
            raise ModelResponseError(
                f"Unsupported extraction fields at index {index}: "
                f"{sorted(unsupported)}"
            )

    @classmethod
    def _parse_plan(
        cls,
        text: str,
    ) -> list[dict[str, Any]]:
        """Parse and validate all generated actions."""

        data = cls._load_json(text)

        if not isinstance(data, list) or not data:
            raise ModelResponseError(
                "The generated plan must be a non-empty JSON array."
            )

        validated_actions = []

        for index, action in enumerate(data):
            action = cls._normalize_action(action)
            cls._validate_action(action, index)
            validated_actions.append(action)

        return validated_actions

    @classmethod
    def _validate_action(
        cls,
        action: Any,
        index: int = 0,
    ) -> None:
        """Validate an action before execution."""

        if (
            not isinstance(action, dict)
            or not isinstance(action.get("type"), str)
            or not action["type"].strip()
            or not isinstance(action.get("parameters"), dict)
        ):
            raise ModelResponseError(
                f"Invalid action structure at index {index}."
            )

        action_type = action["type"]
        parameters = action["parameters"]

        if action_type not in SUPPORTED_ACTIONS:
            raise ModelResponseError(
                f"Unsupported action type at index {index}: "
                f"{action_type}"
            )

        if action_type in {"navigate", "open_url"}:
            url = parameters.get("url")

            if not isinstance(url, str) or not url.strip():
                raise ModelResponseError(
                    f"{action_type} action at index {index} "
                    "requires a URL."
                )

        elif action_type == "search":
            query = parameters.get("query")

            if not isinstance(query, str) or not query.strip():
                raise ModelResponseError(
                    f"search action at index {index} "
                    "requires a non-empty query."
                )

        elif action_type == "click":
            selector = parameters.get("selector")

            if not isinstance(selector, str) or not selector.strip():
                raise ModelResponseError(
                    f"click action at index {index} requires a selector."
                )

        elif action_type == "fill":
            selector = parameters.get("selector")
            value = parameters.get("value")

            if not isinstance(selector, str) or not selector.strip():
                raise ModelResponseError(
                    f"fill action at index {index} requires a selector."
                )

            if not isinstance(value, str):
                raise ModelResponseError(
                    f"fill action at index {index} requires a string value."
                )

        elif action_type == "extract":
            cls._validate_extraction_fields(
                parameters.get("fields"),
                index,
                action_type,
            )

        elif action_type == "paginate":
            fields = parameters.get("fields", ["products"])

            cls._validate_extraction_fields(
                fields,
                index,
                action_type,
            )

            next_selector = parameters.get("next_selector")
            max_pages = parameters.get("max_pages", 5)

            if next_selector is not None and (
                not isinstance(next_selector, str)
                or not next_selector.strip()
            ):
                raise ModelResponseError(
                    f"paginate action at index {index} has an "
                    "invalid next_selector."
                )

            if (
                isinstance(max_pages, bool)
                or not isinstance(max_pages, int)
                or not 1 <= max_pages <= MAX_PAGES
            ):
                raise ModelResponseError(
                    f"paginate action at index {index} requires "
                    f"max_pages between 1 and {MAX_PAGES}."
                )

        elif action_type == "scroll":
            if parameters.get("direction") not in {"up", "down"}:
                raise ModelResponseError(
                    f"scroll action at index {index} requires "
                    "direction 'up' or 'down'."
                )

        elif action_type == "wait":
            seconds = parameters.get("seconds", 2)

            if (
                isinstance(seconds, bool)
                or not isinstance(seconds, (int, float))
                or not 0 <= seconds <= MAX_WAIT_SECONDS
            ):
                raise ModelResponseError(
                    f"wait action at index {index} requires "
                    f"seconds between 0 and {MAX_WAIT_SECONDS}."
                )

        elif action_type == "download":
            selector = parameters.get("selector")
            save_path = parameters.get("save_path")

            if not isinstance(selector, str) or not selector.strip():
                raise ModelResponseError(
                    f"download action at index {index} requires "
                    "a selector."
                )

            if not isinstance(save_path, str) or not save_path.strip():
                raise ModelResponseError(
                    f"download action at index {index} requires "
                    "a save_path."
                )

    @classmethod
    def _parse_action(
        cls,
        text: str,
    ) -> dict[str, Any] | None:
        """Parse and validate one recovery action."""

        data = cls._load_json(text)

        if data is None:
            return None

        data = cls._normalize_action(data)
        cls._validate_action(data)

        return data