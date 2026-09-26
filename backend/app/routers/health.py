from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db

router = APIRouter(tags=["health"])


@router.get("/api/health")
def health(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        database = "connected"
        status = "ok"
    except Exception:
        db.rollback()
        database = "unavailable"
        status = "degraded"
    return {"status": status, "database": database}
