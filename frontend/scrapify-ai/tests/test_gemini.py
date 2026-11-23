
import os

import pytest
from google import genai


@pytest.mark.integration
@pytest.mark.asyncio
async def test_gemini_connection():
    """
    Live integration test for Gemini.

    Only runs when explicitly enabled:
    RUN_GEMINI_TESTS=1 python -m pytest -m integration -v
    """

    if os.getenv("RUN_GEMINI_TESTS") != "1":
        pytest.skip("Gemini integration tests are disabled.")

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        pytest.skip("GEMINI_API_KEY is not configured.")

    client = genai.Client(api_key=api_key)

    try:
        response = await client.aio.models.generate_content(
            model=os.getenv(
                "GEMINI_MODEL",
                "gemini-flash-latest",
            ),
            contents="Explain how AI works in one sentence.",
        )

        assert response.text
        assert response.text.strip()

    finally:
        await client.aio.aclose()
