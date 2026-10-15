def success_rate(results: list[bool]) -> float:
    if not results:
        return 0.0

    successful = sum(results)

    return successful / len(results)


def average_steps(step_counts: list[int]) -> float:
    if not step_counts:
        return 0.0

    return sum(step_counts) / len(step_counts)


def recovery_rate(
    recovered: int,
    failures: int,
) -> float:

    if failures == 0:
        return 0.0

    return recovered / failures