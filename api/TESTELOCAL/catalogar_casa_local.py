import argparse
import json
import os
import re
import time
import unicodedata
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from html import unescape
from urllib.error import HTTPError
from urllib.parse import parse_qs, quote, unquote, urlencode, urljoin, urlsplit, urlunsplit
from urllib.request import Request, urlopen


def normalize_host(url_text):
    try:
        host = (urlsplit(str(url_text or "")).hostname or "").lower().strip()
    except Exception:
        host = ""
    if host.startswith("www."):
        host = host[4:]
    return host


def is_ipv4_host(host):
    return bool(re.match(r"^\d{1,3}(?:\.\d{1,3}){3}$", str(host or "")))


BET7K_FAMILY_IDS = {
    447, 1280, 1305, 1307, 1308, 1311, 1312, 1313, 1314, 1315, 1316,
    1318, 1319, 1335, 1418, 1420, 1421, 1423, 1424, 1502, 1532, 1734, 1735,
}


def is_tracking_intermediate(url_text):
    txt = str(url_text or "").strip().lower()
    host = normalize_host(txt)
    if not txt or not host:
        return False
    if is_ipv4_host(host):
        return True
    if ("ttid=" in txt and "a=" in txt) or "#pe/" in txt:
        return True
    return False


def is_viable_final_url(url_text):
    txt = str(url_text or "").strip()
    if not re.match(r"^https?://", txt, flags=re.I):
        return False
    host = normalize_host(txt)
    if not host:
        return False
    if is_ipv4_host(host):
        return False
    if host in ("w3.org", "www.w3.org"):
        return False
    try:
        path_lower = (urlsplit(txt).path or "").lower()
    except Exception:
        path_lower = ""
    if path_lower.endswith((".dtd", ".css", ".js", ".json", ".xml", ".svg")):
        return False
    if "oddsrabbit.org" in host or "betburger.com" in host:
        return False
    return True


def to_int(value):
    try:
        return int(str(value).strip())
    except Exception:
        return None


# Fallback para quando a API nao envia sport_name, apenas sport_id.
SPORT_ID_FALLBACK_MAP = {
    1: "Baseball",
    2: "Basketball",
    4: "Futsal",
    5: "Handball",
    6: "Ice Hockey",
    7: "Soccer",
    8: "Tennis",
    9: "Volleyball",
    10: "American Football",
    11: "Snooker",
    12: "Darts",
    13: "Table Tennis",
    14: "Water Polo",
    15: "Martial Arts",
    16: "Field Hockey",
    17: "Other E-Sports",
    18: "Chess",
    19: "Cricket",
    20: "Formula 1",
    21: "Motorsport",
    22: "Cycling",
    23: "Beach Volleyball",
    24: "Horse Racing",
    25: "Biathlon",
    29: "Beach Soccer",
    47: "E-Sports",
    48: "E-Basketball",
}

VBET_FEED_BASE = (
    "https://stats-widget-api.feedconstruct.com/api/pb/900/"
    "93f428d0-6591-48da-859d-b6c326db2448"
)

# Mapeamento aproximado BetBurger sport_id -> sportId da API de calendario da VBET statify.
BETBURGER_TO_VBET_FEED_SPORT_ID = {
    1: 11,   # Baseball
    2: 3,    # Basketball
    4: 26,   # Futsal
    5: 29,   # Handball
    6: 2,    # Ice Hockey
    7: 1,    # Soccer
    8: 4,    # Tennis
    9: 5,    # Volleyball
    10: 6,   # American Football
    13: 41,  # Table Tennis
    14: 42,  # Water Polo
    16: 30,  # Field Hockey
    17: 71,  # E-Soccer (fallback)
    47: 71,  # E-Soccer
    48: 73,  # E-Basketball
}

SPORT_TEXT_TO_VBET_FEED_SPORT_ID = {
    "soccer": 1,
    "football": 1,
    "basketball": 3,
    "ice hockey": 2,
    "icehockey": 2,
    "handball": 29,
    "volleyball": 5,
    "tennis": 4,
    "baseball": 11,
    "american football": 6,
    "americanfootball": 6,
    "futsal": 26,
    "field hockey": 30,
    "fieldhockey": 30,
    "water polo": 42,
    "waterpolo": 42,
    "table tennis": 41,
    "tabletennis": 41,
    "badminton": 9,
    "curling": 20,
    "floorball": 24,
    "bandy": 10,
    "e soccer": 71,
    "esoccer": 71,
    "e basketball": 73,
    "ebasketball": 73,
    "esports": 71,
    "e sports": 71,
}

COUNTRY_ALIAS_TO_EN = {
    "brasil": "Brazil",
    "alemanha": "Germany",
    "espanha": "Spain",
    "franca": "France",
    "italia": "Italy",
    "portugal": "Portugal",
    "argentina": "Argentina",
    "australia": "Australia",
    "austria": "Austria",
    "belgica": "Belgium",
    "canada": "Canada",
    "chile": "Chile",
    "china": "China",
    "coreia do sul": "South Korea",
    "dinamarca": "Denmark",
    "egito": "Egypt",
    "escocia": "Scotland",
    "estados unidos": "USA",
    "finlandia": "Finland",
    "grecia": "Greece",
    "holanda": "Netherlands",
    "hungria": "Hungary",
    "india": "India",
    "inglaterra": "England",
    "irlanda": "Ireland",
    "islandia": "Iceland",
    "israel": "Israel",
    "japao": "Japan",
    "mexico": "Mexico",
    "noruega": "Norway",
    "nova zelandia": "New Zealand",
    "polonia": "Poland",
    "republica tcheca": "Czech Republic",
    "romenia": "Romania",
    "russia": "Russia",
    "servia": "Serbia",
    "suecia": "Sweden",
    "suica": "Switzerland",
    "turquia": "Turkey",
    "ucrania": "Ukraine",
    "uruguai": "Uruguay",
    "europa": "Europe",
    "asia": "Asia",
    "africa": "Africa",
    "america do sul": "South America",
    "america do norte": "North America",
    "mundo": "World",
}


def _infer_sport_name(arb_data, bet_data):
    arb_data = arb_data if isinstance(arb_data, dict) else {}
    bet_data = bet_data if isinstance(bet_data, dict) else {}

    # 1) Campos diretos vindos da API
    for raw in (
        bet_data.get("sport_name"),
        bet_data.get("sportName"),
        bet_data.get("sport"),
        arb_data.get("sport_name"),
        arb_data.get("sportName"),
        arb_data.get("sport"),
    ):
        txt = str(raw or "").strip()
        if txt:
            return txt

    # 2) Fallback por ID
    sid = to_int(arb_data.get("sport_id"))
    if sid is None:
        sid = to_int(bet_data.get("sport_id"))
    if sid is not None:
        return SPORT_ID_FALLBACK_MAP.get(sid, f"Sport {sid}")

    # 3) Heuristica minima por liga (evita vazio total)
    league_txt = str(bet_data.get("league") or arb_data.get("league") or "").lower()
    if "counter-strike" in league_txt or "esl" in league_txt or "esport" in league_txt:
        return "E-Sports"
    return ""


def extract_event_id_from_url(url_text, fallback_bookmaker_event_id=""):
    txt = str(url_text or "").strip()
    if txt:
        try:
            parsed = urlsplit(txt)
        except Exception:
            parsed = None

        if parsed is not None:
            try:
                qs = parse_qs(parsed.query or "", keep_blank_values=True)
            except Exception:
                qs = {}

            for key in ("event", "eventid", "event_id", "match", "matchid", "match_id", "eventId", "e"):
                for raw in qs.get(key, []):
                    digits = re.sub(r"[^0-9]", "", str(raw))
                    if digits:
                        return digits

            # Evita falso-positivo em links com bt-path (FortuneJack), onde o ID no fim
            # do query-string nem sempre representa o eventId usado pelos clones.
            for chunk in (parsed.path or "", parsed.fragment or ""):
                for pattern in (
                    r"/liveEvent/([0-9]{4,})",
                    r"/le-([0-9]{4,})",
                    r"eventId=([0-9]{4,})",
                    r"/([0-9]{6,})(?:[/?#]|$)",
                    r"-([0-9]{6,})(?:[/?#]|$)",
                ):
                    match = re.search(pattern, chunk, flags=re.I)
                    if match:
                        return match.group(1)

    fallback = re.sub(r"[^0-9]", "", str(fallback_bookmaker_event_id or "").strip())
    return fallback


def extract_goldenpalace_fragment_path(url_text):
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


def extract_goldenpalace_sport_id(url_text):
    txt = str(url_text or "").strip()
    if not txt:
        return ""
    try:
        parsed = urlsplit(txt)
    except Exception:
        parsed = None

    # 1) Querystring direta (?sportId=77)
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

    # 2) Fragmento da GoldenPalace (#/sport/77/category/...)
    frag_path = extract_goldenpalace_fragment_path(txt)
    if frag_path:
        match = re.search(r"/sport/([0-9]+)", frag_path, flags=re.I)
        if match:
            return match.group(1)

    # 3) Fallback geral no texto
    match = re.search(r"/sport/([0-9]+)", txt, flags=re.I)
    if match:
        return match.group(1)
    return ""


def build_goldenpalace_fragment_path(url_text, event_id=""):
    frag_path = extract_goldenpalace_fragment_path(url_text)
    if not frag_path:
        return ""

    eid = re.sub(r"[^0-9]", "", str(event_id or "").strip())
    if not eid:
        return frag_path

    return re.sub(
        r"/liveEvent/[0-9]{4,}",
        f"/liveEvent/{eid}",
        frag_path,
        flags=re.I,
    )


def build_bwin_br_clone_url(source_url, target_host):
    txt = str(source_url or "").strip()
    if not txt:
        return f"https://{target_host}/pt-br/sports"
    try:
        parsed = urlsplit(txt)
    except Exception:
        parsed = None
    if parsed is None:
        return f"https://{target_host}/pt-br/sports"

    path = str(parsed.path or "/")
    if path.startswith("/en/"):
        path = "/pt-br/" + path[len("/en/"):]
    elif not path.startswith("/pt-br/"):
        path = "/pt-br" + (path if path.startswith("/") else "/" + path)

    return urlunsplit(("https", target_host, path, parsed.query, parsed.fragment))


