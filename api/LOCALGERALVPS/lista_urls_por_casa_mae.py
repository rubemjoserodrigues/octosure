#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
from urllib.parse import parse_qs, quote, urlsplit, urlunsplit

import psycopg2


def normalize_host(url_text: str) -> str:
    try:
        host = (urlsplit(str(url_text or "")).hostname or "").lower().strip()
    except Exception:
        host = ""
    if host.startswith("www."):
        host = host[4:]
    return host


def is_tracking_link(url_text: str) -> bool:
    host = normalize_host(url_text)
    txt = str(url_text or "").lower()
    if not host:
        return True
    if "oddsrabbit.org" in host or "betburger.com" in host:
        return True
    if host in ("w3.org", "www.w3.org"):
        return True
    if ("ttid=" in txt and "a=" in txt) or "#pe/" in txt:
        return True
    return False


def score_link(url_text: str) -> int:
    txt = str(url_text or "").strip()
    if not txt:
        return -100
    score = 0
    if txt.startswith("http://") or txt.startswith("https://"):
        score += 10
    if not is_tracking_link(txt):
        score += 30
    if re.search(r"/IP/EV[0-9A-Z]+/?$", txt, flags=re.I):
        score += 40
    if "bet365.bet.br" in txt.lower():
        score += 10
    return score


def extract_event_id(url_text: str) -> str:
    txt = str(url_text or "").strip()
    if not txt:
        return ""
    try:
        parsed = urlsplit(txt)
    except Exception:
        parsed = None

    if parsed is not None:
        try:
            qs = parse_qs(parsed.query or "", keep_blank_values=True)
        except Exception:
            qs = {}
        for key in ("eventId", "eventid", "event_id", "event", "matchid", "match_id"):
            for raw in (qs.get(key) or []):
                digits = re.sub(r"[^0-9]", "", str(raw))
                if digits:
                    return digits

    for pattern in (
        r"/e-([0-9]{6,})",
        r"/live-betting/([0-9]{6,})",
        r"/liveEvent/([0-9]{4,})",
        r"-([0-9]{6,})(?:[/?#]|$)",
        r"/([0-9]{6,})(?:[/?#]|$)",
    ):
        m = re.search(pattern, txt, flags=re.I)
        if m:
            return m.group(1)
    return ""


def extract_bet365_ev(url_text: str) -> str:
    txt = str(url_text or "")
    m = re.search(r"(?:^|[#?/])/?IP/EV([0-9A-Z]+)(?:/|#|$)", txt, flags=re.I)
    if m:
        return f"/IP/EV{m.group(1)}"
    return ""


def extract_goldenpalace_fragment_path(url_text: str) -> str:
    txt = str(url_text or "").strip()
    if not txt:
        return ""
    try:
        parsed = urlsplit(txt)
        fragment = str(parsed.fragment or "").strip()
    except Exception:
        fragment = ""
    if not fragment:
        return ""
    frag = "/" + fragment.lstrip("/")
    match = re.search(
        r"(/sport/[0-9]+/category/[0-9]+/championship/[0-9]+/liveEvent/[0-9]+)",
        frag,
        flags=re.I,
    )
    if match:
        return match.group(1)
    return ""


def extract_goldenpalace_sport_id(url_text: str) -> str:
    txt = str(url_text or "").strip()
    if not txt:
        return ""
    try:
        parsed = urlsplit(txt)
    except Exception:
        parsed = None

    if parsed is not None:
        try:
            qs = parse_qs(parsed.query or "", keep_blank_values=True)
        except Exception:
            qs = {}
        for key in ("sportId", "sportid", "sport_id"):
            for raw in (qs.get(key) or []):
                sid = re.sub(r"[^0-9]", "", str(raw))
                if sid:
                    return sid

    frag_path = extract_goldenpalace_fragment_path(txt)
    if frag_path:
        m = re.search(r"/sport/([0-9]+)", frag_path, flags=re.I)
        if m:
            return m.group(1)

    m = re.search(r"/sport/([0-9]+)", txt, flags=re.I)
    if m:
        return m.group(1)
    return ""


