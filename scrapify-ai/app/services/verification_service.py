
from typing import Any


class VerificationService:
    """Check whether browser results contain useful task data."""

    async def verify(
        self,
        task: str,
        observation: dict,
        extracted_data: list | None = None,
    ) -> dict:
        if observation.get("has_error"):
            return {
                "completed": False,
                "reason": "The browser page contains an error.",
            }

        if not extracted_data:
            return {
                "completed": False,
                "reason": "No extraction results are available yet.",
            }

        task_lower = task.lower()
        product_keywords = (
            "product",
            "products",
            "item",
            "items",
            "listing",
            "listings",
            "product name",
            "product names",
            "price",
            "prices",
        )

        products_requested = any(
            keyword in task_lower
            for keyword in product_keywords
        )

        products = self._collect_values(
            extracted_data,
            target_key="products",
        )

        if products_requested:
            valid_products = [
                product
                for product in products
                if isinstance(product, dict)
                and any(
                    self._has_value(product.get(key))
                    for key in (
                        "name",
                        "title",
                        "price",
                        "url",
                        "image",
                        "text",
                    )
                )
            ]

            if not valid_products:
                return {
                    "completed": False,
                    "reason": (
                        "The task requested product data, but no "
                        "usable product records were found. Check "
                        "the extraction fields, selectors, and "
                        "pagination results."
                    ),
                }

        if not self._has_useful_data(extracted_data):
            return {
                "completed": False,
                "reason": "The extraction results contain no useful data.",
            }

        return {
            "completed": True,
            "result": extracted_data,
            "reason": "Useful extraction data was found.",
        }

    @staticmethod
    def _has_value(value: Any) -> bool:
        if value is None:
            return False

        if isinstance(value, str):
            return bool(value.strip())

        if isinstance(value, (list, dict)):
            return bool(value)

        return True

    @classmethod
    def _collect_values(
        cls,
        value: Any,
        target_key: str,
    ) -> list[Any]:
        """Find values under a key in nested extraction results."""
        found = []

        if isinstance(value, dict):
            for key, item in value.items():
                if key.lower() == target_key:
                    if isinstance(item, list):
                        found.extend(item)
                    elif item is not None:
                        found.append(item)

                found.extend(
                    cls._collect_values(item, target_key)
                )

        elif isinstance(value, list):
            for item in value:
                found.extend(
                    cls._collect_values(item, target_key)
                )

        return found

    @classmethod
    def _has_useful_data(cls, value: Any) -> bool:
        """Ignore pagination metadata and empty extraction fields."""
        metadata_keys = {
            "pages_visited",
            "pages",
            "current_page",
            "page_number",
        }

        if isinstance(value, dict):
            for key, item in value.items():
                if key.lower() in metadata_keys:
                    continue

                if cls._has_useful_data(item):
                    return True

            return False

        if isinstance(value, list):
            return any(
                cls._has_useful_data(item)
                for item in value
            )

        if isinstance(value, str):
            return bool(value.strip())

        if value is None:
            return False

        return True
