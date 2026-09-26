from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.models import Project, Proposal
from app.schemas.project import ProjectCreate, ProjectRead, ProjectUpdate
from app.schemas.proposal import ComparisonRead, MetricDifference, ProposalRead

router = APIRouter(prefix="/api", tags=["projects"])


def find_project(db: Session, project_id: str, include_proposals: bool = False) -> Project:
    query = select(Project).where(Project.id == project_id)
    if include_proposals:
        query = query.options(selectinload(Project.proposals).selectinload(Proposal.analyses))
    project = db.scalar(query)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.post("/projects", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db)):
    project = Project(**payload.model_dump())
    db.add(project)
    try:
        db.commit()
        db.refresh(project)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=503, detail="Could not save project") from exc
    return project


@router.get("/projects", response_model=list[ProjectRead])
def list_projects(limit: int = Query(default=50, ge=1, le=100), offset: int = Query(default=0, ge=0), db: Session = Depends(get_db)):
    return list(db.scalars(select(Project).order_by(Project.created_at.desc()).limit(limit).offset(offset)))


@router.get("/projects/{project_id}", response_model=ProjectRead)
def get_project(project_id: str, db: Session = Depends(get_db)):
    return find_project(db, project_id)


@router.put("/projects/{project_id}", response_model=ProjectRead)
def update_project(project_id: str, payload: ProjectUpdate, db: Session = Depends(get_db)):
    project = find_project(db, project_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(project, key, value)
    try:
        db.commit()
        db.refresh(project)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=503, detail="Could not update project") from exc
    return project


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: str, db: Session = Depends(get_db)):
    project = find_project(db, project_id)
    db.delete(project)
    db.commit()


@router.get("/projects/{project_id}/comparison", response_model=ComparisonRead)
def compare_project(project_id: str, db: Session = Depends(get_db)):
    project = find_project(db, project_id, include_proposals=True)
    proposals = {proposal.label: proposal for proposal in project.proposals}
    if "A" not in proposals or "B" not in proposals:
        raise HTTPException(status_code=422, detail="Comparison requires both Proposal A and Proposal B")
    a, b = proposals["A"], proposals["B"]
    b_analyses = {analysis.category: analysis for analysis in b.analyses}
    differences = []
    comparable_fields = [
        ("Site area", a.site_area_km2, b.site_area_km2, "km²"),
        ("Building count", a.building_count, b.building_count, "buildings"),
        ("Green space", a.green_space_area_m2, b.green_space_area_m2, "m²"),
    ]
    for category, value_a, value_b, unit in comparable_fields:
        if value_a is not None and value_b is not None:
            differences.append(MetricDifference(category=category, proposal_a=str(value_a), proposal_b=str(value_b), difference_a_minus_b=str(value_a - value_b), unit=unit))
    for metric in a.analyses:
        other = b_analyses.get(metric.category)
        if (metric.numeric_value is not None and other is not None and other.numeric_value is not None
                and metric.unit == other.unit and metric.scope == other.scope
                and metric.reporting_period == other.reporting_period):
            differences.append(MetricDifference(
                category=metric.category, proposal_a=str(metric.numeric_value),
                proposal_b=str(other.numeric_value),
                difference_a_minus_b=str(metric.numeric_value - other.numeric_value), unit=metric.unit,
            ))
    return ComparisonRead(project_id=project.id, proposal_a=ProposalRead.model_validate(a),
                          proposal_b=ProposalRead.model_validate(b), comparable_differences=differences)
