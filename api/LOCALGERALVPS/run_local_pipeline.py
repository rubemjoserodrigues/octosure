#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import os
import time
from dataclasses import dataclass
from collections import Counter
from datetime import datetime, timezone

from localgeralvps.betburger_api import ApiError, fetch_arbs_page
from localgeralvps.link_resolver import OddsRabbitResolver, is_viable_final_url, normalize_catalog_url
from localgeralvps.normalize import normalize_payload
from localgeralvps.reference_data import load_reference_data
from localgeralvps.settings import load_settings
from localgeralvps.storage_pg import PgConfig, PostgresStore


def _now_iso():
    return datetime.now(timezone.utc).isoformat()


@dataclass(frozen=True)
class FamilyWorker:
    root: int
    table_current: str
    table_history: str


def _parse_worker_spec(raw: str, default_current: str, default_history: str) -> FamilyWorker | None:
    text = str(raw or "").strip()
    if not text:
        return None

    if ":" not in text:
        try:
            root = int(text)
        except Exception:
            raise ValueError(f"Formato de worker invalido: '{raw}'. Use root ou root:current:history.")
        return FamilyWorker(root=root, table_current=default_current, table_history=default_history)

    parts = [str(p).strip() for p in text.split(":")]
    if len(parts) < 1:
        return None

    try:
        root = int(parts[0])
    except Exception:
        raise ValueError(f"Familia invalida no worker: '{parts[0]}'.")

    if len(parts) == 2:
        raise ValueError(f"Formato de worker incompleto: '{raw}'. Use root:current:history.")

    table_current = parts[1] or default_current
    table_history = parts[2] if len(parts) > 2 and parts[2] else default_history
    return FamilyWorker(root=root, table_current=table_current, table_history=table_history)


def _parse_workers(raw_list: list[str] | None, base_arg: str | None, default_current: str, default_history: str) -> list[FamilyWorker]:
    workers: list[FamilyWorker] = []
    merged: list[str] = []

    if raw_list:
        for raw in raw_list:
            if not raw:
                continue
            merged.extend([p.strip() for p in str(raw).split(",") if p.strip()])

    if base_arg:
        merged.extend([p.strip() for p in str(base_arg).split(",") if p.strip()])

    for item in merged:
        worker = _parse_worker_spec(item, default_current, default_history)
        if worker is not None:
            workers.append(worker)
    return workers


def _mode_label(is_live: bool) -> str:
    return "LIVE" if is_live else "PREMATCH"


def _to_int_or_none(value):
    try:
        if value is None:
            return None
        return int(str(value).strip())
    except Exception:
        return None


def _family_hints(family_root: int) -> tuple[str, ...]:
    if family_root == 10:
        return ("bet365",)
    if family_root == 447:
        return ("bet7k", "7k.bet", "7kbet")
    return ()


def _side_matches_family(row: dict, side_prefix: str, family_root: int) -> bool:
    side_root = _to_int_or_none(row.get(f"{side_prefix}_family_root"))
    # Modo estrito: considera apenas o family_root resolvido no normalize_payload.
    # Evita entrada indevida por matching textual em bookmaker/casa_mae.
    return side_root == family_root


def _swap_bets(row: dict) -> dict:
    swapped = dict(row)
    suffixes = (
        "bookmaker_id",
        "bookmaker",
        "family_root",
        "casa_mae_id",
        "casa_mae",
        "odd",
        "entry_type",
        "bet_id",
        "link",
        "oddsrabbit_url",
    )
    for suffix in suffixes:
        swapped[f"bet1_{suffix}"] = row.get(f"bet2_{suffix}")
        swapped[f"bet2_{suffix}"] = row.get(f"bet1_{suffix}")

    payload = row.get("payload")
    if isinstance(payload, dict):
        payload_swapped = dict(payload)
        payload_swapped["bet1"], payload_swapped["bet2"] = payload.get("bet2"), payload.get("bet1")
        swapped["payload"] = payload_swapped
    return swapped


def _build_family_row_key(row: dict, family_root: int) -> str:
    arb_hash = str(row.get("arb_hash") or "").strip()
    bet_ids = sorted(
        [
            str(row.get("bet1_bet_id") or "").strip(),
            str(row.get("bet2_bet_id") or "").strip(),
        ]
    )
    base = f"family:{family_root}|{arb_hash}|{bet_ids[0]}|{bet_ids[1]}|{1 if row.get('is_live') else 0}"
    return hashlib.md5(base.encode("utf-8")).hexdigest()


