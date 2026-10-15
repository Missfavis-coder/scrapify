from fastapi import APIRouter, Depends

from app.api.schemas.task import TaskRequest
from app.api.schemas.action import ActionPlan
from app.controllers.planner_controller import (
    PlannerController,
)
from app.dependencies import get_planner_controller


router = APIRouter(
    prefix="/planner",
    tags=["Planner"],
)


@router.post(
    "/plan",
    response_model=ActionPlan,
)
async def create_plan(
    request: TaskRequest,
    controller: PlannerController = Depends(
        get_planner_controller
    ),
):
    return await controller.create_plan(
        request.task
    )