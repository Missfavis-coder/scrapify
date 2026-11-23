import json
from pathlib import Path

from app.evaluation.datasets import DATASET


OUTPUT_PATH = Path(
    "experiments/datasets/prepared_tasks.json"
)


def prepare_data():

    OUTPUT_PATH.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    records = [
        {
            "name": example.name,
            "task": example.task,
            "expected_action_types": (
                example.expected_action_types
            ),
        }
        for example in DATASET
    ]

    with OUTPUT_PATH.open(
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            records,
            file,
            indent=2,
        )


if __name__ == "__main__":
    prepare_data()