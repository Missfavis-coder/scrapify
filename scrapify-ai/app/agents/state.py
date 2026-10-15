from dataclasses import dataclass, field
from typing import Any


@dataclass
class AgentState:
    """
    Stores the current state of a Scrapify agent run.
    """

    task: str

    current_step: int = 0
    status: str = "initialized"

    plan: list[dict[str, Any]] = field(default_factory=list)

    history: list[dict[str, Any]] = field(default_factory=list)

    observations: list[dict[str, Any]] = field(default_factory=list)

    extracted_data: list[dict[str, Any]] = field(
        default_factory=list
    )

    errors: list[str] = field(default_factory=list)

    retries: int = 0

    def record_observation(self, observation: dict[str, Any]):
        self.observations.append(observation)

    def record_error(self, error: str):
        self.errors.append(error)

    def add_history(self, entry: dict[str, Any]):
        self.history.append(entry)

    def next_step(self):
        self.current_step += 1