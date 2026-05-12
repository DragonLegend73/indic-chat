"""
Database setup — SQLAlchemy async engine with SQLite.
Configured with WAL mode and busy timeout for concurrency.
"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import event, text
from app.config import get_settings


class Base(DeclarativeBase):
    """Base class for all ORM models."""
    pass


settings = get_settings()

engine = create_async_engine(
    settings.SQLITE_DB_URL,
    echo=(settings.APP_ENV == "development"),
    connect_args={"check_same_thread": False},
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


def _set_sqlite_pragmas(dbapi_connection, connection_record):
    """Set SQLite PRAGMAs for performance and concurrency."""
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA busy_timeout=5000")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.execute("PRAGMA cache_size=-64000")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


# Register the PRAGMA listener on the sync engine underneath
event.listen(engine.sync_engine, "connect", _set_sqlite_pragmas)


async def init_db():
    """Create all tables."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db() -> AsyncSession:
    """Dependency: yields an async database session."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
