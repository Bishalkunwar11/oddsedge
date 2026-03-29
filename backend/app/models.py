"""SQLAlchemy ORM models for the football odds database.

Translates the existing SQLite schema from ``src/db_manager.py`` into
PostgreSQL-compatible models with proper types, indexes, and relationships.
"""

from datetime import datetime

from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Match(Base):
    """A football match with team and scheduling metadata.

    Corresponds to the ``matches`` table.
    """

    __tablename__ = "matches"

    match_id: Mapped[str] = mapped_column(
        String(255), primary_key=True, comment="External match identifier"
    )
    sport_key: Mapped[str] = mapped_column(
        String(100), nullable=False, index=True, comment="e.g. soccer_epl"
    )
    league: Mapped[str] = mapped_column(
        String(255), nullable=False, comment="Human-readable league name"
    )
    home_team: Mapped[str] = mapped_column(String(255), nullable=False)
    away_team: Mapped[str] = mapped_column(String(255), nullable=False)
    commence_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    # Relationship
    odds: Mapped[list["Odds"]] = relationship(
        back_populates="match",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Match {self.match_id}: {self.home_team} vs {self.away_team}>"


class Odds(Base):
    """A single odds snapshot for one outcome from one bookmaker.

    Corresponds to the ``odds`` table.
    """

    __tablename__ = "odds"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    match_id: Mapped[str] = mapped_column(
        String(255),
        ForeignKey("matches.match_id", ondelete="CASCADE"),
        nullable=False,
    )
    bookmaker: Mapped[str] = mapped_column(String(255), nullable=False)
    market: Mapped[str] = mapped_column(String(50), nullable=False)
    outcome_name: Mapped[str] = mapped_column(String(255), nullable=False)
    outcome_price: Mapped[float] = mapped_column(Float, nullable=False)
    point: Mapped[float | None] = mapped_column(Float, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    # Relationship
    match: Mapped["Match"] = relationship(back_populates="odds")

    # Composite index mirroring idx_odds_lookup from the SQLite schema
    __table_args__ = (
        Index(
            "idx_odds_lookup",
            "match_id",
            "bookmaker",
            "market",
            "outcome_name",
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<Odds id={self.id} match={self.match_id} "
            f"{self.bookmaker}/{self.market}/{self.outcome_name} "
            f"@ {self.outcome_price}>"
        )


class Feedback(Base):
    """User feedback entry with a category and star rating.

    Corresponds to the ``feedback`` table.
    """

    __tablename__ = "feedback"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
    )

    def __repr__(self) -> str:
        return f"<Feedback id={self.id} category={self.category!r} rating={self.rating}>"
