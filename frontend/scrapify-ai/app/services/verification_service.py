
from typing import Any


class VerificationService:
    """Verify whether Scrapify collected useful data for a task."""

    METADATA_KEYS = {
        "pages_visited",
        "pages",
        "current_page",
        "page_number",
        "total_pages",
    }

    PRODUCT_KEYWORDS = (
        "product",
        "products",
        "item",
        "items",
        "listing",
        "listings",
        "price",
        "prices",
        "book",
        "books",
    )

    PRODUCT_COLLECTION_KEYS = {
        "products",
        "product",
        "items",
        "item",
        "listings",
        "listing",
        "results",
        "records",
    }

    PRODUCT_VALUE_KEYS = {
        "name",
        "title",
        "product_name",
        "item_name",
        "book_name",
        "price",
        "product_price",
        "current_price",
        "url",
        "product_url",
        "link",
        "image",
        "image_url",
        "availability",
        "stock",
        "text",
    }

    def __init__(self, require_extracted_data: bool = True):
        self.require_extracted_data = require_extracted_data

    async def verify(
        self,
        task: str,
        observation: dict[str, Any],
        extracted_data: list[Any] | None = None,
    ) -> dict[str, Any]:
        """Check whether the task produced usable results."""

        if not isinstance(task, str) or not task.strip():
            return self._failure("The task description is empty or invalid.")

        if not isinstance(observation, dict):
            return self._failure("The browser observation is invalid.")

        if extracted_data is None:
            extracted_data = []

        if not isinstance(extracted_data, list):
            return self._failure(
                "Extraction results must be provided as a list."
            )

        page_state = observation.get("page_state")

        if page_state in {"security_challenge", "access_denied"}:
            return self._failure(
                "Verification cannot complete because website access "
                "is blocked."
            )

        if observation.get("has_error"):
            return self._failure("The browser page contains an error.")

        if self.require_extracted_data and not extracted_data:
            return self._failure(
                "No extraction results are available yet."
            )

        if not self._has_useful_data(extracted_data):
            return self._failure(
                "Extraction returned no useful data. Check the "
                "browser extraction result and requested fields."
            )

        task_lower = task.lower()

        products_requested = any(
            keyword in task_lower
            for keyword in self.PRODUCT_KEYWORDS
        )

        if products_requested:
            products = self._find_products(extracted_data)

            if not products:
                return self._failure(
                    "The task requested product or listing data, but "
                    "no usable records were found. Inspect the raw "
                    "extraction result and browser selectors."
                )

            return {
                "completed": True,
                "result": products,
                "reason": (
                    f"Found {len(products)} usable product or "
                    "listing record(s)."
                ),
            }

        return {
            "completed": True,
            "result": extracted_data,
            "reason": "Useful extraction data was found.",
        }

    @staticmethod
    def _failure(reason: str) -> dict[str, Any]:
        return {
            "completed": False,
            "result": None,
            "reason": reason,
        }

    @classmethod
    def _is_valid_product(cls, product: Any) -> bool:
        if not isinstance(product, dict):
            return False

        normalized = {
            key.lower(): value
            for key, value in product.items()
            if isinstance(key, str)
        }

        return any(
            cls._has_value(normalized.get(key))
            for key in cls.PRODUCT_VALUE_KEYS
        )

    @staticmethod
    def _has_value(value: Any) -> bool:
        if value is None:
            return False

        if isinstance(value, str):
            return bool(value.strip())

        if isinstance(value, (list, dict, tuple, set)):
            return bool(value)

        return True

    @classmethod
    def _find_products(cls, value: Any) -> list[dict[str, Any]]:
        """Find product records in common nested extraction formats."""

        found: list[dict[str, Any]] = []

        def visit(item: Any, inside_collection: bool = False) -> None:
            if isinstance(item, list):
                for child in item:
                    visit(child, inside_collection)
                return

            if not isinstance(item, dict):
                return

            normalized_keys = {
                key.lower(): key
                for key in item
                if isinstance(key, str)
            }

            # Prefer explicit product/listing collections.
            for collection_key in cls.PRODUCT_COLLECTION_KEYS:
                original_key = normalized_keys.get(collection_key)

                if original_key is not None:
                    collection = item[original_key]

                    if isinstance(collection, (list, dict)):
                        visit(collection, True)

            # Accept records directly returned by the extractor.
            if cls._is_valid_product(item):
                found.append(item)
                return

            # Handle wrappers such as {"data": [...]} or
            # {"results": {"items": [...]}}.
            for key, child in item.items():
                if not isinstance(key, str):
                    continue

                if key.lower() in cls.METADATA_KEYS:
                    continue

                if isinstance(child, (dict, list)):
                    visit(child, inside_collection)

        visit(value)

        # Remove duplicates while preserving their original order.
        unique: list[dict[str, Any]] = []
        seen: set[str] = set()

        for product in found:
            signature = repr(sorted(product.items(), key=lambda pair: str(pair[0])))

            if signature not in seen:
                seen.add(signature)
                unique.append(product)

        return unique

    @classmethod
    def _has_useful_data(cls, value: Any) -> bool:
        """Ignore empty values and pagination-only metadata."""

        if isinstance(value, dict):
            for key, item in value.items():
                if (
                    isinstance(key, str)
                    and key.lower() in cls.METADATA_KEYS
                ):
                    continue

                if cls._has_useful_data(item):
                    return True

            return False

        if isinstance(value, list):
            return any(cls._has_useful_data(item) for item in value)

        if isinstance(value, str):
            return bool(value.strip())

        if value is None:
            return False

        return True
