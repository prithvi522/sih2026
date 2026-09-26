from collections.abc import Generator
from functools import lru_cache

from sqlalchemy import create_engine
from sqlalchemy import event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import get_settings


class Base(DeclarativeBase):
    pass


def make_engine(url: str):
    options = {"check_same_thread": False} if url.startswith("sqlite") else {}
    pool_options = {"poolclass": StaticPool} if url in {"sqlite://", "sqlite:///:memory:"} else {}
    database_engine = create_engine(url, connect_args=options, pool_pre_ping=True, **pool_options)
    if url.startswith("sqlite"):
        @event.listens_for(database_engine, "connect")
        def enable_foreign_keys(connection, _record):
            cursor = connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()
    return database_engine


@lru_cache
def get_engine():
    return make_engine(get_settings().database_url)


@lru_cache
def get_session_factory():
    return sessionmaker(bind=get_engine(), autoflush=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    with get_session_factory()() as session:
        yield session
