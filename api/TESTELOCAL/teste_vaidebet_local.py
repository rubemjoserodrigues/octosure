#!/usr/bin/env python3
import argparse
import os
import sys
from urllib.parse import parse_qs, quote, urlsplit


CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from catalogar_casa_local import (  # noqa: E402
    build_clone_urls,
    extract_event_id_from_url,
    fetch_live_page,
    find_first_by_bookmaker,
    is_tracking_intermediate,
    is_viable_final_url,
    normalize_catalog_url,
    resolve_oddsrabbit,
    resolve_oddsrabbit_playwright,
)


def main():
    parser = argparse.ArgumentParser(
        description="Teste local Vaidebet: mostra esporte + liga + nome_evento + url_mae + clones_urls."
    )
    parser.add_argument("--token", default=os.getenv("BETBURGER_ACCESS_TOKEN", "").strip())
    parser.add_argument("--filter-id", default="2028569")
    parser.add_argument("--locale", default="en")
    parser.add_argument("--per-page", type=int, default=80)
    parser.add_argument("--max-pages", type=int, default=20)
    parser.add_argument("--timeout", type=float, default=25.0)
    parser.add_argument(
        "--resolver",
        choices=("auto", "urllib", "playwright"),
        default="auto",
    )
    args = parser.parse_args()

    if not args.token:
        print("erro=token_obrigatorio")
        print("use: --token SEU_TOKEN")
        return

    bookmaker_id = 488
    found = None
    for page in range(args.max_pages):
        payload = fetch_live_page(
            token=args.token,
            filter_id=args.filter_id,
            page=page,
            per_page=args.per_page,
            locale=args.locale,
            timeout_sec=args.timeout,
        )
        if not isinstance(payload, dict):
            continue

        found = find_first_by_bookmaker(payload, bookmaker_id)
        if found:
            print(f"[ok] evento Vaidebet encontrado na pagina {page}")
            break

        arbs_count = len(payload.get("arbs") or [])
        print(f"[info] pagina={page} sem Vaidebet (arbs={arbs_count})")
        if arbs_count == 0:
            break

    if not found:
        print("nao_encontrado=1")
        return

    oddsrabbit_url = (
        "https://lv.oddsrabbit.org/bets/"
        f"{quote(found['bet_id'])}"
        f"?locale={args.locale}&access_token={quote(args.token)}&domain=&arb_hash={quote(found['arb_hash'])}&is_live=1"
    )

    def _is_vaidebet_event_url(url_text: str, fallback_event_id: str) -> bool:
        txt = str(url_text or "").strip()
        if not txt:
            return False

        try:
            parsed = urlsplit(txt)
        except Exception:
            return False

        host = (parsed.hostname or "").lower().strip()
        if host.startswith("www."):
            host = host[4:]
        if host != "vaidebet.bet.br":
            return False

        if fallback_event_id and str(fallback_event_id).strip() in txt:
            return True

        path = str(parsed.path or "").strip().lower()
        if "/event/" in path or "/ao-vivo/" in path or "/live/" in path:
            return True

        try:
            qs = parse_qs(parsed.query or "", keep_blank_values=True)
        except Exception:
            qs = {}

        for key in ("event", "eventid", "match", "game"):
            for raw in (qs.get(key) or []):
                value = str(raw or "").strip()
                if value.isdigit() and len(value) >= 5:
                    return True

        return False

    resolver_used = "urllib"
    resolved = resolve_oddsrabbit(oddsrabbit_url, timeout_sec=args.timeout)

    need_browser = True
    urllib_final = resolved.get("resolved_url") or resolved.get("direct_link") or resolved.get("final_url") or ""
    if is_viable_final_url(urllib_final) and (not is_tracking_intermediate(urllib_final)):
        need_browser = not _is_vaidebet_event_url(urllib_final, found.get("bookmaker_event_id", ""))

    if args.resolver == "playwright" or (args.resolver == "auto" and need_browser):
        resolved_pw = resolve_oddsrabbit_playwright(oddsrabbit_url, timeout_sec=args.timeout)
        pw_final = resolved_pw.get("resolved_url") or resolved_pw.get("final_url") or ""
        if is_viable_final_url(pw_final):
            resolved = resolved_pw
            resolver_used = "playwright"
        elif args.resolver == "playwright":
            resolved = resolved_pw
            resolver_used = "playwright"

    final_url = resolved.get("resolved_url") or resolved.get("direct_link") or resolved.get("final_url") or ""
    url_mae = normalize_catalog_url(found.get("bookmaker_id"), final_url)
    event_id = extract_event_id_from_url(
        final_url,
        fallback_bookmaker_event_id=found.get("bookmaker_event_id", ""),
    )
    clone_urls = build_clone_urls(found.get("bookmaker_id"), event_id, source_url=final_url)

    print("========================================")
    print("casa_mae=Vaidebet")
    print(f"esporte={found.get('sport')}")
    print(f"liga={found.get('league')}")
    print(f"nome_evento={found.get('event_name')}")
    print(f"resolver_usado={resolver_used}")
    print(f"oddsrabbit_url={oddsrabbit_url}")
    print(f"oddsrabbit_final={resolved.get('final_url') or ''}")
    print(f"direct_link={resolved.get('direct_link') or ''}")
    print(f"url_resolvida={resolved.get('resolved_url') or ''}")
    print(f"url_mae={url_mae}")
    print("clones_urls:")
    if clone_urls:
        for url in clone_urls:
            print(url)
    else:
        print("(sem_clones_mapeados)")
    print("========================================")


if __name__ == "__main__":
    main()
