import json
from typing import Any


def parse_json(text: str) -> Any:
    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        raise ValueError(
            "The AI returned invalid JSON."
        ) from exc