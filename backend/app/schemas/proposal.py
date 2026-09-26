from datetime import datetime
from decimal import Decimal
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator

from app.schemas.analysis import AnalysisRead


class ProposalLabel(StrEnum):
    A = "A"
    B = "B"


class ProposalCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    label: ProposalLabel
    name: str = Field(min_length=1, max_length=200)
    design_summary: str | None = None
    site_location: str | None = Field(default=None, max_length=300)
    site_area_km2: Decimal | None = Field(default=None, ge=1, max_digits=12, decimal_places=4)
    site_boundary_reference: str | None = Field(default=None, max_length=1000)
    building_count: int | None = Field(default=None, ge=0, le=2_147_483_647)
    green_space_area_m2: Decimal | None = Field(default=None, ge=0, max_digits=14, decimal_places=2)
    road_network: str | None = Field(default=None, max_length=500)
    forma_board_url: HttpUrl | None = None
    forma_board_reference: str | None = Field(default=None, max_length=1000)


class ProposalUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str | None = Field(default=None, min_length=1, max_length=200)
    design_summary: str | None = None
    site_location: str | None = Field(default=None, max_length=300)
    site_area_km2: Decimal | None = Field(default=None, ge=1, max_digits=12, decimal_places=4)
    site_boundary_reference: str | None = Field(default=None, max_length=1000)
    building_count: int | None = Field(default=None, ge=0, le=2_147_483_647)
    green_space_area_m2: Decimal | None = Field(default=None, ge=0, max_digits=14, decimal_places=2)
    road_network: str | None = Field(default=None, max_length=500)
    forma_board_url: HttpUrl | None = None
    forma_board_reference: str | None = Field(default=None, max_length=1000)

    @field_validator("name")
    @classmethod
    def name_cannot_be_null(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("proposal name cannot be null")
        return value


class ProposalRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    project_id: str
    label: ProposalLabel
    name: str
    design_summary: str | None
    site_location: str | None
    site_area_km2: Decimal | None
    site_boundary_reference: str | None
    building_count: int | None
    green_space_area_m2: Decimal | None
    road_network: str | None
    forma_board_url: str | None
    forma_board_reference: str | None
    created_at: datetime
    updated_at: datetime
    analyses: list[AnalysisRead] = Field(default_factory=list)


class MetricDifference(BaseModel):
    category: str
    proposal_a: str
    proposal_b: str
    difference_a_minus_b: str
    unit: str | None


class ComparisonRead(BaseModel):
    project_id: str
    proposal_a: ProposalRead
    proposal_b: ProposalRead
    comparable_differences: list[MetricDifference]
