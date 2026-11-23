from app.agents.planner import Planner


class PlannerController:

    def __init__(self, planner: Planner):
        self.planner = planner

    async def create_plan(self, task: str) -> dict:

        actions = await self.planner.create_plan(
            task
        )

        return {
            "actions": actions
        }