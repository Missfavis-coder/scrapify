from typing import Any


class ExtractionService:

    def extract_requested_fields(
        self,
        items: list[dict[str, Any]],
        fields: list[str],
    ) -> list[dict[str, Any]]:

        extracted = []

        for item in items:
            result = {
                field: item.get(field)
                for field in fields
            }

            extracted.append(result)

        return extracted

    def limit_results(
        self,
        items: list[dict[str, Any]],
        limit: int,
    ) -> list[dict[str, Any]]:

        return items[:limit]