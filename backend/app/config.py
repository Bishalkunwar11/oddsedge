"""Application settings loaded from environment variables."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central configuration sourced from env vars / .env file(s).

    Pydantic reads files left-to-right; later files override earlier ones.
    - ``.env``   — database / redis / app config (committed as .env.example)
    - ``api.env`` — third-party API keys (git-ignored, never committed)
    """

    model_config = SettingsConfigDict(
        env_file=(".env", "api.env"),   # api.env overrides .env for shared keys
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

    # ---------------------------------------------------------------------------
    # Third-Party API Keys (all optional — service degrades gracefully if absent)
    # ---------------------------------------------------------------------------

    # The Odds API — https://the-odds-api.com
    # Free tier: 500 requests/month. Injected as ?apiKey= query param.
    odds_api_key: str | None = None

    # API-Football — https://www.api-football.com (via RapidAPI)
    # Free tier: 100 requests/day. Injected via x-rapidapi-key header.
    api_football_key: str | None = None

    # Sportmonks — https://www.sportmonks.com
    # Free tier: limited fixtures/day. Injected via Authorization header.
    sportmonks_api_token: str | None = None


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