def filter_rows_by_family(rows: list[dict], family_root: int, target_side_only: bool) -> list[dict]:
    out = []
    for row in rows:
        left_match = _side_matches_family(row, "bet1", family_root)
        right_match = _side_matches_family(row, "bet2", family_root)
        if not left_match and not right_match:
            continue

        selected = row
        if target_side_only and right_match and not left_match:
            selected = _swap_bets(row)

        selected = dict(selected)
        selected["row_key"] = _build_family_row_key(selected, family_root)
        out.append(selected)
    return out


def _parse_int_set(raw: str) -> set[int]:
    out: set[int] = set()
    for part in str(raw or "").split(","):
        value = _to_int_or_none(part)
        if value is not None:
            out.add(value)
    return out


def _float_env(name: str):
    raw = str(os.getenv(name, "") or "").strip()
    if not raw:
        return None
    try:
        return float(raw)
    except Exception:
        return None


def _row_percent(row: dict) -> float | None:
    try:
        value = row.get("percentage")
        if value is None or value == "":
            return None
        return float(value)
    except Exception:
        return None


def apply_runtime_filters(rows: list[dict]) -> list[dict]:
    allowed_roots = _parse_int_set(os.getenv("BETBURGER_ALLOWED_ROOTS", ""))
    min_live = _float_env("BETBURGER_MIN_PERCENT_LIVE")
    min_pre = _float_env("BETBURGER_MIN_PERCENT_PREMATCH")
    max_live = _float_env("BETBURGER_MAX_PERCENT_LIVE")
    max_pre = _float_env("BETBURGER_MAX_PERCENT_PREMATCH")
    if not allowed_roots and min_live is None and min_pre is None and max_live is None and max_pre is None:
        return rows

    out = []
    drop_roots = 0
    drop_percent = 0
    for row in rows:
        roots = {
            r for r in (
                _to_int_or_none(row.get("bet1_family_root")),
                _to_int_or_none(row.get("bet2_family_root")),
            )
            if r is not None
        }
        if allowed_roots and not (roots & allowed_roots):
            drop_roots += 1
            continue

        percent = _row_percent(row)
        is_live = bool(row.get("is_live"))
        min_percent = min_live if is_live else min_pre
        max_percent = max_live if is_live else max_pre
        if percent is not None:
            if min_percent is not None and percent < min_percent:
                drop_percent += 1
                continue
            if max_percent is not None and percent > max_percent:
                drop_percent += 1
                continue

        out.append(row)

    print(
        f"local_filter in={len(rows)} out={len(out)} "
        f"allowed_roots={len(allowed_roots)} drop_roots={drop_roots} drop_percent={drop_percent}"
    )
    return out


def _sync_payload_link(row: dict, side_prefix: str, final_link: str):
    payload = row.get("payload")
    if not isinstance(payload, dict):
        return
    bet_obj = payload.get(side_prefix)
    if not isinstance(bet_obj, dict):
        return
    for key in ("direct_link", "directLink", "url", "link", "eventUrl", "event_url"):
        bet_obj[key] = final_link


def _payload_value(row: dict, side_prefix: str, key: str) -> str:
    payload = row.get("payload")
    if not isinstance(payload, dict):
        return ""
    bet_obj = payload.get(side_prefix)
    if not isinstance(bet_obj, dict):
        return ""
    return str(bet_obj.get(key) or "").strip()


def _fallback_home_link(row: dict, side_prefix: str) -> str:
    for key in ("bookmakerHomeUrl", "bookmakerUrl", "bookmaker_home_url", "bookmaker_url"):
        value = _payload_value(row, side_prefix, key)
        if value:
            return value
    return ""


def resolve_links_for_rows(rows: list[dict], resolver: OddsRabbitResolver):
    if not rows:
        return {"resolved_from_oddsrabbit": 0, "normalized_existing": 0, "still_empty": 0}

    resolved_from_oddsrabbit = 0
    normalized_existing = 0
    still_empty = 0

    for row in rows:
        for side_prefix in ("bet1", "bet2"):
            link_key = f"{side_prefix}_link"
            bookmaker_id_key = f"{side_prefix}_bookmaker_id"
            oddsrabbit_key = f"{side_prefix}_oddsrabbit_url"

            current_link = str(row.get(link_key) or "").strip()
            bookmaker_id = row.get(bookmaker_id_key)

            if current_link:
                normalized = normalize_catalog_url(bookmaker_id, current_link)
                if normalized != current_link:
                    row[link_key] = normalized
                normalized_existing += 1
                _sync_payload_link(row, side_prefix, str(row.get(link_key) or "").strip())
                continue

            oddsrabbit_url = str(row.get(oddsrabbit_key) or "").strip()
            if oddsrabbit_url:
                resolved = resolver.resolve_oddsrabbit(oddsrabbit_url)
                resolved_url = str(resolved.get("resolved_url") or "").strip()
                direct_link = str(resolved.get("direct_link") or "").strip()
                final_url = str(resolved.get("final_url") or "").strip()

                candidate = ""
                if is_viable_final_url(resolved_url):
                    candidate = resolved_url
                elif is_viable_final_url(direct_link):
                    candidate = direct_link
                elif is_viable_final_url(final_url):
                    candidate = final_url

                if candidate:
                    final_link = normalize_catalog_url(bookmaker_id, candidate)
                    if final_link:
                        row[link_key] = final_link
                        _sync_payload_link(row, side_prefix, final_link)
                        resolved_from_oddsrabbit += 1
                        continue

            # Sem fallback para home: link fica vazio quando nao resolvido.
            # A validacao downstream descarta linhas sem URL de evento.
            still_empty += 1

    return {
        "resolved_from_oddsrabbit": resolved_from_oddsrabbit,
        "normalized_existing": normalized_existing,
        "still_empty": still_empty,
    }


