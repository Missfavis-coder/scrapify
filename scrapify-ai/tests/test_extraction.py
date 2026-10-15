from app.services.extraction_service import (
    ExtractionService,
)


def test_extract_requested_fields():

    service = ExtractionService()

    items = [
        {
            "name": "Black Handbag",
            "price": "₦20,000",
            "seller": "Store A",
        }
    ]

    result = service.extract_requested_fields(
        items,
        ["name", "price"],
    )

    assert result == [
        {
            "name": "Black Handbag",
            "price": "₦20,000",
        }
    ]


def test_limit_results():

    service = ExtractionService()

    items = [
        {"name": "A"},
        {"name": "B"},
        {"name": "C"},
    ]

    result = service.limit_results(
        items,
        2,
    )

    assert len(result) == 2