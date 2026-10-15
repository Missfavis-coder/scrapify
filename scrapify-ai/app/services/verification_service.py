class VerificationService:

    async def verify(
        self,
        task: str,
        observation: dict,
        extracted_data: list | None = None,
    ) -> dict:

        if observation.get("has_error"):
            return {
                "completed": False,
                "reason": "Page contains an error.",
            }

        if not extracted_data:
            return {
                "completed": False,
                "reason": "No useful data extracted yet.",
            }

        return {
            "completed": True,
            "result": extracted_data,
        }