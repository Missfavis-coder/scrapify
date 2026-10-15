from app.models.llm_client import LLMClient


class ModelRouter:

    def __init__(self):
        self._clients = {
            "planner": LLMClient(),
            "agent": LLMClient(),
        }

    def get_model(self, purpose: str) -> LLMClient:

        if purpose not in self._clients:
            raise ValueError(
                f"No model configured for '{purpose}'."
            )

        return self._clients[purpose]