def normalize_superbet_url(url_text: str) -> str:
    txt = str(url_text or "").strip()
    if not txt:
        return ""
    try:
        parsed = urlsplit(txt)
        host = normalize_host(txt)
        path = str(parsed.path or "").strip()
    except Exception:
        return txt

    if "superbet.com" in host or "superbet.bet.br" in host:
        if path.startswith("/offer-event/"):
            slug = path[len("/offer-event/"):].strip("/")
            if slug:
                return f"https://superbet.bet.br/odds/{slug}"
        if path.startswith("/odds/"):
            slug = path[len("/odds/"):].strip("/")
            if slug:
                return f"https://superbet.bet.br/odds/{slug}"
        return "https://superbet.bet.br/"
    return txt


def bet7k_clone_urls(event_id: str) -> list[str]:
    if not event_id:
        return []
    return [
        f"https://7k.bet.br/sports/live-betting/e-{event_id}",
        f"https://esportiva.bet.br/en/sports?eventId={event_id}",
        f"https://sortenabet.bet.br/sports/live-betting/e-{event_id}",
        f"https://vera.bet.br/sports/live-betting/e-{event_id}",
        f"https://brx.bet.br/sports/live-betting/e-{event_id}",
        f"https://bateu.bet.br/en/sports?eventId={event_id}",
        f"https://bullsbet.bet.br/sports/live-betting/e-{event_id}",
        f"https://cassino.bet.br/en/sports?eventId={event_id}",
        f"https://pix.bet.br/sports/live-betting/{event_id}",
        f"https://donald.bet.br/sports/live-betting/e-{event_id}",
        f"https://rico.bet.br/sports/live-betting/e-{event_id}",
        f"https://www.betdasorte.bet.br/sports/live-betting/{event_id}",
    ]


def bet365_clone_urls(final_url: str) -> list[str]:
    ev = extract_bet365_ev(final_url)
    if ev:
        return [
            f"https://www.bet365.bet.br/?bet=1#{ev}/",
            f"https://www.bet365.com/?bet=1#{ev}/",
        ]
    host = normalize_host(final_url)
    if "bet365.com" in host or "bet365.bet.br" in host:
        return ["https://www.bet365.bet.br/?bet=1#/"]
    return []


def superbet_clone_urls(final_url: str) -> list[str]:
    canon = normalize_superbet_url(final_url)
    return [canon] if canon else []


def goldenpalace_clone_urls(final_url: str) -> list[str]:
    eid = extract_event_id(final_url)
    if not eid:
        return []
    sport_id = extract_goldenpalace_sport_id(final_url)
    if sport_id:
        pagol_url = f"https://pagol.bet.br/br/aposta-esportiva/liveEvent?eventId={eid}&sportId={sport_id}"
    else:
        pagol_url = "https://pagol.bet.br/"
    return [
        "https://betfusion.bet.br/sports/",
        pagol_url,
        f"https://jogodeouro.bet.br/pt/sports?page=liveEvent&eventId={eid}",
        f"https://br4.bet.br/sports/le-{eid}",
        f"https://lotogreen.bet.br/sports/le-{eid}",
        "https://mcgames.bet.br/sports",
        f"https://www.estrelabet.bet.br/aposta-esportiva?eventId={eid}",
    ]


def vbet_clone_urls(final_url: str) -> list[str]:
    return [
        "https://vbet.bet.br/",
        "http://www.vbet.com/",
        "https://betao.bet.br/",
        "https://www.7games.bet/",
        "https://r7.bet.br/",
        "https://www.maxima.bet.br/",
        "https://www.playpix.com/",
        "https://suprema.bet.br/",
    ]


def build_bwin_br_clone_url(source_url: str, target_host: str) -> str:
    txt = str(source_url or "").strip()
    if not txt:
        return f"https://{target_host}/pt-br/sports"
    try:
        parsed = urlsplit(txt)
    except Exception:
        return f"https://{target_host}/pt-br/sports"

    path = str(parsed.path or "/")
    if path.startswith("/en/"):
        path = "/pt-br/" + path[len("/en/"):]
    elif not path.startswith("/pt-br/"):
        path = "/pt-br" + (path if path.startswith("/") else "/" + path)
    return urlunsplit(("https", target_host, path, parsed.query, parsed.fragment))


