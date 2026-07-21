#!/usr/bin/env python3
from __future__ import annotations

import argparse
from urllib.parse import urlsplit

import psycopg2


def host_of(url_text: str) -> str:
    try:
        return (urlsplit(str(url_text or "")).hostname or "").lower()
    except Exception:
        return ""


def print_table_report(cur, label: str, table: str):
    print("=" * 90)
    print(f"{label} | table={table}")
    cur.execute(
        f"""
        SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN COALESCE(bet1_link,'')='' THEN 1 ELSE 0 END) AS bet1_empty,
            SUM(CASE WHEN COALESCE(bet2_link,'')='' THEN 1 ELSE 0 END) AS bet2_empty
        FROM {table}
        """
    )
    total, bet1_empty, bet2_empty = cur.fetchone()
    print(f"total={total} bet1_link_empty={bet1_empty} bet2_link_empty={bet2_empty}")

    cur.execute(
        f"""
        SELECT
            bet1_bookmaker_id, bet1_bookmaker, bet1_family_root, bet1_casa_mae, bet1_link,
            bet2_bookmaker_id, bet2_bookmaker, bet2_family_root, bet2_casa_mae, bet2_link
        FROM {table}
        ORDER BY captured_at DESC
        LIMIT 15
        """
    )
    rows = cur.fetchall()
    if not rows:
        print("sem_linhas=1")
        return

    print("samples:")
    for row in rows:
        (
            b1_id,
            b1_name,
            b1_root,
            b1_mae,
            b1_link,
            b2_id,
            b2_name,
            b2_root,
            b2_mae,
            b2_link,
        ) = row
        h1 = host_of(b1_link)
        h2 = host_of(b2_link)
        print(
            f"b1=({b1_id},{b1_name},root={b1_root},mae={b1_mae},host={h1}) "
            f"| b2=({b2_id},{b2_name},root={b2_root},mae={b2_mae},host={h2})"
        )

    print("top_bet1_casa_mae:")
    cur.execute(
        f"""
        SELECT bet1_casa_mae, bet1_family_root, COUNT(*)
        FROM {table}
        GROUP BY bet1_casa_mae, bet1_family_root
        ORDER BY COUNT(*) DESC
        LIMIT 10
        """
    )
    for name, root, qty in cur.fetchall():
        print(f"  {name} (root={root}) -> {qty}")


def main():
    parser = argparse.ArgumentParser(description="Audita links e clones dos bots individuais.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=5432)
    parser.add_argument("--db", default="surebet")
    parser.add_argument("--user", default="postgres")
    parser.add_argument("--password", default="postgres")
    parser.add_argument("--bet7k-table", default="localgeralvps_bet7k_current")
    parser.add_argument("--bet365-table", default="localgeralvps_bet365_current")
    args = parser.parse_args()

    conn = psycopg2.connect(
        host=args.host,
        port=args.port,
        dbname=args.db,
        user=args.user,
        password=args.password,
    )
    try:
        cur = conn.cursor()
        print_table_report(cur, "BET7K", args.bet7k_table)
        print_table_report(cur, "BET365", args.bet365_table)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
