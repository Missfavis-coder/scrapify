from pathlib import Path


def train_model(
    dataset_path: str,
    output_dir: str = "experiments/models",
):

    dataset = Path(dataset_path)

    if not dataset.exists():
        raise FileNotFoundError(
            f"Dataset not found: {dataset}"
        )

    output = Path(output_dir)
    output.mkdir(
        parents=True,
        exist_ok=True,
    )

    print(
        "Training pipeline initialized."
    )

    print(
        "Dataset:",
        dataset,
    )

    print(
        "Model output directory:",
        output,
    )

    print(
        "No fine-tuning performed yet. "
        "Model improvement should be introduced "
        "only after evaluation identifies a real need."
    )


if __name__ == "__main__":

    train_model(
        "experiments/datasets/prepared_tasks.json"
    )