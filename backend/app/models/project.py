from datetime import datetime, timezone
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    problem_statement_id: Mapped[str] = mapped_column(String(20), nullable=False, default="26114")
    site_location: Mapped[str | None] = mapped_column(String(300))
    site_area_km2: Mapped[Decimal | None] = mapped_column(Numeric(12, 4))
    site_boundary_reference: Mapped[str | None] = mapped_column(String(1000))
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, server_default=func.now())

    proposals: Mapped[list["Proposal"]] = relationship(back_populates="project", cascade="all, delete-orphan", passive_deletes=True)

    __table_args__ = (CheckConstraint("site_area_km2 IS NULL OR site_area_km2 >= 1", name="ck_project_area_min_1km2"), Index("ix_projects_created_at", "created_at"))


class Proposal(Base):
    __tablename__ = "proposals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    label: Mapped[str] = mapped_column(String(1), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    design_summary: Mapped[str | None] = mapped_column(Text)
    site_location: Mapped[str | None] = mapped_column(String(300))
    site_area_km2: Mapped[Decimal | None] = mapped_column(Numeric(12, 4))
    site_boundary_reference: Mapped[str | None] = mapped_column(String(1000))
    building_count: Mapped[int | None] = mapped_column(Integer)
    green_space_area_m2: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    road_network: Mapped[str | None] = mapped_column(String(500))
    forma_board_url: Mapped[str | None] = mapped_column(String(2000))
    forma_board_reference: Mapped[str | None] = mapped_column(String(1000))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, server_default=func.now())

    project: Mapped[Project] = relationship(back_populates="proposals")
    analyses: Mapped[list["Analysis"]] = relationship(back_populates="proposal", cascade="all, delete-orphan", passive_deletes=True)

    __table_args__ = (
        UniqueConstraint("project_id", "label", name="uq_proposal_project_label"),
        CheckConstraint("label IN ('A', 'B')", name="ck_proposal_label_ab"),
        CheckConstraint("site_area_km2 IS NULL OR site_area_km2 >= 1", name="ck_proposal_area_min_1km2"),
        CheckConstraint("building_count IS NULL OR building_count >= 0", name="ck_proposal_buildings_nonnegative"),
    )


class Analysis(Base):
    __tablename__ = "analyses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    proposal_id: Mapped[str] = mapped_column(ForeignKey("proposals.id", ondelete="CASCADE"), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(40), nullable=False)
    value: Mapped[str | None] = mapped_column(String(500))
    numeric_value: Mapped[Decimal | None] = mapped_column(Numeric(18, 6))
    unit: Mapped[str | None] = mapped_column(String(40))
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="not_analyzed")
    notes: Mapped[str | None] = mapped_column(Text)
    data_source: Mapped[str | None] = mapped_column(String(1000))
    scope: Mapped[str | None] = mapped_column(String(200))
    reporting_period: Mapped[str | None] = mapped_column(String(200))
    analysis_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, server_default=func.now())

    proposal: Mapped[Proposal] = relationship(back_populates="analyses")

    __table_args__ = (
        UniqueConstraint("proposal_id", "category", name="uq_analysis_proposal_category"),
        CheckConstraint("category IN ('Area Metrics', 'Embodied Carbon', 'Sun Hours', 'Daylight Potential', 'Wind Analysis', 'Microclimate Analysis', 'Noise Analysis', 'Solar Energy')", name="ck_analysis_category"),
        CheckConstraint("status IN ('not_analyzed', 'analyzed', 'imported')", name="ck_analysis_status"),
        Index("ix_analyses_category", "category"),
    )
