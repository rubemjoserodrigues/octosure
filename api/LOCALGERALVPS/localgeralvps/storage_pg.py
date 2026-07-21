from __future__ import annotations

import hashlib
from dataclasses import dataclass

try:
    import psycopg2
    from psycopg2.extras import Json, execute_values
except Exception:  # pragma: no cover
    psycopg2 = None
    Json = None
    execute_values = None


def _safe_ident(name: str) -> str:
    out = "".join(ch for ch in str(name or "") if ch.isalnum() or ch == "_")
    if not out:
        raise ValueError("Nome de tabela invalido.")
    return out


def _row_key_for_row(row: dict) -> str:
    key = str(row.get("row_key") or "").strip()
    if key:
        return key
    base = (
        f"{row.get('arb_hash') or ''}|"
        f"{row.get('bet1_bet_id') or ''}|"
        f"{row.get('bet2_bet_id') or ''}|"
        f"{1 if row.get('is_live') else 0}"
    )
    return hashlib.md5(base.encode("utf-8")).hexdigest()


def _dedupe_rows(rows: list[dict]) -> list[dict]:
    # Same row_key can appear more than once in the same batch (pagination overlap).
    # Keep only the latest row per key before sending to ON CONFLICT upsert.
    dedup: dict[str, dict] = {}
    for row in rows:
        key = _row_key_for_row(row)
        row["row_key"] = key
        dedup[key] = row
    return list(dedup.values())


@dataclass
class PgConfig:
    host: str
    port: int
    db: str
    user: str
    password: str
    sslmode: str
    table_current: str
    table_history: str
    write_history: bool


