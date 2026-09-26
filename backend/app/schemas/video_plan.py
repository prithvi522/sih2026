from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, model_validator


SCENE_KEYS = ("city_overview", "urban_layout", "green_transport", "sustainable_design", "final_reveal")
CHECKLIST_KEYS = (
    "open_forma_model", "confirm_site_visible", "record_five_scenes", "verify_buildings_roads",
    "check_landscaping", "review_footage", "trim_arrange_clips", "add_project_title",
    "verify_30_seconds", "export_final_mp4", "review_exported_video",
)


class VideoStatus(StrEnum):
    NOT_STARTED = "not_started"
    RECORDING = "recording"
    EDITING = "editing"
    REVIEW = "review"
    COMPLETED = "completed"


class SceneStatus(StrEnum):
    NOT_STARTED = "not_started"
    RECORDED = "recorded"
    EDITED = "edited"


class VideoSceneInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    scene_key: str
    order_index: int = Field(ge=0, le=4)
    title: str = Field(min_length=1, max_length=200)
    duration_seconds: int = Field(ge=1, le=300)
    objective: str
    recording_instructions: str
    camera_movement: str = Field(max_length=500)
    status: SceneStatus = SceneStatus.NOT_STARTED
    notes: str | None = None
    reference_url: HttpUrl | None = None


class ChecklistInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    task_key: str
    is_complete: bool


class VideoPlanUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: VideoStatus = VideoStatus.NOT_STARTED
    scenes: list[VideoSceneInput] = Field(min_length=5, max_length=5)
    checklist: list[ChecklistInput] = Field(min_length=11, max_length=11)

    @model_validator(mode="after")
    def validate_fixed_plan(self):
        keys = [scene.scene_key for scene in self.scenes]
        orders = [scene.order_index for scene in self.scenes]
        if set(keys) != set(SCENE_KEYS) or len(set(keys)) != 5:
            raise ValueError("The plan must contain each of its five standard scene keys exactly once")
        if set(orders) != set(range(5)):
            raise ValueError("Scene order indexes must be unique values from 0 through 4")
        task_keys = [item.task_key for item in self.checklist]
        if set(task_keys) != set(CHECKLIST_KEYS) or len(set(task_keys)) != 11:
            raise ValueError("The plan must contain each required video checklist task exactly once")
        return self


class VideoSceneRead(VideoSceneInput):
    id: str
    start_seconds: int
    end_seconds: int
    updated_at: datetime


class ChecklistRead(ChecklistInput):
    id: str
    order_index: int
    label: str


class VideoPlanRead(BaseModel):
    id: str
    project_id: str
    status: VideoStatus
    scenes: list[VideoSceneRead]
    checklist: list[ChecklistRead]
    created_at: datetime
    updated_at: datetime


class VideoPlanReset(BaseModel):
    model_config = ConfigDict(extra="forbid")
