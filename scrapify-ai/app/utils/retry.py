import asyncio
from collections.abc import Awaitable, Callable
from typing import TypeVar


T = TypeVar("T")


async def retry_async(
    function: Callable[[], Awaitable[T]],
    attempts: int = 3,
    delay: float = 1.0,
) -> T:

    last_error = None

    for attempt in range(attempts):

        try:
            return await function()

        except Exception as exc:
            last_error = exc

            if attempt < attempts - 1:
                await asyncio.sleep(delay)

    raise last_error