import pytest

from app.agents.planner import Planner


class FakeLLM:

    async def generate_plan(self, task):

        return [
            {
                "type": "search",
                "query": "black handbags",
            },
            {
                "type": "extract",
                "fields": [
                    "name",
                    "price",
                ],
            },
        ]


@pytest.mark.asyncio
async def test_planner_creates_structured_plan():

    planner = Planner(
        llm_client=FakeLLM()
    )

    plan = await planner.create_plan(
        "Find black handbags."
    )

    assert isinstance(plan, list)
    assert len(plan) == 2
    assert plan[0]["type"] == "search"
    assert plan[1]["type"] == "extract"