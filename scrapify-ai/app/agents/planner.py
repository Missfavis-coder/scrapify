from app.models.llm_client import LLMClient


class Planner:
    """
    Converts a natural-language task into executable actions
    and generates recovery actions when necessary.
    """

    def __init__(self, llm_client: LLMClient):
        self.llm = llm_client

    async def create_plan(self, task: str) -> list[dict]:
        if not task or not task.strip():
            raise ValueError("Task cannot be empty.")

        return await self.llm.generate_plan(task)

    async def replan(
        self,
        task: str,
        failed_action: dict,
        observation: dict,
        history: list[dict],
    ) -> dict | None:

        return await self.llm.generate_recovery_action(
            task=task,
            failed_action=failed_action,
            observation=observation,
            history=history,
        )