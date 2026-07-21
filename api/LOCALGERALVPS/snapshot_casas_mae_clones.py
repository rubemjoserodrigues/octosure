#!/usr/bin/env python3
from __future__ import annotations

import argparse
import sys
from pathlib import Path
from urllib.parse import urlsplit

import psycopg2

REPO_ROOT = Path(__file__).resolve().parent.parent
TESTELOCAL_DIR = REPO_ROOT / "TESTELOCAL"
if str(TESTELOCAL_DIR) not in sys.path:
    sys.path.insert(0, str(TESTELOCAL_DIR))

from catalogar_casa_local import (  # type: ignore
    build_clone_urls,
    extract_event_id_from_url,
    normalize_catalog_url,
)


HOUSE_SPECS = [
    (447, "Bet7k", "localgeralvps_bet7k_current"),
    (10, "Bet365", "localgeralvps_bet365_current"),
    (329, "SuperbetBR", "localgeralvps_superbet_current"),
    (61, "Goldenpalace", "localgeralvps_goldenpalace_current"),
    (34, "Vbet", "localgeralvps_vbet_current"),
    (127, "FortuneJack", "localgeralvps_fortunejack_current"),
    (19, "Unibet", "localgeralvps_unibet_current"),
    (76, "Stoiximan", "localgeralvps_stoiximan_current"),
    (488, "Vaidebet", "localgeralvps_vaidebet_current"),
    (461, "BetNacional", "localgeralvps_betnacional_current"),
    (11, "Betfair", "localgeralvps_betfair_current"),
    (48, "Betsson", "localgeralvps_betsson_current"),
    (83, "Novibet", "localgeralvps_novibet_current"),
    (1, "Pinnacle", "localgeralvps_pinnacle_current"),
    (700, "ExpektDk", "localgeralvps_expekt_current"),
    (9, "Bwin", "localgeralvps_bwin_current"),
]


def _safe_ident(name: str) -> str:
    out = "".join(ch for ch in str(name or "") if ch.isalnum() or ch == "_")
    if not out:
        raise ValueError(f"Nome de tabela invalido: {name!r}")
    return out


def _pick_latest_side(conn, table: str, root: int):
    sql = f"""
        SELECT captured_at, event_name,
               bet1_bookmaker_id AS bookmaker_id,
               bet1_link AS link_url,
               bet1_bet_id AS bet_id
        FROM {_safe_ident(table)}
        WHERE bet1_family_root = %s
        UNION ALL
        SELECT captured_at, event_name,
               bet2_bookmaker_id AS bookmaker_id,
               bet2_link AS link_url,
               bet2_bet_id AS bet_id
        FROM {_safe_ident(table)}
        WHERE bet2_family_root = %s
        ORDER BY captured_at DESC
        LIMIT 200
    """
    with conn.cursor() as cur:
        cur.execute(sql, (root, root))
        rows = cur.fetchall()

    # Preferencia: link preenchido. Fallback: mais recente mesmo sem link.
    non_empty = [r for r in rows if str(r[3] or "").strip()]
    if non_empty:
        return non_empty[0]
    if rows:
        return rows[0]
    return None


def _normalize_clone_list(items):
    out = []
    seen = set()
    for u in items or []:
        txt = str(u or "").strip()
        if not txt:
            continue
        key = txt.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(txt)
    return out


def _extract_bet365_ev(url_text: str) -> str:
    txt = str(url_text or "")
    import re

    m = re.search(r"(?:^|[#?/])/?IP/EV([0-9A-Z]+)(?:/|#|$)", txt, flags=re.I)
    if m:
        return f"/IP/EV{m.group(1)}"
    return ""


def _bet365_clone_urls(final_url: str) -> list[str]:
    ev = _extract_bet365_ev(final_url)
    if ev:
        return [
            f"https://www.bet365.bet.br/?bet=1#{ev}/",
            f"https://www.bet365.com/?bet=1#{ev}/",
        ]
    try:
        host = (urlsplit(str(final_url or "")).hostname or "").lower()
    except Exception:
        host = ""
    if "bet365" in host:
        return ["https://www.bet365.bet.br/?bet=1#/"]
    return []


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Imprime 1 evento por casa-mae com url_mae e clones_urls."
    )
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=5432)
    parser.add_argument("--db", default="surebet")
    parser.add_argument("--user", default="postgres")
    parser.add_argument("--password", default="postgres")
    args = parser.parse_args()

    conn = psycopg2.connect(
        host=args.host,
        port=args.port,
        dbname=args.db,
        user=args.user,
        password=args.password,
    )

    try:
        for root, house_name, table in HOUSE_SPECS:
            rec = _pick_latest_side(conn, table, root)

            print(house_name)
            if not rec:
                print("   evento=(sem_evento_no_momento)")
                print("   url_mae=(vazio)")
                print("   clones_urls:")
                print("      - (sem_clones)")
                print()
                continue

            _, event_name, bookmaker_id, link_url, bet_id = rec
            link_url = str(link_url or "").strip()
            event_name = str(event_name or "").strip() or "(vazio)"

            url_mae = normalize_catalog_url(bookmaker_id, link_url)
            url_base = url_mae or link_url
            event_id = extract_event_id_from_url(url_base, fallback_bookmaker_event_id="")
            clones = build_clone_urls(bookmaker_id, event_id, source_url=url_base)
            if not clones:
                if int(bookmaker_id or 0) in (10, 199):
                    clones = _bet365_clone_urls(url_base)
                elif url_mae:
                    clones = [url_mae]
            clones = _normalize_clone_list(clones)

            print(f"   evento={event_name}")
            print(f"   url_mae={url_mae or '(vazio)'}")
            print("   clones_urls:")
            if clones:
                for u in clones:
                    print(f"      - {u}")
            else:
                print("      - (sem_clones)")
            print()
    finally:
        conn.close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
