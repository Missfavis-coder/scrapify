
import os
from pathlib import Path

from dotenv import load_dotenv
from google import genai

env_path = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(env_path, override=True)

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise RuntimeError(f"GEMINI_API_KEY not found in {env_path}")

client = genai.Client(api_key=api_key)

response = client.models.generate_content(
    model="gemini-flash-latest",
    contents="Explain how AI works in one sentence.",
)

print(response.text)