def build_same_path_clone_url(source_url, target_host):
    txt = str(source_url or "").strip()
    if not txt:
        return f"https://{target_host}/"
    try:
        parsed = urlsplit(txt)
    except Exception:
        return f"https://{target_host}/"

    path = str(parsed.path or "/")
    return urlunsplit(("https", target_host, path, parsed.query, parsed.fragment))


VBET_SPORT_ID_FALLBACK_MAP = {
    1: "Baseball",
    2: "Basketball",
    4: "Futsal",
    5: "Handball",
    6: "IceHockey",
    7: "Soccer",
    8: "Tennis",
    9: "Volleyball",
    10: "AmericanFootball",
    13: "TableTennis",
    17: "Esports",
    47: "Esports",
    48: "EBasketball",
}


def _vbet_norm(text):
    raw = str(text or "").strip().lower()
    if not raw:
        return ""
    raw = unicodedata.normalize("NFKD", raw)
    raw = "".join(ch for ch in raw if not unicodedata.combining(ch))
    raw = re.sub(r"[^a-z0-9]+", " ", raw).strip()
    return raw


def _vbet_league_candidates(league_text):
    raw = str(league_text or "").strip()
    out = []
    if raw:
        out.append(raw)
    if ". " in raw:
        out.append(raw.split(". ", 1)[1].strip())
    elif "." in raw:
        out.append(raw.split(".", 1)[1].strip())
    if " - " in raw and len(raw.split(" - ", 1)[0]) <= 10:
        out.append(raw.split(" - ", 1)[1].strip())

    unique = []
    seen = set()
    for item in out:
        key = _vbet_norm(item)
        if key and key not in seen:
            seen.add(key)
            unique.append(item)
    return unique


def _vbet_country_hint_from_league(league_text):
    raw = str(league_text or "").strip()
    if ". " in raw:
        return raw.split(". ", 1)[0].strip()
    if "." in raw:
        return raw.split(".", 1)[0].strip()
    return ""


@lru_cache(maxsize=1)
def _load_vbet_catalog():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    camp_path = os.path.join(base_dir, "VBET", "vbet_campeonatos.json")
    esports_path = os.path.join(base_dir, "VBET", "vbet_esports.json")
    aliases_en_path = os.path.join(base_dir, "VBET", "vbet_campeonatos_en.json")

    by_league = {}
    by_champ_id = {}

    def _add(league_name, sport, country, champ_id):
        key = _vbet_norm(league_name)
        if not key:
            return
        cid = str(champ_id or "").strip()
        row = {
            "league": str(league_name or "").strip(),
            "sport": str(sport or "").strip(),
            "country": str(country or "").strip(),
            "championship_id": cid,
        }
        bucket = by_league.setdefault(key, [])
        sig = (
            _vbet_norm(row.get("sport")),
            _vbet_norm(row.get("country")),
            str(row.get("championship_id") or ""),
        )
        already = False
        for old in bucket:
            old_sig = (
                _vbet_norm(old.get("sport")),
                _vbet_norm(old.get("country")),
                str(old.get("championship_id") or ""),
            )
            if old_sig == sig:
                already = True
                break
        if not already:
            bucket.append(row)
        if cid and cid not in by_champ_id:
            by_champ_id[cid] = row

    try:
        with open(camp_path, "r", encoding="utf-8", errors="replace") as f:
            camp_obj = json.load(f)
    except Exception:
        camp_obj = {}

    indice = camp_obj.get("indicePlano") if isinstance(camp_obj, dict) else {}
    if isinstance(indice, dict):
        for cid, data in indice.items():
            if not isinstance(data, dict):
                continue
            _add(
                data.get("nomeCampeonato"),
                data.get("esporte"),
                data.get("pais"),
                str(cid),
            )

    por_esporte = camp_obj.get("porEsporte") if isinstance(camp_obj, dict) else {}
    if isinstance(por_esporte, dict):
        for sport_name, bucket in por_esporte.items():
            if not isinstance(bucket, dict):
                continue
            for cid, data in bucket.items():
                if not isinstance(data, dict):
                    continue
                _add(
                    data.get("nomeCampeonato"),
                    sport_name,
                    data.get("pais"),
                    str(data.get("id") or cid),
                )

    try:
        with open(esports_path, "r", encoding="utf-8", errors="replace") as f:
            esports_obj = json.load(f)
    except Exception:
        esports_obj = {}

    if isinstance(esports_obj, dict):
        for esport_key, bucket in esports_obj.items():
            if not isinstance(bucket, dict):
                continue
            for cid, data in bucket.items():
                if not isinstance(data, dict):
                    continue
                _add(
                    data.get("nomeCampeonato"),
                    esport_key,
                    "Esports",
                    str(data.get("id") or cid),
                )

    # Aliases em ingles (manual), para casar ligas do feed EN com catalogo PT.
    # Formatos aceitos no JSON:
    # 1) {"aliases":[{"league_en":"World. International Friendlies","championship_id":"3042","sport":"Soccer","country":"World"}]}
    # 2) {"World. International Friendlies":"3042", "International Friendlies":"3042"}
    try:
        with open(aliases_en_path, "r", encoding="utf-8", errors="replace") as f:
            aliases_obj = json.load(f)
    except Exception:
        aliases_obj = {}

    alias_items = []
    if isinstance(aliases_obj, list):
        alias_items.extend(aliases_obj)
    elif isinstance(aliases_obj, dict):
        if isinstance(aliases_obj.get("aliases"), list):
            alias_items.extend(aliases_obj.get("aliases") or [])
        else:
            for k, v in aliases_obj.items():
                if isinstance(v, dict):
                    item = dict(v)
                    item.setdefault("league_en", k)
                    alias_items.append(item)
                else:
                    alias_items.append({"league_en": str(k), "championship_id": str(v or "")})

    for item in alias_items:
        if not isinstance(item, dict):
            continue
        alias_name = str(
            item.get("league_en")
            or item.get("alias")
            or item.get("league")
            or ""
        ).strip()
        cid = str(item.get("championship_id") or item.get("id") or "").strip()
        if not alias_name or not cid:
            continue
        base = by_champ_id.get(cid) or {}
        sport = str(item.get("sport") or base.get("sport") or "").strip()
        country = str(item.get("country") or base.get("country") or "").strip()
        _add(alias_name, sport, country, cid)
        if ". " in alias_name:
            _add(alias_name.split(". ", 1)[1].strip(), sport, country, cid)

    return by_league, by_champ_id


def _extract_vbet_event_id(source_url, fallback_event_id=""):
    txt = str(source_url or "").strip()
    fallback = re.sub(r"[^0-9]", "", str(fallback_event_id or "").strip())
    if txt:
        m = re.search(r"#/sport/\?([0-9]{5,})", txt, flags=re.I)
        if m:
            return m.group(1)
        m = re.search(r"/([0-9]{5,})(?:[/?#]|$)", txt, flags=re.I)
        if m:
            return m.group(1)
    return fallback


def _extract_vbet_route_parts_from_url(url_text):
    txt = str(url_text or "").strip()
    if not txt:
        return None
    m = re.search(r"/pb/live/sport/([^/]+)/([^/]+)/([0-9]+)/([0-9]+)", txt, flags=re.I)
    if m:
        return {
            "sport": unquote(m.group(1)),
            "country": unquote(m.group(2)),
            "championship_id": m.group(3),
            "event_id": m.group(4),
            "source": "direct_url",
        }
    m = re.search(r"/e/live/([^/]+)/([^/]+)/([0-9]+)/([0-9]+)", txt, flags=re.I)
    if m:
        return {
            "sport": unquote(m.group(1)),
            "country": unquote(m.group(2)),
            "championship_id": m.group(3),
            "event_id": m.group(4),
            "source": "direct_url",
        }
    m = re.search(r"/ao-vivo/match/([^/]+)/([^/]+)/([0-9]+)/([0-9]+)", txt, flags=re.I)
    if m:
        return {
            "sport": unquote(m.group(1)),
            "country": unquote(m.group(2)),
            "championship_id": m.group(3),
            "event_id": m.group(4),
            "source": "direct_url",
        }
    return None


def _vbet_sport_segment(sport_text):
    raw = str(sport_text or "").strip()
    key = _vbet_norm(raw)
    fixed = {
        "beach soccer": "BeachSoccer",
        "table tennis": "TableTennis",
        "ice hockey": "IceHockey",
        "american football": "AmericanFootball",
        "field hockey": "FieldHockey",
        "cross country skiing": "CrossCountrySkiing",
        "rugby league": "RugbyLeague",
        "rugby union": "RugbyUnion",
        "water polo": "WaterPolo",
    }
    if key in fixed:
        return fixed[key]
    cleaned = re.sub(r"[^A-Za-z0-9]+", "", raw)
    return cleaned or raw


def _vbet_country_segment(country_text):
    raw = str(country_text or "").strip()
    if not raw:
        return ""
    normalized = _country_to_english(raw)
    normalized = re.sub(r"[_/]+", " ", normalized)
    normalized = re.sub(r"[^A-Za-z0-9\s-]+", " ", normalized)
    normalized = re.sub(r"\s+", " ", normalized).strip()
    return normalized or raw