def fetch_mode_rows(settings, ref, is_live: bool, filter_id: str):
    all_rows = []
    for page in range(1, settings.max_pages + 1):
        try:
            payload = fetch_arbs_page(
                token=settings.token,
                locale=settings.locale,
                filter_id=filter_id,
                page=page,
                per_page=settings.per_page,
                is_live=is_live,
                timeout_sec=settings.timeout_sec,
                retries=settings.retries,
                retry_backoff_sec=settings.retry_backoff_sec,
            )
        except ApiError as exc:
            print(f"[{_mode_label(is_live)}] page={page} erro={exc}")
            break

        arbs = payload.get("arbs") or []
        bets = payload.get("bets") or []
        print(f"[{_mode_label(is_live)}] page={page} arbs={len(arbs)} bets={len(bets)}")
        if not arbs:
            break
        rows = normalize_payload(
            payload=payload,
            is_live=is_live,
            token=settings.token,
            locale=settings.locale,
            ref=ref,
        )
        all_rows.extend(rows)
    return all_rows


def print_summary(rows: list[dict]):
    print(f"total_rows={len(rows)}")
    if not rows:
        return
    live_count = sum(1 for row in rows if row.get("is_live"))
    pre_count = len(rows) - live_count
    print(f"live_rows={live_count}")
    print(f"prematch_rows={pre_count}")

    counter = Counter()
    for row in rows:
        for key in ("bet1_casa_mae", "bet2_casa_mae"):
            name = str(row.get(key) or "").strip()
            if name:
                counter[name] += 1
    top = counter.most_common(10)
    if top:
        print("top_casas_mae:")
        for name, qty in top:
            print(f"  - {name}: {qty}")


def run_cycle(
    settings,
    ref,
    stores: dict[tuple[str, str], PostgresStore | None],
    family_workers: list[FamilyWorker] | None,
    target_side_only: bool,
    link_resolver: OddsRabbitResolver | None,
):
    print(f"\n[ciclo] {_now_iso()}")
    rows = []
    if settings.fetch_live:
        rows.extend(fetch_mode_rows(settings, ref, True, settings.search_filter_live))
    if settings.fetch_prematch:
        rows.extend(fetch_mode_rows(settings, ref, False, settings.search_filter_prematch))
    rows = apply_runtime_filters(rows)

    workers = family_workers or []
    if not workers:
        workers = [FamilyWorker(root=-1, table_current=settings.pg_table_current, table_history=settings.pg_table_history)]

    for worker in workers:
        worker_rows = rows if worker.root < 0 else filter_rows_by_family(rows, worker.root, target_side_only)
        if worker.root >= 0:
            print(
                f"family_root={worker.root} "
                f"target_side_only={1 if target_side_only else 0} "
                f"rows_filtered={len(worker_rows)} "
                f"table_current={worker.table_current}"
            )

        if link_resolver is not None and worker_rows:
            link_stats = resolve_links_for_rows(worker_rows, link_resolver)
            print(
                f"worker_root={worker.root} "
                f"link_resolver resolved_from_oddsrabbit={link_stats['resolved_from_oddsrabbit']} "
                f"normalized_existing={link_stats['normalized_existing']} "
                f"still_empty={link_stats['still_empty']}"
            )

        print_summary(worker_rows)

        store = stores.get((worker.table_current, worker.table_history))
        if store is not None:
            # Snapshot semantics: even with 0 rows, refresh current table (clear).
            store.upsert_current(worker_rows)
            if worker_rows:
                store.insert_history(worker_rows)
                print(f"worker_root={worker.root} postgres_upsert_ok={len(worker_rows)}")
            else:
                print(f"worker_root={worker.root} postgres_upsert_ok=0 (sem rows, current_limpa=1)")


