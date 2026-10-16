
import json
import logging
from typing import Any

from google import genai
from google.genai import types

from app.core.config import settings
from app.core.exceptions import ModelResponseError

logger = logging.getLogger(__name__)

SUPPORTED_ACTIONS = {
    "navigate",
    "click",
    "fill",
    "extract",
    "paginate",
    "scroll",
    "wait",
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

# Normalize common names returned by an LLM to fields
# that BrowserRuntime already supports.
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


class LLMClient:
    def __init__(self):
        self.client = genai.Client(
            api_key=settings.GEMINI_API_KEY
        )

    async def _generate_content(self, *, contents, config):
        primary_model = settings.GEMINI_MODEL
        fallback_model = "gemini-flash-latest"

        try:
            return await self.client.aio.models.generate_content(
                model=primary_model,
                contents=contents,
                config=config,
            )
        except Exception as exc:
            from google.genai.errors import ServerError

            # Only retry for temporary server errors.
            if not isinstance(exc, ServerError):
                raise

            if getattr(exc, "code", None) not in (
                500,
                502,
                503,
                504,
            ):
                raise

            if primary_model == fallback_model:
                raise

            logger.warning(
                "Gemini model %s returned a server error. "
                "Trying fallback model %s.",
                primary_model,
                fallback_model,
            )

            return await self.client.aio.models.generate_content(
                model=fallback_model,
                contents=contents,
                config=config,
            )

    async def generate_plan(
        self,
        task: str,
    ) -> list[dict[str, Any]]:
        response = await self._generate_content(
            contents=task,
            config=types.GenerateContentConfig(
                system_instruction="""
You are Scrapify's browser-task planning component.

Convert the user's task into a safe, structured browser plan.

Return only a JSON array of actions.
Every action must have:
- a string "type"
- an object "parameters"

SUPPORTED ACTIONS

1. navigate
{
  "type": "navigate",
  "parameters": {"url": "https://example.com"}
}

2. click
{
  "type": "click",
  "parameters": {"selector": "CSS_SELECTOR"}
}

3. fill
{
  "type": "fill",
  "parameters": {
    "selector": "CSS_SELECTOR",
    "value": "TEXT"
  }
}

4. extract
{
  "type": "extract",
  "parameters": {"fields": ["title", "products"]}
}

5. paginate
{
  "type": "paginate",
  "parameters": {
    "fields": ["products"],
    "next_selector": "a[rel='next']",
    "max_pages": 5
  }
}

6. scroll
{
  "type": "scroll",
  "parameters": {"direction": "down"}
}

7. wait
{
  "type": "wait",
  "parameters": {"seconds": 2}
}

SUPPORTED EXTRACTION FIELDS

Use only these standard field names:
- "title": page title
- "url": current page URL
- "text": visible page text
- "page_text": visible page text
- "links": page links
- "images": page images
- "products": structured product information

PRODUCT EXTRACTION RULES

- For product names, prices, product URLs, product images,
  or product details, always use "products".
- A "products" result contains product names, prices, URLs,
  images, and product text when the website exposes them.
- Do not use "product_name", "product_names", "price",
  "prices", "product_url", "link", or "image" as extraction
  field names for product collection.
- Use "links" when the user separately requests page links.
- Use "images" when the user separately requests page images.
- If the user asks for product information across pages,
  use one "paginate" action with fields ["products"].
- If the user asks for product information and all page links
  or images as well, include the relevant fields:
  ["products", "links", "images"].
- Do not create separate extract actions for individual product
  attributes when "products" already returns that information.

PLANNING RULES

- Use "paginate" when the user requests results across multiple
  pages, multiple result pages, or a page limit.
- Use "paginate" for product collection across pages when
  pagination is available or likely to exist.
- Use "extract" for ordinary single-page extraction.
- Include only the fields needed to satisfy the task.
- For "paginate", fields must be a non-empty list of strings.
- For "extract", fields must be a list of strings.
- Use "next_selector" only when the page provides evidence for
  a suitable next-page selector. Otherwise omit it so the browser
  can try its built-in pagination selectors.
- Use the requested page limit when the user provides one.
- Otherwise use max_pages=5 for multi-page tasks.
- max_pages must be an integer between 1 and 20.
- Use only the supported actions listed above.
- Do not invent page content, products, prices, or URLs.
- Do not invent a website URL when the user has not supplied one
  and the task does not otherwise identify a website.
- Never make purchases, submit payments, or make consequential
  commitments as an implicit step.
- Do not treat a successful navigation as proof that the task
  itself has been completed.
- Return only the JSON array, with no Markdown or explanation.
""",
                response_mime_type="application/json",
            ),
        )

        if not response.text:
            raise ModelResponseError(
                "Gemini returned an empty plan."
            )

        return self._parse_plan(response.text)

    async def generate_recovery_action(
        self,
        task: str,
        failed_action: dict,
        observation: dict,
        history: list[dict],
    ) -> dict | None:
        prompt = f"""
Original task:
{json.dumps(task)}

Failed action:
{json.dumps(failed_action)}

Current browser observation:
{json.dumps(observation)}

Action history:
{json.dumps(history)}

Return either one JSON action object with "type" and
"parameters", or JSON null if no safe recovery is possible.

Use only supported actions and valid parameter formats.
For product extraction, use "products".
For multi-page extraction, use "paginate".
Do not claim an action has succeeded.
"""

        response = await self._generate_content(
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=(
                    "You are Scrapify's browser-agent recovery "
                    "component. Recommend only safe, relevant "
                    "actions supported by the available evidence. "
                    "Supported actions are navigate, click, fill, "
                    "extract, paginate, scroll, and wait. "
                    "Extraction fields must be lists of strings. "
                    "For product data, use the products field. "
                    "For paginate, fields must be a non-empty list "
                    "of strings, next_selector is optional and "
                    "must be a non-empty CSS selector when supplied, "
                    "and max_pages must be an integer from 1 to 20. "
                    "Return only one valid action or JSON null."
                ),
                response_mime_type="application/json",
            ),
        )

        if not response.text:
            raise ModelResponseError(
                "Gemini returned an empty recovery response."
            )

        return self._parse_action(response.text)

    @staticmethod
    def _load_json(text: str) -> Any:
        """Parse JSON, tolerating a surrounding Markdown code fence."""
        cleaned = text.strip()

        if cleaned.startswith("```"):
            lines = cleaned.splitlines()

            if lines and lines[0].startswith("```"):
                lines = lines[1:]

            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]

            cleaned = "\n".join(lines).strip()

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError as exc:
            raise ModelResponseError(
                "Gemini returned invalid JSON."
            ) from exc

    @staticmethod
    def _normalize_action(action: Any) -> Any:
        """
        Normalize common LLM field aliases before validation.

        Unknown fields are preserved because BrowserRuntime also
        supports CSS selectors as extraction fields.
        """
        if not isinstance(action, dict):
            return action

        action_type = action.get("type")
        parameters = action.get("parameters")

        if (
            action_type not in ("extract", "paginate")
            or not isinstance(parameters, dict)
        ):
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

            cleaned_field = field.strip()
            canonical = FIELD_ALIASES.get(
                cleaned_field.lower(),
                cleaned_field,
            )

            if canonical not in seen:
                normalized_fields.append(canonical)
                seen.add(canonical)

        parameters["fields"] = normalized_fields
        return action

    @staticmethod
    def _parse_plan(
        text: str,
    ) -> list[dict[str, Any]]:
        data = LLMClient._load_json(text)

        if not isinstance(data, list):
            raise ModelResponseError(
                "The generated plan must be a JSON array."
            )

        for index, action in enumerate(data):
            data[index] = LLMClient._normalize_action(action)
            LLMClient._validate_action(data[index], index)

        return data

    @staticmethod
    def _validate_action(
        action: Any,
        index: int = 0,
    ) -> None:
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

        if action_type == "navigate":
            url = parameters.get("url")

            if not isinstance(url, str) or not url.strip():
                raise ModelResponseError(
                    f"navigate action at index {index} "
                    "requires a URL."
                )

        elif action_type == "click":
            selector = parameters.get("selector")

            if not isinstance(selector, str) or not selector.strip():
                raise ModelResponseError(
                    f"click action at index {index} "
                    "requires a selector."
                )

        elif action_type == "fill":
            if not all(
                isinstance(parameters.get(key), str)
                and parameters[key].strip()
                for key in ("selector", "value")
            ):
                raise ModelResponseError(
                    f"fill action at index {index} requires "
                    "string selector and value."
                )

        elif action_type == "extract":
            fields = parameters.get("fields")

            if (
                not isinstance(fields, list)
                or not fields
                or not all(
                    isinstance(field, str) and field.strip()
                    for field in fields
                )
            ):
                raise ModelResponseError(
                    f"extract action at index {index} requires "
                    "a non-empty list of string fields."
                )

        elif action_type == "paginate":
            fields = parameters.get("fields", ["products"])
            next_selector = parameters.get("next_selector")
            max_pages = parameters.get("max_pages", 5)

            if (
                not isinstance(fields, list)
                or not fields
                or not all(
                    isinstance(field, str) and field.strip()
                    for field in fields
                )
            ):
                raise ModelResponseError(
                    f"paginate action at index {index} requires "
                    "a non-empty list of string fields."
                )

            if next_selector is not None and (
                not isinstance(next_selector, str)
                or not next_selector.strip()
            ):
                raise ModelResponseError(
                    f"paginate action at index {index} requires "
                    "next_selector to be a non-empty string "
                    "when provided."
                )

            if (
                isinstance(max_pages, bool)
                or not isinstance(max_pages, int)
                or not 1 <= max_pages <= 20
            ):
                raise ModelResponseError(
                    f"paginate action at index {index} requires "
                    "max_pages to be an integer between 1 and 20."
                )

        elif action_type == "scroll":
            if parameters.get("direction") not in ("up", "down"):
                raise ModelResponseError(
                    f"scroll action at index {index} requires "
                    "direction 'up' or 'down'."
                )

        elif action_type == "wait":
            seconds = parameters.get("seconds")

            if (
                isinstance(seconds, bool)
                or not isinstance(seconds, (int, float))
                or seconds < 0
            ):
                raise ModelResponseError(
                    f"wait action at index {index} requires "
                    "a non-negative number of seconds."
                )

    @staticmethod
    def _parse_action(
        text: str,
    ) -> dict[str, Any] | None:
        data = LLMClient._load_json(text)

        if data is None:
            return None

        data = LLMClient._normalize_action(data)
        LLMClient._validate_action(data)

        return data