def build_same_path_clone_url(source_url: str, target_host: str) -> str:
    txt = str(source_url or "").strip()
    if not txt:
        return f"https://{target_host}/"
    try:
        parsed = urlsplit(txt)
    except Exception:
        return f"https://{target_host}/"
    path = str(parsed.path or "/")
    return urlunsplit(("https", target_host, path, parsed.query, parsed.fragment))


def unibet_clone_urls(final_url: str) -> list[str]:
    eid = extract_event_id(final_url)
    if not eid:
        return [
            "https://apostas.betwarrior.bet.br/pt-br/sports",
            "https://www.kto.bet.br/esportes",
            "https://stake.bet.br/esportes",
        ]
    return [
        f"https://apostas.betwarrior.bet.br/pt-br/sports/event/live/{eid}",
        "https://www.kto.bet.br/esportes",
        f"https://stake.bet.br/esportes/{eid}",
    ]


def normalize_betfair_url(url_text: str) -> str:
    txt = str(url_text or "").strip()
    if not txt:
        return "https://www.betfair.bet.br/"
    try:
        parsed = urlsplit(txt)
    except Exception:
        return "https://www.betfair.bet.br/"
    path = str(parsed.path or "/")
    return urlunsplit(("https", "www.betfair.bet.br", path, parsed.query, parsed.fragment))


def betfair_clone_urls(final_url: str) -> list[str]:
    return [normalize_betfair_url(final_url)]


def normalize_betsson_url(url_text: str) -> str:
    txt = str(url_text or "").strip()
    if not txt:
        return "https://www.betsson.bet.br/apostas-esportivas"
    try:
        parsed = urlsplit(txt)
        qs = parse_qs(parsed.query or "", keep_blank_values=True)
    except Exception:
        return "https://www.betsson.bet.br/apostas-esportivas"

    event_id = ""
    for key, values in qs.items():
        if str(key or "").strip().lower() in ("eventid", "event_id"):
            for raw in values or []:
                value = str(raw or "").strip()
                if value:
                    event_id = value
                    break
        if event_id:
            break
    if event_id:
        encoded = quote(event_id, safe="-._~")
        return f"https://www.betsson.bet.br/apostas-esportivas?eventId={encoded}&eti=0"
    return "https://www.betsson.bet.br/apostas-esportivas"


def betsson_clone_urls(final_url: str) -> list[str]:
    return [normalize_betsson_url(final_url)]


def normalize_novibet_url(url_text: str) -> str:
    event_id = extract_event_id(url_text)
    if event_id:
        return f"https://www.novibet.bet.br/apostas-ao-vivo/{event_id}"
    return "https://www.novibet.bet.br/apostas-ao-vivo"


def novibet_clone_urls(final_url: str) -> list[str]:
    return [normalize_novibet_url(final_url)]


def normalize_pinnacle_url(url_text: str) -> str:
    txt = str(url_text or "").strip()
    if not txt:
        return "https://pinnacle.bet.br/"
    try:
        parsed = urlsplit(txt)
    except Exception:
        return "https://pinnacle.bet.br/"

    path = str(parsed.path or "").strip()
    if not path:
        return "https://pinnacle.bet.br/"

    path_lower = path.lower()
    marker = "/standard/"
    marker_pos = path_lower.find(marker)
    if marker_pos >= 0:
        tail = path[marker_pos + len(marker):].lstrip("/")
        if tail:
            return f"https://pinnacle.bet.br/sportsbook/standard/{tail.rstrip('/')}/#all"

    path_no_locale = re.sub(r"^/(en|pt-br|pt|es|fr|de)(?=/|$)", "", path, flags=re.I)
    path_no_locale = "/" + path_no_locale.lstrip("/")
    if path_no_locale in ("", "/"):
        return "https://pinnacle.bet.br/"

    if path_no_locale.lower().startswith("/sportsbook/standard/"):
        target_path = path_no_locale
    elif path_no_locale.lower().startswith("/standard/"):
        target_path = "/sportsbook" + path_no_locale
    else:
        target_path = "/sportsbook/standard" + path_no_locale

    target_path = re.sub(r"/{2,}", "/", target_path)
    return f"https://pinnacle.bet.br{target_path.rstrip('/')}/#all"


