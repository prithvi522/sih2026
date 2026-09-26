from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import VideoChecklistItem, VideoScene
from app.models.project import utcnow
from app.schemas.video_plan import CHECKLIST_KEYS, VideoPlanRead, VideoPlanUpdate, VideoStatus
from app.services.video_plan_service import CHECKLIST_LABELS, DEFAULT_SCENES, ensure_plan, serialize_plan

router = APIRouter(prefix="/api/projects/{project_id}/walkthrough-plan", tags=["walkthrough video"])


@router.get("", response_model=VideoPlanRead)
def read_plan(project_id: str, db: Session = Depends(get_db)):
    return serialize_plan(ensure_plan(db, project_id))


@router.put("", response_model=VideoPlanRead)
def update_plan(project_id: str, payload: VideoPlanUpdate, db: Session = Depends(get_db)):
    plan = ensure_plan(db, project_id)
    scenes = {scene.scene_key: scene for scene in plan.scenes}
    checklist = {item.task_key: item for item in plan.checklist}
    try:
        plan.status = payload.status.value
        plan.updated_at = utcnow()
        # Move old unique positions out of the target range before reordering scenes.
        for scene in plan.scenes:
            scene.order_index += 10
        db.flush()
        for incoming in payload.scenes:
            scene = scenes[incoming.scene_key]
            values = incoming.model_dump()
            values["status"] = incoming.status.value
            if values["reference_url"] is not None:
                values["reference_url"] = str(values["reference_url"])
            for key, value in values.items():
                setattr(scene, key, value)
        for incoming in payload.checklist:
            checklist[incoming.task_key].is_complete = incoming.is_complete
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=503, detail="Could not save walkthrough plan") from exc
    return serialize_plan(ensure_plan(db, project_id))


@router.post("/reset", response_model=VideoPlanRead)
def reset_plan(project_id: str, db: Session = Depends(get_db)):
    plan = ensure_plan(db, project_id)
    try:
        for scene in list(plan.scenes):
            db.delete(scene)
        for item in list(plan.checklist):
            db.delete(item)
        db.flush()
        plan.status = VideoStatus.NOT_STARTED.value
        plan.updated_at = utcnow()
        plan.scenes = [VideoScene(order_index=index, status="not_started", notes=None, reference_url=None, **scene) for index, scene in enumerate(DEFAULT_SCENES)]
        plan.checklist = [VideoChecklistItem(task_key=key, order_index=index, label=label, is_complete=False)
                          for index, (key, label) in enumerate(zip(CHECKLIST_KEYS, CHECKLIST_LABELS, strict=True))]
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=503, detail="Could not reset walkthrough plan") from exc
    return serialize_plan(ensure_plan(db, project_id))
