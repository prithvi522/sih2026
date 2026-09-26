from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator


def valid_area(value: Decimal | None) -> Decimal | None:
    if value is not None and value < Decimal("1"):
        raise ValueError("site area must be at least 1 km²")
    return value


class ProjectCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1, max_length=200)
    problem_statement_id: str = Field(default="26114", min_length=1, max_length=20)
    site_location: str | None = Field(default=None, max_length=300)
    site_area_km2: Decimal | None = Field(default=None, ge=1, max_digits=12, decimal_places=4)
    site_boundary_reference: str | None = Field(default=None, max_length=1000)
    description: str | None = None

    _valid_area = field_validator("site_area_km2")(valid_area)


class ProjectUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str | None = Field(default=None, min_length=1, max_length=200)
    problem_statement_id: str | None = Field(default=None, min_length=1, max_length=20)
    site_location: str | None = Field(default=None, max_length=300)
    site_area_km2: Decimal | None = Field(default=None, ge=1, max_digits=12, decimal_places=4)
    site_boundary_reference: str | None = Field(default=None, max_length=1000)
    description: str | None = None

    @field_validator("name", "problem_statement_id")
    @classmethod
    def non_nullable_fields(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("this field cannot be null")
        return value

    _valid_area = field_validator("site_area_km2")(valid_area)


class ProjectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    problem_statement_id: str
    site_location: str | None
    site_area_km2: Decimal | None
    site_boundary_reference: str | None
    description: str | None
    created_at: datetime
    updated_at: datetime