def pinnacle_clone_urls(final_url: str) -> list[str]:
    return [normalize_pinnacle_url(final_url)]


def normalize_expektdk_url(url_text: str) -> str:
    return "https://www.betmgm.bet.br/"


def expektdk_clone_urls(final_url: str) -> list[str]:
    return [normalize_expektdk_url(final_url)]


def bwin_clone_urls(final_url: str) -> list[str]:
    return [
        build_bwin_br_clone_url(final_url, "sports.sportingbet.bet.br"),
        build_bwin_br_clone_url(final_url, "betboo.bet.br"),
    ]


def luvabet_clone_urls(final_url: str) -> list[str]:
    return [
        build_same_path_clone_url(final_url, "luva.bet.br"),
        build_same_path_clone_url(final_url, "1pra1.bet.br"),
        build_same_path_clone_url(final_url, "esporte365.bet.br"),
        build_same_path_clone_url(final_url, "ona.bet.br"),
        build_same_path_clone_url(final_url, "start.bet.br"),
    ]


def extract_bt_path(source_url: str) -> str:
    txt = str(source_url or "").strip()
    if not txt:
        return ""
    try:
        parsed = urlsplit(txt)
        qs = parse_qs(parsed.query or "", keep_blank_values=True)
    except Exception:
        return ""

    for key in ("bt-path", "bt_path", "btpath"):
        values = qs.get(key) or []
        for raw in values:
            value = str(raw or "").strip()
            if value:
                if not value.startswith("/"):
                    value = "/" + value
                return value
    return ""


def normalize_fortunejack_url(url_text: str) -> str:
    txt = str(url_text or "").strip()
    if not txt:
        return "https://fortunejack.com/crypto-sportsbook"
    try:
        parsed = urlsplit(txt)
    except Exception:
        return "https://fortunejack.com/crypto-sportsbook"
    path = str(parsed.path or "/crypto-sportsbook")
    if path == "/":
        path = "/crypto-sportsbook"
    return urlunsplit(("https", "fortunejack.com", path, parsed.query, parsed.fragment))


def fortunejack_clone_urls(final_url: str, event_id: str = "") -> list[str]:
    bt_path = extract_bt_path(final_url)
    eid = re.sub(r"[^0-9]", "", str(event_id or "").strip())
    if not bt_path:
        if eid:
            return [
                "https://blaze.bet.br/pt/sports",
                "https://apostaganha.bet.br/esportes",
                f"https://betvip.bet.br/sports/live-betting/e-{eid}",
            ]
        return [
            "https://blaze.bet.br/pt/sports",
            "https://apostaganha.bet.br/esportes",
            "https://betvip.bet.br/sports",
        ]
    bt_path_encoded = quote(bt_path, safe="-._~")
    betvip_url = f"https://betvip.bet.br/sports/{bt_path.lstrip('/')}"
    if eid:
        betvip_url = f"https://betvip.bet.br/sports/live-betting/e-{eid}"
    return [
        f"https://blaze.bet.br/pt/sports?bt-path={bt_path_encoded}",
        f"https://apostaganha.bet.br/esportes?bt-path={bt_path_encoded}",
        betvip_url,
    ]


def normalize_unibet_url(url_text: str) -> str:
    txt = str(url_text or "").strip()
    if not txt:
        return "https://www.unibet.com/betting/sports"
    try:
        parsed = urlsplit(txt)
    except Exception:
        return "https://www.unibet.com/betting/sports"
    path = str(parsed.path or "/betting/sports")
    if path == "/":
        path = "/betting/sports"
    return urlunsplit(("https", "www.unibet.com", path, parsed.query, parsed.fragment))


