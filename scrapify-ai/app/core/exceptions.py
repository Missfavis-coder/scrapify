class ScrapifyError(Exception):
    """Base Scrapify exception."""


class PlanningError(ScrapifyError):
    """Raised when task planning fails."""


class ActionExecutionError(ScrapifyError):
    """Raised when an action cannot be executed."""


class ExtractionError(ScrapifyError):
    """Raised when requested data cannot be extracted."""


class VerificationError(ScrapifyError):
    """Raised when results cannot be verified."""


class ModelResponseError(ScrapifyError):
    """Raised when the model returns an invalid response."""