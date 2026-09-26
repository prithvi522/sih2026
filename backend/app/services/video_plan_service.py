from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.models import Project, VideoChecklistItem, VideoPlan, VideoScene
from app.schemas.video_plan import CHECKLIST_KEYS, SCENE_KEYS, VideoPlanRead, VideoStatus

DEFAULT_SCENES = [
    {"scene_key": "city_overview", "title": "Smart City Overview", "duration_seconds": 5, "objective": "Introduce the complete smart city site.", "recording_instructions": "Show the complete site from an aerial perspective, including the actual site boundary, buildings, roads, and green spaces.", "camera_movement": "Slow aerial camera movement."},
    {"scene_key": "urban_layout", "title": "Buildings and Urban Layout", "duration_seconds": 7, "objective": "Show the building arrangement and urban layout.", "recording_instructions": "Capture actual building heights and spacing and their relationship to the roads.", "camera_movement": "Smooth aerial camera movement."},
    {"scene_key": "green_transport", "title": "Green Infrastructure and Transportation", "duration_seconds": 7, "objective": "Show real landscaping and transportation connections.", "recording_instructions": "Highlight modeled parks, green spaces, roads, pedestrian paths, and connectivity. Show only elements in the actual Forma model.", "camera_movement": "Follow the modeled green and transport corridors."},
    {"scene_key": "sustainable_design", "title": "Sustainable Design", "duration_seconds": 6, "objective": "Present sustainability features that are actually modeled.", "recording_instructions": "Show modeled sustainability features. Include solar installations or green roofs only when present in the actual model; do not add analysis claims.", "camera_movement": "Slow focused aerial pass over verified features."},
    {"scene_key": "final_reveal", "title": "Final City Reveal", "duration_seconds": 5, "objective": "End with a complete wide view of the city.", "recording_instructions": "Return to a wide aerial view, display ‘UrbanForma — Smart City Site Planning’, hold the shot, and finish with a clean fade-out.", "camera_movement": "Pull back to a steady wide aerial view; hold and fade."},
]
CHECKLIST_LABELS = (
    "Open the actual Autodesk Forma model.",
    "Confirm the complete site is visible.",
    "Record the five planned scenes.",
    "Verify that buildings and roads are clearly visible.",
    "Check the landscaping shots.",
    "Review the recorded footage.",
    "Trim and arrange the clips.",
    "Add the project title.",
    "Verify the total video duration is 30 seconds.",
    "Export the final MP4.",
    "Review the exported video.",
)


def find_plan(db: Session, project_id: str) -> VideoPlan | None:
    return db.scalar(select(VideoPlan).options(selectinload(VideoPlan.scenes), selectinload(VideoPlan.checklist)).where(VideoPlan.project_id == project_id))


def ensure_plan(db: Session, project_id: str) -> VideoPlan:
    if db.get(Project, project_id) is None:
        raise HTTPException(status_code=404, detail="Project not found")
    plan = find_plan(db, project_id)
    if plan is not None:
        return plan
    plan = VideoPlan(project_id=project_id, status=VideoStatus.NOT_STARTED.value)
    plan.scenes = [VideoScene(order_index=order, status="not_started", notes=None, reference_url=None, **scene) for order, scene in enumerate(DEFAULT_SCENES)]
    plan.checklist = [VideoChecklistItem(task_key=key, order_index=order, label=label, is_complete=False) for order, (key, label) in enumerate(zip(CHECKLIST_KEYS, CHECKLIST_LABELS, strict=True))]
    db.add(plan)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
    return find_plan(db, project_id) or ensure_existing_plan(db, project_id)


def ensure_existing_plan(db: Session, project_id: str) -> VideoPlan:
    plan = find_plan(db, project_id)
    if plan is None:
        raise HTTPException(status_code=503, detail="Could not initialize walkthrough plan")
    return plan


def serialize_plan(plan: VideoPlan) -> VideoPlanRead:
    cursor = 0
    scenes = []
    for scene in sorted(plan.scenes, key=lambda item: item.order_index):
        start = cursor
        cursor += scene.duration_seconds
        scenes.append({
            "id": scene.id, "scene_key": scene.scene_key, "order_index": scene.order_index,
            "title": scene.title, "duration_seconds": scene.duration_seconds,
            "start_seconds": start, "end_seconds": cursor, "objective": scene.objective,
            "recording_instructions": scene.recording_instructions, "camera_movement": scene.camera_movement,
            "status": scene.status, "notes": scene.notes, "reference_url": scene.reference_url,
            "updated_at": scene.updated_at,
        })
    checklist = [{"id": task.id, "task_key": task.task_key, "order_index": task.order_index,
                  "label": task.label, "is_complete": task.is_complete}
                 for task in sorted(plan.checklist, key=lambda item: item.order_index)]
    return VideoPlanRead(id=plan.id, project_id=plan.project_id, status=plan.status,
                         scenes=scenes, checklist=checklist, created_at=plan.created_at,
                         updated_at=plan.updated_at)