def _resolve_vbet_parts_by_league(league_text, event_id, championship_id="", sport_text=""):
    by_league, by_champ_id = _load_vbet_catalog()
    event_id = str(event_id or "").strip()
    if not event_id:
        return None

    champ_hint = re.sub(r"[^0-9]", "", str(championship_id or "").strip())
    if champ_hint and champ_hint in by_champ_id:
        hit = by_champ_id[champ_hint]
        return {
            "sport": hit.get("sport") or str(sport_text or "").strip(),
            "country": hit.get("country") or "",
            "championship_id": hit.get("championship_id") or champ_hint,
            "event_id": event_id,
            "source": "catalog",
        }

    sport_hint = _vbet_norm(sport_text)
    country_hint = _country_match_key(_vbet_country_hint_from_league(league_text))

    for cand in _vbet_league_candidates(league_text):
        hits = list(by_league.get(_vbet_norm(cand)) or [])
        if not hits:
            continue

        if sport_hint:
            filtered = [h for h in hits if _vbet_norm(h.get("sport")) == sport_hint]
            if filtered:
                hits = filtered

        if country_hint:
            filtered = [h for h in hits if _country_match_key(h.get("country")) == country_hint]
            if filtered:
                hits = filtered

        champ_ids = {str(h.get("championship_id") or "") for h in hits if str(h.get("championship_id") or "")}
        if len(champ_ids) > 1:
            # Ambiguo: evita chute errado (ex: mesma liga em pais diferente).
            continue
        if not hits:
            continue
        hit = hits[0]
        return {
            "sport": hit.get("sport") or str(sport_text or "").strip(),
            "country": hit.get("country") or "",
            "championship_id": str(hit.get("championship_id") or ""),
            "event_id": event_id,
            "source": "catalog",
        }

    if champ_hint:
        league_raw = str(league_text or "").strip()
        country = ""
        if ". " in league_raw:
            country = league_raw.split(". ", 1)[0].strip()
        elif "." in league_raw:
            country = league_raw.split(".", 1)[0].strip()
        if not country:
            country = "World"
        return {
            "sport": str(sport_text or "").strip(),
            "country": country,
            "championship_id": champ_hint,
            "event_id": event_id,
            "source": "catalog",
        }

    return None


def _build_vbet_main_url(parts):
    if not parts:
        return ""
    sport = _vbet_sport_segment(parts.get("sport"))
    country = _vbet_country_segment(parts.get("country"))
    champ = str(parts.get("championship_id") or "").strip()
    event_id = str(parts.get("event_id") or "").strip()
    if not all((sport, country, champ, event_id)):
        return ""
    return (
        f"https://www.vbet.bet.br/pb/live/sport/"
        f"{quote(sport, safe='')}/{quote(country, safe='')}/{champ}/{event_id}"
    )


def _country_to_english(country_text):
    raw = str(country_text or "").strip()
    if not raw:
        return ""
    key = _vbet_norm(raw)
    return COUNTRY_ALIAS_TO_EN.get(key, raw)


def _country_match_key(country_text):
    return _vbet_norm(_country_to_english(country_text))


def _event_team_tokens(event_name):
    txt = str(event_name or "").strip()
    if not txt:
        return []
    for sep in (" vs ", " v ", " x ", " - ", " ⇄ ", " ↔ ", " — ", " – "):
        if sep in txt:
            parts = [p.strip() for p in txt.split(sep) if p.strip()]
            if len(parts) >= 2:
                return [parts[0], parts[1]]
    return []


def _norm_team_token(text):
    n = _vbet_norm(text)
    n = re.sub(r"\b(fc|cf|sc|ac|bc|fk|sk|club|clube|women|wom|ladies|u\d{2}|sub \d{2})\b", " ", n)
    n = re.sub(r"\s+", " ", n).strip()
    return n


def _team_similarity(a, b):
    a_n = _norm_team_token(a)
    b_n = _norm_team_token(b)
    if not a_n or not b_n:
        return 0.0
    stop = {"de", "da", "do", "del", "the", "and"}
    a_set = {w for w in a_n.split() if len(w) >= 2 and w not in stop}
    b_set = {w for w in b_n.split() if len(w) >= 2 and w not in stop}
    if not a_set or not b_set:
        return 0.0
    inter = len(a_set.intersection(b_set))
    base = min(len(a_set), len(b_set))
    if base <= 0:
        return 0.0
    return inter / float(base)


def _league_core_name(league_text):
    raw = str(league_text or "").strip()
    if ". " in raw:
        return raw.split(". ", 1)[1].strip()
    if "." in raw:
        return raw.split(".", 1)[1].strip()
    return raw


def _pick_country_for_url(feed_country, fallback_route_parts, league_text, championship_id):
    feed_country = str(feed_country or "").strip()
    fallback_country = str((fallback_route_parts or {}).get("country") or "").strip()
    fallback_champ = str((fallback_route_parts or {}).get("championship_id") or "").strip()
    champ = str(championship_id or "").strip()

    # Se fallback veio do catalogo e bate com o mesmo campeonato, ele costuma estar no formato certo da rota.
    if fallback_country and champ and fallback_champ and champ == fallback_champ:
        return _country_to_english(fallback_country)

    # Prefixo da liga normalmente vem em ingles no feed da BetBurger (ex: Brazil. Superliga...).
    league_country = _vbet_country_hint_from_league(league_text)
    if league_country:
        return _country_to_english(league_country)

    if fallback_country:
        return _country_to_english(fallback_country)
    return _country_to_english(feed_country)


def _feed_sport_id_from_context(bet_sport_id, sport_text, route_parts=None):
    sid = to_int(bet_sport_id)
    if sid is not None and sid in BETBURGER_TO_VBET_FEED_SPORT_ID:
        return BETBURGER_TO_VBET_FEED_SPORT_ID[sid]

    candidates = [
        str(sport_text or "").strip(),
        str((route_parts or {}).get("sport") or "").strip(),
    ]
    for cand in candidates:
        key = _vbet_norm(cand)
        if key in SPORT_TEXT_TO_VBET_FEED_SPORT_ID:
            return SPORT_TEXT_TO_VBET_FEED_SPORT_ID[key]
    return None


def _fetch_vbet_calendar_matches(feed_sport_id, base_day):
    start_dt = datetime(base_day.year, base_day.month, base_day.day, 3, 0, 0)
    end_dt = start_dt + timedelta(days=1)
    start_s = start_dt.strftime("%Y-%m-%dT%H:%M:%S.000")
    end_s = end_dt.strftime("%Y-%m-%dT%H:%M:%S.000")
    url = (
        f"{VBET_FEED_BASE}/Match/GetCalendarWidgetMatches"
        f"?sportId={int(feed_sport_id)}"
        f"&startDate={start_s}"
        f"&endDate={end_s}"
        f"&liveStatus=3"
    )
    req = Request(
        url,
        method="GET",
        headers={
            "user-agent": "Mozilla/5.0",
            "accept": "application/json, text/plain, */*",
        },
    )
    try:
        with urlopen(req, timeout=20) as resp:
            payload = resp.read().decode("utf-8", errors="replace")
        data = json.loads(payload)
        if isinstance(data, list):
            return data
        return []
    except Exception:
        return []


def _safe_parse_match_date(date_text):
    raw = str(date_text or "").strip()
    if not raw:
        return None
    try:
        if raw.endswith("Z"):
            return datetime.fromisoformat(raw.replace("Z", "+00:00")).astimezone(timezone.utc)
        return datetime.fromisoformat(raw).replace(tzinfo=timezone.utc)
    except Exception:
        return None


def _iter_obj_values(obj):
    if isinstance(obj, dict):
        return obj.values()
    if isinstance(obj, list):
        return obj
    return []


def _to_unix_ts(value):
    iv = to_int(value)
    if iv is not None:
        return iv
    if isinstance(value, datetime):
        try:
            return int(value.astimezone(timezone.utc).timestamp())
        except Exception:
            return None
    raw = str(value or "").strip()
    if not raw:
        return None
    try:
        if raw.endswith("Z"):
            return int(datetime.fromisoformat(raw.replace("Z", "+00:00")).timestamp())
        return int(datetime.fromisoformat(raw).replace(tzinfo=timezone.utc).timestamp())
    except Exception:
        return None


def _score_feed_match(item, teams, league_text, started_at):
    score = 0
    home = str(((item or {}).get("HomeTeam") or {}).get("Name") or "").strip()
    away = str(((item or {}).get("AwayTeam") or {}).get("Name") or "").strip()
    comp_name = str(((item or {}).get("Competition") or {}).get("Name") or "").strip()

    home_n = _norm_team_token(home)
    away_n = _norm_team_token(away)
    team_n = [_norm_team_token(t) for t in teams]

    if len(team_n) >= 2 and home_n and away_n:
        t1, t2 = team_n[0], team_n[1]
        direct = (t1 and t1 in home_n) and (t2 and t2 in away_n)
        reverse = (t1 and t1 in away_n) and (t2 and t2 in home_n)
        if direct or reverse:
            score += 120
        else:
            one_hit = (t1 and (t1 in home_n or t1 in away_n)) or (t2 and (t2 in home_n or t2 in away_n))
            if one_hit:
                score += 40

    if len(teams) >= 2:
        s_direct = min(_team_similarity(teams[0], home), _team_similarity(teams[1], away))
        s_reverse = min(_team_similarity(teams[0], away), _team_similarity(teams[1], home))
        s_best = max(s_direct, s_reverse)
        if s_best >= 0.75:
            score += 110
        elif s_best >= 0.55:
            score += 85
        elif s_best >= 0.4:
            score += 60

    league_core = _vbet_norm(_league_core_name(league_text))
    comp_norm = _vbet_norm(comp_name)
    if league_core and comp_norm:
        if league_core in comp_norm or comp_norm in league_core:
            score += 35

    started = _to_unix_ts(started_at)
    if started:
        match_dt = _safe_parse_match_date((item or {}).get("Date"))
        if match_dt:
            target = datetime.fromtimestamp(started, tz=timezone.utc)
            diff_h = abs((match_dt - target).total_seconds()) / 3600.0
            if diff_h <= 3:
                score += 25
            elif diff_h <= 12:
                score += 15
            elif diff_h <= 30:
                score += 5
    return score


def _resolve_real_vbet_route_from_feed(
    event_name,
    league_text,
    sport_text,
    bet_sport_id,
    started_at,
    fallback_route_parts=None,
):
    feed_sport_id = _feed_sport_id_from_context(bet_sport_id, sport_text, fallback_route_parts)
    if feed_sport_id is None:
        return None

    teams = _event_team_tokens(event_name)
    started = _to_unix_ts(started_at)
    if started:
        base_day = datetime.fromtimestamp(started, tz=timezone.utc).date()
    else:
        base_day = datetime.now(timezone.utc).date()

    all_rows = []
    for delta in (-1, 0, 1):
        day = base_day + timedelta(days=delta)
        rows = _fetch_vbet_calendar_matches(feed_sport_id, day)
        if rows:
            all_rows.extend(rows)

    if not all_rows:
        return None

    best = None
    best_score = -1
    for row in all_rows:
        s = _score_feed_match(row, teams, league_text, started_at)
        if s > best_score:
            best_score = s
            best = row

    # Threshold conservador para evitar casar evento errado.
    if best is None or best_score < 80:
        return None

    comp = (best.get("Competition") or {})
    region = (best.get("Region") or {})
    match_id = str(best.get("Id") or "").strip()
    champ_id = str(comp.get("Id") or "").strip()
    country = _pick_country_for_url(
        feed_country=str(region.get("Name") or "").strip(),
        fallback_route_parts=fallback_route_parts,
        league_text=league_text,
        championship_id=champ_id,
    )
    if not all((match_id, champ_id, country)):
        return None

    return {
        "sport": str((fallback_route_parts or {}).get("sport") or sport_text or "").strip(),
        "country": country,
        "championship_id": champ_id,
        "event_id": match_id,
        "source": "feedconstruct",
        "score": best_score,
    }


