from app.agents.agent_loop import AgentLoop


class AgentService:

    def __init__(self, agent: AgentLoop):
        self.agent = agent

    async def run_task(self, task: str) -> dict:
        if not task or not task.strip():
            raise ValueError("Task cannot be empty.")

        return await self.agent.run(task)