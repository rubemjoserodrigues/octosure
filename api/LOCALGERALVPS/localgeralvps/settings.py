from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[1]
DEFAULT_REFERENCE_FILE = BASE_DIR.parent / "ARQUIVOSDAVPS" / "bot" / "TODASURLSEFORMATOS.txt"


def _load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = str(raw_line or "").strip()
        if not line or line.startswith("#"):
            continue
        if line.lower().startswith("export "):
            line = line[7:].strip()
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = str(key or "").strip()
        value = str(value or "").strip()
        if not key:
            continue
        if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
            value = value[1:-1]
        # Always apply values from LOCALGERALVPS/.env to avoid inheriting
        # stale process/systemd environment values (e.g. malformed Windows paths).
        os.environ[key] = value


def _env_bool(name: str, default: bool) -> bool:
    raw = str(os.getenv(name, "")).strip().lower()
    if not raw:
        return default
    return raw in ("1", "true", "yes", "on")


def _env_int(name: str, default: int, min_value: int | None = None) -> int:
    raw = str(os.getenv(name, "")).strip()
    try:
        value = int(raw) if raw else int(default)
    except Exception:
        value = int(default)
    if min_value is not None and value < min_value:
        value = min_value
    return value


def _env_float(name: str, default: float, min_value: float | None = None) -> float:
    raw = str(os.getenv(name, "")).strip()
    try:
        value = float(raw) if raw else float(default)
    except Exception:
        value = float(default)
    if min_value is not None and value < min_value:
        value = min_value
    return value


@dataclass
class Settings:
    token: str
    locale: str
    fetch_live: bool
    fetch_prematch: bool
    search_filter_live: str
    search_filter_prematch: str
    per_page: int
    max_pages: int
    interval_sec: float
    timeout_sec: float
    retries: int
    retry_backoff_sec: float
    link_resolve_enabled: bool
    link_resolve_timeout_sec: float
    link_resolve_retries: int
    link_resolve_retry_backoff_sec: float
    reference_file: Path
    pg_enabled: bool
    pg_host: str
    pg_port: int
    pg_db: str
    pg_user: str
    pg_password: str
    pg_sslmode: str
    pg_table_current: str
    pg_table_history: str
    pg_write_history: bool


def _resolve_path(raw_path: str) -> Path:
    # Aceita paths vindos de Windows (.env) mesmo rodando em Linux.
    txt = str(raw_path or "").strip().replace("\\", "/")
    p = Path(txt)
    if not p.is_absolute():
        p = (BASE_DIR / p).resolve()
    else:
        p = p.resolve()
    return p


def load_settings() -> Settings:
    _load_env_file(BASE_DIR / ".env")

    settings = Settings(
        token=str(os.getenv("BETBURGER_ACCESS_TOKEN", "")).strip(),
        locale=str(os.getenv("BETBURGER_LOCALE", "pt")).strip() or "pt",
        fetch_live=_env_bool("FETCH_LIVE", True),
        fetch_prematch=_env_bool("FETCH_PREMATCH", True),
        search_filter_live=str(os.getenv("SEARCH_FILTER_ID_LIVE", "2028569")).strip() or "2028569",
        search_filter_prematch=str(os.getenv("SEARCH_FILTER_ID_PREMATCH", "1296400")).strip() or "1296400",
        per_page=_env_int("PER_PAGE", 10, min_value=1),
        max_pages=_env_int("MAX_PAGES", 8, min_value=1),
        interval_sec=_env_float("INTERVAL_SEC", 2.0, min_value=0.0),
        timeout_sec=_env_float("REQUEST_TIMEOUT_SEC", 20.0, min_value=1.0),
        retries=_env_int("REQUEST_RETRIES", 3, min_value=1),
        retry_backoff_sec=_env_float("REQUEST_RETRY_BACKOFF_SEC", 1.5, min_value=0.2),
        link_resolve_enabled=_env_bool("LINK_RESOLVE_ENABLED", True),
        link_resolve_timeout_sec=_env_float("LINK_RESOLVE_TIMEOUT_SEC", 20.0, min_value=1.0),
        link_resolve_retries=_env_int("LINK_RESOLVE_RETRIES", 2, min_value=1),
        link_resolve_retry_backoff_sec=_env_float("LINK_RESOLVE_RETRY_BACKOFF_SEC", 1.2, min_value=0.2),
        reference_file=_resolve_path(str(os.getenv("REFERENCE_FILE", str(DEFAULT_REFERENCE_FILE))).strip()),
        pg_enabled=_env_bool("PG_ENABLED", True),
        pg_host=str(os.getenv("PG_HOST", "127.0.0.1")).strip() or "127.0.0.1",
        pg_port=_env_int("PG_PORT", 5432, min_value=1),
        pg_db=str(os.getenv("PG_DB", "surebet")).strip() or "surebet",
        pg_user=str(os.getenv("PG_USER", "postgres")).strip() or "postgres",
        pg_password=str(os.getenv("PG_PASSWORD", "")).strip(),
        pg_sslmode=str(os.getenv("PG_SSLMODE", "prefer")).strip() or "prefer",
        pg_table_current=str(os.getenv("PG_TABLE_CURRENT", "localgeralvps_arbs_current")).strip() or "localgeralvps_arbs_current",
        pg_table_history=str(os.getenv("PG_TABLE_HISTORY", "localgeralvps_arbs_history")).strip() or "localgeralvps_arbs_history",
        pg_write_history=_env_bool("PG_WRITE_HISTORY", False),
    )

    if not settings.token:
        raise ValueError("BETBURGER_ACCESS_TOKEN nao definido.")
    if not settings.fetch_live and not settings.fetch_prematch:
        raise ValueError("Ative FETCH_LIVE=1 ou FETCH_PREMATCH=1.")
    return settings
