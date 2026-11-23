import pytest

from app.services.verification_service import (
    VerificationService,
)


@pytest.mark.asyncio
async def test_verification_rejects_empty_results():

    service = VerificationService()

    result = await service.verify(
        task="Find five handbags.",
        observation={
            "has_error": False
        },
        extracted_data=[],
    )

    assert result["completed"] is False


@pytest.mark.asyncio
async def test_verification_accepts_results():

    service = VerificationService()

    result = await service.verify(
        task="Find handbags.",
        observation={
            "has_error": False
        },
        extracted_data=[
            {
                "name": "Black handbag",
                "price": "₦20,000",
            }
        ],
    )

    assert result["completed"] is True