def _extract_vbet_ws_games(ws_payload):
    out = []
    root = ((ws_payload or {}).get("data") or {}).get("data") or {}
    sports = root.get("sport") or {}

    for sport in _iter_obj_values(sports):
        if not isinstance(sport, dict):
            continue
        sport_alias = str(sport.get("alias") or sport.get("name") or "").strip()
        regions = sport.get("region") or {}
        for region in _iter_obj_values(regions):
            if not isinstance(region, dict):
                continue
            region_alias = str(region.get("alias") or region.get("name") or "").strip()
            competitions = region.get("competition") or {}
            for competition in _iter_obj_values(competitions):
                if not isinstance(competition, dict):
                    continue
                competition_id = str(competition.get("id") or "").strip()
                competition_name = str(competition.get("name") or "").strip()
                games = competition.get("game") or {}
                for game in _iter_obj_values(games):
                    if not isinstance(game, dict):
                        continue
                    game_id = str(game.get("id") or "").strip()
                    if not game_id:
                        continue
                    out.append(
                        {
                            "sport_alias": sport_alias,
                            "region_alias": region_alias,
                            "competition_id": competition_id,
                            "competition_name": competition_name,
                            "game_id": game_id,
                            "team1_name": str(game.get("team1_name") or "").strip(),
                            "team2_name": str(game.get("team2_name") or "").strip(),
                            "start_ts": to_int(game.get("start_ts")) or 0,
                            "is_live": to_int(game.get("is_live")) or 0,
                            "is_blocked": to_int(game.get("is_blocked")) or 0,
                        }
                    )
    return out


@lru_cache(maxsize=8)
def _fetch_vbet_live_games_by_sport_ws(sport_alias):
    sport_alias = _vbet_sport_segment(sport_alias)
    if not sport_alias:
        return []

    try:
        from playwright.sync_api import sync_playwright
    except Exception:
        return []

    js = """
    async ([sportAlias]) => {
      return await new Promise((resolve) => {
        const rid = Math.floor(Math.random() * 1000000000) + 1000;
        const done = { value: false };
        const finish = (obj) => {
          if (done.value) return;
          done.value = true;
          try { ws.close(); } catch (e) {}
          resolve(obj);
        };
        const ws = new WebSocket('wss://eu-swarm-newm.vbet.bet.br/');
        const timer = setTimeout(() => finish({ ok: false, payload: '', error: 'timeout' }), 12000);

        ws.onopen = () => {
          try {
            ws.send(JSON.stringify({
              command: 'request_session',
              params: {
                source: 42,
                language: 'pt-br',
                afec: Math.random().toString(36).slice(2) + Date.now(),
                site_id: 692,
                release_date: new Date().toString()
              }
            }));
            ws.send(JSON.stringify({
              command: 'get',
              params: {
                source: 'betting',
                what: {
                  sport: ['alias', 'name'],
                  region: ['alias', 'name'],
                  competition: ['id', 'name'],
                  game: ['id', 'team1_name', 'team2_name', 'start_ts', 'type', 'is_live', 'is_blocked']
                },
                where: {
                  sport: { alias: sportAlias },
                  game: { type: { '@in': [1] } }
                },
                subscribe: false
              },
              rid: rid
            }));
          } catch (e) {
            clearTimeout(timer);
            finish({ ok: false, payload: '', error: String(e) });
          }
        };

        ws.onmessage = (ev) => {
          const txt = String(ev.data || '');
          if (txt.includes(`"rid":${rid}`) || txt.includes(`"rid": ${rid}`)) {
            clearTimeout(timer);
            finish({ ok: true, payload: txt, error: '' });
          }
        };

        ws.onerror = () => {};
      });
    }
    """

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto("https://www.vbet.bet.br/pb", wait_until="domcontentloaded", timeout=90000)
            result = page.evaluate(js, [sport_alias])
            browser.close()
    except Exception:
        return []

    if not isinstance(result, dict) or not result.get("ok"):
        return []

    raw_payload = str(result.get("payload") or "").strip()
    if not raw_payload:
        return []

    try:
        parsed = json.loads(raw_payload)
    except Exception:
        return []

    return _extract_vbet_ws_games(parsed)


def _score_ws_match(item, teams, league_text, started_at, champ_hints):
    score = 0
    home_raw = str(item.get("team1_name") or "").strip()
    away_raw = str(item.get("team2_name") or "").strip()
    home = _norm_team_token(home_raw)
    away = _norm_team_token(away_raw)
    team_n = [_norm_team_token(t) for t in teams]

    if len(team_n) >= 2 and home and away:
        t1, t2 = team_n[0], team_n[1]
        direct = (t1 and t1 in home) and (t2 and t2 in away)
        reverse = (t1 and t1 in away) and (t2 and t2 in home)
        if direct or reverse:
            score += 130
        else:
            one_hit = (t1 and (t1 in home or t1 in away)) or (t2 and (t2 in home or t2 in away))
            if one_hit:
                score += 45

    if len(teams) >= 2:
        t1_raw = str(teams[0] or "").strip()
        t2_raw = str(teams[1] or "").strip()
        s_direct = min(_team_similarity(t1_raw, home_raw), _team_similarity(t2_raw, away_raw))
        s_reverse = min(_team_similarity(t1_raw, away_raw), _team_similarity(t2_raw, home_raw))
        s_best = max(s_direct, s_reverse)
        if s_best >= 0.75:
            score += 115
        elif s_best >= 0.55:
            score += 90
        elif s_best >= 0.4:
            score += 65

    league_core = _vbet_norm(_league_core_name(league_text))
    comp_norm = _vbet_norm(item.get("competition_name"))
    if league_core and comp_norm and (league_core in comp_norm or comp_norm in league_core):
        score += 35

    cid = str(item.get("competition_id") or "").strip()
    if cid and cid in (champ_hints or set()):
        score += 55

    started = _to_unix_ts(started_at)
    match_ts = to_int(item.get("start_ts"))
    if started and match_ts:
        diff_h = abs(started - match_ts) / 3600.0
        if diff_h <= 3:
            score += 25
        elif diff_h <= 12:
            score += 15
        elif diff_h <= 30:
            score += 5

    if to_int(item.get("is_live")) == 1:
        score += 8

    return score


def _resolve_real_vbet_route_from_ws(
    event_name,
    league_text,
    sport_text,
    started_at,
    fallback_route_parts=None,
    championship_hint="",
):
    sport_alias = _vbet_sport_segment(
        str((fallback_route_parts or {}).get("sport") or sport_text or "").strip()
    )
    if not sport_alias:
        return None

    rows = _fetch_vbet_live_games_by_sport_ws(sport_alias)
    if not rows:
        return None

    teams = _event_team_tokens(event_name)
    champ_hints = set()
    for hint in (
        championship_hint,
        str((fallback_route_parts or {}).get("championship_id") or "").strip(),
    ):
        h = re.sub(r"[^0-9]", "", str(hint or "").strip())
        if h:
            champ_hints.add(h)

    best = None
    best_score = -1
    for row in rows:
        s = _score_ws_match(row, teams, league_text, started_at, champ_hints)
        if s > best_score:
            best_score = s
            best = row

    if best is None or best_score < 95:
        return None

    match_id = str(best.get("game_id") or "").strip()
    champ_id = str(best.get("competition_id") or "").strip()
    country = str(best.get("region_alias") or "").strip()
    if not all((match_id, champ_id, country)):
        return None

    return {
        "sport": sport_alias,
        "country": _country_to_english(country),
        "championship_id": champ_id,
        "event_id": match_id,
        "source": "vbet_ws",
        "score": best_score,
    }


def _build_vbet_clone_urls_from_parts(parts):
    if not parts:
        return []

    sport = _vbet_sport_segment(parts.get("sport"))
    country = _vbet_country_segment(parts.get("country"))
    champ = str(parts.get("championship_id") or "").strip()
    event_id = str(parts.get("event_id") or "").strip()
    if not all((sport, country, champ, event_id)):
        return []

    token_country = re.sub(r"[^A-Za-z0-9]+", "", country)
    token = f"live_{sport}_{token_country}_{champ}_{event_id}"
    sport_q = quote(sport, safe="")
    country_q = quote(country, safe="")

    return [
        f"https://www.vbet.bet.br/pb/live/sport/{sport_q}/{country_q}/{champ}/{event_id}",
        f"https://betao.bet.br/pb/sports/pre-match/event-view/Soccer/World/20896?game={token}",
        f"https://7games.bet.br/pb/sports/pre-match/event-view/Soccer/World/20896?game={token}",
        f"https://r7.bet.br/pb/sports/pre-match/event-view/Soccer/World/20896/copa-do-mundo-longo-prazo?game={token}",
        f"https://maxima.bet.br/e/live/{sport_q}/{country_q}/{champ}/{event_id}",
        f"https://suprema.bet.br/e/live/{sport_q}/{country_q}/{champ}/{event_id}",
        f"https://www.seguro.bet.br/ao-vivo/match/{sport_q}/{country_q}/{champ}/{event_id}",
        f"https://ultra.bet.br/e/live/{sport_q}/{country_q}/{champ}/{event_id}",
        f"https://www.bravo.bet.br/ao-vivo/match/{sport_q}/{country_q}/{champ}/{event_id}",
        f"https://www.h2.bet.br/ao-vivo/match/{sport_q}/{country_q}/{champ}/{event_id}",
        f"https://www.seu.bet.br/ao-vivo/match/{sport_q}/{country_q}/{champ}/{event_id}",
    ]


