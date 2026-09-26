from decimal import Decimal, InvalidOperation

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.models import Analysis, Project, Proposal
from app.schemas.analysis import AnalysisInput, AnalysisRead, AnalysisUpdate
from app.schemas.proposal import ProposalCreate, ProposalRead, ProposalUpdate

router = APIRouter(prefix="/api", tags=["proposals", "analyses"])


def find_proposal(db: Session, proposal_id: str, include_analyses: bool = False) -> Proposal:
    query = select(Proposal).where(Proposal.id == proposal_id)
    if include_analyses:
        query = query.options(selectinload(Proposal.analyses))
    proposal = db.scalar(query)
    if proposal is None:
        raise HTTPException(status_code=404, detail="Proposal not found")
    return proposal


def get_numeric_value(value: str | None) -> Decimal | None:
    if value is None:
        return None
    try:
        numeric = Decimal(value)
    except InvalidOperation:
        return None
    return numeric if numeric.is_finite() else None


@router.post("/projects/{project_id}/proposals", response_model=ProposalRead, status_code=status.HTTP_201_CREATED)
def create_proposal(project_id: str, payload: ProposalCreate, db: Session = Depends(get_db)):
    if db.get(Project, project_id) is None:
        raise HTTPException(status_code=404, detail="Project not found")
    data = payload.model_dump()
    if data["forma_board_url"] is not None:
        data["forma_board_url"] = str(data["forma_board_url"])
    proposal = Proposal(project_id=project_id, **data)
    db.add(proposal)
    try:
        db.commit()
        db.refresh(proposal)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="This project already has a proposal with that label") from exc
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=503, detail="Could not save proposal") from exc
    return proposal


@router.get("/projects/{project_id}/proposals", response_model=list[ProposalRead])
def list_proposals(project_id: str, db: Session = Depends(get_db)):
    if db.get(Project, project_id) is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return list(db.scalars(select(Proposal).options(selectinload(Proposal.analyses)).where(Proposal.project_id == project_id).order_by(Proposal.label)))


@router.get("/proposals/{proposal_id}", response_model=ProposalRead)
def get_proposal(proposal_id: str, db: Session = Depends(get_db)):
    return find_proposal(db, proposal_id, include_analyses=True)


@router.put("/proposals/{proposal_id}", response_model=ProposalRead)
def update_proposal(proposal_id: str, payload: ProposalUpdate, db: Session = Depends(get_db)):
    proposal = find_proposal(db, proposal_id)
    changes = payload.model_dump(exclude_unset=True)
    if "forma_board_url" in changes and changes["forma_board_url"] is not None:
        changes["forma_board_url"] = str(changes["forma_board_url"])
    for key, value in changes.items():
        setattr(proposal, key, value)
    try:
        db.commit()
        db.refresh(proposal)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=503, detail="Could not update proposal") from exc
    return proposal


@router.delete("/proposals/{proposal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_proposal(proposal_id: str, db: Session = Depends(get_db)):
    proposal = find_proposal(db, proposal_id)
    db.delete(proposal)
    db.commit()


@router.post("/proposals/{proposal_id}/analyses", response_model=AnalysisRead, status_code=status.HTTP_201_CREATED)
def create_analysis(proposal_id: str, payload: AnalysisInput, db: Session = Depends(get_db)):
    proposal = find_proposal(db, proposal_id)
    data = payload.model_dump()
    data["category"] = data["category"].value
    data["status"] = data["status"].value
    analysis = Analysis(proposal_id=proposal.id, numeric_value=get_numeric_value(data["value"]), **data)
    db.add(analysis)
    try:
        db.commit()
        db.refresh(analysis)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="This proposal already has a result for that category") from exc
    return analysis


@router.get("/proposals/{proposal_id}/analyses", response_model=list[AnalysisRead])
def list_analyses(proposal_id: str, db: Session = Depends(get_db)):
    find_proposal(db, proposal_id)
    return list(db.scalars(select(Analysis).where(Analysis.proposal_id == proposal_id).order_by(Analysis.category)))


@router.put("/analyses/{analysis_id}", response_model=AnalysisRead)
def update_analysis(analysis_id: str, payload: AnalysisUpdate, db: Session = Depends(get_db)):
    analysis = db.get(Analysis, analysis_id)
    if analysis is None:
        raise HTTPException(status_code=404, detail="Analysis result not found")
    changes = payload.model_dump(exclude_unset=True)
    if "status" in changes and changes["status"] is not None:
        changes["status"] = changes["status"].value
    if "value" in changes:
        analysis.numeric_value = get_numeric_value(changes["value"])
    for key, value in changes.items():
        setattr(analysis, key, value)
    try:
        db.commit()
        db.refresh(analysis)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=503, detail="Could not update analysis result") from exc
    return analysis


@router.delete("/analyses/{analysis_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_analysis(analysis_id: str, db: Session = Depends(get_db)):
    analysis = db.get(Analysis, analysis_id)
    if analysis is None:
        raise HTTPException(status_code=404, detail="Analysis result not found")
    db.delete(analysis)
    db.commit()
