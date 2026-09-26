from datetime import datetime
from decimal import Decimal, InvalidOperation
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class AnalysisCategory(StrEnum):
    AREA_METRICS = "Area Metrics"
    EMBODIED_CARBON = "Embodied Carbon"
    SUN_HOURS = "Sun Hours"
    DAYLIGHT_POTENTIAL = "Daylight Potential"
    WIND_ANALYSIS = "Wind Analysis"
    MICROCLIMATE_ANALYSIS = "Microclimate Analysis"
    NOISE_ANALYSIS = "Noise Analysis"
    SOLAR_ENERGY = "Solar Energy"


class AnalysisStatus(StrEnum):
    NOT_ANALYZED = "not_analyzed"
    ANALYZED = "analyzed"
    IMPORTED = "imported"


class AnalysisInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    category: AnalysisCategory
    value: str | None = Field(default=None, max_length=500)
    unit: str | None = Field(default=None, max_length=40)
    status: AnalysisStatus = AnalysisStatus.NOT_ANALYZED
    notes: str | None = None
    data_source: str | None = Field(default=None, max_length=1000)
    scope: str | None = Field(default=None, max_length=200)
    reporting_period: str | None = Field(default=None, max_length=200)
    analysis_date: datetime | None = None

    @field_validator("value")
    @classmethod
    def reject_non_finite_numeric(cls, value: str | None) -> str | None:
        if value is None:
            return None
        try:
            number = Decimal(value)
        except InvalidOperation:
            return value
        if not number.is_finite():
            raise ValueError("numeric analysis values must be finite")
        exponent = number.as_tuple().exponent
        fractional_places = max(0, -exponent)
        integer_places = max(0, len(number.as_tuple().digits) + exponent)
        if fractional_places > 6 or integer_places > 12:
            raise ValueError("numeric analysis values support up to 12 integer and 6 fractional digits")
        return value


class AnalysisUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    value: str | None = Field(default=None, max_length=500)
    unit: str | None = Field(default=None, max_length=40)
    status: AnalysisStatus | None = None
    notes: str | None = None
    data_source: str | None = Field(default=None, max_length=1000)
    scope: str | None = Field(default=None, max_length=200)
    reporting_period: str | None = Field(default=None, max_length=200)
    analysis_date: datetime | None = None

    @field_validator("status")
    @classmethod
    def status_cannot_be_null(cls, value: AnalysisStatus | None) -> AnalysisStatus:
        if value is None:
            raise ValueError("status cannot be null")
        return value


class AnalysisRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    proposal_id: str
    category: AnalysisCategory
    value: str | None
    unit: str | None
    status: AnalysisStatus
    notes: str | None
    data_source: str | None
    scope: str | None
    reporting_period: str | None
    analysis_date: datetime | None
    updated_at: datetime
