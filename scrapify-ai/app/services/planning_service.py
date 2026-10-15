from app.models.llm_client import LLMClient


class PlanningService:

    def __init__(self, llm: LLMClient):
        self.llm = llm

    async def create_plan(self, task: str) -> list[dict]:
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