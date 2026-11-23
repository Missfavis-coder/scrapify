from app.agents.agent_loop import AgentLoop


class AgentController:

    def __init__(self, agent: AgentLoop):
        self.agent = agent

    async def run(self, task: str) -> dict:

        result = await self.agent.run(task)

        return {
            "success": result.get(
                "success",
                False,
            ),
            "result": result.get(
                "result"
            ),
            "error": result.get(
                "reason"
            ),
            "steps_completed": len(
                result.get(
                    "history",
                    []
                )
            ),
            "execution_history": result.get(
                "history",
                [],
            ),
        }