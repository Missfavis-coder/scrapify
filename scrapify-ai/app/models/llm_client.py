from openai import AsyncOpenAI

from app.core.config import settings


class LLMClient:

    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY
        )

    async def generate_plan(self, task: str) -> list[dict]:

        response = await self.client.responses.create(
            model=settings.OPENAI_MODEL,
            input=[
                {
                    "role": "system",
                    "content": (
                        "You are the planning component of Scrapify. "
                        "Convert a user's browser task into a safe, "
                        "structured sequence of browser actions. "
                        "Return only valid JSON."
                    ),
                },
                {
                    "role": "user",
                    "content": task,
                },
            ],
        )

        return self._parse_plan(response.output_text)

    async def generate_recovery_action(
        self,
        task: str,
        failed_action: dict,
        observation: dict,
        history: list[dict],
    ) -> dict | None:

        prompt = f"""
Task:
{task}

Failed action:
{failed_action}

Current observation:
{observation}

Previous history:
{history}

Determine the next best action to recover.
Return one structured action or null.
"""

        response = await self.client.responses.create(
            model=settings.OPENAI_MODEL,
            input=prompt,
        )

        return self._parse_action(response.output_text)

    @staticmethod
    def _parse_plan(text: str) -> list[dict]:
        import json

        data = json.loads(text)

        if not isinstance(data, list):
            raise ValueError("Model did not return a valid plan.")

        return data

    @staticmethod
    def _parse_action(text: str) -> dict | None:
        import json

        if text.strip().lower() == "null":
            return None

        data = json.loads(text)

        if not isinstance(data, dict):
            raise ValueError("Model did not return a valid action.")

        return data