class PostgresStore:
    def __init__(self, cfg: PgConfig):
        if psycopg2 is None or execute_values is None or Json is None:
            raise RuntimeError("psycopg2 indisponivel. Instale requirements.")
        self.cfg = cfg
        self.table_current = _safe_ident(cfg.table_current)
        self.table_history = _safe_ident(cfg.table_history)
        self.conn = psycopg2.connect(
            host=cfg.host,
            port=cfg.port,
            dbname=cfg.db,
            user=cfg.user,
            password=cfg.password,
            sslmode=cfg.sslmode,
        )
        self.conn.autocommit = False

    def close(self):
        try:
            self.conn.close()
        except Exception:
            pass

    def ensure_schema(self):
        ddl_current = f"""
        CREATE TABLE IF NOT EXISTS {self.table_current} (
            row_key TEXT PRIMARY KEY,
            captured_at TIMESTAMPTZ NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            is_live BOOLEAN NOT NULL,
            arb_hash TEXT NULL,
            event_name TEXT NULL,
            sport_name TEXT NULL,
            percentage DOUBLE PRECISION NULL,
            starts_at TEXT NULL,
            bet1_bookmaker_id BIGINT NULL,
            bet1_bookmaker TEXT NULL,
            bet1_family_root BIGINT NULL,
            bet1_casa_mae_id BIGINT NULL,
            bet1_casa_mae TEXT NULL,
            bet1_odd DOUBLE PRECISION NULL,
            bet1_entry_type TEXT NULL,
            bet1_bet_id TEXT NULL,
            bet1_link TEXT NULL,
            bet1_oddsrabbit_url TEXT NULL,
            bet2_bookmaker_id BIGINT NULL,
            bet2_bookmaker TEXT NULL,
            bet2_family_root BIGINT NULL,
            bet2_casa_mae_id BIGINT NULL,
            bet2_casa_mae TEXT NULL,
            bet2_odd DOUBLE PRECISION NULL,
            bet2_entry_type TEXT NULL,
            bet2_bet_id TEXT NULL,
            bet2_link TEXT NULL,
            bet2_oddsrabbit_url TEXT NULL,
            payload JSONB NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_{self.table_current}_captured_at ON {self.table_current}(captured_at DESC);
        CREATE INDEX IF NOT EXISTS idx_{self.table_current}_is_live ON {self.table_current}(is_live);
        CREATE INDEX IF NOT EXISTS idx_{self.table_current}_arb_hash ON {self.table_current}(arb_hash);
        CREATE INDEX IF NOT EXISTS idx_{self.table_current}_roots ON {self.table_current}(bet1_family_root, bet2_family_root);
        """

        ddl_history = f"""
        CREATE TABLE IF NOT EXISTS {self.table_history} (
            id BIGSERIAL PRIMARY KEY,
            row_key TEXT NOT NULL,
            captured_at TIMESTAMPTZ NOT NULL,
            is_live BOOLEAN NOT NULL,
            arb_hash TEXT NULL,
            event_name TEXT NULL,
            sport_name TEXT NULL,
            percentage DOUBLE PRECISION NULL,
            starts_at TEXT NULL,
            bet1_bookmaker_id BIGINT NULL,
            bet1_bookmaker TEXT NULL,
            bet1_family_root BIGINT NULL,
            bet1_casa_mae_id BIGINT NULL,
            bet1_casa_mae TEXT NULL,
            bet1_odd DOUBLE PRECISION NULL,
            bet1_entry_type TEXT NULL,
            bet1_bet_id TEXT NULL,
            bet1_link TEXT NULL,
            bet1_oddsrabbit_url TEXT NULL,
            bet2_bookmaker_id BIGINT NULL,
            bet2_bookmaker TEXT NULL,
            bet2_family_root BIGINT NULL,
            bet2_casa_mae_id BIGINT NULL,
            bet2_casa_mae TEXT NULL,
            bet2_odd DOUBLE PRECISION NULL,
            bet2_entry_type TEXT NULL,
            bet2_bet_id TEXT NULL,
            bet2_link TEXT NULL,
            bet2_oddsrabbit_url TEXT NULL,
            payload JSONB NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_{self.table_history}_captured_at ON {self.table_history}(captured_at DESC);
        CREATE INDEX IF NOT EXISTS idx_{self.table_history}_row_key ON {self.table_history}(row_key);
        CREATE INDEX IF NOT EXISTS idx_{self.table_history}_roots ON {self.table_history}(bet1_family_root, bet2_family_root);
        """

        with self.conn.cursor() as cur:
            cur.execute(ddl_current)
            cur.execute(ddl_history)
        self.conn.commit()

    def upsert_current(self, rows: list[dict]):
        if not rows:
            # Keep *_current as true snapshot: empty batch means empty table.
            with self.conn.cursor() as cur:
                cur.execute(f"DELETE FROM {self.table_current}")
            self.conn.commit()
            return
        rows = _dedupe_rows(rows)

        sql = f"""
        INSERT INTO {self.table_current} (
            row_key, captured_at, is_live, arb_hash, event_name, sport_name, percentage, starts_at,
            bet1_bookmaker_id, bet1_bookmaker, bet1_family_root, bet1_casa_mae_id, bet1_casa_mae, bet1_odd, bet1_entry_type, bet1_bet_id, bet1_link, bet1_oddsrabbit_url,
            bet2_bookmaker_id, bet2_bookmaker, bet2_family_root, bet2_casa_mae_id, bet2_casa_mae, bet2_odd, bet2_entry_type, bet2_bet_id, bet2_link, bet2_oddsrabbit_url,
            payload
        ) VALUES %s
        ON CONFLICT (row_key) DO UPDATE SET
            captured_at = EXCLUDED.captured_at,
            updated_at = NOW(),
            is_live = EXCLUDED.is_live,
            arb_hash = EXCLUDED.arb_hash,
            event_name = EXCLUDED.event_name,
            sport_name = EXCLUDED.sport_name,
            percentage = EXCLUDED.percentage,
            starts_at = EXCLUDED.starts_at,
            bet1_bookmaker_id = EXCLUDED.bet1_bookmaker_id,
            bet1_bookmaker = EXCLUDED.bet1_bookmaker,
            bet1_family_root = EXCLUDED.bet1_family_root,
            bet1_casa_mae_id = EXCLUDED.bet1_casa_mae_id,
            bet1_casa_mae = EXCLUDED.bet1_casa_mae,
            bet1_odd = EXCLUDED.bet1_odd,
            bet1_entry_type = EXCLUDED.bet1_entry_type,
            bet1_bet_id = EXCLUDED.bet1_bet_id,
            bet1_link = EXCLUDED.bet1_link,
            bet1_oddsrabbit_url = EXCLUDED.bet1_oddsrabbit_url,
            bet2_bookmaker_id = EXCLUDED.bet2_bookmaker_id,
            bet2_bookmaker = EXCLUDED.bet2_bookmaker,
            bet2_family_root = EXCLUDED.bet2_family_root,
            bet2_casa_mae_id = EXCLUDED.bet2_casa_mae_id,
            bet2_casa_mae = EXCLUDED.bet2_casa_mae,
            bet2_odd = EXCLUDED.bet2_odd,
            bet2_entry_type = EXCLUDED.bet2_entry_type,
            bet2_bet_id = EXCLUDED.bet2_bet_id,
            bet2_link = EXCLUDED.bet2_link,
            bet2_oddsrabbit_url = EXCLUDED.bet2_oddsrabbit_url,
            payload = EXCLUDED.payload
        """

        values = []
        for row in rows:
            values.append((
                row.get("row_key"),
                row.get("captured_at"),
                row.get("is_live"),
                row.get("arb_hash"),
                row.get("event_name"),
                row.get("sport_name"),
                row.get("percentage"),
                row.get("starts_at"),
                row.get("bet1_bookmaker_id"),
                row.get("bet1_bookmaker"),
                row.get("bet1_family_root"),
                row.get("bet1_casa_mae_id"),
                row.get("bet1_casa_mae"),
                row.get("bet1_odd"),
                row.get("bet1_entry_type"),
                row.get("bet1_bet_id"),
                row.get("bet1_link"),
                row.get("bet1_oddsrabbit_url"),
                row.get("bet2_bookmaker_id"),
                row.get("bet2_bookmaker"),
                row.get("bet2_family_root"),
                row.get("bet2_casa_mae_id"),
                row.get("bet2_casa_mae"),
                row.get("bet2_odd"),
                row.get("bet2_entry_type"),
                row.get("bet2_bet_id"),
                row.get("bet2_link"),
                row.get("bet2_oddsrabbit_url"),
                Json(row.get("payload") or {}),
            ))

        keys = [str(row.get("row_key") or "").strip() for row in rows]
        keys = [k for k in keys if k]

        with self.conn.cursor() as cur:
            execute_values(cur, sql, values, page_size=500)
            # Keep *_current as real snapshot of the last successful cycle.
            # Remove stale rows that were not present in this batch.
            if keys:
                cur.execute(
                    f"DELETE FROM {self.table_current} WHERE NOT (row_key = ANY(%s))",
                    (keys,),
                )
        self.conn.commit()

    def insert_history(self, rows: list[dict]):
        if not rows or not self.cfg.write_history:
            return
        rows = _dedupe_rows(rows)
        sql = f"""
        INSERT INTO {self.table_history} (
            row_key, captured_at, is_live, arb_hash, event_name, sport_name, percentage, starts_at,
            bet1_bookmaker_id, bet1_bookmaker, bet1_family_root, bet1_casa_mae_id, bet1_casa_mae, bet1_odd, bet1_entry_type, bet1_bet_id, bet1_link, bet1_oddsrabbit_url,
            bet2_bookmaker_id, bet2_bookmaker, bet2_family_root, bet2_casa_mae_id, bet2_casa_mae, bet2_odd, bet2_entry_type, bet2_bet_id, bet2_link, bet2_oddsrabbit_url,
            payload
        ) VALUES %s
        """
        values = []
        for row in rows:
            values.append((
                row.get("row_key"),
                row.get("captured_at"),
                row.get("is_live"),
                row.get("arb_hash"),
                row.get("event_name"),
                row.get("sport_name"),
                row.get("percentage"),
                row.get("starts_at"),
                row.get("bet1_bookmaker_id"),
                row.get("bet1_bookmaker"),
                row.get("bet1_family_root"),
                row.get("bet1_casa_mae_id"),
                row.get("bet1_casa_mae"),
                row.get("bet1_odd"),
                row.get("bet1_entry_type"),
                row.get("bet1_bet_id"),
                row.get("bet1_link"),
                row.get("bet1_oddsrabbit_url"),
                row.get("bet2_bookmaker_id"),
                row.get("bet2_bookmaker"),
                row.get("bet2_family_root"),
                row.get("bet2_casa_mae_id"),
                row.get("bet2_casa_mae"),
                row.get("bet2_odd"),
                row.get("bet2_entry_type"),
                row.get("bet2_bet_id"),
                row.get("bet2_link"),
                row.get("bet2_oddsrabbit_url"),
                Json(row.get("payload") or {}),
            ))

        with self.conn.cursor() as cur:
            execute_values(cur, sql, values, page_size=500)
        self.conn.commit()
