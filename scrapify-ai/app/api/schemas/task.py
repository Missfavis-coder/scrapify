from pydantic import BaseModel, Field


class TaskRequest(BaseModel):
    task: str = Field(
        ...,
        min_length=1,
        max_length=5000,
        description="Natural-language browser task.",
    )


class TaskResponse(BaseModel):
    task_id: str
    status: str