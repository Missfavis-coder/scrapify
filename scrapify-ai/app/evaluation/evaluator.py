from app.evaluation.metrics import (
    success_rate,
    average_steps,
    recovery_rate,
)


class Evaluator:

    def evaluate(self, runs: list[dict]) -> dict:

        successes = [
            run.get("success", False)
            for run in runs
        ]

        step_counts = [
            len(run.get("history", []))
            for run in runs
        ]

        failures = sum(
            not success for success in successes
        )

        recovered = sum(
            run.get("recovered", False)
            for run in runs
        )

        return {
            "success_rate": success_rate(successes),
            "average_steps": average_steps(step_counts),
            "recovery_rate": recovery_rate(
                recovered,
                failures,
            ),
        }