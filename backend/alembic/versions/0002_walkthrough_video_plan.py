"""Add editable walkthrough planning and checklist tables."""

from alembic import op

from app.models.project import VideoChecklistItem, VideoPlan, VideoScene

revision = "0002_walkthrough_video_plan"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    VideoPlan.__table__.create(bind=bind, checkfirst=True)
    VideoScene.__table__.create(bind=bind, checkfirst=True)
    VideoChecklistItem.__table__.create(bind=bind, checkfirst=True)


def downgrade() -> None:
    bind = op.get_bind()
    VideoChecklistItem.__table__.drop(bind=bind, checkfirst=True)
    VideoScene.__table__.drop(bind=bind, checkfirst=True)
    VideoPlan.__table__.drop(bind=bind, checkfirst=True)
