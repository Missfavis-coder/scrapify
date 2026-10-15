from dataclasses import dataclass


@dataclass
class EvaluationExample:
    name: str
    task: str
    expected_action_types: list[str]


DATASET = [
    EvaluationExample(
        name="product_search",
        task=(
            "Find five black handbags on Jumia "
            "and collect their prices."
        ),
        expected_action_types=[
            "open_url",
            "search",
            "extract",
        ],
    ),

    EvaluationExample(
        name="product_information",
        task=(
            "Find laptops and return their "
            "names and prices."
        ),
        expected_action_types=[
            "search",
            "extract",
        ],
    ),
]