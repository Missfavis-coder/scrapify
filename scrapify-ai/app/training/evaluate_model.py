from app.evaluation.evaluator import Evaluator


def evaluate_model(runs: list[dict]) -> dict:

    evaluator = Evaluator()

    metrics = evaluator.evaluate(
        runs
    )

    print(
        "Model evaluation:"
    )

    for name, value in metrics.items():
        print(
            f"{name}: {value}"
        )

    return metrics


if __name__ == "__main__":

    evaluate_model([])