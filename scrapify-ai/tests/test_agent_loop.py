import pytest

from app.agents.agent_loop import AgentLoop


class FakePlanner:

    async def create_plan(self, task):
        return [
            {
                "type": "search",
                "query": "black handbags",
            }
        ]

    async def replan(
        self,
        task,
        failed_action,
        observation,
        history,
    ):
        return {
            "type": "search",
            "query": "handbags",
        }


class FakeVerifier:

    async def verify(
        self,
        task,
        observation,
        extracted_data=None,
    ):
        return {
            "completed": True,
            "result": ["item"],
        }


@pytest.mark.asyncio
async def test_agent_loop_completes():

    class FakeBrowser:

        async def search(self, query):
            pass

        async def get_page_text(self):
            return "products prices"

        async def get_current_url(self):
            return "https://example.com"

        async def get_page_title(self):
            return "Products"

    agent = AgentLoop(
        browser=FakeBrowser(),
        planner=FakePlanner(),
        verifier=FakeVerifier(),
    )

    result = await agent.run(
        "Find black handbags."
    )

    assert result["success"] is True