def normalize_stoiximan_url(url_text: str) -> str:
    txt = str(url_text or "").strip()
    if not txt:
        return "https://www.stoiximan.gr/"
    try:
        parsed = urlsplit(txt)
    except Exception:
        return "https://www.stoiximan.gr/"
    path = str(parsed.path or "/")
    return urlunsplit(("https", "www.stoiximan.gr", path, parsed.query, parsed.fragment))


def stoiximan_clone_urls(final_url: str) -> list[str]:
    txt = str(final_url or "").strip()
    if not txt:
        return ["https://www.betano.bet.br/"]
    try:
        parsed = urlsplit(txt)
    except Exception:
        return ["https://www.betano.bet.br/"]
    path = str(parsed.path or "/")
    return [urlunsplit(("https", "www.betano.bet.br", path, parsed.query, parsed.fragment))]


def normalize_vaidebet_url(url_text: str) -> str:
    txt = str(url_text or "").strip()
    if not txt:
        return "https://vaidebet.bet.br/"
    try:
        parsed = urlsplit(txt)
    except Exception:
        return "https://vaidebet.bet.br/"
    path = str(parsed.path or "/")
    return urlunsplit(("https", "vaidebet.bet.br", path, parsed.query, parsed.fragment))


def vaidebet_clone_urls(final_url: str) -> list[str]:
    return [normalize_vaidebet_url(final_url)]


def normalize_betnacional_url(url_text: str) -> str:
    txt = str(url_text or "").strip()
    if not txt:
        return "https://betnacional.bet.br/"
    try:
        parsed = urlsplit(txt)
    except Exception:
        return "https://betnacional.bet.br/"
    path = str(parsed.path or "/")
    return urlunsplit(("https", "betnacional.bet.br", path, parsed.query, parsed.fragment))


def betnacional_clone_urls(final_url: str) -> list[str]:
    return [normalize_betnacional_url(final_url)]


def print_casa(casa: str, root, final_url: str, source: str, event_name: str):
    print("=" * 90)
    print(f"casa_mae={casa} root={root} origem={source}")
    print(f"nome_evento={event_name or '(vazio)'}")
    print("resolver_usado=db_snapshot")
    print(f"url_mae={final_url or '(vazio)'}")

    clones = []
    casa_lower = str(casa or "").lower()
    event_id = extract_event_id(final_url)
    if "bet7k" in casa_lower or int(root or 0) == 447:
        clones = bet7k_clone_urls(event_id)
    elif "bet365" in casa_lower or int(root or 0) == 10:
        clones = bet365_clone_urls(final_url)
    elif "superbet" in casa_lower or int(root or 0) == 329:
        clones = superbet_clone_urls(final_url)
    elif "goldenpalace" in casa_lower or int(root or 0) == 61:
        clones = goldenpalace_clone_urls(final_url)
    elif "vbet" in casa_lower or int(root or 0) == 34:
        clones = vbet_clone_urls(final_url)
    elif "bwin" in casa_lower or int(root or 0) == 9:
        clones = bwin_clone_urls(final_url)
    elif "betfair" in casa_lower or int(root or 0) == 11:
        clones = betfair_clone_urls(final_url)
    elif "betsson" in casa_lower or int(root or 0) == 48:
        clones = betsson_clone_urls(final_url)
    elif "pinnacle" in casa_lower or int(root or 0) == 1:
        clones = pinnacle_clone_urls(final_url)
    elif "expekt" in casa_lower or "betmgm" in casa_lower or int(root or 0) == 700:
        clones = expektdk_clone_urls(final_url)
    elif "novibet" in casa_lower or int(root or 0) == 83:
        clones = novibet_clone_urls(final_url)
    elif "unibet" in casa_lower or int(root or 0) == 19:
        clones = unibet_clone_urls(final_url)
    elif "stoiximan" in casa_lower or int(root or 0) == 76:
        clones = stoiximan_clone_urls(final_url)
    elif "vaidebet" in casa_lower or int(root or 0) == 488:
        clones = vaidebet_clone_urls(final_url)
    elif "luvabet" in casa_lower or int(root or 0) == 484:
        clones = luvabet_clone_urls(final_url)
    elif "fortunejack" in casa_lower or int(root or 0) == 127:
        clones = fortunejack_clone_urls(final_url, event_id)
    elif "betnacional" in casa_lower or int(root or 0) == 461:
        clones = betnacional_clone_urls(final_url)

    print("clones_urls:")
    if clones:
        for url in clones:
            print(f"- {url}")
    else:
        print("(sem_regra_clone_para_esta_casa)")


