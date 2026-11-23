class ExtractionTools:

    @staticmethod
    def clean_text(value: str | None) -> str:
        if not value:
            return ""

        return " ".join(value.split())

    @staticmethod
    def clean_price(value: str | None) -> str | None:
        if not value:
            return None

        return ExtractionTools.clean_text(value)