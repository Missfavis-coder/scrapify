
import os
import sqlite3
import time
from datetime import datetime, timezone
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]


class GeminiQuotaError(RuntimeError):
    """Base exception for Scrapify's Gemini quota controls."""


class GeminiDailyLimitExceeded(GeminiQuotaError):
    """Scrapify's configured daily request limit was reached."""


class GeminiCooldownActive(GeminiQuotaError):
    """Gemini requests are temporarily paused."""


class GeminiQuotaManager:
    """
    Persistent, process-safe request counter for Gemini.

    Limits API attempts, not tokens. Provider quota errors activate
    a configurable cooldown. SQLite preserves state across restarts.
    """

    def __init__(self):
        self.daily_limit = max(
            1,
            int(os.getenv("SCRAPIFY_GEMINI_DAILY_LIMIT", "18")),
        )
        self.cooldown_seconds = max(
            60,
            int(os.getenv("SCRAPIFY_GEMINI_COOLDOWN_SECONDS", "3600")),
        )

        default_db = PROJECT_ROOT / ".scrapify_data" / "gemini_quota.sqlite3"
        self.db_path = Path(
            os.getenv("SCRAPIFY_QUOTA_DB_PATH", str(default_db))
        ).expanduser().resolve()

        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._initialize()

    def _connect(self):
        connection = sqlite3.connect(
            str(self.db_path),
            timeout=10,
        )
        connection.execute("PRAGMA busy_timeout = 10000")
        return connection

    def _initialize(self):
        with self._connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS gemini_quota_state (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    utc_day TEXT NOT NULL,
                    request_count INTEGER NOT NULL DEFAULT 0,
                    cooldown_until REAL NOT NULL DEFAULT 0
                )
                """
            )

            today = self._today()

            connection.execute(
                """
                INSERT OR IGNORE INTO gemini_quota_state
                    (id, utc_day, request_count, cooldown_until)
                VALUES (1, ?, 0, 0)
                """,
                (today,),
            )

    @staticmethod
    def _today() -> str:
        return datetime.now(timezone.utc).date().isoformat()

    def reserve_request(self) -> None:
        """
        Atomically reserve one Gemini request.

        Call immediately before every actual Gemini API attempt,
        including fallback-model attempts.
        """

        now = time.time()
        today = self._today()

        with self._connect() as connection:
            connection.execute("BEGIN IMMEDIATE")

            row = connection.execute(
                """
                SELECT utc_day, request_count, cooldown_until
                FROM gemini_quota_state
                WHERE id = 1
                """
            ).fetchone()

            stored_day, request_count, cooldown_until = row

            if stored_day != today:
                request_count = 0

            if cooldown_until > now:
                remaining = int(cooldown_until - now) + 1
                connection.execute(
                    """
                    UPDATE gemini_quota_state
                    SET utc_day = ?, request_count = ?
                    WHERE id = 1
                    """,
                    (today, request_count),
                )
                connection.commit()

                raise GeminiCooldownActive(
                    f"Gemini requests are paused. "
                    f"Try again in approximately {remaining} seconds."
                )

            if request_count >= self.daily_limit:
                connection.execute(
                    """
                    UPDATE gemini_quota_state
                    SET utc_day = ?, request_count = ?
                    WHERE id = 1
                    """,
                    (today, request_count),
                )
                connection.commit()

                raise GeminiDailyLimitExceeded(
                    "Scrapify's daily Gemini request budget has been reached."
                )

            connection.execute(
                """
                UPDATE gemini_quota_state
                SET utc_day = ?, request_count = ?
                WHERE id = 1
                """,
                (today, request_count + 1),
            )

            connection.commit()

    def activate_cooldown(self, seconds: int | None = None) -> None:
        """Pause new requests after a provider quota/rate-limit error."""

        duration = max(
            60,
            seconds if seconds is not None else self.cooldown_seconds,
        )
        until = time.time() + duration

        with self._connect() as connection:
            connection.execute(
                """
                UPDATE gemini_quota_state
                SET cooldown_until = MAX(cooldown_until, ?)
                WHERE id = 1
                """,
                (until,),
            )

    def get_status(self) -> dict:
        """Return current usage without making a Gemini request."""

        today = self._today()
        now = time.time()

        with self._connect() as connection:
            row = connection.execute(
                """
                SELECT utc_day, request_count, cooldown_until
                FROM gemini_quota_state
                WHERE id = 1
                """
            ).fetchone()

        stored_day, count, cooldown_until = row

        if stored_day != today:
            count = 0

        return {
            "provider": "google_gemini",
            "utc_day": today,
            "requests_used": count,
            "daily_limit": self.daily_limit,
            "requests_remaining": max(0, self.daily_limit - count),
            "cooldown_active": cooldown_until > now,
            "cooldown_seconds_remaining": max(
                0, int(cooldown_until - now)
            ),
        }