def _extract_vbet_game_token(source_url, fallback_event_id=""):
    txt = str(source_url or "").strip()
    fallback_eid = re.sub(r"[^0-9]", "", str(fallback_event_id or "").strip())
    if not txt:
        return ""
    try:
        parsed = urlsplit(txt)
    except Exception:
        return ""

    # 1) Query direta: ?game=live_<sport>_<country>_<comp>_<event>
    try:
        qs = parse_qs(parsed.query or "", keep_blank_values=True)
    except Exception:
        qs = {}
    for key in ("game", "Game"):
        for raw in (qs.get(key) or []):
            value = unquote(str(raw or "").strip())
            m = re.search(r"(live_[^_]+_[^_]+_[0-9]+_[0-9]+)", value)
            if m:
                token = m.group(1)
                if fallback_eid:
                    token = re.sub(r"_[0-9]+$", f"_{fallback_eid}", token)
                return token

    # 2) Fragmento com query: #...?...&game=...
    frag = str(parsed.fragment or "").strip()
    if frag:
        m = re.search(r"(?:^|[?&])game=([^&#]+)", frag, flags=re.I)
        if m:
            value = unquote(str(m.group(1) or "").strip())
            m2 = re.search(r"(live_[^_]+_[^_]+_[0-9]+_[0-9]+)", value)
            if m2:
                token = m2.group(1)
                if fallback_eid:
                    token = re.sub(r"_[0-9]+$", f"_{fallback_eid}", token)
                return token

    # 3) Path vbet canônico: /pb/live/sport/<sport>/<country>/<comp>/<event>
    path = str(parsed.path or "")
    m = re.search(r"/pb/live/sport/([^/]+)/([^/]+)/([0-9]+)/([0-9]+)", path, flags=re.I)
    if m:
        sport = unquote(str(m.group(1) or "").strip())
        country = unquote(str(m.group(2) or "").strip())
        comp = str(m.group(3) or "").strip()
        event = str(m.group(4) or "").strip()
        if fallback_eid:
            event = fallback_eid
        if sport and country and comp and event:
            return f"live_{sport}_{country}_{comp}_{event}"

    # 4) Path de clone:
    #    - /e/live/<sport>/<country>/<comp>/<event>
    #    - /ao-vivo/match/<sport>/<country>/<comp>/<event>
    m = re.search(r"/(?:e/live|ao-vivo/match)/([^/]+)/([^/]+)/([0-9]+)/([0-9]+)", path, flags=re.I)
    if m:
        sport = unquote(str(m.group(1) or "").strip())
        country = unquote(str(m.group(2) or "").strip())
        comp = str(m.group(3) or "").strip()
        event = str(m.group(4) or "").strip()
        if fallback_eid:
            event = fallback_eid
        if sport and country and comp and event:
            return f"live_{sport}_{country}_{comp}_{event}"

    return ""


def build_vbet_clone_urls(
    source_url,
    event_id="",
    league_text="",
    sport_text="",
    championship_id="",
    event_name="",
    started_at="",
    bet_sport_id=None,
):
    eid = re.sub(r"[^0-9]", "", str(event_id or "").strip())
    if not eid:
        eid = _extract_vbet_event_id(source_url, fallback_event_id="")

    token = _extract_vbet_game_token(source_url, fallback_event_id=eid)
    token_route_parts = None
    m = re.match(r"^live_([^_]+)_([^_]+)_([0-9]+)_([0-9]+)$", str(token or "").strip())
    if m:
        sport = m.group(1)
        country = m.group(2)
        comp_id = m.group(3)
        event = m.group(4)
        token_route_parts = {
            "sport": sport,
            "country": country,
            "championship_id": comp_id,
            "event_id": event,
            "source": "direct_url",
        }
        # IDs longos (ex.: 161...) costumam ser IDs internos da BetBurger e nao o matchId real da rota VBET.
        if not (str(event_name or "").strip() and len(re.sub(r"[^0-9]", "", event)) >= 9):
            return [
                f"https://www.vbet.bet.br/pb/live/sport/{sport}/{country}/{comp_id}/{event}",
                f"https://betao.bet.br/pb/sports/pre-match/event-view/Soccer/World/20896?game={token}",
                f"https://7games.bet.br/pb/sports/pre-match/event-view/Soccer/World/20896?game={token}",
                f"https://r7.bet.br/pb/sports/pre-match/event-view/Soccer/World/20896/copa-do-mundo-longo-prazo?game={token}",
                f"https://maxima.bet.br/e/live/{sport}/{country}/{comp_id}/{event}",
                f"https://suprema.bet.br/e/live/{sport}/{country}/{comp_id}/{event}",
                f"https://www.seguro.bet.br/ao-vivo/match/{sport}/{country}/{comp_id}/{event}",
                f"https://ultra.bet.br/e/live/{sport}/{country}/{comp_id}/{event}",
                f"https://www.bravo.bet.br/ao-vivo/match/{sport}/{country}/{comp_id}/{event}",
                f"https://www.h2.bet.br/ao-vivo/match/{sport}/{country}/{comp_id}/{event}",
                f"https://www.seu.bet.br/ao-vivo/match/{sport}/{country}/{comp_id}/{event}",
            ]

    route_parts = token_route_parts or _extract_vbet_route_parts_from_url(source_url)
    if route_parts and eid:
        route_parts["event_id"] = eid
    if not route_parts and eid:
        route_parts = _resolve_vbet_parts_by_league(
            league_text=league_text,
            event_id=eid,
            championship_id=championship_id,
            sport_text=sport_text,
        )

    best_route = route_parts
    # Tenta rota "real" quando houver contexto do evento, mas sem descartar
    # a rota de catalogo caso feed/ws nao respondam.
    if str(event_name or "").strip():
        feed_route = _resolve_real_vbet_route_from_feed(
            event_name=event_name,
            league_text=league_text,
            sport_text=sport_text,
            bet_sport_id=bet_sport_id,
            started_at=started_at,
            fallback_route_parts=route_parts,
        )
        if feed_route:
            best_route = feed_route
        else:
            ws_route = _resolve_real_vbet_route_from_ws(
                event_name=event_name,
                league_text=league_text,
                sport_text=sport_text,
                started_at=started_at,
                fallback_route_parts=route_parts,
                championship_hint=championship_id,
            )
            if ws_route:
                best_route = ws_route

    main_url = _build_vbet_main_url(best_route)
    clones = _build_vbet_clone_urls_from_parts(best_route)
    if main_url and (not clones or clones[0] != main_url):
        clones = [main_url] + clones
    if clones:
        return clones

    # Fallback de home (sem vbet.com e sem playpix, por pedido do usuario).
    return [
        "https://www.vbet.bet.br/",
        "https://betao.bet.br/",
        "https://7games.bet.br/",
        "https://r7.bet.br/",
        "https://maxima.bet.br/",
        "https://suprema.bet.br/",
        "https://www.seguro.bet.br/",
        "https://ultra.bet.br/",
        "https://www.bravo.bet.br/",
        "https://www.h2.bet.br/",
        "https://www.seu.bet.br/",
    ]


def extract_bt_path(source_url):
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


def build_fortunejack_clone_urls(source_url, event_id=""):
    bt_path = extract_bt_path(source_url)
    if not bt_path:
        return [
            "https://blaze.bet.br/pt/sports",
            "https://apostaganha.bet.br/esportes",
            "https://jonbet.bet.br/pt/sports",
            "https://reals.bet.br/sports-betby",
            "https://bingo.bet.br/sports",
            "https://pin.bet.br/sports",
        ]

    bt_path_encoded = quote(bt_path, safe="-._~")
    return [
        f"https://blaze.bet.br/pt/sports?bt-path={bt_path_encoded}",
        f"https://apostaganha.bet.br/esportes?bt-path={bt_path_encoded}",
        f"https://jonbet.bet.br/pt/sports?bt-path={bt_path_encoded}",
        f"https://reals.bet.br/sports-betby?bt-path={bt_path_encoded}",
        f"https://bingo.bet.br/sports?bt-path={bt_path_encoded}",
        f"https://pin.bet.br/sports?bt-path={bt_path_encoded}",
    ]


def build_unibet_clone_urls(event_id):
    eid = str(event_id or "").strip()
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


def build_stoiximan_clone_urls(source_url):
    txt = str(source_url or "").strip()
    if not txt:
        return ["https://www.betano.bet.br/"]
    try:
        parsed = urlsplit(txt)
        path = str(parsed.path or "/")
        return [urlunsplit(("https", "www.betano.bet.br", path, parsed.query, parsed.fragment))]
    except Exception:
        return ["https://www.betano.bet.br/"]


def build_betfair_clone_urls(source_url):
    txt = str(source_url or "").strip()
    if not txt:
        return ["https://www.betfair.bet.br/"]
    try:
        parsed = urlsplit(txt)
        path = str(parsed.path or "/")
        return [urlunsplit(("https", "www.betfair.bet.br", path, parsed.query, parsed.fragment))]
    except Exception:
        return ["https://www.betfair.bet.br/"]


