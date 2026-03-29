"""Application settings loaded from environment variables."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central configuration sourced from env vars / .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Database
    database_url: str = (
        "postgresql+asyncpg://postgres:postgres@localhost:5432/football_odds"
    )

    # Redis
    redis_url: str = "redis://localhost:6379/0"
    cache_ttl_seconds: int = 300  # 5 minutes

    # WebSocket
    ws_broadcast_interval: float = 5.0  # seconds between live-odds broadcasts

    # Application
    debug: bool = False
    app_title: str = "Football Odds API"
    app_version: str = "0.1.0"


settings = Settings()

# ---------------------------------------------------------------------------
# Domain constants (migrated from src/config.py)
# ---------------------------------------------------------------------------

LEAGUES: dict[str, str] = {
    "English Premier League": "soccer_epl",
    "La Liga": "soccer_spain_la_liga",
    "Serie A": "soccer_italy_serie_a",
    "Bundesliga": "soccer_germany_bundesliga",
    "Ligue 1": "soccer_france_ligue_one",
    "UEFA Champions League": "soccer_uefa_champs_league",
}

SHARP_BOOKMAKERS: list[str] = ["pinnacle", "betfair_ex_eu", "betfair_ex_uk"]

DEFAULT_EDGE_THRESHOLD: float = 0.05
