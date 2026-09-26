import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import get_settings
from app.routers import health, projects, proposals, walkthrough

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
settings = get_settings()

app = FastAPI(title="UrbanForma API", version="1.0.0", description="Project, proposal, and manually supplied Forma analysis records.")


@app.exception_handler(SQLAlchemyError)
async def database_error_handler(_request: Request, error: SQLAlchemyError):
    logging.getLogger("urbanforma.database").error("Database operation failed (%s)", type(error).__name__)
    return JSONResponse(status_code=503, content={"detail": "Database operation failed; retry the request"})


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type"],
)
app.include_router(health.router)
app.include_router(projects.router)
app.include_router(proposals.router)
app.include_router(walkthrough.router)