def build_bet7k_clone_urls_local(event_id):
    if not event_id:
        return []
    # Usando os clones definidos pelo usuario no script do bot
    return [
        f"https://7k.bet.br/sports/live-betting/e-{event_id}",
        f"https://sortenabet.bet.br/sports/live-betting/e-{event_id}",
        f"https://vera.bet.br/sports/live-betting/e-{event_id}",
        f"https://brx.bet.br/sports/live-betting/e-{event_id}",
        f"https://bullsbet.bet.br/sports/live-betting/e-{event_id}",
        f"https://betvip.bet.br/sports//e-{event_id}",
        f"https://cassino.bet.br/en/sports?eventId={event_id}",
        f"https://pix.bet.br/sports/live-betting/{event_id}",
        f"https://donald.bet.br/sports/live-betting/e-{event_id}",
        f"https://rico.bet.br/sports/live-betting/e-{event_id}",
        f"https://www.betdasorte.bet.br/sports/live-betting/{event_id}",
        f"https://jogao.bet.br/sports/live-betting/e-{event_id}",
        f"https://bra.bet.br/sports/live-betting/e-{event_id}",
        f"https://mmabet.bet.br/sports/live-betting/e-{event_id}",
        f"https://betaki.bet.br/?eventID={event_id}",
        f"https://ice.bet.br/sports/live-betting/{event_id}",
        f"https://play.bet.br/sports/live-betting/e-{event_id}",
        f"https://betbra.bet.br/fbook/br-pt/spbk/live-betting/{event_id}",
        (
            f"https://kingpanda.bet.br/bets/live-betting/{event_id}"
            f"?leagueID={event_id}&eventID={event_id}&eventName=&sportID=1"
        ),
        f"https://betfalcons.bet.br/sports/live-betting/e-{event_id}/",
        f"https://betgorillas.bet.br/sports/live-betting/e-{event_id}/",
        f"https://b1bet.bet.br/sports/live-betting/e-{event_id}/",
        f"https://betpontobet.bet.br/sports/live-betting/e-{event_id}/",
        f"https://geralbet.bet.br/sports/live-betting/e-{event_id}/",
        f"https://lider.bet.br/sports/live-betting/e-{event_id}/",
    ]


def build_betsson_clone_urls(source_url):
    txt = str(source_url or "").strip()
    if not txt:
        return ["https://www.betsson.bet.br/apostas-esportivas"]
    try:
        parsed = urlsplit(txt)
        qs = parse_qs(parsed.query or "", keep_blank_values=True)
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
            return [f"https://www.betsson.bet.br/apostas-esportivas?eventId={encoded}&eti=0"]
        return ["https://www.betsson.bet.br/apostas-esportivas"]
    except Exception:
        return ["https://www.betsson.bet.br/apostas-esportivas"]


def build_novibet_clone_urls(source_url):
    event_id = extract_event_id_from_url(source_url, "")
    if event_id:
        return [f"https://www.novibet.bet.br/apostas-ao-vivo/{event_id}"]
    return ["https://www.novibet.bet.br/apostas-ao-vivo"]


def normalize_pinnacle_event_url(source_url):
    txt = str(source_url or "").strip()
    if not txt:
        return "https://pinnacle.bet.br/"
    if "available_in_api_plan" in txt.lower():
        return ""
    try:
        parsed = urlsplit(txt)
    except Exception:
        return "https://pinnacle.bet.br/"

    path = str(parsed.path or "").strip()
    if not path:
        return "https://pinnacle.bet.br/"
    event_id_match = re.search(r"/(\d{6,})(?:/)?$", path)
    if event_id_match:
        event_id = event_id_match.group(1)
        return f"https://pinnacle.bet.br/sportsbook/standard/soccer/germany-bundesliga/stuttgart-vs-werder-bremen/{event_id}#all"

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


def build_pinnacle_clone_urls(source_url):
    return [normalize_pinnacle_event_url(source_url)]


def build_expektdk_clone_urls(source_url):
    return ["https://www.betmgm.bet.br/"]


def build_betnacional_clone_urls(event_id=""):
    eid = re.sub(r"[^0-9]", "", str(event_id or "").strip())
    if not eid:
        return [
            "https://betnacional.bet.br/",
            "https://aposta.bet.br/esportes/futebol/evento/sr:match:70682272",
            "https://fazo.bet.br/esportes/futebol/evento/sr:match:70682272",
            "https://bet4.bet.br/esportes/futebol/evento/sr:match:70682272",
            "https://www.sporty.bet.br/br/sport/football/live/R%C3%BAssia/Premier_League/FK_Lokomotiv_Moscovo_vs_FC_Dynamo-Makhachkala/sr:match:70682272",
        ]
    return [
        f"https://betnacional.bet.br/event/6/1/{eid}",
        f"https://aposta.bet.br/esportes/futebol/evento/sr:match:{eid}",
        f"https://fazo.bet.br/esportes/futebol/evento/sr:match:{eid}",
        f"https://bet4.bet.br/esportes/futebol/evento/sr:match:{eid}",
        f"https://www.sporty.bet.br/br/sport/football/live/R%C3%BAssia/Premier_League/FK_Lokomotiv_Moscovo_vs_FC_Dynamo-Makhachkala/sr:match:{eid}",
    ]


def build_betfast_clone_urls(event_id=""):
    eid = re.sub(r"[^0-9]", "", str(event_id or "").strip())
    if not eid:
        return [
            "https://betfast.bet.br/br/sportsbook/live",
            "https://faz1.bet.br/br/sportsbook/prematch",
            "https://tivo.bet.br/br/sportsbook/live",
        ]
    return [
        f"https://betfast.bet.br/br/sportsbook/live#/live/eventview/{eid}",
        f"https://faz1.bet.br/br/sportsbook/prematch#/live/eventview/{eid}",
        f"https://tivo.bet.br/br/sportsbook/live#/live/eventview/{eid}",
    ]


def build_clone_urls(
    bookmaker_id,
    event_id,
    source_url="",
    league_text="",
    sport_text="",
    championship_id="",
    event_name="",
    started_at="",
    bet_sport_id=None,
):
    bid = to_int(bookmaker_id)
    eid = str(event_id or "").strip()

    # Goldenpalace family (id=61) clones validated by user.
    if bid == 61:
        if not eid:
            return []
        sport_id = extract_goldenpalace_sport_id(source_url)
        frag_path = build_goldenpalace_fragment_path(source_url, eid)
        if sport_id:
            pagol_url = f"https://pagol.bet.br/br/aposta-esportiva/liveEvent?eventId={eid}&sportId={sport_id}"
        else:
            pagol_url = "https://pagol.bet.br/"
        up_url = f"https://up.bet.br/pt-BR/sports/live#{frag_path}" if frag_path else "https://up.bet.br/pt-BR/sports/live"
        brbet_url = f"https://www.brbet.bet.br/sports#{frag_path}" if frag_path else "https://www.brbet.bet.br/sports"
        apostou_url = f"https://www.apostou.bet.br/sports#{frag_path}" if frag_path else "https://www.apostou.bet.br/sports"
        aviao_url = f"https://www.aviao.bet.br/esportes#{frag_path}" if frag_path else "https://www.aviao.bet.br/esportes"
        multi_url = f"https://multi.bet.br/pb/sports#{frag_path}" if frag_path else "https://multi.bet.br/pb/sports"
        aposta1_url = f"https://www.aposta1.bet.br/esportes#{frag_path}" if frag_path else "https://www.aposta1.bet.br/esportes"
        return [
            "https://betfusion.bet.br/sports/",
            f"https://bateu.bet.br/en/sports/le-{eid}",
            f"https://esportiva.bet.br/sports/le-{eid}",
            pagol_url,
            f"https://jogodeouro.bet.br/pt/sports?page=liveEvent&eventId={eid}",
            f"https://br4.bet.br/sports/le-{eid}",
            f"https://lotogreen.bet.br/sports/le-{eid}",
            "https://mcgames.bet.br/sports",
            f"https://www.estrelabet.bet.br/aposta-esportiva?eventId={eid}",
            f"https://www.sorteonline.bet.br/aposta-esportiva?eventId={eid}",
            f"https://www.lottoland.bet.br/aposta-esportiva?eventId={eid}",
            f"https://www.vupi.bet.br/aposta-esportiva?eventId={eid}",
            up_url,
            brbet_url,
            apostou_url,
            f"https://goldebet.bet.br/sports/e-{eid}",
            aviao_url,
            multi_url,
            f"https://brasildasorte.bet.br/sports/le-{eid}",
            aposta1_url,
        ]

    # Vbet family (id=34): rotas de evento com game token quando disponivel.
    if bid == 34:
        return build_vbet_clone_urls(
            source_url,
            eid,
            league_text=league_text,
            sport_text=sport_text,
            championship_id=championship_id,
            event_name=event_name,
            started_at=started_at,
            bet_sport_id=bet_sport_id,
        )

    # SuperbetBR (id=329): canonical BR event route.
    if bid == 329:
        canonical = normalize_catalog_url(bid, source_url or "")
        if canonical:
            return [canonical]
        return ["https://superbet.bet.br/"]

    # Bwin family (id=9): BR clones route in /pt-br.
    if bid == 9:
        return [
            build_bwin_br_clone_url(source_url, "sports.sportingbet.bet.br"),
            build_bwin_br_clone_url(source_url, "betboo.bet.br"),
        ]

    # LuvaBet family (id=484): same event path across BR clone domains.
    if bid == 484:
        eid_luva = eid or extract_event_id_from_url(source_url, "")
        big_url = f"https://big.bet.br/sportsbook/?e={eid_luva}" if eid_luva else "https://big.bet.br/sportsbook/"
        return [
            build_same_path_clone_url(source_url, "luva.bet.br"),
            build_same_path_clone_url(source_url, "1pra1.bet.br"),
            build_same_path_clone_url(source_url, "esporte365.bet.br"),
            build_same_path_clone_url(source_url, "ona.bet.br"),
            build_same_path_clone_url(source_url, "start.bet.br"),
            big_url,
        ]

    # FortuneJack (id=127): validated clones by user.
    if bid == 127:
        return build_fortunejack_clone_urls(source_url, eid)

    # Unibet (id=19): clones observed in BR.
    if bid == 19:
        return build_unibet_clone_urls(eid)

    # BetNacional (id=461): clones with fixed route templates and dynamic final event id.
    if bid == 461:
        eid_bn = eid or extract_event_id_from_url(source_url, "")
        return build_betnacional_clone_urls(eid_bn)

    # BetFast (id=466): mother + clones with fixed sportsbook routes and event hash.
    if bid == 466:
        eid_bf = eid or extract_event_id_from_url(source_url, "")
        return build_betfast_clone_urls(eid_bf)

    # Stoiximan (id=76): clone validated by user (Betano BR host).
    if bid == 76:
        return build_stoiximan_clone_urls(source_url)

    # Betfair (id=11): clone on Betfair BR host with same route.
    if bid == 11:
        return build_betfair_clone_urls(source_url)

    # Betsson (id=48): clone on Betsson BR host with same route.
    if bid == 48:
        return build_betsson_clone_urls(source_url)

    # Pinnacle (id=1): clone on pinnacle.bet.br with same route.
    if bid == 1:
        return build_pinnacle_clone_urls(source_url)

    # ExpektDk / BetmgmBR family (id=700): canonical BR host.
    if bid == 700:
        return build_expektdk_clone_urls(source_url)

    # Novibet (id=83): canonical host with same route.
    if bid == 83:
        return build_novibet_clone_urls(source_url)

    # Vaidebet (id=488): mother + validated clone (betpix365) with same route.
    if bid == 488:
        canonical = normalize_catalog_url(bid, source_url or "")
        if not canonical:
            canonical = "https://vaidebet.bet.br/"
        clone_betpix365 = build_same_path_clone_url(canonical, "betpix365.bet.br")
        out = [canonical]
        if clone_betpix365 and clone_betpix365 not in out:
            out.append(clone_betpix365)
        return out

    # BetNacional (id=461): canonical host only (no clones mapped yet).
    if bid == 461:
        canonical = normalize_catalog_url(bid, source_url or "")
        if canonical:
            return [canonical]
        return ["https://betnacional.bet.br/"]

    # Bet7k Family
    if bid in BET7K_FAMILY_IDS:
        if not eid:
            # Fallback: tenta recuperar ID do proprio link de origem
            # para garantir montagem correta (ex.: vera .../e-<id>).
            eid = extract_event_id_from_url(source_url, fallback_bookmaker_event_id="")
        return build_bet7k_clone_urls_local(eid)

    return []


