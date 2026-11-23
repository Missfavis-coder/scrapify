from fastapi import APIRouter, Depends

from app.api.schemas.task import TaskRequest
from app.api.schemas.result import TaskResult
from app.controllers.agent_controller import (
    AgentController,
)
from app.dependencies import get_agent_controller


router = APIRouter(
    prefix="/agent",
    tags=["Agent"],
)


@router.post(
    "/run",
    response_model=TaskResult,
)
async def run_agent(
    request: TaskRequest,
    controller: AgentController = Depends(
        get_agent_controller
    ),
):

    return await controller.run(
        request.task
    )