def main():
    parser = argparse.ArgumentParser(description="Pipeline local geral (BetBurger -> casa_mae -> Postgres).")
    parser.add_argument("--cycles", type=int, default=0, help="0=infinito")
    parser.add_argument("--interval", type=float, default=None, help="sobrescreve INTERVAL_SEC")
    parser.add_argument("--token", default="", help="sobrescreve BETBURGER_ACCESS_TOKEN")
    parser.add_argument("--family-root", type=int, default=None, help="Filtra por familia (ex: 447 Bet7k, 10 Bet365).")
    parser.add_argument(
        "--workers",
        action="append",
        help=(
            "Modo distribuido. Formato: root:table_current:table_history . "
            "Ex: 447:localgeralvps_bet7k_current:localgeralvps_bet7k_history"
        ),
    )
    parser.add_argument("--target-side-only", action="store_true", help="Mantem a familia alvo no lado bet1 (swap automatico).")
    parser.add_argument("--no-link-resolve", action="store_true", help="Nao resolve link via oddsrabbit (debug).")
    args = parser.parse_args()

    settings = load_settings()
    if str(args.token or "").strip():
        settings.token = str(args.token).strip()
    if args.interval is not None and args.interval >= 0:
        settings.interval_sec = float(args.interval)

    ref = load_reference_data(settings.reference_file)
    print("========================================")
    print("LOCALGERALVPS")
    print(f"inicio={_now_iso()}")
    print(f"reference_file={settings.reference_file}")
    print(f"bookmakers_map={len(ref.bookmakers_map)} sports_map={len(ref.sports_map)}")
    print(f"fetch_live={1 if settings.fetch_live else 0} fetch_prematch={1 if settings.fetch_prematch else 0}")
    print(f"interval={settings.interval_sec} timeout={settings.timeout_sec}")
    workers = _parse_workers(
        raw_list=args.workers,
        base_arg=None,
        default_current=settings.pg_table_current,
        default_history=settings.pg_table_history,
    )
    if not workers:
        workers = []
    if args.family_root is not None:
        workers = [
            FamilyWorker(
                root=args.family_root,
                table_current=settings.pg_table_current,
                table_history=settings.pg_table_history,
            )
        ]
        print(f"individual_bot=1 family_root={args.family_root} target_side_only={1 if args.target_side_only else 0}")
    elif workers:
        print(f"workers_distribuidor={len(workers)} tables={[w.table_current for w in workers]}")
    else:
        print("workers_distribuidor=0 (fallback para tabela unica)")

    if not workers:
        workers = [FamilyWorker(root=-1, table_current=settings.pg_table_current, table_history=settings.pg_table_history)]
    print(f"link_resolve={0 if (args.no_link_resolve or not settings.link_resolve_enabled) else 1}")
    print("========================================")

    stores: dict[tuple[str, str], PostgresStore | None] = {}
    if settings.pg_enabled:
        for worker in workers:
            key = (worker.table_current, worker.table_history)
            if key in stores:
                continue
            cfg = PgConfig(
                host=settings.pg_host,
                port=settings.pg_port,
                db=settings.pg_db,
                user=settings.pg_user,
                password=settings.pg_password,
                sslmode=settings.pg_sslmode,
                table_current=worker.table_current,
                table_history=worker.table_history,
                write_history=settings.pg_write_history,
            )
            store = PostgresStore(cfg)
            store.ensure_schema()
            stores[key] = store
        print(
            f"postgres=on host={settings.pg_host}:{settings.pg_port} db={settings.pg_db} "
            f"write_history={1 if settings.pg_write_history else 0} workers={len(stores)}"
        )
    else:
        for worker in workers:
            key = (worker.table_current, worker.table_history)
            stores.setdefault(key, None)
        print("postgres=off")

    link_resolver = None
    if settings.link_resolve_enabled and not args.no_link_resolve:
        link_resolver = OddsRabbitResolver(
            timeout_sec=settings.link_resolve_timeout_sec,
            retries=settings.link_resolve_retries,
            retry_backoff_sec=settings.link_resolve_retry_backoff_sec,
        )

    cycle = 0
    try:
        while True:
            cycle += 1
            run_cycle(settings, ref, stores, workers, args.target_side_only, link_resolver)
            if args.cycles > 0 and cycle >= args.cycles:
                break
            if settings.interval_sec > 0:
                time.sleep(settings.interval_sec)
    except KeyboardInterrupt:
        print("interrompido=1")
    finally:
        for st in stores.values():
            if st is not None:
                st.close()


if __name__ == "__main__":
    main()