def normalize_catalog_url(bookmaker_id, url_text):
    bid = to_int(bookmaker_id)
    txt = str(url_text or "").strip()
    if not txt:
        if bid == 329:
            return "https://superbet.bet.br/"
        return ""

    # Bet365 family: normalize redirect route to the stable BR base.
    if bid in (10, 199):
        try:
            parsed = urlsplit(txt)
        except Exception:
            parsed = None

        host = normalize_host(txt)
        if parsed is not None and ("bet365.com" in host or "bet365.bet.br" in host):
            fragment = str(parsed.fragment or "").strip()
            if not fragment:
                m = re.search(r"(#/IP/EV[0-9A-Z]+)", txt, flags=re.I)
                if m:
                    fragment = m.group(1).lstrip("#")
            if fragment:
                if not fragment.startswith("/"):
                    fragment = "/" + fragment
                if not fragment.endswith("/"):
                    fragment = fragment + "/"
                return f"https://www.bet365.bet.br/?bet=1#{fragment}"

    # Vbet family (id=34): usa rota de evento quando possivel.
    if bid == 34:
        vbet_urls = build_vbet_clone_urls(txt, extract_event_id_from_url(txt, ""))
        if vbet_urls:
            return vbet_urls[0]
        return "https://www.vbet.bet.br/"

    # SuperbetBR (id=329): normalize offer-event to BR odds route.
    if bid == 329:
        try:
            parsed = urlsplit(txt)
            host = normalize_host(txt)
            path = str(parsed.path or "").strip()
        except Exception:
            parsed = None
            host = ""
            path = ""

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

    # LuvaBet family (id=484): canonical host luva.bet.br with same path.
    if bid == 484:
        try:
            parsed = urlsplit(txt)
            path = str(parsed.path or "/")
            return urlunsplit(("https", "luva.bet.br", path, parsed.query, parsed.fragment))
        except Exception:
            return "https://luva.bet.br/"

    # FortuneJack (id=127): canonical host fortunejack.com with same route.
    if bid == 127:
        try:
            parsed = urlsplit(txt)
            path = str(parsed.path or "/crypto-sportsbook")
            if path == "/":
                path = "/crypto-sportsbook"
            return urlunsplit(("https", "fortunejack.com", path, parsed.query, parsed.fragment))
        except Exception:
            return "https://fortunejack.com/crypto-sportsbook"

    # Unibet (id=19): canonical host www.unibet.com with same route.
    if bid == 19:
        try:
            parsed = urlsplit(txt)
            path = str(parsed.path or "/betting/sports")
            if path == "/":
                path = "/betting/sports"
            return urlunsplit(("https", "www.unibet.com", path, parsed.query, parsed.fragment))
        except Exception:
            return "https://www.unibet.com/betting/sports"

    # Stoiximan (id=76): canonical host www.stoiximan.gr with same route.
    if bid == 76:
        try:
            parsed = urlsplit(txt)
            path = str(parsed.path or "/")
            return urlunsplit(("https", "www.stoiximan.gr", path, parsed.query, parsed.fragment))
        except Exception:
            return "https://www.stoiximan.gr/"

    # Betfair (id=11): canonical host www.betfair.bet.br with same route.
    if bid == 11:
        try:
            parsed = urlsplit(txt)
            path = str(parsed.path or "/")
            return urlunsplit(("https", "www.betfair.bet.br", path, parsed.query, parsed.fragment))
        except Exception:
            return "https://www.betfair.bet.br/"

    # Betsson (id=48): canonical host www.betsson.bet.br with same route.
    if bid == 48:
        return build_betsson_clone_urls(txt)[0]

    # Pinnacle (id=1): canonical host pinnacle.bet.br with sportsbook standard event route.
    if bid == 1:
        return normalize_pinnacle_event_url(txt)

    # ExpektDk / BetmgmBR family (id=700): canonical BR host with same route.
    if bid == 700:
        return build_expektdk_clone_urls(txt)[0]

    # Novibet (id=83): canonical host www.novibet.com with same route.
    if bid == 83:
        return build_novibet_clone_urls(txt)[0]

    # Vaidebet (id=488): canonical host vaidebet.bet.br and live detail route.
    if bid == 488:
        try:
            parsed = urlsplit(txt)
            path = str(parsed.path or "/")
            if path == "/":
                return "https://vaidebet.bet.br/"
            return urlunsplit(("https", "vaidebet.bet.br", path, parsed.query, parsed.fragment))
        except Exception:
            return "https://vaidebet.bet.br/"

    # BetNacional (id=461): canonical host betnacional.bet.br with same route.
    if bid == 461:
        try:
            parsed = urlsplit(txt)
            path = str(parsed.path or "/")
            return urlunsplit(("https", "betnacional.bet.br", path, parsed.query, parsed.fragment))
        except Exception:
            return "https://betnacional.bet.br/"

    # BetFast (id=466): canonical host betfast.bet.br preserving sportsbook route/hash.
    if bid == 466:
        try:
            parsed = urlsplit(txt)
            path = str(parsed.path or "").strip()
            if not path:
                path = "/br/sportsbook/live"
            return urlunsplit(("https", "betfast.bet.br", path, parsed.query, parsed.fragment))
        except Exception:
            return "https://betfast.bet.br/br/sportsbook/live"

    return txt


def build_search_payload(filter_id, page, per_page):
    data = [
        ("auto_update", "true"),
        ("notification_sound", "false"),
        ("notification_popup", "false"),
        ("show_event_arbs", "true"),
        ("grouped", "true"),
        ("per_page", str(per_page)),
        ("page", str(page)),
        ("sort_by", "percent"),
        ("koef_format", "decimal"),
        ("mode", ""),
        ("event_id", ""),
        ("q", ""),
        ("search_filter[]", str(filter_id)),
        ("is_live", "true"),
    ]
    for t in range(1, 11):
        data.append(("event_arb_types[]", str(t)))
    return data


def fetch_live_page(token, filter_id, page, per_page, locale, timeout_sec=25.0):
    url = f"https://rest-api-lv.betburger.com/api/v1/arbs/pro_search?access_token={token}&locale={locale}"
    headers = {
        "accept": "application/json, text/plain, */*",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "origin": "https://www.betburger.com",
        "referer": "https://www.betburger.com/",
        "user-agent": "Mozilla/5.0",
    }
    body = urlencode(build_search_payload(filter_id, page, per_page)).encode("utf-8")

    for attempt in range(1, 4):
        req = Request(url, method="POST", data=body, headers=headers)
        try:
            with urlopen(req, timeout=timeout_sec) as resp:
                return json.loads(resp.read().decode("utf-8", errors="replace"))
        except HTTPError as e:
            if e.code == 429 and attempt < 4:
                wait_sec = 2 * attempt
                print(f"[warn] 429 page={page} attempt={attempt} wait={wait_sec}s")
                time.sleep(wait_sec)
                continue
            try:
                err_body = e.read().decode("utf-8", errors="replace")
            except Exception:
                err_body = str(e)
            print(f"[erro] HTTP {e.code} page={page}: {err_body[:180]}")
            return None
        except Exception as e:
            print(f"[erro] Falha page={page}: {type(e).__name__}: {e}")
            return None
    return None


def extract_candidate_url(raw_url):
    url_txt = str(raw_url or "").strip()
    if not url_txt:
        return ""
    url_txt = unescape(url_txt)
    url_txt = url_txt.replace("\\/", "/").replace("\\u0026", "&").replace("&amp;", "&")
    url_txt = url_txt.strip().strip('"').strip("'")
    if url_txt.startswith("//"):
        return "https:" + url_txt
    return url_txt


def extract_direct_link_from_html(html_text, base_url=""):
    if not html_text:
        return ""

    patterns = [
        r"direct_link\s*=\s*'([^']+)'",
        r'direct_link\s*=\s*"([^"]+)"',
        r'"direct_link"\s*:\s*"([^"]+)"',
        r"window\.location(?:\.href)?\s*=\s*'([^']+)'",
        r'window\.location(?:\.href)?\s*=\s*"([^"]+)"',
        r"location\.(?:replace|assign)\(\s*'([^']+)'\s*\)",
        r'location\.(?:replace|assign)\(\s*"([^"]+)"\s*\)',
        r'<meta[^>]+http-equiv=["\']refresh["\'][^>]*content=["\']([^"\']+)["\']',
    ]

    candidates = []
    for pattern in patterns:
        match = re.search(pattern, html_text, flags=re.I)
        if not match:
            continue
        candidate = extract_candidate_url(match.group(1))
        if not candidate:
            continue
        if candidate.lower().startswith("0;url="):
            candidate = extract_candidate_url(candidate.split("=", 1)[-1])
        if candidate.startswith("/"):
            candidate = urljoin(base_url or "", candidate)
        if re.match(r"^https?://", candidate, flags=re.I):
            candidates.append(candidate)

    # Fallback: collect absolute URLs from HTML and prioritize real bookmaker hosts.
    for match in re.finditer(r"https?://[^\"'\s<>]+", str(html_text)):
        candidate = extract_candidate_url(match.group(0))
        if re.match(r"^https?://", candidate, flags=re.I):
            candidates.append(candidate)

    # Prefer viable final URLs first.
    for candidate in candidates:
        if is_viable_final_url(candidate):
            return candidate
    if candidates:
        return candidates[0]
    return ""