def main():
    parser = argparse.ArgumentParser(description="Lista 1 URL final por casa-mae + URLs de clones.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=5432)
    parser.add_argument("--db", default="surebet")
    parser.add_argument("--user", default="postgres")
    parser.add_argument("--password", default="postgres")
    parser.add_argument("--tables", default="localgeralvps_bet7k_current,localgeralvps_bet365_current")
    parser.add_argument("--only-casa", default="", help="Filtra por casa_mae (ex: SuperbetBR).")
    parser.add_argument(
        "--roots",
        default="",
        help="Filtra por family_root (csv), ex: 447,10,329",
    )
    args = parser.parse_args()

    tables = [x.strip() for x in str(args.tables or "").split(",") if x.strip()]
    if not tables:
        raise SystemExit("Nenhuma tabela informada.")
    root_filter = {
        int(x.strip())
        for x in str(args.roots or "").split(",")
        if str(x).strip().isdigit()
    }

    conn = psycopg2.connect(
        host=args.host,
        port=args.port,
        dbname=args.db,
        user=args.user,
        password=args.password,
    )
    cur = conn.cursor()
    try:
        best_by_casa = {}
        for table in tables:
            cur.execute(
                f"""
                SELECT bet1_casa_mae, bet1_family_root, bet1_link, event_name, '{table}:bet1' AS source
                FROM {table}
                UNION ALL
                SELECT bet2_casa_mae, bet2_family_root, bet2_link, event_name, '{table}:bet2' AS source
                FROM {table}
                """
            )
            for casa, root, link, event_name, source in cur.fetchall():
                casa = str(casa or "").strip()
                link = str(link or "").strip()
                event_name = str(event_name or "").strip()
                try:
                    root_int = int(root) if root is not None else 0
                except Exception:
                    root_int = 0
                if not casa:
                    continue
                if root_filter and root_int not in root_filter:
                    continue
                casa_lower = casa.lower()
                if "superbet" in casa_lower or root_int == 329:
                    link = normalize_superbet_url(link)
                elif "betfair" in casa_lower or root_int == 11:
                    link = normalize_betfair_url(link)
                elif "betsson" in casa_lower or root_int == 48:
                    link = normalize_betsson_url(link)
                elif "pinnacle" in casa_lower or root_int == 1:
                    link = normalize_pinnacle_url(link)
                elif "expekt" in casa_lower or "betmgm" in casa_lower or root_int == 700:
                    link = normalize_expektdk_url(link)
                elif "novibet" in casa_lower or root_int == 83:
                    link = normalize_novibet_url(link)
                elif "unibet" in casa_lower or root_int == 19:
                    link = normalize_unibet_url(link)
                elif "stoiximan" in casa_lower or root_int == 76:
                    link = normalize_stoiximan_url(link)
                elif "vaidebet" in casa_lower or root_int == 488:
                    link = normalize_vaidebet_url(link)
                sc = score_link(link)
                prev = best_by_casa.get(casa)
                if prev is None or sc > prev["score"]:
                    best_by_casa[casa] = {
                        "casa": casa,
                        "root": root,
                        "final_url": link,
                        "event_name": event_name,
                        "source": source,
                        "score": sc,
                    }

        only_casa = str(args.only_casa or "").strip().lower()
        casas = sorted(best_by_casa.keys(), key=lambda x: x.lower())
        if only_casa:
            casas = [c for c in casas if c.lower() == only_casa]

        for casa in casas:
            item = best_by_casa[casa]
            try:
                print_casa(item["casa"], item["root"], item["final_url"], item["source"], item.get("event_name", ""))
            except Exception as exc:
                print("=" * 90)
                print(f"casa_mae={item.get('casa')} root={item.get('root')} origem={item.get('source')}")
                print(f"erro={type(exc).__name__}: {exc}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