def extract_redirect_qs_url(candidate):
    txt = str(candidate or "").strip()
    if not txt:
        return ""
    try:
        parsed = urlsplit(txt)
        qs = parse_qs(parsed.query or "")
    except Exception:
        return ""

    for key in ("url", "target", "redirect", "to", "next", "link", "event_url"):
        for value in (qs.get(key) or []):
            clean = extract_candidate_url(value)
            if re.match(r"^https?://", clean, flags=re.I):
                return clean
    return ""


def resolve_oddsrabbit(oddsrabbit_url, timeout_sec=20.0):
    req_headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/json;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Upgrade-Insecure-Requests": "1",
        "Connection": "keep-alive",
        "Referer": "https://www.betburger.com/",
    }
    req = Request(oddsrabbit_url, method="GET", headers=req_headers)
    try:
        with urlopen(req, timeout=timeout_sec) as resp:
            final_url = str(resp.geturl() or "").strip()
            html_text = resp.read().decode("utf-8", errors="replace")
    except Exception as e:
        return {
            "final_url": "",
            "direct_link": "",
            "resolved_url": "",
            "error": f"{type(e).__name__}: {e}",
        }

    direct_from_qs = extract_redirect_qs_url(final_url)
    direct_from_html = extract_direct_link_from_html(html_text, base_url=final_url)
    direct_link = direct_from_qs or direct_from_html

    if is_viable_final_url(direct_link):
        resolved = direct_link
    elif is_viable_final_url(final_url) and (not is_tracking_intermediate(final_url)):
        resolved = final_url
    else:
        # If the first landing is a tracking host, try one extra hop.
        resolved = ""
        if final_url and is_tracking_intermediate(final_url):
            try:
                req2 = Request(final_url, method="GET", headers=req_headers)
                with urlopen(req2, timeout=timeout_sec) as resp2:
                    final_url2 = str(resp2.geturl() or "").strip()
                    html_text2 = resp2.read().decode("utf-8", errors="replace")
                if is_viable_final_url(final_url2):
                    resolved = final_url2
                    final_url = final_url2
                else:
                    second_from_qs = extract_redirect_qs_url(final_url2)
                    second_from_html = extract_direct_link_from_html(html_text2, base_url=final_url2)
                    candidate2 = second_from_qs or second_from_html
                    if is_viable_final_url(candidate2):
                        resolved = candidate2
            except Exception:
                resolved = ""
        if not resolved and is_viable_final_url(final_url):
            resolved = final_url

    return {
        "final_url": final_url,
        "direct_link": direct_link,
        "resolved_url": resolved,
        "error": "",
    }


def resolve_oddsrabbit_playwright(oddsrabbit_url, timeout_sec=20.0):
    try:
        from playwright.sync_api import sync_playwright
    except Exception as e:
        return {
            "final_url": "",
            "direct_link": "",
            "resolved_url": "",
            "error": f"playwright_indisponivel: {type(e).__name__}: {e}",
        }

    timeout_ms = int(max(5.0, float(timeout_sec)) * 1000)
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                ignore_https_errors=True,
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            )
            page = context.new_page()
            page.goto(oddsrabbit_url, wait_until="domcontentloaded", timeout=timeout_ms)

            # Wait a little for JS redirects/tracker hops.
            for _ in range(16):
                current = str(page.url or "").strip()
                if is_viable_final_url(current) and (not is_tracking_intermediate(current)):
                    break
                page.wait_for_timeout(500)

            final_url = str(page.url or "").strip()
            browser.close()
    except Exception as e:
        return {
            "final_url": "",
            "direct_link": "",
            "resolved_url": "",
            "error": f"playwright_erro: {type(e).__name__}: {e}",
        }

    resolved = final_url if is_viable_final_url(final_url) else ""
    return {
        "final_url": final_url,
        "direct_link": "",
        "resolved_url": resolved,
        "error": "",
    }


def find_first_by_bookmaker(payload, target_bookmaker_id):
    bets_map = {
        str(b.get("id")): b
        for b in (payload.get("bets") or [])
        if isinstance(b, dict) and b.get("id")
    }

    for arb in (payload.get("arbs") or []):
        if not isinstance(arb, dict):
            continue
        arb_hash = str(arb.get("arb_hash") or arb.get("id") or "").strip()
        if not arb_hash:
            continue

        side_ids = []
        for key in ("bet1_id", "bet2_id", "bet3_id", "bet4_id"):
            if arb.get(key):
                side_ids.append(str(arb.get(key)))

        for bet_id in side_ids:
            bet_data = bets_map.get(bet_id) or {}
            bookmaker_id = to_int(bet_data.get("bookmaker_id"))
            if bookmaker_id != target_bookmaker_id:
                continue
            return {
                "arb_hash": arb_hash,
                "bet_id": bet_id,
                "bookmaker_id": bookmaker_id,
                "bookmaker_name": str(bet_data.get("bookmaker_name") or bet_data.get("bookmaker") or ""),
                "bookmaker_event_id": str(bet_data.get("bookmaker_event_id") or ""),
                "bookmaker_league_id": str(
                    bet_data.get("bookmaker_league_id")
                    or bet_data.get("league_id")
                    or arb.get("league_id")
                    or ""
                ),
                "sport_id": (
                    bet_data.get("sport_id")
                    or arb.get("sport_id")
                    or ""
                ),
                "starts_at": (
                    arb.get("started_at")
                    or arb.get("starts_at")
                    or ""
                ),
                "event_name": str(
                    bet_data.get("bookmaker_event_name")
                    or arb.get("event_name")
                    or arb.get("event")
                    or ""
                ),
                "event_title": str(
                    bet_data.get("title")
                    or bet_data.get("event_title")
                    or bet_data.get("bet_type_name")
                    or arb.get("title")
                    or arb.get("arb_title")
                    or ""
                ),
                "league": str(bet_data.get("league") or arb.get("league") or ""),
                "sport": _infer_sport_name(arb, bet_data),
            }
    return None


def main():
    parser = argparse.ArgumentParser(description="Cataloga 1 evento live por bookmaker_id")
    parser.add_argument("--token", default=os.getenv("BETBURGER_ACCESS_TOKEN", "").strip())
    parser.add_argument("--filter-id", default="2028569")
    parser.add_argument("--locale", default="en")
    parser.add_argument("--per-page", type=int, default=40)
    parser.add_argument("--max-pages", type=int, default=8)
    parser.add_argument("--timeout", type=float, default=25.0)
    parser.add_argument(
        "--resolver",
        choices=("auto", "urllib", "playwright"),
        default="auto",
        help="auto: urllib e, se necessario, tenta playwright. urllib: so urllib. playwright: so navegador.",
    )
    parser.add_argument("--bookmaker-id", type=int, required=True)
    parser.add_argument("--bookmaker-name", default="")
    args = parser.parse_args()

    if not args.token:
        print("erro=token_obrigatorio")
        print("use: --token SEU_TOKEN")
        return

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

        found = find_first_by_bookmaker(payload, args.bookmaker_id)
        if found:
            print(f"[ok] evento encontrado na pagina {page}")
            break

        arbs_count = len(payload.get("arbs") or [])
        print(f"[info] pagina={page} sem bookmaker_id={args.bookmaker_id} (arbs={arbs_count})")
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
    resolver_used = "urllib"
    resolved = resolve_oddsrabbit(oddsrabbit_url, timeout_sec=args.timeout)

    need_browser = True
    urllib_final = resolved.get("resolved_url") or resolved.get("direct_link") or resolved.get("final_url") or ""
    if is_viable_final_url(urllib_final) and (not is_tracking_intermediate(urllib_final)):
        need_browser = False

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
    catalog_url = final_url if is_viable_final_url(final_url) else ""
    catalog_url = normalize_catalog_url(found.get("bookmaker_id"), catalog_url or final_url)
    event_id = extract_event_id_from_url(
        final_url,
        fallback_bookmaker_event_id=found.get("bookmaker_event_id", ""),
    )
    clone_urls = build_clone_urls(
        found.get("bookmaker_id"),
        event_id,
        source_url=final_url,
        league_text=found.get("league"),
        sport_text=found.get("sport"),
        championship_id=found.get("bookmaker_league_id"),
        event_name=found.get("event_name"),
        started_at=found.get("starts_at"),
        bet_sport_id=found.get("sport_id"),
    )

    label = args.bookmaker_name.strip() or found["bookmaker_name"] or f"id_{args.bookmaker_id}"
    print("========================================")
    print(f"casa_mae={label}")
    print(f"casa_mae_id={found['bookmaker_id']}")
    print(f"bookmaker_name={found['bookmaker_name']}")
    print(f"nome_evento={found['event_name']}")
    print(f"titulo={found['event_title']}")
    print(f"liga={found['league']}")
    print(f"sport={found['sport']}")
    print(f"bet_id={found['bet_id']}")
    print(f"arb_hash={found['arb_hash']}")
    print(f"bookmaker_event_id={found['bookmaker_event_id']}")
    print(f"oddsrabbit_url={oddsrabbit_url}")
    print(f"resolver_usado={resolver_used}")
    print(f"oddsrabbit_final={resolved.get('final_url')}")
    print(f"direct_link={resolved.get('direct_link')}")
    print(f"url_resolvida={resolved.get('resolved_url')}")
    print(f"url_para_catalogo={catalog_url}")
    print(f"event_id={event_id}")
    if clone_urls:
        print("----------------------------------------")
        print("clones_urls:")
        for url in clone_urls:
            print(url)
    if not catalog_url:
        print("obs=nao_foi_possivel_resolver_url_final_com_http_puro")
    if resolved.get("error"):
        print(f"erro_resolver={resolved['error']}")
    print("========================================")


if __name__ == "__main__":
    main()
