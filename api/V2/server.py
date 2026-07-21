import asyncio
import socketio
from aiohttp import web
import json
import os
import re
import time
import hashlib
import threading
from datetime import datetime, timezone
from html import unescape
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from urllib.parse import parse_qs, quote, unquote, urlencode, urljoin, urlsplit, urlunsplit
import unicodedata

try:
    import psycopg2
    from psycopg2.extras import Json, execute_values
except Exception:
    psycopg2 = None
    Json = None
    execute_values = None

# --- Config ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
JSON_FILE = os.path.join(BASE_DIR, 'surebets_live.json')
REFERENCE_FILE = os.path.join(BASE_DIR, 'TODASURLSEFORMATOS.txt')
STATUS_FILE = os.path.join(BASE_DIR, 'bookmakers_statuses.json')
HOUSES_FILE = os.path.join(BASE_DIR, 'casas.txt')
PORT = 3005
DISABLE_HOUSES_FILTER = os.getenv('DISABLE_HOUSES_FILTER', '0').strip().lower() in ('1', 'true', 'yes', 'on')
# Padrao ligado: gera combinacoes entre clones permitidos no casas.txt
# (ex.: B x C, B x D), nunca entre lados da mesma casa-mae.
USE_BOOKMAKER_FAMILY_EXPANSION = os.getenv('USE_BOOKMAKER_FAMILY_EXPANSION', '1').strip().lower() in ('1', 'true', 'yes', 'on')
ONLY_CLONE_BOOKMAKERS = os.getenv('ONLY_CLONE_BOOKMAKERS', '1').strip().lower() in ('1', 'true', 'yes', 'on')
JSON_POLL_INTERVAL_SEC = 0.05
JSON_READ_RETRY_ATTEMPTS = 5
JSON_READ_RETRY_DELAY_SEC = 0.01
JSON_READ_ERROR_LOG_THROTTLE_SEC = 2.0
PG_FEED_ERROR_LOG_THROTTLE_SEC = 2.0
ARBS_RETENTION_SEC = max(0.0, float(os.getenv('ARBS_RETENTION_SEC', '900')))
ARBS_CACHE_MAX_ROWS = max(100, int(os.getenv('ARBS_CACHE_MAX_ROWS', '20000')))
CRONOGRAMA_TZ_OFFSET_HOURS = int(os.getenv('CRONOGRAMA_TZ_OFFSET_HOURS', '-3'))
PANEL_AUTH_ENDPOINT = os.getenv('PANEL_AUTH_ENDPOINT', 'https://octosure.net/painel/api/auth/login.php')
PANEL_AUTH_TIMEOUT_SEC = float(os.getenv('PANEL_AUTH_TIMEOUT_SEC', '10'))
PANEL_AUTH_ENDPOINT_FALLBACKS = os.getenv('PANEL_AUTH_ENDPOINT_FALLBACKS', '')
PANEL_AUTH_LOOP_HEADER = 'X-Octosure-Panel-Auth-Hop'
PANEL_AUTH_LOOP_VALUE = '1'
BETBURGER_ACCESS_TOKEN = str(os.getenv('BETBURGER_ACCESS_TOKEN', '')).strip()
BETBURGER_LINK_LOCALE = str(os.getenv('BETBURGER_LINK_LOCALE', 'en')).strip() or 'en'
ODDSRABBIT_BETS_BASE = str(os.getenv('ODDSRABBIT_BETS_BASE', 'https://lv.oddsrabbit.org/bets')).strip().rstrip('/')
ODDSRABBIT_DOMAIN_PARAM = str(os.getenv('ODDSRABBIT_DOMAIN_PARAM', '')).strip()
DIRECT_LINK_ENABLED = os.getenv('DIRECT_LINK_ENABLED', '1').strip().lower() in ('1', 'true', 'yes', 'on')
DIRECT_LINK_DEBUG = os.getenv('DIRECT_LINK_DEBUG', '0').strip().lower() in ('1', 'true', 'yes', 'on')
DIRECT_LINK_FETCH_TIMEOUT_SEC = max(1.0, float(os.getenv('DIRECT_LINK_FETCH_TIMEOUT_SEC', '6')))
DIRECT_LINK_CACHE_TTL_SEC = max(5.0, float(os.getenv('DIRECT_LINK_CACHE_TTL_SEC', '300')))
DIRECT_LINK_EMPTY_CACHE_TTL_SEC = max(5.0, float(os.getenv('DIRECT_LINK_EMPTY_CACHE_TTL_SEC', '35')))
DIRECT_LINK_CACHE_MAX_ITEMS = max(100, int(os.getenv('DIRECT_LINK_CACHE_MAX_ITEMS', '5000')))
DIRECT_LINK_MAX_FETCH_PER_TICK = max(0, int(os.getenv('DIRECT_LINK_MAX_FETCH_PER_TICK', '20')))
DIRECT_LINK_FORCE_MAX_FETCH_PER_TICK = max(0, int(os.getenv('DIRECT_LINK_FORCE_MAX_FETCH_PER_TICK', '80')))
DIRECT_LINK_FORCE_FETCH_ROOT_IDS_RAW = str(os.getenv('DIRECT_LINK_FORCE_FETCH_ROOT_IDS', '10,199,329,1,447,9,61,127,19,76,488,461,11,48,83,700,484')).strip()
DIRECT_LINK_FORCE_FETCH_ROOT_IDS = {
    int(x.strip())
    for x in DIRECT_LINK_FORCE_FETCH_ROOT_IDS_RAW.split(',')
    if x.strip().isdigit()
}
DIRECT_LINK_SWAP_ROOT_IDS_RAW = str(os.getenv('DIRECT_LINK_SWAP_ROOT_IDS', '461,484,488')).strip()
DIRECT_LINK_SWAP_ROOT_IDS = {
    int(x.strip())
    for x in DIRECT_LINK_SWAP_ROOT_IDS_RAW.split(',')
    if x.strip().isdigit()
}
if not DIRECT_LINK_SWAP_ROOT_IDS:
    DIRECT_LINK_SWAP_ROOT_IDS = {461, 484, 488}
DIRECT_LINK_DISABLE_SWAP_ROOT_IDS_RAW = str(os.getenv('DIRECT_LINK_DISABLE_SWAP_ROOT_IDS', '')).strip()
DIRECT_LINK_DISABLE_SWAP_ROOT_IDS = {
    int(x.strip())
    for x in DIRECT_LINK_DISABLE_SWAP_ROOT_IDS_RAW.split(',')
    if x.strip().isdigit()
}
BETBURGER_SESSION_COOKIE = str(os.getenv('BETBURGER_SESSION_COOKIE', '')).strip()
BETBURGER_EXTRA_REQUEST_HEADERS = {}
raw_extra_headers = str(os.getenv('BETBURGER_EXTRA_REQUEST_HEADERS', '')).strip()
if raw_extra_headers:
    try:
        parsed = json.loads(raw_extra_headers)
        if isinstance(parsed, dict):
            BETBURGER_EXTRA_REQUEST_HEADERS = {
                str(k).strip(): str(v).strip()
                for k, v in parsed.items()
                if str(k).strip() and str(v).strip()
            }
    except Exception:
        BETBURGER_EXTRA_REQUEST_HEADERS = {}
ARBS_SOURCE_MODE = os.getenv('ARBS_SOURCE_MODE', 'json').strip().lower()
if ARBS_SOURCE_MODE not in ('json', 'postgres_raw'):
    ARBS_SOURCE_MODE = 'json'

# --- Postgres Config ---
def _clean_env_text(name, default=''):
    val = str(os.getenv(name, default)).strip()
    if len(val) >= 2 and ((val[0] == '"' and val[-1] == '"') or (val[0] == "'" and val[-1] == "'")):
        val = val[1:-1].strip()
    return val

PG_ENABLED = os.getenv('PG_ENABLED', '1').strip().lower() in ('1', 'true', 'yes', 'on')
PG_HOST = _clean_env_text('PG_HOST', '127.0.0.1') or '127.0.0.1'
PG_PORT = int(_clean_env_text('PG_PORT', '5432') or '5432')
PG_DB = _clean_env_text('PG_DB', 'surebet') or 'surebet'
PG_USER = _clean_env_text('PG_USER', 'postgres') or 'postgres'
PG_PASSWORD = _clean_env_text('PG_PASSWORD', '')
PG_SSLMODE = _clean_env_text('PG_SSLMODE', 'prefer') or 'prefer'
PG_RETENTION_DAYS = max(1, int(os.getenv('PG_RETENTION_DAYS', '365')))
PG_CLEANUP_INTERVAL_SEC = max(60, int(os.getenv('PG_CLEANUP_INTERVAL_SEC', '60')))
PG_QUERY_DEFAULT_PAGE_SIZE = 100
PG_QUERY_MAX_PAGE_SIZE = 500
SOCKET_BROADCAST_MAX_ROWS = max(100, int(os.getenv('SOCKET_BROADCAST_MAX_ROWS', '5000')))
SCRAPER_PG_FEED_TABLE = os.getenv('SCRAPER_PG_FEED_TABLE', 'scraper_arbs_current').strip() or 'scraper_arbs_current'
if not re.match(r'^[A-Za-z_][A-Za-z0-9_]*$', SCRAPER_PG_FEED_TABLE):
    SCRAPER_PG_FEED_TABLE = 'scraper_arbs_current'
PG_FEED_POLL_INTERVAL_SEC = max(0.01, float(os.getenv('PG_FEED_POLL_INTERVAL_SEC', str(JSON_POLL_INTERVAL_SEC))))
PG_FEED_MAX_ROWS = max(100, int(os.getenv('PG_FEED_MAX_ROWS', '50000')))

_PG_CURRENT_STALE_SEC_ENV = os.getenv('PG_CURRENT_STALE_SEC')
if _PG_CURRENT_STALE_SEC_ENV is not None and str(_PG_CURRENT_STALE_SEC_ENV).strip() != '':
    PG_CURRENT_STALE_SEC = max(60, int(float(_PG_CURRENT_STALE_SEC_ENV)))
else:
    _PG_CURRENT_STALE_HOURS_ENV = os.getenv('PG_CURRENT_STALE_HOURS')
    if _PG_CURRENT_STALE_HOURS_ENV is not None and str(_PG_CURRENT_STALE_HOURS_ENV).strip() != '':
        PG_CURRENT_STALE_SEC = max(60, int(float(_PG_CURRENT_STALE_HOURS_ENV) * 3600))
    else:
        # Padrao alinhado com cache antigo em memoria: janelas curtas de "tempo real".
        PG_CURRENT_STALE_SEC = max(60, int(ARBS_RETENTION_SEC if ARBS_RETENTION_SEC > 0 else 900))

# --- Socket.IO Setup ---
# Cors allowed origins * to prevent issues with Electron file:// or localhost
sio = socketio.AsyncServer(async_mode='aiohttp', cors_allowed_origins='*')
app = web.Application()
sio.attach(app)

# --- Global State ---
last_mtime = 0
last_json_read_error_ts = 0.0
last_pg_feed_error_ts = 0.0
BOOKMAKERS_REF_MAP = {}
SPORTS_REF_MAP = {}
PERIODS_REF_MAP = {}
PERIOD_TRANSLATIONS_REF_MAP = {}
MARKET_VARIATION_TITLE_MAP = {}
MARKET_VARIATION_MARKET_ID_MAP = {}
MARKET_ID_NEED_VALUE_MAP = {}
BOOKMAKER_PARENT_BY_ID = {}
BOOKMAKER_FAMILY_NAMES = {}
BOOKMAKER_FAMILY_IDS = {}
ALLOWED_BOOKMAKER_DISPLAY_NAMES = []
ALLOWED_BOOKMAKER_URL_BY_NAME = {}
ALLOWED_BOOKMAKER_NAME_BY_HOST = {}
LIVE_ARBS_CACHE = {}
PREFILTER_OPTIONS = {"houses": [], "sports": []}
UNKNOWN_BOOKMAKER_IDS_SEEN = set()

# Bloqueio de nomes explicitamente indesejados.
# Mantemos curto por padrao para nao "achatar" o feed.
PARENT_BLOCK_BOOKMAKERS_RAW = os.getenv(
    'PARENT_BLOCK_BOOKMAKERS',
    'winner,lsbet,888sport',
)
PARENT_BLOCK_BOOKMAKERS = {
    re.sub(r'\s+', ' ', str(x or '').strip().lower())
    for x in str(PARENT_BLOCK_BOOKMAKERS_RAW).split(',')
    if str(x or '').strip()
}
ALLOWED_BOOKMAKER_IDS = set()
ALLOWED_BOOKMAKER_NAMES = set()
PG_CONN = None
PG_CONN_LOCK = threading.RLock()
PG_LAST_CLEANUP_TS = 0.0
LAST_PG_FEED_SIGNATURE = None
DIRECT_LINK_CACHE = {}
DIRECT_LINK_CACHE_LOCK = threading.Lock()

def _normalize_endpoint_url(value):
    txt = str(value or '').strip()
    if not txt:
        return ''
    if not re.match(r'^https?://', txt, flags=re.IGNORECASE):
        return ''
    return txt

def panel_auth_endpoints():
    out = []
    primary = _normalize_endpoint_url(PANEL_AUTH_ENDPOINT)
    if primary:
        out.append(primary)
    if PANEL_AUTH_ENDPOINT_FALLBACKS:
        for raw in re.split(r'[,\n;]+', str(PANEL_AUTH_ENDPOINT_FALLBACKS)):
            candidate = _normalize_endpoint_url(raw)
            if candidate and candidate not in out:
                out.append(candidate)
    return out

def call_panel_auth(email, password):
    payload_raw = json.dumps({
        "email": str(email or '').strip().lower(),
        "password": str(password or ''),
    }).encode('utf-8')
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Octosure-V2-Auth/1.0",
        PANEL_AUTH_LOOP_HEADER: PANEL_AUTH_LOOP_VALUE,
    }

    endpoints = panel_auth_endpoints()
    if not endpoints:
        return 502, {"message": "PANEL_AUTH_ENDPOINT invalido ou vazio."}

    last_error = None
    for endpoint in endpoints:
        req = Request(endpoint, data=payload_raw, headers=headers, method='POST')
        try:
            with urlopen(req, timeout=PANEL_AUTH_TIMEOUT_SEC) as resp:
                status_code = int(getattr(resp, 'status', 200) or 200)
                raw = resp.read() or b''
        except HTTPError as e:
            status_code = int(getattr(e, 'code', 502) or 502)
            try:
                raw = e.read() or b''
            except Exception:
                raw = b''
        except Exception as e:
            last_error = f"{endpoint} -> {type(e).__name__}: {e}"
            continue

        text = raw.decode('utf-8', errors='replace').strip() if raw else ''
        try:
            panel_resp = json.loads(text) if text else {}
        except Exception:
            panel_resp = {"message": text or f"Resposta invalida do endpoint {endpoint}."}

        # Endpoint apontando para o proprio /api/auth/login do V2 cria loop.
        # Nesse caso, tentamos proximo fallback.
        if (
            status_code == 502
            and isinstance(panel_resp, dict)
            and 'loop de autenticacao detectado' in str(panel_resp.get('message') or '').strip().lower()
        ):
            last_error = f"{endpoint} -> loop de autenticacao"
            continue

        # Endpoints comuns errados: 404/405. Tenta fallback seguinte.
        if status_code in (404, 405):
            last_error = f"{endpoint} -> HTTP {status_code}"
            continue

        return status_code, panel_resp if isinstance(panel_resp, dict) else {"message": "Resposta invalida do painel."}

    return 502, {"message": f"Falha ao autenticar no painel. {last_error or 'Nenhum endpoint respondeu.'}"}

async def api_auth_login(request):
    if str(request.headers.get(PANEL_AUTH_LOOP_HEADER, '')).strip() == PANEL_AUTH_LOOP_VALUE:
        return web.json_response(
            {
                "message": (
                    "Loop de autenticacao detectado. Ajuste PANEL_AUTH_ENDPOINT para o endpoint real do painel "
                    "(ex.: /painel/api/auth/login.php)."
                )
            },
            status=502
        )

    try:
        data = await request.json()
    except Exception:
        return web.json_response({"message": "JSON invalido."}, status=400)

    email = str((data or {}).get("email") or "").strip().lower()
    password = str((data or {}).get("password") or "")
    if not email or not password:
        return web.json_response({"message": "Informe e-mail e senha."}, status=400)

    status_code, panel_resp = await asyncio.to_thread(call_panel_auth, email, password)
    if not isinstance(panel_resp, dict):
        panel_resp = {"message": "Resposta invalida do painel."}

    # Mantem compatibilidade com o frontend Electron (raw.data ou raw)
    if status_code >= 400:
        msg = panel_resp.get("message") or panel_resp.get("error") or "E-mail ou senha invalidos."
        out = {"message": msg}
        code = panel_resp.get("code")
        renew = panel_resp.get("renew")
        if isinstance(code, str) and code.strip():
            out["code"] = code.strip()
        if isinstance(renew, dict):
            out["renew"] = renew
        response_status = status_code if status_code in (400, 401, 403) else 502
        return web.json_response(out, status=response_status)

    if "data" in panel_resp and isinstance(panel_resp.get("data"), dict):
        data_obj = panel_resp.get("data")
        socket_key = data_obj.get("socketKey")
    else:
        data_obj = panel_resp
        socket_key = data_obj.get("socketKey")
    user_obj = data_obj.get("user") if isinstance(data_obj, dict) else None

    if not socket_key:
        return web.json_response({"message": "Painel nao retornou socketKey."}, status=502)

    return web.json_response({
        "success": True,
        "data": {
            "socketKey": socket_key,
            "user": user_obj if isinstance(user_obj, dict) else None,
        }
    })

def query_int_param(request, name, default, min_value=1, max_value=100000):
    raw = request.query.get(name, str(default))
    try:
        value = int(str(raw).strip())
    except Exception:
        value = default
    value = max(min_value, value)
    value = min(max_value, value)
    return value

async def api_arbs_current(request):
    if not pg_runtime_enabled():
        return web.json_response({
            "ok": False,
            "message": "Postgres desativado ou driver psycopg2 indisponivel."
        }, status=503)

    page = query_int_param(request, 'page', 1, 1, 1000000)
    page_size = query_int_param(request, 'page_size', PG_QUERY_DEFAULT_PAGE_SIZE, 1, PG_QUERY_MAX_PAGE_SIZE)
    subtab = request.query.get('subtab', 'all')

    result = await asyncio.to_thread(query_arbs_from_postgres, 'arbs_current', page, page_size, subtab, None)
    items = result.get('items') or []
    try:
        items = await asyncio.to_thread(sanitize_prebuilt_arbs, items)
    except Exception as exc:
        print(f"[Warn] sanitize_prebuilt_arbs failed in /api/arbs/current: {exc}")

    total = int(result.get('total') or 0)
    total_pages = max(1, (total + page_size - 1) // page_size)

    return web.json_response({
        "ok": True,
        "source": "postgres",
        "table": "arbs_current",
        "page": page,
        "pageSize": page_size,
        "total": total,
        "totalPages": total_pages,
        "items": items,
    })

async def api_arbs_history(request):
    if not pg_runtime_enabled():
        return web.json_response({
            "ok": False,
            "message": "Postgres desativado ou driver psycopg2 indisponivel."
        }, status=503)

    page = query_int_param(request, 'page', 1, 1, 1000000)
    page_size = query_int_param(request, 'page_size', PG_QUERY_DEFAULT_PAGE_SIZE, 1, PG_QUERY_MAX_PAGE_SIZE)
    subtab = request.query.get('subtab', 'all')
    days = query_int_param(request, 'days', PG_RETENTION_DAYS, 1, 3650)

    result = await asyncio.to_thread(query_arbs_from_postgres, 'arbs_history', page, page_size, subtab, days)
    items = result.get('items') or []
    try:
        items = await asyncio.to_thread(sanitize_prebuilt_arbs, items)
    except Exception as exc:
        print(f"[Warn] sanitize_prebuilt_arbs failed in /api/arbs/history: {exc}")

    total = int(result.get('total') or 0)
    total_pages = max(1, (total + page_size - 1) // page_size)

    return web.json_response({
        "ok": True,
        "source": "postgres",
        "table": "arbs_history",
        "page": page,
        "pageSize": page_size,
        "days": days,
        "total": total,
        "totalPages": total_pages,
        "items": items,
    })

def to_int_or_none(value):
    try:
        if value is None or isinstance(value, bool):
            return None
        return int(str(value).strip())
    except (TypeError, ValueError):
        return None


def to_bool_or_none(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return bool(int(value))
    txt = str(value or '').strip().lower()
    if txt in {'1', 'true', 'yes', 'y', 'on'}:
        return True
    if txt in {'0', 'false', 'no', 'n', 'off'}:
        return False
    return None

def normalize_match_text(value):
    if value is None:
        return ''
    return re.sub(r'\s+', ' ', str(value).strip().lower())


CLONE_DISPLAY_NAME_ALIASES = {
    "Bet365": ["bet365", "bet365.bet.br"],
    "Betano": ["betano", "betano.bet.br"],
    "Pinnacle": ["pinnacle", "pinnacle.bet.br"],
    "SuperbetBR": ["superbet", "superbet.bet.br", "superbet.com"],
    "Novibet": ["novibet", "novibet.bet.br"],
    "Betboo": ["betboo", "betboo.bet.br"],
    "Sportingbet.bet.br": ["sportingbet", "sportingbet.bet.br", "sports.sportingbet.bet.br"],
    "BetfairBR": ["betfairbr", "betfair.bet.br", "betfair"],
    "Betwarrior": ["betwarrior", "international.betwarrior.bet", "apostas.betwarrior.bet.br"],
    "Kto.bet.br": ["kto", "kto.bet.br"],
    "Stake.bet.br": ["stake", "stake.bet.br"],
    "7games": ["7games", "7games.bet", "7games.bet.br"],
    "Betao.bet.br": ["betao", "betao.bet.br"],
    "MaximaBet": ["maximabet", "maxima.bet.br"],
    "Playpix": ["playpix", "playpix.com"],
    "r7.bet.br": ["r7", "r7.bet.br"],
    "Supremabet": ["supremabet", "suprema.bet.br"],
    "Seguro.bet.br": ["seguro", "seguro.bet.br"],
    "Ultra.bet.br": ["ultra", "ultra.bet.br"],
    "Bravo.bet.br": ["bravo", "bravo.bet.br"],
    "H2.bet.br": ["h2", "h2.bet.br"],
    "Seu.bet.br": ["seu.bet.br", "seu", "seubet"],
    "BetssonBR": ["betssonbr", "betsson.bet.br"],
    "Betfusion": ["betfusion", "betfusion.bet.br"],
    "Br4bet": ["br4bet", "br4.bet.br"],
    "EstrelaBet": ["estrelabet", "estrelabet.bet.br"],
    "Jogodeouro": ["jogodeouro", "jogodeouro.bet.br"],
    "LotogreenBR": ["lotogreenbr", "lotogreen.bet.br"],
    "Mcgames.bet.br": ["mcgames", "mcgames.bet.br"],
    "Sorteonline.bet.br": ["sorteonline", "sorteonline.bet.br"],
    "Lottoland.bet.br": ["lottoland", "lottoland.bet.br"],
    "Vupi.bet.br": ["vupi", "vupi.bet.br"],
    "Up.bet.br": ["up.bet", "up.bet.br"],
    "Brbet.bet.br": ["brbet", "brbet.bet.br"],
    "Apostou.bet.br": ["apostou", "apostou.bet.br"],
    "Goldebet.bet.br": ["goldebet", "goldebet.bet.br"],
    "Aviao.bet.br": ["aviao", "aviao.bet.br"],
    "Multi.bet.br": ["multi.bet", "multi.bet.br"],
    "Brasildasorte.bet.br": ["brasildasorte", "brasildasorte.bet.br"],
    "Aposta1.bet.br": ["aposta1", "aposta1.bet.br"],
    "Aposta.bet.br": ["aposta.bet.br", "aposta.bet", "apostabet"],
    "Fazo.bet.br": ["fazo.bet.br", "fazo.bet", "fazo"],
    "Bet4.bet.br": ["bet4.bet.br", "bet4.bet", "bet4"],
    "Sporty.bet.br": ["sporty.bet.br", "sporty.bet", "sporty"],
    "NovibetGR": ["novibetgr", "novibet.gr"],
    "Apostaganha": ["apostaganha", "apostaganha.bet.br"],
    "Betvip": ["betvip", "betvip.bet.br"],
    "Betbra.bet.br": ["betbra", "betbra.bet.br"],
    "Kingpanda.bet.br": ["kingpanda", "kingpanda.bet.br"],
    "Blaze.bet.br": ["blaze", "blaze.bet.br"],
    "Flabet": ["flabet", "flabet.bet.br"],
    "Jonbet.bet.br": ["jonbet", "jonbet.bet.br"],
    "Reals.bet.br": ["reals", "reals.bet.br"],
    "Bingo.bet.br": ["bingo", "bingo.bet.br"],
    "Pin.bet.br": ["pinbet", "pin.bet.br"],
    "Bateu.bet.br": ["bateubet", "bateu.bet.br"],
    "Betdasorte": ["betdasorte", "betdasorte.bet.br"],
    "Betmillion": ["betmillion", "betmillion.io"],
    "Brxbet": ["brxbet", "brx.bet.br"],
    "Bullsbet": ["bullsbet", "bullsbet.bet.br"],
    "Cassino.bet.br": ["cassinobet", "cassino.bet.br"],
    "Donald.bet.br": ["donaldbet", "donald.bet.br"],
    "Esportiva.bet.br": ["esportiva", "esportiva.bet.br"],
    "Pagol.bet.br": ["pagolbet", "pagol.bet.br"],
    "PixbetBR": ["pixbetbr", "pix.bet.br"],
    "Ricobet": ["ricobet", "rico.bet.br"],
    "Sortenabet.bet.br": ["sortenabet", "sortenabet.bet.br"],
    "Verabet": ["verabet", "vera.bet.br"],
    "1pra1": ["1pra1", "1pra1.bet.br"],
    "Esporte365": ["esporte365", "esporte365.bet.br"],
    "LuvaBet": ["luvabet", "luva.bet.br"],
    "Onabet": ["onabet", "ona.bet.br"],
    "Start": ["start", "start.bet.br"],
    "Big.bet.br": ["bigbet", "big.bet.br"],
    "BetFast": ["betfast", "betfast.bet.br"],
    "Faz1.bet.br": ["faz1", "faz1.bet.br"],
    "Tivo.bet.br": ["tivo", "tivo.bet.br"],
    "BetmgmBR": ["betmgmbr", "betmgm.bet.br"],
}


def build_clone_display_name_map():
    display_map = {}
    for canonical, aliases in CLONE_DISPLAY_NAME_ALIASES.items():
        for raw in [canonical] + list(aliases or []):
            key = normalize_match_text(raw)
            if key and key not in display_map:
                display_map[key] = canonical
    return display_map


CLONE_DISPLAY_NAME_MAP = build_clone_display_name_map()


def canonical_clone_display_name(value):
    raw = str(value or '').strip()
    if not raw:
        return ''
    key = normalize_match_text(raw)

    candidates = [key]
    if key.startswith('www.'):
        candidates.append(key[4:])

    prefixed_candidates = []
    for candidate in list(candidates):
        for prefix in ('sports.', 'apostas.', 'international.'):
            if candidate.startswith(prefix):
                prefixed_candidates.append(candidate[len(prefix):])
    candidates.extend(prefixed_candidates)

    seen = set()
    for candidate in candidates:
        if not candidate or candidate in seen:
            continue
        seen.add(candidate)
        canonical = CLONE_DISPLAY_NAME_MAP.get(candidate)
        if canonical:
            return canonical

    return raw


def _extract_host_or_domain_text(value):
    txt = str(value or '').strip()
    if not txt:
        return ''

    host = _normalize_redirect_host(txt)
    if host:
        return host

    if re.match(r'^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}(?:/.*)?$', txt, flags=re.I):
        candidate = txt.split('/', 1)[0].strip().lower()
        if candidate.startswith('www.'):
            candidate = candidate[4:]
        return candidate

    return ''


def resolve_bookmaker_display_name(raw_name, fallback_root=None, event_link=''):
    raw_txt = str(raw_name or '').strip()
    if not raw_txt:
        return ''

    direct_canonical = canonical_clone_display_name(raw_txt)
    if normalize_match_text(direct_canonical) != normalize_match_text(raw_txt):
        return direct_canonical

    host_candidates = []
    host_from_name = _extract_host_or_domain_text(raw_txt)
    if host_from_name:
        host_candidates.append(host_from_name)

    host_from_link = _extract_host_or_domain_text(event_link)
    if host_from_link:
        host_candidates.append(host_from_link)

    seen_hosts = set()
    for host in host_candidates:
        host_norm = normalize_match_text(host)
        if not host_norm or host_norm in seen_hosts:
            continue
        seen_hosts.add(host_norm)

        mapped_from_allowed = ALLOWED_BOOKMAKER_NAME_BY_HOST.get(host_norm, '')
        if mapped_from_allowed:
            return canonical_clone_display_name(mapped_from_allowed) or mapped_from_allowed

        canonical_host = canonical_clone_display_name(host)
        if normalize_match_text(canonical_host) != host_norm:
            return canonical_host

    root_id = to_int_or_none(fallback_root)
    if root_id is not None:
        mapped_root = str(BOOKMAKERS_REF_MAP.get(root_id) or '').strip()
        if mapped_root:
            return canonical_clone_display_name(mapped_root) or mapped_root

    return direct_canonical or raw_txt


def is_hidden_period_label(value):
    norm = normalize_match_text(value)
    return norm in {'hidden period', 'hidden'}


def is_generic_ordinal_period_label(value):
    norm = normalize_match_text(value)
    return norm in {'1st', '2nd', '3rd', '4th', '5th', '1', '2', '3', '4', '5'}


def dedupe_sorted_names(names):
    seen = set()
    out = []
    for raw in names:
        txt = str(raw or '').strip()
        if not txt:
            continue
        key = normalize_match_text(txt)
        if not key or key in seen:
            continue
        seen.add(key)
        out.append(txt)
    out.sort(key=lambda s: s.lower())
    return out

def append_unique_name(names_list, value):
    txt = str(value or '').strip()
    if not txt:
        return
    key = normalize_match_text(txt)
    if not key:
        return
    for existing in names_list:
        if normalize_match_text(existing) == key:
            return
    names_list.append(txt)
    names_list.sort(key=lambda s: s.lower())

def resolve_family_root(bookmaker_id):
    if bookmaker_id is None:
        return None
    current = bookmaker_id
    visited = set()
    while current not in visited:
        visited.add(current)
        parent = BOOKMAKER_PARENT_BY_ID.get(current)
        if parent is None or parent == current:
            return current
        current = parent
    return bookmaker_id

def pg_runtime_enabled():
    return PG_ENABLED and psycopg2 is not None and execute_values is not None and Json is not None

def pg_connect():
    global PG_CONN
    if not pg_runtime_enabled():
        return None
    with PG_CONN_LOCK:
        if PG_CONN is not None:
            try:
                if getattr(PG_CONN, 'closed', 1) == 0:
                    return PG_CONN
            except Exception:
                pass
        try:
            PG_CONN = psycopg2.connect(
                host=PG_HOST,
                port=PG_PORT,
                dbname=PG_DB,
                user=PG_USER,
                password=PG_PASSWORD,
                sslmode=PG_SSLMODE,
            )
            PG_CONN.autocommit = False
            return PG_CONN
        except Exception as e:
            print(f"[Warn] Postgres connect failed: {e}")
            PG_CONN = None
            return None

def pg_connect_fresh():
    if not pg_runtime_enabled():
        return None
    try:
        conn = psycopg2.connect(
            host=PG_HOST,
            port=PG_PORT,
            dbname=PG_DB,
            user=PG_USER,
            password=PG_PASSWORD,
            sslmode=PG_SSLMODE,
        )
        conn.autocommit = False
        return conn
    except Exception as e:
        print(f"[Warn] Postgres fresh connect failed: {e}")
        return None

def pg_close_conn():
    global PG_CONN
    with PG_CONN_LOCK:
        try:
            if PG_CONN is not None and getattr(PG_CONN, 'closed', 1) == 0:
                PG_CONN.close()
        except Exception:
            pass
        PG_CONN = None

def parse_any_to_dt(value):
    if value is None or value == '':
        return None
    try:
        if isinstance(value, (int, float)):
            numeric = float(value)
            if numeric > 1e12:
                numeric /= 1000.0
            return datetime.fromtimestamp(numeric, timezone.utc)

        txt = str(value).strip()
        if not txt:
            return None

        try:
            numeric = float(txt)
            if numeric > 1e12:
                numeric /= 1000.0
            return datetime.fromtimestamp(numeric, timezone.utc)
        except Exception:
            pass

        if txt.endswith('Z'):
            txt = txt[:-1] + '+00:00'
        dt = datetime.fromisoformat(txt)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        return None

def hash_arb_payload(arb):
    try:
        payload = json.dumps(arb, sort_keys=True, ensure_ascii=False, separators=(',', ':'))
    except Exception:
        payload = str(arb)
    return hashlib.sha1(payload.encode('utf-8', errors='replace')).hexdigest()

def build_pg_row_tuple(cache_key, arb, now_dt):
    bet1 = arb.get('bet1') if isinstance(arb, dict) else {}
    bet2 = arb.get('bet2') if isinstance(arb, dict) else {}
    if not isinstance(bet1, dict):
        bet1 = {}
    if not isinstance(bet2, dict):
        bet2 = {}

    row_hash = hash_arb_payload(arb)
    received_at = parse_any_to_dt(arb.get('receivedAt') if isinstance(arb, dict) else None)
    starts_at = parse_any_to_dt(arb.get('startsAt') if isinstance(arb, dict) else None)

    return (
        cache_key,
        row_hash,
        now_dt,   # first_seen (new row)
        now_dt,   # last_seen
        now_dt,   # updated_at
        str(arb.get('arbId') or '') if isinstance(arb, dict) else '',
        bool(arb.get('isLive')) if isinstance(arb, dict) and isinstance(arb.get('isLive'), bool) else None,
        received_at,
        starts_at,
        str(arb.get('sportName') or '') if isinstance(arb, dict) else '',
        str(bet1.get('eventName') or bet2.get('eventName') or '')[:512],
        float(arb.get('percentage')) if isinstance(arb, dict) and arb.get('percentage') is not None else None,
        str(bet1.get('bookmaker') or '')[:255],
        float(bet1.get('odd')) if bet1.get('odd') is not None else None,
        str(bet1.get('entryType') or '')[:255],
        str(bet2.get('bookmaker') or '')[:255],
        float(bet2.get('odd')) if bet2.get('odd') is not None else None,
        str(bet2.get('entryType') or '')[:255],
        to_int_or_none(arb.get('bookmakerFamilyRoot1') if isinstance(arb, dict) else None),
        to_int_or_none(arb.get('bookmakerFamilyRoot2') if isinstance(arb, dict) else None),
        Json(arb),
    )

def init_postgres_schema():
    conn = pg_connect()
    if conn is None:
        return False
    ddl = """
    CREATE TABLE IF NOT EXISTS arbs_current (
        cache_key TEXT PRIMARY KEY,
        row_hash TEXT NOT NULL,
        first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        arb_id TEXT,
        is_live BOOLEAN,
        received_at TIMESTAMPTZ NULL,
        starts_at TIMESTAMPTZ NULL,
        sport_name TEXT,
        event_name TEXT,
        percentage DOUBLE PRECISION NULL,
        bookmaker1 TEXT,
        odd1 DOUBLE PRECISION NULL,
        entry1 TEXT,
        bookmaker2 TEXT,
        odd2 DOUBLE PRECISION NULL,
        entry2 TEXT,
        family_root1 BIGINT NULL,
        family_root2 BIGINT NULL,
        payload JSONB NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_arbs_current_last_seen ON arbs_current(last_seen DESC);
    CREATE INDEX IF NOT EXISTS idx_arbs_current_is_live ON arbs_current(is_live);
    CREATE INDEX IF NOT EXISTS idx_arbs_current_sport ON arbs_current(sport_name);

    CREATE TABLE IF NOT EXISTS arbs_history (
        id BIGSERIAL PRIMARY KEY,
        cache_key TEXT NOT NULL,
        row_hash TEXT NOT NULL,
        seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        arb_id TEXT,
        is_live BOOLEAN,
        received_at TIMESTAMPTZ NULL,
        starts_at TIMESTAMPTZ NULL,
        sport_name TEXT,
        event_name TEXT,
        percentage DOUBLE PRECISION NULL,
        bookmaker1 TEXT,
        odd1 DOUBLE PRECISION NULL,
        entry1 TEXT,
        bookmaker2 TEXT,
        odd2 DOUBLE PRECISION NULL,
        entry2 TEXT,
        family_root1 BIGINT NULL,
        family_root2 BIGINT NULL,
        payload JSONB NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_arbs_history_seen_at ON arbs_history(seen_at DESC);
    CREATE INDEX IF NOT EXISTS idx_arbs_history_is_live ON arbs_history(is_live);
    CREATE INDEX IF NOT EXISTS idx_arbs_history_cache_key ON arbs_history(cache_key);
    """
    try:
        with PG_CONN_LOCK:
            with conn.cursor() as cur:
                cur.execute(ddl)
            conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        print(f"[Warn] Postgres schema init failed: {e}")
        return False

def init_postgres_raw_feed_schema():
    """
    Tabela de entrada bruta do scraper (ARBS_SOURCE_MODE=postgres_raw).
    """
    conn = pg_connect()
    if conn is None:
        return False
    ddl = f"""
    CREATE TABLE IF NOT EXISTS {SCRAPER_PG_FEED_TABLE} (
        cache_key TEXT PRIMARY KEY,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        is_live BOOLEAN NULL,
        arb_id TEXT NULL,
        percent DOUBLE PRECISION NULL,
        sport TEXT NULL,
        event_name TEXT NULL,
        captured_at TIMESTAMPTZ NULL,
        payload JSONB NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_{SCRAPER_PG_FEED_TABLE}_updated_at ON {SCRAPER_PG_FEED_TABLE}(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_{SCRAPER_PG_FEED_TABLE}_is_live ON {SCRAPER_PG_FEED_TABLE}(is_live);
    """
    try:
        with PG_CONN_LOCK:
            with conn.cursor() as cur:
                cur.execute(ddl)
            conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        print(f"[Warn] Postgres raw feed schema init failed: {e}")
        return False

def maybe_cleanup_postgres(now_ts=None):
    global PG_LAST_CLEANUP_TS
    if not pg_runtime_enabled():
        return
    ts = now_ts if now_ts is not None else time.time()
    if (ts - PG_LAST_CLEANUP_TS) < PG_CLEANUP_INTERVAL_SEC:
        return
    conn = pg_connect()
    if conn is None:
        return
    try:
        with PG_CONN_LOCK:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM arbs_history WHERE seen_at < NOW() - (%s * INTERVAL '1 day')",
                    (PG_RETENTION_DAYS,),
                )
                cur.execute(
                    "DELETE FROM arbs_current WHERE last_seen < NOW() - (%s * INTERVAL '1 second')",
                    (PG_CURRENT_STALE_SEC,),
                )
            conn.commit()
        PG_LAST_CLEANUP_TS = ts
    except Exception as e:
        conn.rollback()
        print(f"[Warn] Postgres cleanup failed: {e}")
        pg_close_conn()

def persist_rows_to_postgres(rows, replace_current=False):
    """
    Salva estado atual em arbs_current e historico (somente quando linha nova/alterada) em arbs_history.
    """
    if not pg_runtime_enabled():
        maybe_cleanup_postgres()
        return

    conn = pg_connect()
    if conn is None:
        return

    if not rows:
        try:
            if replace_current:
                with PG_CONN_LOCK:
                    with conn.cursor() as cur:
                        cur.execute("DELETE FROM arbs_current")
                    conn.commit()
        except Exception as e:
            conn.rollback()
            print(f"[Warn] Postgres clear current failed: {e}")
            pg_close_conn()
        finally:
            maybe_cleanup_postgres()
        return

    now_dt = datetime.now(timezone.utc)
    tuples = []
    key_order = []
    for arb in rows:
        if not isinstance(arb, dict):
            continue
        cache_key = make_arb_cache_key(arb)
        key_order.append(cache_key)
        tuples.append(build_pg_row_tuple(cache_key, arb, now_dt))
    if not tuples:
        maybe_cleanup_postgres()
        return

    existing_hash = {}
    try:
        with PG_CONN_LOCK:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT cache_key, row_hash FROM arbs_current WHERE cache_key = ANY(%s)",
                    (list(dict.fromkeys(key_order)),),
                )
                for key, row_hash in cur.fetchall():
                    existing_hash[key] = row_hash

                upsert_sql = """
                INSERT INTO arbs_current (
                    cache_key, row_hash, first_seen, last_seen, updated_at,
                    arb_id, is_live, received_at, starts_at, sport_name, event_name, percentage,
                    bookmaker1, odd1, entry1, bookmaker2, odd2, entry2, family_root1, family_root2, payload
                ) VALUES %s
                ON CONFLICT (cache_key) DO UPDATE SET
                    row_hash = EXCLUDED.row_hash,
                    last_seen = EXCLUDED.last_seen,
                    updated_at = CASE
                        WHEN arbs_current.row_hash IS DISTINCT FROM EXCLUDED.row_hash THEN EXCLUDED.updated_at
                        ELSE arbs_current.updated_at
                    END,
                    arb_id = EXCLUDED.arb_id,
                    is_live = EXCLUDED.is_live,
                    received_at = EXCLUDED.received_at,
                    starts_at = EXCLUDED.starts_at,
                    sport_name = EXCLUDED.sport_name,
                    event_name = EXCLUDED.event_name,
                    percentage = EXCLUDED.percentage,
                    bookmaker1 = EXCLUDED.bookmaker1,
                    odd1 = EXCLUDED.odd1,
                    entry1 = EXCLUDED.entry1,
                    bookmaker2 = EXCLUDED.bookmaker2,
                    odd2 = EXCLUDED.odd2,
                    entry2 = EXCLUDED.entry2,
                    family_root1 = EXCLUDED.family_root1,
                    family_root2 = EXCLUDED.family_root2,
                    payload = EXCLUDED.payload
                """
                execute_values(cur, upsert_sql, tuples, page_size=1000)

                if replace_current:
                    unique_keys = list(dict.fromkeys(key_order))
                    if unique_keys:
                        cur.execute(
                            "DELETE FROM arbs_current WHERE cache_key <> ALL(%s)",
                            (unique_keys,),
                        )
                    else:
                        cur.execute("DELETE FROM arbs_current")

                changed_rows = []
                for row in tuples:
                    key = row[0]
                    row_hash = row[1]
                    prev_hash = existing_hash.get(key)
                    if prev_hash != row_hash:
                        changed_rows.append(row)

                if changed_rows:
                    history_rows = [
                        (
                            r[0],  # cache_key
                            r[1],  # row_hash
                            now_dt,  # seen_at
                            r[5],  # arb_id
                            r[6],  # is_live
                            r[7],  # received_at
                            r[8],  # starts_at
                            r[9],  # sport_name
                            r[10], # event_name
                            r[11], # percentage
                            r[12], # bookmaker1
                            r[13], # odd1
                            r[14], # entry1
                            r[15], # bookmaker2
                            r[16], # odd2
                            r[17], # entry2
                            r[18], # family_root1
                            r[19], # family_root2
                            r[20], # payload
                        )
                        for r in changed_rows
                    ]
                    history_sql = """
                    INSERT INTO arbs_history (
                        cache_key, row_hash, seen_at, arb_id, is_live, received_at, starts_at,
                        sport_name, event_name, percentage, bookmaker1, odd1, entry1,
                        bookmaker2, odd2, entry2, family_root1, family_root2, payload
                    ) VALUES %s
                    """
                    execute_values(cur, history_sql, history_rows, page_size=1000)

            conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"[Warn] Postgres persist failed: {e}")
        pg_close_conn()
    finally:
        maybe_cleanup_postgres(time.time())

def get_rows_for_socket():
    if pg_runtime_enabled():
        result = query_arbs_from_postgres(
            'arbs_current',
            page=1,
            page_size=SOCKET_BROADCAST_MAX_ROWS,
            subtab='all',
            days=None,
        )
        return result.get('items') or []
    return get_live_cache_rows()

def query_arbs_from_postgres(table_name, page, page_size, subtab='all', days=None):
    if table_name not in ('arbs_current', 'arbs_history'):
        raise ValueError('table invalida')
    conn = pg_connect_fresh()
    if conn is None:
        return {'items': [], 'total': 0}

    where = []
    params = []

    subtab_norm = str(subtab or 'all').strip().lower()
    if subtab_norm == 'live':
        where.append("is_live = TRUE")
    elif subtab_norm in ('pre-live', 'prelive', 'prematch'):
        where.append("is_live = FALSE")

    if table_name == 'arbs_history' and days is not None:
        where.append("seen_at >= NOW() - (%s * INTERVAL '1 day')")
        params.append(int(days))

    where_sql = f"WHERE {' AND '.join(where)}" if where else ""
    offset = max(0, (int(page) - 1) * int(page_size))

    order_field = 'last_seen' if table_name == 'arbs_current' else 'seen_at'
    sql_count = f"SELECT COUNT(*) FROM {table_name} {where_sql}"
    sql_data = f"""
        SELECT payload
        FROM {table_name}
        {where_sql}
        ORDER BY {order_field} DESC
        LIMIT %s OFFSET %s
    """
    try:
        with conn.cursor() as cur:
            cur.execute(sql_count, tuple(params))
            total = int(cur.fetchone()[0] or 0)
            cur.execute(sql_data, tuple(params + [int(page_size), int(offset)]))
            rows = cur.fetchall()
        items = [row[0] for row in rows if row and isinstance(row[0], dict)]
        return {'items': items, 'total': total}
    except Exception as e:
        print(f"[Warn] Postgres query failed ({table_name}): {e}")
        pg_close_conn()
        return {'items': [], 'total': 0}
    finally:
        try:
            conn.close()
        except Exception:
            pass

# Traducao EN -> PT-BR (mantem original quando nao houver traducao definida)
SPORT_NAME_PT_MAP = {
    "Baseball": "Beisebol",
    "Basketball": "Basquete",
    "Handball": "Handebol",
    "Ice Hockey": "Hoquei no Gelo",
    "Hockey": "Hoquei",
    "Soccer": "Futebol",
    "Tennis": "Tenis",
    "Volleyball": "Volei",
    "American Football": "Futebol Americano",
    "Snooker": "Sinuca",
    "Darts": "Dardos",
    "Table Tennis": "Tenis de Mesa",
    "Water Polo": "Polo Aquatico",
    "Martial arts": "Artes Marciais",
    "Field Hockey": "Hoquei sobre a Grama",
    "Other E-Sports": "Outros E-Sports",
    "Chess": "Xadrez",
    "Cricket": "Criquete",
    "Formula 1": "Formula 1",
    "Motorsport": "Automobilismo",
    "Cycling": "Ciclismo",
    "Beach Volleyball": "Volei de Praia",
    "Horse Racing": "Corrida de Cavalos",
    "Biathlon": "Biatlo",
    "Beach Soccer": "Futebol de Areia",
    "E-Soccer": "E-Futebol",
    "E-Basketball": "E-Basquete",
    "Boxing": "Boxe",
}
SPORT_NAME_PT_MAP_NORM = {normalize_match_text(k): v for k, v in SPORT_NAME_PT_MAP.items()}

# Mapeamento basico de codigo de mercado BetBurger -> legenda de aposta.
# Quando nao houver mapeamento, exibimos fallback "T<codigo>(param)".
MARKET_TYPE_LABELS = {
    1: "Team1 Win",
    2: "Team2 Win",
    11: "1",
    12: "X",
    13: "2",
    14: "1X",
    15: "X2",
    16: "12",
    17: "AH1",
    18: "AH2",
    19: "TO",
    20: "TU",
    21: "TO1",
    22: "TU1",
    23: "TO2",
    24: "TU2",
    51: "CNR_TO",
    52: "CNR_TU",
    53: "AUX_TO",
    54: "AUX_TU",
    131: "SET_F1",
    132: "SET_F2",
}

def translate_sport_name_to_pt(value):
    if value is None:
        return value
    raw = str(value).strip()
    if not raw:
        return value
    if raw in SPORT_NAME_PT_MAP:
        return SPORT_NAME_PT_MAP[raw]
    return SPORT_NAME_PT_MAP_NORM.get(normalize_match_text(raw), value)

def format_market_param(value):
    if value is None or value == '':
        return ''
    try:
        raw = str(value).strip().replace(',', '.')
        num = float(raw)
    except (TypeError, ValueError):
        txt = str(value).strip()
        return txt

    if num.is_integer():
        return str(int(num))
    txt = f"{num:.6f}".rstrip('0').rstrip('.')
    return txt or str(num)

def label_from_market_variation_title(variation_title):
    txt = str(variation_title or '').strip().upper()
    if not txt:
        return ''

    parts = [p for p in txt.split('-') if p]
    if not parts:
        return ''

    prefix = parts[0]
    suffix = parts[-1]
    alias = {
        'ML1': 'Team1 Win',
        'ML2': 'Team2 Win',
        'EH1': 'AH1',
        'EH2': 'AH2',
        'F1': 'AH1',
        'F2': 'AH2',
        'SET_TO': 'TO',
        'SET_TU': 'TU',
        'SET_F1': 'AH1',
        'SET_F2': 'AH2',
        'SET_CS': 'CS',
        'SET_CS_N': 'CS_N',
    }
    label = alias.get(suffix, suffix)

    # Ex.: PNT_OU1-TO => TO for Team1 ; PNT_OU2-TU => TU for Team2
    if label in {'TO', 'TU'}:
        if 'OU1' in prefix:
            return f'{label} for Team1'
        if 'OU2' in prefix:
            return f'{label} for Team2'
    return label


def market_code_requires_param(market_code):
    code = to_int_or_none(market_code)
    if code is None:
        return None
    market_id = to_int_or_none(MARKET_VARIATION_MARKET_ID_MAP.get(code))
    if market_id is None:
        return None
    return to_bool_or_none(MARKET_ID_NEED_VALUE_MAP.get(market_id))


def apply_market_param_to_label(label, param_text):
    label = str(label or '').strip()
    if not label:
        return ''
    if not param_text:
        return label

    # Formato visual do BetBurger para handicaps: AH1(+x) / AH2(-x)
    if label in {'AH1', 'AH2'} and not str(param_text).startswith(('+', '-')):
        try:
            n = float(str(param_text).replace(',', '.'))
        except Exception:
            n = None
        if n is not None and n > 0:
            param_text = f'+{param_text}'

    no_param_labels = {'Team1 Win', 'Team2 Win', '1', 'X', '2', '1X', 'X2', '12', 'DNB1', 'DNB2', 'ODD', 'EVEN'}
    if label in no_param_labels:
        return label

    if label.startswith(('TO for Team', 'TU for Team')):
        base, _, side = label.partition(' for ')
        if side:
            return f'{base}({param_text}) for {side}'
    return f'{label}({param_text})'


def pick_first_text(*values):
    for v in values:
        txt = str(v or '').strip()
        if txt:
            return txt
    return ''

def format_market_entry(bet_obj, fallback_label):
    def _is_placeholder_entry_label(value):
        txt = str(value or '').strip()
        if not txt:
            return True
        nm = re.sub(r'\s+', '', txt.lower())
        return nm in {'-', '--', '—', 'na', 'n/a', 'null', 'none', 'm1', 'm2'}

    # Camada visual:
    # 1) usa titulo cru vindo do proprio BetBurger (bc_title/title), quando existir;
    # 2) senao, monta pelo dicionario oficial market_variations + parametro.
    if isinstance(bet_obj, dict):
        # payload cru do BetBurger (quando presente) e a fonte mais fiel
        for raw_title in (bet_obj.get('bc_title'), bet_obj.get('title')):
            txt = str(raw_title or '').strip()
            if txt and not _is_placeholder_entry_label(txt):
                return txt

        market_code = (
            to_int_or_none(bet_obj.get('marketTypeCode'))
            or to_int_or_none(bet_obj.get('market_and_bet_type'))
        )
        if market_code is not None:
            requires_param = market_code_requires_param(market_code)
            mapped_title = str(MARKET_VARIATION_TITLE_MAP.get(market_code) or '').strip()
            if mapped_title:
                label = label_from_market_variation_title(mapped_title) or mapped_title
                market_param = (
                    bet_obj.get('marketParam')
                    if bet_obj.get('marketParam') is not None
                    else bet_obj.get('market_and_bet_type_param')
                )
                param_text = format_market_param(market_param)
                if param_text and requires_param is not False:
                    label = apply_market_param_to_label(label, param_text)
                return label

            base_label = str(MARKET_TYPE_LABELS.get(market_code) or '').strip()
            if base_label:
                market_param = (
                    bet_obj.get('marketParam')
                    if bet_obj.get('marketParam') is not None
                    else bet_obj.get('market_and_bet_type_param')
                )
                param_text = format_market_param(market_param)
                if param_text and requires_param is not False:
                    return apply_market_param_to_label(base_label, param_text)
                return base_label

        raw_title_candidates = (
            bet_obj.get('entryType'),
            bet_obj.get('entry_type'),
        )
        for raw_title in raw_title_candidates:
            txt = str(raw_title or '').strip()
            if txt and not _is_placeholder_entry_label(txt):
                return txt
    fallback_txt = str(fallback_label or '').strip()
    if _is_placeholder_entry_label(fallback_txt):
        return ''
    return fallback_txt


PERIOD_FIXED_LABELS = {
    -3: "match",
    -2: "with OT and SO",
    -1: "with OT",
    10: "1st half",
    20: "2nd half",
}


def resolve_sport_period_kind(sport_text):
    norm = normalize_match_text(sport_text)
    if not norm:
        return ''
    set_tokens = (
        'tenis',
        'tennis',
        'tabletennis',
        'tenisdemesa',
        'badminton',
        'squash',
        'volleyball',
        'volei',
        'voleibol',
        'beachvolleyball',
    )
    map_tokens = (
        'counterstrike',
        'dota2',
        'leagueoflegends',
        'valorant',
        'rainbowsix',
        'callofduty',
        'overwatch',
        'starcraft',
        'warcraft',
        'mobilelegends',
        'arenaofvalor',
        'kingofglory',
        'esports',
        'esoccer',
        'ebasketball',
    )
    if any(tok in norm for tok in set_tokens):
        return 'set'
    if any(tok in norm for tok in map_tokens):
        return 'map'
    return ''


def resolve_sport_id_from_text(sport_text):
    sid_direct = to_int_or_none(sport_text)
    if sid_direct is not None:
        return sid_direct
    norm = normalize_match_text(sport_text)
    if not norm:
        return None
    partial = []
    for sid, sname in SPORTS_REF_MAP.items():
        snorm = normalize_match_text(sname)
        if snorm == norm:
            return sid
        if norm in snorm or snorm in norm:
            partial.append(sid)
    if len(partial) == 1:
        return partial[0]
    return None


def build_period_label(period_identifier, sport_text='', period_title=''):
    pid = to_int_or_none(period_identifier)
    if pid is not None:
        sport_id = resolve_sport_id_from_text(sport_text)
        if sport_id is not None:
            sport_periods = PERIOD_TRANSLATIONS_REF_MAP.get(sport_id)
            if isinstance(sport_periods, dict):
                translated = str(sport_periods.get(pid) or '').strip()
                if translated:
                    return translated
        mapped_title = str(PERIODS_REF_MAP.get(pid) or '').strip()
        if mapped_title:
            return mapped_title
    return str(period_title or '').strip()

def load_reference_maps(path):
    sports_map = {}
    bookmakers_map = {}
    periods_map = {}
    period_translations_map = {}
    market_variation_title_map = {}
    market_variation_market_id_map = {}
    market_id_need_value_map = {}
    family_names = {}
    family_ids = {}
    parent_by_id = {}
    if not path or not os.path.exists(path):
        return (
            sports_map,
            bookmakers_map,
            periods_map,
            period_translations_map,
            market_variation_title_map,
            market_variation_market_id_map,
            market_id_need_value_map,
            family_names,
            family_ids,
            parent_by_id,
        )
    try:
        with open(path, 'r', encoding='utf-8', errors='replace') as f:
            lines = f.readlines()
    except Exception:
        return (
            sports_map,
            bookmakers_map,
            periods_map,
            period_translations_map,
            market_variation_title_map,
            market_variation_market_id_map,
            market_id_need_value_map,
            family_names,
            family_ids,
            parent_by_id,
        )

    sections = []
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if line.startswith('http://') or line.startswith('https://'):
            url = line
            i += 1
            chunk = []
            while i < len(lines):
                nxt = lines[i].strip()
                if nxt.startswith('http://') or nxt.startswith('https://'):
                    break
                chunk.append(lines[i])
                i += 1
            json_text = ''.join(chunk).strip()
            if json_text:
                sections.append((url, json_text))
        else:
            i += 1

    for url, json_text in sections:
        if '/api/v1/directories' not in url:
            continue
        try:
            payload = json.loads(json_text)
        except Exception:
            continue

        for p in payload.get('periods', []):
            if not isinstance(p, dict):
                continue
            pid = to_int_or_none(p.get('identifier'))
            if pid is None:
                pid = to_int_or_none(p.get('id'))
            ptitle = str(p.get('title') or '').strip()
            if pid is not None and ptitle:
                periods_map[pid] = ptitle

        period_translations = payload.get('period_translations')
        if isinstance(period_translations, dict):
            for sport_key, period_map in period_translations.items():
                sid = to_int_or_none(sport_key)
                if sid is None or not isinstance(period_map, dict):
                    continue
                sport_bucket = period_translations_map.setdefault(sid, {})
                for period_key, pdata in period_map.items():
                    pid = to_int_or_none(period_key)
                    if pid is None:
                        continue
                    ptitle = ''
                    if isinstance(pdata, dict):
                        ptitle = str(pdata.get('name') or pdata.get('title') or '').strip()
                    else:
                        ptitle = str(pdata or '').strip()
                    if ptitle:
                        sport_bucket[pid] = ptitle

        for mv in payload.get('market_variations', []):
            if not isinstance(mv, dict):
                continue
            mid = to_int_or_none(mv.get('id'))
            mtitle = str(mv.get('title') or '').strip()
            if mid is not None and mtitle:
                market_variation_title_map[mid] = mtitle
            market_id = to_int_or_none(mv.get('market_id'))
            if mid is not None and market_id is not None:
                market_variation_market_id_map[mid] = market_id

        for m in payload.get('markets', []):
            if not isinstance(m, dict):
                continue
            market_id = to_int_or_none(m.get('id'))
            need_value = to_bool_or_none(m.get('need_value'))
            if market_id is not None and need_value is not None:
                market_id_need_value_map[market_id] = need_value

        for s in payload.get('sports', []):
            if not isinstance(s, dict):
                continue
            sid = to_int_or_none(s.get('id'))
            sname = s.get('name')
            if sid is not None and sname:
                sports_map[sid] = str(sname).strip()

        bk_root = payload.get('bookmakers', {})
        bk_lists = []
        if isinstance(bk_root, dict):
            for key in ('arbs', 'valuebets'):
                if isinstance(bk_root.get(key), list):
                    bk_lists.append(bk_root.get(key))
        elif isinstance(bk_root, list):
            bk_lists.append(bk_root)

        for bk_list in bk_lists:
            for b in bk_list:
                if not isinstance(b, dict):
                    continue
                bid = to_int_or_none(b.get('id'))
                bname = b.get('name') or b.get('bookmaker')
                if bid is not None and bname:
                    nm = str(bname).strip()
                    bookmakers_map[bid] = nm
                    parent_by_id.setdefault(bid, bid)
                    family_ids.setdefault(bid, set()).add(bid)
                    family_names.setdefault(bid, set()).add(nm)
        
        # Clone IDs (muitos IDs > 127 aparecem aqui com nome proprio)
        for clone in payload.get('bookmaker_clones', []):
            if not isinstance(clone, dict):
                continue
            cid = to_int_or_none(clone.get('id'))
            base_id = to_int_or_none(clone.get('bookmaker_id'))
            cname = clone.get('name') or clone.get('bookmaker')
            cname_txt = str(cname).strip() if cname else ''

            if cid is not None and cname_txt and cid not in bookmakers_map:
                bookmakers_map[cid] = cname_txt

            if base_id is None and cid is not None:
                base_id = cid

            if base_id is not None:
                parent_by_id.setdefault(base_id, base_id)
                family_ids.setdefault(base_id, set()).add(base_id)
                family_names.setdefault(base_id, set())

                if cid is not None:
                    parent_by_id[cid] = base_id
                    family_ids[base_id].add(cid)

                if cname_txt:
                    family_names[base_id].add(cname_txt)

                # Alguns bookmaker_id base nao existem na lista principal.
                # Nesses casos, usamos o nome do clone como melhor inferencia.
                if base_id not in bookmakers_map and cname_txt:
                    bookmakers_map[base_id] = cname_txt

    family_names = {k: dedupe_sorted_names(v) for k, v in family_names.items()}
    return (
        sports_map,
        bookmakers_map,
        periods_map,
        period_translations_map,
        market_variation_title_map,
        market_variation_market_id_map,
        market_id_need_value_map,
        family_names,
        family_ids,
        parent_by_id,
    )

def load_live_directories_maps(access_token, locale='en'):
    sports_map = {}
    periods_map = {}
    period_translations_map = {}
    market_variation_title_map = {}
    market_variation_market_id_map = {}
    market_id_need_value_map = {}

    token_txt = str(access_token or '').strip()
    if not token_txt:
        return (
            sports_map,
            periods_map,
            period_translations_map,
            market_variation_title_map,
            market_variation_market_id_map,
            market_id_need_value_map,
        )

    locale_txt = str(locale or 'en').strip() or 'en'
    endpoints = (
        'https://api-lv.betburger.com/api/v1/directories',
        'https://api-pr.betburger.com/api/v1/directories',
    )
    query = urlencode({
        'access_token': token_txt,
        'locale': locale_txt,
    })
    headers = {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0',
    }

    for base_url in endpoints:
        url = f"{base_url}?{query}"
        try:
            req = Request(url, method='GET', headers=headers)
            with urlopen(req, timeout=12) as resp:
                raw = resp.read().decode('utf-8', errors='replace')
            payload = json.loads(raw) if raw else {}
        except Exception as ex:
            print(f"[Warn] Live directories fetch failed ({base_url}): {ex}")
            continue

        if not isinstance(payload, dict):
            continue

        for s in payload.get('sports', []):
            if not isinstance(s, dict):
                continue
            sid = to_int_or_none(s.get('id'))
            sname = str(s.get('name') or '').strip()
            if sid is not None and sname:
                sports_map[sid] = sname

        for p in payload.get('periods', []):
            if not isinstance(p, dict):
                continue
            pid = to_int_or_none(p.get('identifier'))
            if pid is None:
                pid = to_int_or_none(p.get('id'))
            ptitle = str(p.get('title') or '').strip()
            if pid is not None and ptitle:
                periods_map[pid] = ptitle

        period_translations = payload.get('period_translations')
        if isinstance(period_translations, dict):
            for sport_key, period_map in period_translations.items():
                sid = to_int_or_none(sport_key)
                if sid is None or not isinstance(period_map, dict):
                    continue
                sport_bucket = period_translations_map.setdefault(sid, {})
                for period_key, pdata in period_map.items():
                    pid = to_int_or_none(period_key)
                    if pid is None:
                        continue
                    ptitle = ''
                    if isinstance(pdata, dict):
                        ptitle = str(pdata.get('name') or pdata.get('title') or '').strip()
                    else:
                        ptitle = str(pdata or '').strip()
                    if ptitle:
                        sport_bucket[pid] = ptitle

        for mv in payload.get('market_variations', []):
            if not isinstance(mv, dict):
                continue
            mid = to_int_or_none(mv.get('id'))
            mtitle = str(mv.get('title') or '').strip()
            if mid is not None and mtitle:
                market_variation_title_map[mid] = mtitle
            market_id = to_int_or_none(mv.get('market_id'))
            if mid is not None and market_id is not None:
                market_variation_market_id_map[mid] = market_id

        for m in payload.get('markets', []):
            if not isinstance(m, dict):
                continue
            market_id = to_int_or_none(m.get('id'))
            need_value = to_bool_or_none(m.get('need_value'))
            if market_id is not None and need_value is not None:
                market_id_need_value_map[market_id] = need_value

    return (
        sports_map,
        periods_map,
        period_translations_map,
        market_variation_title_map,
        market_variation_market_id_map,
        market_id_need_value_map,
    )

def load_status_bookmakers(path):
    status_list = []
    if not path or not os.path.exists(path):
        return status_list
    try:
        with open(path, 'r', encoding='utf-8', errors='replace') as f:
            text = f.read()
    except Exception:
        return status_list

    for obj_text in re.findall(r'\{[^{}]*\}', text, flags=re.S):
        try:
            row = json.loads(obj_text)
        except Exception:
            continue
        if not isinstance(row, dict):
            continue

        bid = to_int_or_none(row.get('id'))
        bname = row.get('bookmaker') or row.get('name')
        if bid is None or not bname:
            continue
        
        parent_id = to_int_or_none(row.get('bookmaker_id'))
        status_list.append((bid, str(bname).strip(), parent_id))
        
    return status_list

def load_allowed_bookmakers(path):
    allowed_ids = set()
    allowed_names = set()
    if not path or not os.path.exists(path):
        return allowed_ids, allowed_names

    try:
        with open(path, 'r', encoding='utf-8', errors='replace') as f:
            text = f.read()
    except Exception:
        return allowed_ids, allowed_names

    for obj_text in re.findall(r'\{[^{}]*\}', text, flags=re.S):
        try:
            obj = json.loads(obj_text)
        except Exception:
            continue
        if not isinstance(obj, dict):
            continue

        # Ignora objetos de status/outros blocos que nao sao entrada de casa.
        # Aceita entradas com dados de casa/clone: name/bookmaker + id/bookmaker_id/url/etc.
        has_house_hint = any(k in obj for k in ('bookmaker_id', 'url', 'bk_settings', 'primary_mask', 'affiliate_url'))
        has_name = isinstance(obj.get('name'), str) and obj.get('name').strip()
        has_bookmaker_name = isinstance(obj.get('bookmaker'), str) and obj.get('bookmaker').strip()
        if not (has_house_hint or (has_name and ('id' in obj or 'bookmaker_id' in obj)) or (has_bookmaker_name and 'bookmaker_id' in obj)):
            continue

        raw_id = to_int_or_none(obj.get('id'))
        base_id = to_int_or_none(obj.get('bookmaker_id'))

        # Importante: quando houver bookmaker_id (clone), ele representa a casa-mae
        # usada na API. O "id" do clone nao eh id de bookmaker da API e pode colidir.
        if base_id is not None:
            allowed_ids.add(base_id)
        elif raw_id is not None:
            allowed_ids.add(raw_id)

        nm_name = normalize_match_text(obj.get('name'))
        if nm_name:
            allowed_names.add(nm_name)

        nm_bookmaker = normalize_match_text(obj.get('bookmaker'))
        if nm_bookmaker:
            allowed_names.add(nm_bookmaker)

    return allowed_ids, allowed_names

def load_allowed_bookmaker_display_names(path):
    names = []
    if not path or not os.path.exists(path):
        return names

    try:
        with open(path, 'r', encoding='utf-8', errors='replace') as f:
            text = f.read()
    except Exception:
        return names

    for obj_text in re.findall(r'\{[^{}]*\}', text, flags=re.S):
        try:
            obj = json.loads(obj_text)
        except Exception:
            continue
        if not isinstance(obj, dict):
            continue

        has_house_hint = any(k in obj for k in ('bookmaker_id', 'url', 'bk_settings', 'primary_mask', 'affiliate_url'))
        has_name = isinstance(obj.get('name'), str) and obj.get('name').strip()
        has_bookmaker_name = isinstance(obj.get('bookmaker'), str) and obj.get('bookmaker').strip()
        if not (has_house_hint or (has_name and ('id' in obj or 'bookmaker_id' in obj)) or (has_bookmaker_name and 'bookmaker_id' in obj)):
            continue

        for key in ('name', 'bookmaker'):
            value = obj.get(key)
            if isinstance(value, str) and value.strip():
                append_unique_name(names, value)

    return names

def load_allowed_bookmaker_url_map(path):
    url_map = {}
    if not path or not os.path.exists(path):
        return url_map

    try:
        with open(path, 'r', encoding='utf-8', errors='replace') as f:
            text = f.read()
    except Exception:
        return url_map

    for obj_text in re.findall(r'\{[^{}]*\}', text, flags=re.S):
        try:
            obj = json.loads(obj_text)
        except Exception:
            continue
        if not isinstance(obj, dict):
            continue

        raw_url = str(obj.get('url') or '').strip()
        if not re.match(r'^https?://', raw_url, flags=re.I):
            continue

        for key in ('name', 'bookmaker'):
            value = obj.get(key)
            nm = normalize_match_text(value)
            if not nm:
                continue
            # Mantem primeira URL encontrada para estabilizar o mapeamento.
            if nm not in url_map:
                url_map[nm] = raw_url

    return url_map


def load_allowed_bookmaker_host_map(path):
    host_map = {}
    if not path or not os.path.exists(path):
        return host_map

    try:
        with open(path, 'r', encoding='utf-8', errors='replace') as f:
            text = f.read()
    except Exception:
        return host_map

    for obj_text in re.findall(r'\{[^{}]*\}', text, flags=re.S):
        try:
            obj = json.loads(obj_text)
        except Exception:
            continue
        if not isinstance(obj, dict):
            continue

        raw_url = str(obj.get('url') or '').strip()
        if not re.match(r'^https?://', raw_url, flags=re.I):
            continue

        host = _normalize_redirect_host(raw_url)
        host_norm = normalize_match_text(host)
        if not host_norm:
            continue

        display_name = str(obj.get('name') or obj.get('bookmaker') or '').strip()
        if not display_name:
            continue
        display_name = canonical_clone_display_name(display_name) or display_name

        # Mantem primeiro mapeamento para evitar oscilacao.
        if host_norm not in host_map:
            host_map[host_norm] = display_name

    return host_map

def build_fixed_prefilter_options():
    sport_names = dedupe_sorted_names(
        translate_sport_name_to_pt(name) for name in SPORTS_REF_MAP.values()
    )

    if DISABLE_HOUSES_FILTER:
        house_names = dedupe_sorted_names(BOOKMAKERS_REF_MAP.values())
    else:
        house_raw = []
        house_raw.extend(ALLOWED_BOOKMAKER_DISPLAY_NAMES)
        for bid in sorted(ALLOWED_BOOKMAKER_IDS):
            mapped = BOOKMAKERS_REF_MAP.get(bid)
            if mapped:
                house_raw.append(mapped)
        house_raw = [canonical_clone_display_name(name) for name in house_raw]
        house_names = dedupe_sorted_names(house_raw)

    return {
        "houses": house_names,
        "sports": sport_names,
    }

def is_bookmaker_allowed(bet_obj, resolved_name):
    if not ALLOWED_BOOKMAKER_IDS and not ALLOWED_BOOKMAKER_NAMES:
        return True
    if not isinstance(bet_obj, dict):
        return False

    id_candidates = [
        to_int_or_none(bet_obj.get('bookmaker_id')),
        to_int_or_none(bet_obj.get('bookmaker_name')),
        to_int_or_none(bet_obj.get('bookmaker')),
        to_int_or_none(resolved_name),
    ]
    for candidate in id_candidates:
        if candidate is not None and candidate in ALLOWED_BOOKMAKER_IDS:
            return True

    name_candidates = [
        resolved_name,
        bet_obj.get('bookmaker_name'),
        bet_obj.get('bookmaker'),
    ]
    for name in name_candidates:
        nm = normalize_match_text(name)
        if nm and nm in ALLOWED_BOOKMAKER_NAMES:
            return True

    return False

def get_bookmaker_family_info(bet_obj, resolved_name):
    bid_candidates = []
    if isinstance(bet_obj, dict):
        bid_candidates.extend([
            to_int_or_none(bet_obj.get('bookmaker_id')),
            to_int_or_none(bet_obj.get('bookmaker')),
            to_int_or_none(bet_obj.get('bookmaker_name')),
        ])

    bid = next((x for x in bid_candidates if x is not None), None)
    root = resolve_family_root(bid) if bid is not None else None

    family_ids = set()
    family_names = []

    if root is not None:
        family_ids.update(BOOKMAKER_FAMILY_IDS.get(root, set()))
        family_ids.add(root)
        family_names.extend(BOOKMAKER_FAMILY_NAMES.get(root, []))

    if bid is not None:
        family_ids.add(bid)
        mapped_bid = BOOKMAKERS_REF_MAP.get(bid)
        if mapped_bid:
            family_names.append(str(mapped_bid).strip())

    if root is not None:
        mapped_root = BOOKMAKERS_REF_MAP.get(root)
        if mapped_root:
            family_names.append(str(mapped_root).strip())

    if isinstance(bet_obj, dict):
        family_names.extend([
            bet_obj.get('bookmaker_name'),
            bet_obj.get('bookmaker'),
        ])

    family_names.append(resolved_name)
    normalized = dedupe_sorted_names(family_names)
    if not normalized:
        normalized = ['Casa Desconhecida']

    return root, family_ids, normalized

def family_matches_allowed(family_ids, family_names):
    if not ALLOWED_BOOKMAKER_IDS and not ALLOWED_BOOKMAKER_NAMES:
        return True

    for candidate in family_ids:
        if candidate in ALLOWED_BOOKMAKER_IDS:
            return True

    for name in family_names:
        nm = normalize_match_text(name)
        if nm and nm in ALLOWED_BOOKMAKER_NAMES:
            return True

    return False

def restrict_family_names_to_allowed(family_ids, family_names):
    """
    Quando filtro de casas estiver ativo, restringe a exibicao apenas as casas
    explicitamente permitidas no casas.txt (por nome e/ou id).
    """
    if DISABLE_HOUSES_FILTER or (not ALLOWED_BOOKMAKER_IDS and not ALLOWED_BOOKMAKER_NAMES):
        return family_names

    allowed_norm_names = set()
    for raw_name in family_names:
        nm = normalize_match_text(raw_name)
        if not nm:
            continue
        if nm in ALLOWED_BOOKMAKER_NAMES:
            allowed_norm_names.add(nm)

    for fid in family_ids:
        if fid in ALLOWED_BOOKMAKER_IDS:
            mapped = BOOKMAKERS_REF_MAP.get(fid)
            nm = normalize_match_text(mapped)
            if nm:
                allowed_norm_names.add(nm)

    if not allowed_norm_names:
        return []

    filtered = []
    seen = set()
    for raw_name in family_names:
        nm = normalize_match_text(raw_name)
        if not nm or nm not in allowed_norm_names or nm in seen:
            continue
        seen.add(nm)
        filtered.append(raw_name)
    return filtered

def resolve_allowed_house_names_by_ids(family_ids, fallback_names=None):
    """
    Resolve nomes de exibicao exclusivamente a partir dos IDs permitidos.
    Evita vazamento por nome e aplica filtro estrito por bookmaker_id.
    """
    if DISABLE_HOUSES_FILTER or not ALLOWED_BOOKMAKER_IDS:
        return dedupe_sorted_names(fallback_names or [])

    allowed_ids_in_family = [fid for fid in family_ids if fid in ALLOWED_BOOKMAKER_IDS]
    if not allowed_ids_in_family:
        return []

    out = []
    seen = set()
    allowed_root_norm_names = set()
    for fid in allowed_ids_in_family:
        mapped_root = str(BOOKMAKERS_REF_MAP.get(fid) or '').strip()
        mapped_root_norm = normalize_match_text(mapped_root)
        if mapped_root_norm:
            allowed_root_norm_names.add(mapped_root_norm)

    # Prioriza nomes vindos da familia da API.
    # Quando o root/family_id ja eh permitido, nao restringimos por nome literal
    # para evitar "achatamento" (ex.: clone novo nao listado ainda em casas.txt).
    for raw_name in (fallback_names or []):
        txt = str(raw_name or '').strip()
        nm = normalize_match_text(txt)
        if not nm or nm in seen:
            continue
        canonical_txt = canonical_clone_display_name(txt) or txt
        canonical_nm = normalize_match_text(canonical_txt)
        if not canonical_nm:
            continue
        if ALLOWED_BOOKMAKER_NAMES:
            if (
                canonical_nm not in ALLOWED_BOOKMAKER_NAMES
                and canonical_nm not in allowed_root_norm_names
                and nm not in ALLOWED_BOOKMAKER_NAMES
                and nm not in allowed_root_norm_names
            ):
                continue
        key = canonical_nm
        if key in seen:
            continue
        seen.add(key)
        out.append(canonical_txt)

    # Fallback final: nome mapeado do bookmaker_id da API.
    if not out:
        for fid in allowed_ids_in_family:
            mapped = str(BOOKMAKERS_REF_MAP.get(fid) or '').strip()
            nm = normalize_match_text(mapped)
            if not nm or nm in seen:
                continue
            seen.add(nm)
            out.append(mapped)

    return dedupe_sorted_names(out)


def filter_clone_only_names(root, family_names):
    """
    Remove a casa-mae da exibicao quando modo clone-only estiver ativo.
    Ex.: para root=10 remove "Bet365" e mantem "Bet365Direct".
    """
    names = dedupe_sorted_names(family_names or [])
    if not ONLY_CLONE_BOOKMAKERS:
        return names
    if root is None:
        return names

    root_name = str(BOOKMAKERS_REF_MAP.get(root) or '').strip()
    root_norm = normalize_match_text(root_name)
    if not root_norm:
        return names

    filtered = [n for n in names if normalize_match_text(n) != root_norm]
    # Se nao houver clone resolvido, mantem os nomes originais para nao descartar
    # toda a familia permitida naquele tick.
    if filtered:
        return dedupe_sorted_names(filtered)
    return names


def is_parent_blocked_name(value):
    nm = normalize_match_text(value)
    return bool(nm and nm in PARENT_BLOCK_BOOKMAKERS)


def resolve_sanitize_side_bookmaker(bet_obj, event_link, fallback_root=None):
    bet_obj = bet_obj if isinstance(bet_obj, dict) else {}
    root_hint = resolve_family_root(to_int_or_none(fallback_root)) if to_int_or_none(fallback_root) is not None else None

    resolved_name = resolve_bookmaker_display_name(
        bet_obj.get("bookmaker"),
        fallback_root=root_hint,
        event_link=event_link,
    )
    root, family_ids, family_names = get_bookmaker_family_info(bet_obj, resolved_name)

    if root is None and root_hint is not None:
        root = root_hint
        family_ids.update(BOOKMAKER_FAMILY_IDS.get(root, set()))
        family_ids.add(root)
        family_names = dedupe_sorted_names(list(family_names) + BOOKMAKER_FAMILY_NAMES.get(root, []))

    if not DISABLE_HOUSES_FILTER and (ALLOWED_BOOKMAKER_IDS or ALLOWED_BOOKMAKER_NAMES):
        allowed_names = resolve_allowed_house_names_by_ids(family_ids, family_names)
        if not allowed_names:
            return "", root
    else:
        allowed_names = dedupe_sorted_names(family_names or ([resolved_name] if resolved_name else []))

    if ONLY_CLONE_BOOKMAKERS:
        allowed_names = filter_clone_only_names(root, allowed_names)

    normalized_allowed = {}
    ordered_allowed = []
    for raw_name in dedupe_sorted_names(allowed_names):
        txt = str(raw_name or "").strip()
        if not txt:
            continue
        display_name = canonical_clone_display_name(txt) or txt
        key = normalize_match_text(display_name)
        if not key:
            continue
        if is_parent_blocked_name(display_name):
            continue
        if key in normalized_allowed:
            continue
        normalized_allowed[key] = display_name
        ordered_allowed.append(display_name)

    if not ordered_allowed:
        return "", root

    preferred_candidates = [
        bet_obj.get("bookmaker"),
        bet_obj.get("bookmaker_name"),
        resolved_name,
    ]
    for candidate in preferred_candidates:
        candidate_txt = str(candidate or "").strip()
        if not candidate_txt:
            continue
        candidate_display = canonical_clone_display_name(candidate_txt) or candidate_txt
        candidate_key = normalize_match_text(candidate_display)
        if candidate_key and candidate_key in normalized_allowed:
            return normalized_allowed[candidate_key], root
        raw_key = normalize_match_text(candidate_txt)
        if raw_key and raw_key in normalized_allowed:
            return normalized_allowed[raw_key], root

    if root is not None:
        mapped_root_name = str(BOOKMAKERS_REF_MAP.get(root) or "").strip()
        mapped_root_display = canonical_clone_display_name(mapped_root_name) or mapped_root_name
        mapped_root_key = normalize_match_text(mapped_root_display)
        if mapped_root_key and mapped_root_key in normalized_allowed:
            return normalized_allowed[mapped_root_key], root

    return ordered_allowed[0], root


def build_sanitize_side_event_link(
    bet_obj,
    item_obj,
    selected_name,
    family_root,
    current_event_link,
):
    bet_obj = bet_obj if isinstance(bet_obj, dict) else {}
    item_obj = item_obj if isinstance(item_obj, dict) else {}
    selected_name = str(selected_name or "").strip()
    if not selected_name:
        return ""

    mapped_home = ALLOWED_BOOKMAKER_URL_BY_NAME.get(normalize_match_text(selected_name), "")
    clone_home = _clone_home_for_house(selected_name, house_home_url=mapped_home)

    fallback_event_id = (
        bet_obj.get("raw_id")
        or bet_obj.get("bookmaker_event_id")
        or bet_obj.get("event_id")
        or item_obj.get("bet1_event_id")
        or item_obj.get("bet2_event_id")
        or item_obj.get("event_id")
    )
    fallback_event_name = (
        bet_obj.get("eventName")
        or bet_obj.get("bookmaker_event_name")
        or item_obj.get("eventName")
        or item_obj.get("event_name")
        or ""
    )
    source_bookmaker_name = (
        bet_obj.get("bookmaker")
        or bet_obj.get("bookmaker_name")
        or ""
    )
    source_bookmaker_id = (
        bet_obj.get("bookmaker_id")
        or bet_obj.get("bookmaker")
        or bet_obj.get("bookmaker_name")
    )

    safe_link = build_house_safe_link(
        base_event_link=current_event_link,
        house_home_url=clone_home,
        family_root=family_root,
        house_name=selected_name,
        fallback_event_id=fallback_event_id,
        fallback_event_name=fallback_event_name,
        source_bookmaker_name=source_bookmaker_name,
        source_bookmaker_id=source_bookmaker_id,
    )
    if _is_valid_publishable_url(safe_link):
        return safe_link
    return ""

# --- Socket.IO Events ---

@sio.event
async def connect(sid, environ, auth=None):
    """
    Handle connection. 
    Electron app sends token in auth, but we accept anyone for now.
    """
    print(f"[Socket] Client connected: {sid}")
    # Electron app expects a 'connected' message? Protocol says:
    # WS-->>BG: { type: "connected" } 
    # But socket.io handles the handshake. The dashboard waits for 'connect' event.
    return True

@sio.event
async def disconnect(sid):
    print(f"[Socket] Client disconnected: {sid}")

@sio.on('getRooms')
async def get_rooms(sid):
    """
    Electron app emits 'getRooms' after connecting.
    We must return a list of rooms. The app looks for 'SPORTS:BETBURGUER:ARBS_LIVE'.
    """
    print(f"[Socket] Client {sid} requested rooms.")
    rooms_data = {
        "rooms": [
            {
                "id": "arbs_live_room",
                "strategy": "SPORTS:BETBURGUER:ARBS_LIVE",
                "label": "BetBurger Live Arbs"
            }
        ]
    }
    await sio.emit('roomsList', rooms_data, to=sid)

@sio.on('joinRoom')
async def join_room(sid, data):
    """
    App sends { jobId: '...' } to join.
    """
    room_id = data.get('jobId')
    print(f"[Socket] Client {sid} joining room: {room_id}")
    await sio.enter_room(sid, room_id)
    
    # Send current data immediately (fonte de verdade: PostgreSQL quando habilitado)
    live_rows = get_rows_for_socket()
    try:
        # Alinha com o mesmo saneamento usado no fluxo de broadcast postgres_raw.
        live_rows = await asyncio.to_thread(sanitize_prebuilt_arbs, live_rows or [])
    except Exception as exc:
        print(f"[Warn] sanitize_prebuilt_arbs failed in joinRoom: {exc}")
        live_rows = live_rows or []

    payload = {
        "data": {
            "arbs": live_rows,
            "timestamp": datetime_now_iso(),
            "prefilterOptions": PREFILTER_OPTIONS,
            "cronograma": build_cronograma(live_rows),
        },
        "arbs": live_rows,
        "timestamp": datetime_now_iso(),
        "prefilterOptions": PREFILTER_OPTIONS,
        "cronograma": build_cronograma(live_rows),
    }
    await sio.emit('data', payload, to=sid)

# --- Background Task ---

def read_arbs_data():
    global last_json_read_error_ts
    if not os.path.exists(JSON_FILE):
        return []
    for attempt in range(JSON_READ_RETRY_ATTEMPTS):
        try:
            with open(JSON_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except PermissionError as e:
            if attempt + 1 < JSON_READ_RETRY_ATTEMPTS:
                time.sleep(JSON_READ_RETRY_DELAY_SEC)
                continue
            now = time.time()
            if (now - last_json_read_error_ts) >= JSON_READ_ERROR_LOG_THROTTLE_SEC:
                print(f"[Warn] JSON locked/busy, skipping tick: {e}")
                last_json_read_error_ts = now
            return None
        except Exception as e:
            now = time.time()
            if (now - last_json_read_error_ts) >= JSON_READ_ERROR_LOG_THROTTLE_SEC:
                print(f"[Error] Reading JSON: {e}")
                last_json_read_error_ts = now
            return None

def read_pg_feed_signature():
    global last_pg_feed_error_ts
    if not pg_runtime_enabled():
        return None
    conn = pg_connect()
    if conn is None:
        return None
    try:
        table_name_norm = str(SCRAPER_PG_FEED_TABLE).strip().lower()
        if table_name_norm == 'arbs_current':
            # arbs_current atualiza last_seen a cada sync; updated_at muda
            # apenas quando row_hash muda. Para detectar "lote novo", considerar ambos.
            sql = (
                f"SELECT COUNT(*), "
                f"COALESCE(EXTRACT(EPOCH FROM GREATEST(MAX(updated_at), MAX(last_seen))), 0)::double precision "
                f"FROM {SCRAPER_PG_FEED_TABLE}"
            )
        else:
            sql = (
                f"SELECT COUNT(*), "
                f"COALESCE(EXTRACT(EPOCH FROM MAX(updated_at)), 0)::double precision "
                f"FROM {SCRAPER_PG_FEED_TABLE}"
            )
        with PG_CONN_LOCK:
            with conn.cursor() as cur:
                cur.execute(sql)
                row = cur.fetchone()
        if not row:
            return (0, 0.0)
        cnt = int(row[0] or 0)
        max_ts = float(row[1] or 0.0)
        return (cnt, max_ts)
    except Exception as e:
        now = time.time()
        if (now - last_pg_feed_error_ts) >= PG_FEED_ERROR_LOG_THROTTLE_SEC:
            print(f"[Warn] PG feed signature read failed ({SCRAPER_PG_FEED_TABLE}): {e}")
            last_pg_feed_error_ts = now
        return None

def read_arbs_data_from_pg_feed(limit_rows):
    global last_pg_feed_error_ts
    if not pg_runtime_enabled():
        return []
    conn = pg_connect()
    if conn is None:
        return []
    try:
        table_name_norm = str(SCRAPER_PG_FEED_TABLE).strip().lower()
        order_by = "last_seen DESC, updated_at DESC" if table_name_norm == 'arbs_current' else "updated_at DESC"
        sql = (
            f"SELECT payload "
            f"FROM {SCRAPER_PG_FEED_TABLE} "
            f"ORDER BY {order_by} "
            f"LIMIT %s"
        )
        with PG_CONN_LOCK:
            with conn.cursor() as cur:
                cur.execute(sql, (int(limit_rows),))
                rows = cur.fetchall()
        out = []
        for row in rows:
            if not row:
                continue
            payload = row[0]
            if isinstance(payload, dict):
                out.append(payload)
        return out
    except Exception as e:
        now = time.time()
        if (now - last_pg_feed_error_ts) >= PG_FEED_ERROR_LOG_THROTTLE_SEC:
            print(f"[Warn] PG feed data read failed ({SCRAPER_PG_FEED_TABLE}): {e}")
            last_pg_feed_error_ts = now
        return []

def datetime_now_iso():
    return datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')

def build_oddsrabbit_bet_link(bet_id, arb_hash, is_live=None, base_url=None):
    """
    Monta link direto no formato usado pelo botao BET da BetBurger.
    Requer token ativo para funcionar.
    """
    if not BETBURGER_ACCESS_TOKEN:
        return ''

    bet_txt = str(bet_id or '').strip()
    arb_txt = str(arb_hash or '').strip()
    if not bet_txt or not arb_txt:
        return ''

    if base_url is None:
        base_url = ODDSRABBIT_BETS_BASE
    base_txt = str(base_url or '').strip().rstrip('/')
    if not base_txt:
        return ''

    params = [
        ('locale', BETBURGER_LINK_LOCALE),
        ('access_token', BETBURGER_ACCESS_TOKEN),
        ('arb_hash', arb_txt),
    ]
    if ODDSRABBIT_DOMAIN_PARAM:
        params.append(('domain', ODDSRABBIT_DOMAIN_PARAM))
    if is_live is not None:
        params.append(('is_live', '1' if bool(is_live) else '0'))
    return f"{base_txt}/{quote(bet_txt, safe='')}?{urlencode(params)}"


def _normalize_redirect_host(candidate_url):
    host = (urlsplit(candidate_url).hostname or '').lower()
    if not host:
        return ''
    return host[4:] if host.startswith('www.') else host


def _normalize_pinnacle_clone_event_link(event_link):
    txt = str(event_link or '').strip()
    if not txt:
        return "https://pinnacle.bet.br/"
    if "available_in_api_plan" in txt.lower():
        return ""
    try:
        parsed = urlsplit(txt)
    except Exception:
        return "https://pinnacle.bet.br/"

    path = str(parsed.path or '').strip()
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


def _normalize_bet365_clone_event_link(event_link):
    txt = str(event_link or '').strip()
    if not txt:
        return ''
    try:
        parsed = urlsplit(txt)
    except Exception:
        return ''

    path = str(parsed.path or '')
    fragment = str(parsed.fragment or '')
    combined = f"{path}#{fragment}" if fragment else path

    # Bet365 evento valido costuma vir como #/IP/EV<codigo>/
    match = re.search(r"/ip/ev[a-z0-9]{4,}", combined, flags=re.I)
    if not match:
        return ''

    ev_path = match.group(0)
    if not ev_path.startswith('/'):
        ev_path = '/' + ev_path
    ev_path = ev_path.rstrip('/') + '/'
    return f"https://www.bet365.bet.br/?bet=1#{ev_path}"


def _normalize_superbet_clone_event_link(event_link):
    txt = str(event_link or '').strip()
    if not txt:
        return ''
    try:
        parsed = urlsplit(txt)
    except Exception:
        return ''

    path = str(parsed.path or '')
    # Formato conhecido:
    # - /offer-event/<slug>-<id>
    # - /odds/<slug>-<id>
    match = re.search(r"/(?:offer-event|odds)/([^/?#]+-\d{4,})", path, flags=re.I)
    if not match:
        return ''
    slug = str(match.group(1) or '').strip('/ ')
    if not slug:
        return ''
    return f"https://superbet.bet.br/odds/{slug}"


def _house_key_from_name(house_name):
    nm = normalize_match_text(house_name)
    if not nm:
        return ''
    if 'bet365' in nm:
        return 'bet365'
    if 'superbet' in nm:
        return 'superbet'
    if 'pinnacle' in nm:
        return 'pinnacle'
    if 'novibet' in nm:
        return 'novibet'
    if 'expekt' in nm or 'betmgm' in nm:
        return 'expektdk'
    if (
        ('betnacional' in nm)
        or ('aposta.bet.br' in nm) or ('apostabet' in nm)
        or ('fazo.bet.br' in nm) or (nm == 'fazo')
        or ('bet4.bet.br' in nm) or (nm == 'bet4')
        or ('sporty.bet.br' in nm) or (nm == 'sporty')
    ):
        return 'betnacional'
    if 'vbet' in nm:
        return 'vbet'
    return ''


def _clone_home_for_house(house_name, house_home_url=''):
    key = _house_key_from_name(house_name)
    if key == 'bet365':
        return 'https://www.bet365.bet.br/'
    if key == 'superbet':
        return 'https://superbet.bet.br/'
    if key == 'pinnacle':
        return 'https://pinnacle.bet.br/'
    if key == 'novibet':
        return 'https://www.novibet.bet.br/apostas-ao-vivo'
    if key == 'expektdk':
        return 'https://www.betmgm.bet.br/'
    if key == 'betnacional':
        return 'https://betnacional.bet.br/'
    if key == 'vbet':
        return 'https://vbet.bet.br/'
    txt = str(house_home_url or '').strip()
    if re.match(r'^https?://', txt, flags=re.I):
        return txt
    return ''


def _is_http_url(url_text):
    return bool(re.match(r'^https?://', str(url_text or '').strip(), flags=re.I))


def _extract_query_value(url_text, key):
    try:
        parsed = urlsplit(str(url_text or '').strip())
        values = parse_qs(parsed.query or '').get(str(key), [])
    except Exception:
        return ''
    if not values:
        return ''
    return str(values[0] or '').strip()


def _extract_event_id(url_text):
    txt = str(url_text or '').strip()
    if not txt:
        return ''

    for qk in ('eventId', 'eventid', 'event_id', 'match', 'matchid', 'match_id', 'e'):
        qv = _extract_query_value(txt, qk)
        if qv and re.search(r'\d{4,}', qv):
            return re.search(r'\d{4,}', qv).group(0)

    patterns = (
        r'/e-(\d{4,})',
        r'/liveEvent/(\d{4,})',
        r'/le-(\d{4,})',
        r'/live-betting/(\d{4,})',
        r'/event/live/(\d{4,})',
        r'/esportes/(\d{4,})',
        r'/detail/(\d{4,})',
        r'/(\d{4,})/?$',
    )
    for pat in patterns:
        m = re.search(pat, txt, flags=re.I)
        if m:
            return str(m.group(1) or '').strip()
    return ''


def _extract_event_id_7k_like(url_text):
    """
    IDs da família 7k geralmente são longos (ex.: 18 dígitos).
    Evita usar IDs curtos de bookmaker_event_id que geram link inválido/home.
    """
    eid = re.sub(r'\D+', '', str(_extract_event_id(url_text) or ''))
    if len(eid) >= 12:
        return eid
    return ''


def _extract_goldenpalace_fragment_path(url_text, fallback_event_id=''):
    txt = str(url_text or '').strip()
    if not txt:
        return ''

    fragment_path = ''
    try:
        parsed = urlsplit(txt)
        fragment = str(parsed.fragment or '').strip()
    except Exception:
        fragment = ''

    if fragment:
        candidate = '/' + fragment.lstrip('/')
        match = re.search(
            r'(/sport/[0-9]+/category/[0-9]+/championship/[0-9]+/liveEvent/[0-9]+)',
            candidate,
            flags=re.I,
        )
        if match:
            fragment_path = str(match.group(1) or '').strip()

    if not fragment_path:
        match = re.search(
            r'(/sport/[0-9]+/category/[0-9]+/championship/[0-9]+/liveEvent/[0-9]+)',
            txt,
            flags=re.I,
        )
        if match:
            fragment_path = str(match.group(1) or '').strip()

    if not fragment_path:
        return ''

    eid = _event_id_text(fallback_event_id)
    if eid:
        fragment_path = re.sub(
            r'/liveEvent/[0-9]{4,}',
            f'/liveEvent/{eid}',
            fragment_path,
            flags=re.I,
        )
    return fragment_path


def _extract_bt_path(url_text):
    txt = str(url_text or '').strip()
    if not txt:
        return ''
    bt_path = _extract_query_value(txt, 'bt-path')
    if bt_path:
        bt_path = unquote(bt_path)
    bt_path = str(bt_path or '').strip()
    if bt_path and not bt_path.startswith('/'):
        bt_path = '/' + bt_path
    return bt_path


def _extract_bwin_slug(url_text):
    txt = str(url_text or '').strip()
    if not txt:
        return ''
    m = re.search(r'/(?:pt-br/)?sports/events/([^/?#]+)', txt, flags=re.I)
    if m:
        return str(m.group(1) or '').strip()
    return ''


def _build_bwin_br_clone_event_url(url_text, host):
    slug = _extract_bwin_slug(url_text)
    if not slug:
        return ''
    return f"https://{host}/pt-br/sports/events/{slug}"


def _build_bwin_br_clone_url(url_text, host):
    txt = str(url_text or '').strip()
    if not txt:
        return f"https://{host}/pt-br/sports"
    try:
        parsed = urlsplit(txt)
    except Exception:
        return f"https://{host}/pt-br/sports"

    path = str(parsed.path or '/')
    if path.startswith('/en/'):
        path = '/pt-br/' + path[len('/en/'):]
    elif not path.startswith('/pt-br/'):
        path = '/pt-br' + (path if path.startswith('/') else '/' + path)
    return urlunsplit(('https', host, path, parsed.query, parsed.fragment))


def _build_same_path_clone_url(url_text, host, default_path='/'):
    txt = str(url_text or '').strip()
    if not txt:
        return f"https://{host}{default_path}"
    try:
        parsed = urlsplit(txt)
    except Exception:
        return f"https://{host}{default_path}"
    path = str(parsed.path or default_path or '/')
    return urlunsplit(('https', host, path, parsed.query, parsed.fragment))


def _event_id_text(value):
    if value is None:
        return ''
    txt = str(value).strip()
    if not txt:
        return ''
    m = re.search(r'\d{4,}', txt)
    if m:
        return m.group(0)
    return ''


def _slugify_event_name(value):
    txt = str(value or '').strip().lower()
    if not txt:
        return ''
    txt = unicodedata.normalize('NFKD', txt)
    txt = ''.join(ch for ch in txt if not unicodedata.combining(ch))
    txt = re.sub(r'[^a-z0-9]+', '-', txt)
    txt = re.sub(r'-{2,}', '-', txt).strip('-')
    return txt


def _extract_slug_before_id(url_text, event_id):
    txt = str(url_text or '').strip()
    eid = _event_id_text(event_id)
    if (not txt) or (not eid):
        return ''
    patterns = (
        rf"/odds/([^/?#]*?)-{re.escape(eid)}(?:$|[/?#])",
        rf"/offer-event/([^/?#]*?)-{re.escape(eid)}(?:$|[/?#])",
    )
    for pat in patterns:
        m = re.search(pat, txt, flags=re.I)
        if m:
            slug = str(m.group(1) or '').strip('-/ ')
            if slug:
                return slug
    return ''


def _canonicalize_link_for_house(
    house_name,
    house_home_url,
    source_event_link,
    fallback_event_id=None,
    fallback_event_name='',
    source_bookmaker_name='',
    source_bookmaker_id=None,
):
    nm = normalize_match_text(house_name)
    src = str(source_event_link or '').strip()
    if not nm:
        return ''
    fallback_eid = _event_id_text(fallback_event_id)
    eid = _extract_event_id(src) or fallback_eid
    source_nm = normalize_match_text(source_bookmaker_name)
    source_bid = to_int_or_none(source_bookmaker_id)
    source_is_superbet = ('superbet' in source_nm) or (source_bid == 329)
    source_is_unibet = ('unibet' in source_nm) or (source_bid == 19)
    source_is_betnacional = ('betnacional' in source_nm) or (source_bid == 461)
    source_is_betfast = ('betfast' in source_nm) or (source_bid == 466)
    source_is_vaidebet = ('vaidebet' in source_nm) or (source_bid == 488)
    source_is_novibet = ('novibet' in source_nm) or (source_bid == 83)

    # Bet365: evento quando possivel; senao home clone BR.
    if 'bet365' in nm:
        event = _normalize_bet365_clone_event_link(src)
        if _is_http_url(event):
            return event
        return ''

    # SuperbetBR: evento quando possivel; senao home clone BR.
    if 'superbet' in nm:
        event = _normalize_superbet_clone_event_link(src)
        if _is_http_url(event):
            return event
        if eid and source_is_superbet:
            slug = _extract_slug_before_id(src, eid) or _slugify_event_name(fallback_event_name)
            if slug:
                return f"https://superbet.bet.br/odds/{slug}-{eid}"
        return ''

    # Pinnacle: evento quando possivel; senao home clone BR.
    if 'pinnacle' in nm:
        event = _normalize_pinnacle_clone_event_link(src)
        if _is_http_url(event):
            return event
        return ''

    # Bet7k family.
    if 'bet7k' in nm or nm in ('7k', '7kbet'):
        eid7k = _extract_event_id_7k_like(src)
        if eid7k:
            return f"https://7k.bet.br/sports/live-betting/e-{eid7k}"
        return ''
    if 'sortenabet' in nm:
        eid7k = _extract_event_id_7k_like(src)
        if eid7k:
            return f"https://sortenabet.bet.br/sports/live-betting/e-{eid7k}"
        return ''
    if 'vera' in nm:
        eid7k = _extract_event_id_7k_like(src)
        if eid7k:
            return f"https://vera.bet.br/sports/live-betting/e-{eid7k}"
        return ''
    if 'brx' in nm:
        eid7k = _extract_event_id_7k_like(src)
        if eid7k:
            return f"https://brx.bet.br/sports/live-betting/e-{eid7k}"
        return ''
    if 'bullsbet' in nm:
        eid7k = _extract_event_id_7k_like(src)
        if eid7k:
            return f"https://bullsbet.bet.br/sports/live-betting/e-{eid7k}"
        return ''
    if 'betvip' in nm:
        eid7k = _extract_event_id_7k_like(src)
        if eid7k:
            return f"https://betvip.bet.br/sports//e-{eid7k}"
        return ''
    if 'cassino' in nm:
        eid7k = _extract_event_id_7k_like(src)
        if eid7k:
            return f"https://cassino.bet.br/en/sports?eventId={eid7k}"
        return ''
    if ('pix' in nm and 'playpix' not in nm) or 'pixbet' in nm:
        eid7k = _extract_event_id_7k_like(src)
        if eid7k:
            return f"https://pix.bet.br/sports/live-betting/{eid7k}"
        return ''
    if 'donald' in nm:
        eid7k = _extract_event_id_7k_like(src)
        if eid7k:
            return f"https://donald.bet.br/sports/live-betting/e-{eid7k}"
        return ''
    if 'rico' in nm:
        eid7k = _extract_event_id_7k_like(src)
        if eid7k:
            return f"https://rico.bet.br/sports/live-betting/e-{eid7k}"
        return ''
    if 'betdasorte' in nm:
        eid7k = _extract_event_id_7k_like(src)
        if eid7k:
            return f"https://www.betdasorte.bet.br/sports/live-betting/{eid7k}"
        return ''
    if 'jogao' in nm:
        eid7k = _extract_event_id_7k_like(src)
        if eid7k:
            return f"https://jogao.bet.br/sports/live-betting/e-{eid7k}"
        return ''
    if nm == 'bra' or 'bra bet' in nm or 'bra.bet' in nm:
        eid7k = _extract_event_id_7k_like(src)
        if eid7k:
            return f"https://bra.bet.br/sports/live-betting/e-{eid7k}"
        return ''
    if 'mmabet' in nm:
        eid7k = _extract_event_id_7k_like(src)
        if eid7k:
            return f"https://mmabet.bet.br/sports/live-betting/e-{eid7k}"
        return ''
    if 'betaki' in nm:
        eid7k = _extract_event_id_7k_like(src)
        if eid7k:
            return f"https://betaki.bet.br/?eventID={eid7k}"
        return ''
    if nm == 'ice' or 'ice bet' in nm or 'ice.bet' in nm:
        eid7k = _extract_event_id_7k_like(src)
        if eid7k:
            return f"https://ice.bet.br/sports/live-betting/{eid7k}"
        return ''
    if nm == 'play' or 'play bet' in nm or 'play.bet' in nm:
        eid7k = _extract_event_id_7k_like(src)
        if eid7k:
            return f"https://play.bet.br/sports/live-betting/e-{eid7k}"
        return ''
    if 'betbra' in nm:
        eid7k = _extract_event_id_7k_like(src)
        if eid7k:
            return f"https://betbra.bet.br/fbook/br-pt/spbk/live-betting/{eid7k}"
        return ''
    if 'kingpanda' in nm:
        eid7k = _extract_event_id_7k_like(src)
        if eid7k:
            return (
                f"https://kingpanda.bet.br/bets/live-betting/{eid7k}"
                f"?leagueID={eid7k}&eventID={eid7k}&eventName=&sportID=1"
            )
        return ''
    if 'betfalcons' in nm:
        eid7k = _extract_event_id_7k_like(src)
        if eid7k:
            return f"https://betfalcons.bet.br/sports/live-betting/e-{eid7k}/"
        return ''
    if 'betgorillas' in nm:
        eid7k = _extract_event_id_7k_like(src)
        if eid7k:
            return f"https://betgorillas.bet.br/sports/live-betting/e-{eid7k}/"
        return ''
    if 'b1bet' in nm:
        eid7k = _extract_event_id_7k_like(src)
        if eid7k:
            return f"https://b1bet.bet.br/sports/live-betting/e-{eid7k}/"
        return ''
    if 'betpontobet' in nm:
        eid7k = _extract_event_id_7k_like(src)
        if eid7k:
            return f"https://betpontobet.bet.br/sports/live-betting/e-{eid7k}/"
        return ''
    if 'geralbet' in nm:
        eid7k = _extract_event_id_7k_like(src)
        if eid7k:
            return f"https://geralbet.bet.br/sports/live-betting/e-{eid7k}/"
        return ''
    if nm == 'lider' or 'lider bet' in nm or 'lider.bet' in nm:
        eid7k = _extract_event_id_7k_like(src)
        if eid7k:
            return f"https://lider.bet.br/sports/live-betting/e-{eid7k}/"
        return ''

    # Goldenpalace family clones.
    if 'goldenpalace' in nm:
        return ''
    if 'bateu' in nm:
        if eid:
            return f"https://bateu.bet.br/en/sports/le-{eid}"
        return ''
    if 'esportiva' in nm:
        if eid:
            return f"https://esportiva.bet.br/sports/le-{eid}"
        return ''
    if 'betfusion' in nm:
        return ''
    if 'pagol' in nm:
        sport_id = _extract_query_value(src, 'sportId')
        if not sport_id:
            gp_frag = _extract_goldenpalace_fragment_path(src, fallback_event_id=eid)
            if gp_frag:
                m_sport = re.search(r"/sport/([0-9]+)", gp_frag, flags=re.I)
                if m_sport:
                    sport_id = str(m_sport.group(1) or '').strip()
        if eid and sport_id:
            return f"https://pagol.bet.br/br/aposta-esportiva/liveEvent?eventId={eid}&sportId={sport_id}"
        return ''
    if 'jogodeouro' in nm:
        eid = _extract_event_id(src)
        if eid:
            return f"https://jogodeouro.bet.br/pt/sports?page=liveEvent&eventId={eid}"
        return ''
    if 'br4' in nm:
        eid = _extract_event_id(src)
        if eid:
            return f"https://br4.bet.br/sports/le-{eid}"
        return ''
    if 'lotogreen' in nm:
        eid = _extract_event_id(src)
        if eid:
            return f"https://lotogreen.bet.br/sports/le-{eid}"
        return ''
    if 'mcgames' in nm:
        return ''
    if 'estrelabet' in nm:
        eid = _extract_event_id(src)
        if eid:
            return f"https://www.estrelabet.bet.br/aposta-esportiva?eventId={eid}"
        return ''
    if 'sorteonline' in nm:
        if eid:
            return f"https://www.sorteonline.bet.br/aposta-esportiva?eventId={eid}"
        return ''
    if 'lottoland' in nm:
        if eid:
            return f"https://www.lottoland.bet.br/aposta-esportiva?eventId={eid}"
        return ''
    if 'vupi' in nm:
        if eid:
            return f"https://www.vupi.bet.br/aposta-esportiva?eventId={eid}"
        return ''
    if nm in ('up', 'up.bet.br') or 'up.bet' in nm:
        gp_frag = _extract_goldenpalace_fragment_path(src, fallback_event_id=eid)
        if gp_frag:
            return f"https://up.bet.br/pt-BR/sports/live#{gp_frag}"
        return "https://up.bet.br/pt-BR/sports/live"
    if 'brbet' in nm:
        gp_frag = _extract_goldenpalace_fragment_path(src, fallback_event_id=eid)
        if gp_frag:
            return f"https://www.brbet.bet.br/sports#{gp_frag}"
        return "https://www.brbet.bet.br/sports"
    if 'apostou' in nm:
        gp_frag = _extract_goldenpalace_fragment_path(src, fallback_event_id=eid)
        if gp_frag:
            return f"https://www.apostou.bet.br/sports#{gp_frag}"
        return "https://www.apostou.bet.br/sports"
    if 'goldebet' in nm:
        if eid:
            return f"https://goldebet.bet.br/sports/e-{eid}"
        return ''
    if 'aviao' in nm:
        gp_frag = _extract_goldenpalace_fragment_path(src, fallback_event_id=eid)
        if gp_frag:
            return f"https://www.aviao.bet.br/esportes#{gp_frag}"
        return "https://www.aviao.bet.br/esportes"
    if nm in ('multi', 'multi.bet.br') or 'multi.bet' in nm:
        gp_frag = _extract_goldenpalace_fragment_path(src, fallback_event_id=eid)
        if gp_frag:
            return f"https://multi.bet.br/pb/sports#{gp_frag}"
        return "https://multi.bet.br/pb/sports"
    if 'brasildasorte' in nm:
        if eid:
            return f"https://brasildasorte.bet.br/sports/le-{eid}"
        return ''
    if 'aposta1' in nm:
        gp_frag = _extract_goldenpalace_fragment_path(src, fallback_event_id=eid)
        if gp_frag:
            return f"https://www.aposta1.bet.br/esportes#{gp_frag}"
        return "https://www.aposta1.bet.br/esportes"

    # Vbet family: usuario definiu fallback para home.
    if 'vbet' in nm:
        return ''
    if 'betao' in nm:
        return ''
    if '7games' in nm:
        return ''
    if 'r7' in nm:
        return ''
    if 'maxima' in nm:
        return ''
    if 'playpix' in nm:
        return ''
    if 'suprema' in nm or 'supremabet' in nm:
        return ''
    if 'seguro' in nm:
        return ''
    if 'ultra' in nm:
        return ''
    if 'bravo' in nm:
        return ''
    if 'h2' in nm:
        return ''
    if 'seubet' in nm or 'seu.bet.br' in nm or nm == 'seu':
        return ''

    # Bwin family clones.
    if nm == 'bwin' or 'bwin' in nm:
        event = _build_bwin_br_clone_url(src, 'sports.sportingbet.bet.br')
        if _is_http_url(event):
            return event
        return ''
    if 'sportingbet' in nm:
        event = _build_bwin_br_clone_url(src, 'sports.sportingbet.bet.br')
        if _is_http_url(event):
            return event
        return ''
    if 'betboo' in nm:
        event = _build_bwin_br_clone_url(src, 'betboo.bet.br')
        if _is_http_url(event):
            return event
        return ''

    # FortuneJack family clones.
    if 'fortunejack' in nm:
        bt = _extract_bt_path(src)
        if bt:
            return f"https://fortunejack.com/crypto-sportsbook?bt-path={quote(bt, safe='-._~')}"
        return ''
    if 'blaze' in nm:
        bt = _extract_bt_path(src)
        if bt:
            return f"https://blaze.bet.br/pt/sports?bt-path={quote(bt, safe='-._~')}"
        return ''
    if 'apostaganha' in nm:
        bt = _extract_bt_path(src)
        if bt:
            return f"https://apostaganha.bet.br/esportes?bt-path={quote(bt, safe='-._~')}"
        return ''
    if 'jonbet' in nm:
        bt = _extract_bt_path(src)
        if bt:
            return f"https://jonbet.bet.br/pt/sports?bt-path={quote(bt, safe='-._~')}"
        return ''
    if nm == 'reals' or 'reals.bet' in nm:
        bt = _extract_bt_path(src)
        if bt:
            return f"https://reals.bet.br/sports-betby?bt-path={quote(bt, safe='-._~')}"
        return ''
    if nm == 'bingo' or 'bingo.bet' in nm:
        bt = _extract_bt_path(src)
        if bt:
            return f"https://bingo.bet.br/sports?bt-path={quote(bt, safe='-._~')}"
        return ''
    if nm == 'pinbet' or 'pin.bet' in nm:
        bt = _extract_bt_path(src)
        if bt:
            return f"https://pin.bet.br/sports?bt-path={quote(bt, safe='-._~')}"
        return ''
    if 'flabet' in nm:
        return ''

    # Unibet family clones.
    if 'unibet' in nm:
        eid = _extract_event_id(src) or (fallback_eid if source_is_unibet else '')
        if eid:
            return f"https://www.unibet.com/betting/sports/event/live/{eid}"
        return ''
    if 'betwarrior' in nm:
        eid = _extract_event_id(src)
        if (not eid) and source_is_unibet:
            eid = fallback_eid
        if eid:
            return f"https://apostas.betwarrior.bet.br/pt-br/sports/event/live/{eid}"
        return ''
    if 'kto' in nm:
        return ''
    if 'stake' in nm:
        eid = _extract_event_id(src) or (fallback_eid if source_is_unibet else '')
        if eid:
            return f"https://stake.bet.br/esportes/{eid}"
        return ''

    # Stoiximan/Betano.
    if 'betano' in nm or 'stoiximan' in nm:
        if _is_http_url(src):
            try:
                parsed = urlsplit(src)
                path = str(parsed.path or '/').strip() or '/'
                out = urlunsplit(('https', 'www.betano.bet.br', path, parsed.query, parsed.fragment))
                if _is_http_url(out):
                    return out
            except Exception:
                pass
        return ''

    # Vaidebet canonical.
    if 'vaidebet' in nm:
        eid = _extract_event_id(src) or (fallback_eid if source_is_vaidebet else '')
        if eid:
            return f"https://vaidebet.bet.br/ptb/bet/live/detail/{eid}"
        return ''

    # BetFast family (mother + clones) with fixed sportsbook/hash route.
    if 'betfast' in nm:
        eid_bf = _extract_event_id(src) or (fallback_eid if source_is_betfast else '')
        if eid_bf:
            return f"https://betfast.bet.br/br/sportsbook/live#/live/eventview/{eid_bf}"
        return "https://betfast.bet.br/br/sportsbook/live"
    if 'faz1' in nm:
        eid_bf = _extract_event_id(src) or (fallback_eid if source_is_betfast else '')
        if eid_bf:
            return f"https://faz1.bet.br/br/sportsbook/prematch#/live/eventview/{eid_bf}"
        return "https://faz1.bet.br/br/sportsbook/prematch"
    if 'tivo' in nm:
        eid_bf = _extract_event_id(src) or (fallback_eid if source_is_betfast else '')
        if eid_bf:
            return f"https://tivo.bet.br/br/sportsbook/live#/live/eventview/{eid_bf}"
        return "https://tivo.bet.br/br/sportsbook/live"

    # BetNacional family (mother + clones).
    if ('aposta.bet.br' in nm) or ('apostabet' in nm):
        if fallback_eid and source_is_betnacional:
            return f"https://aposta.bet.br/esportes/futebol/evento/sr:match:{fallback_eid}"
        return ''
    if ('fazo.bet.br' in nm) or (nm == 'fazo'):
        if fallback_eid and source_is_betnacional:
            return f"https://fazo.bet.br/esportes/futebol/evento/sr:match:{fallback_eid}"
        return ''
    if ('bet4.bet.br' in nm) or (nm == 'bet4'):
        if fallback_eid and source_is_betnacional:
            return f"https://bet4.bet.br/esportes/futebol/evento/sr:match:{fallback_eid}"
        return ''
    if ('sporty.bet.br' in nm) or (nm == 'sporty'):
        if fallback_eid and source_is_betnacional:
            return f"https://www.sporty.bet.br/br/sport/football/live/R%C3%BAssia/Premier_League/FK_Lokomotiv_Moscovo_vs_FC_Dynamo-Makhachkala/sr:match:{fallback_eid}"
        return ''

    # BetNacional canonical (mother).
    if 'betnacional' in nm:
        if fallback_eid and source_is_betnacional:
            return f"https://betnacional.bet.br/event/6/1/{fallback_eid}"
        if _is_http_url(src):
            try:
                parsed = urlsplit(src)
                path = str(parsed.path or '/').strip() or '/'
                out = urlunsplit(('https', 'betnacional.bet.br', path, parsed.query, parsed.fragment))
                if _is_http_url(out):
                    return out
            except Exception:
                pass
        return ''

    # Betfair canonical.
    if 'betfair' in nm:
        if _is_http_url(src):
            try:
                parsed = urlsplit(src)
                path = str(parsed.path or '/').strip() or '/'
                out = urlunsplit(('https', 'www.betfair.bet.br', path, parsed.query, parsed.fragment))
                if _is_http_url(out):
                    return out
            except Exception:
                pass
        return ''

    # Betsson canonical.
    if 'betsson' in nm:
        eid = _extract_query_value(src, 'eventId')
        if not eid:
            m = re.search(r'eventid=([^&#]+)', src, flags=re.I)
            if m:
                eid = str(m.group(1) or '').strip()
        if eid:
            return f"https://www.betsson.bet.br/apostas-esportivas?eventId={eid}&eti=0"
        return ''

    # Novibet canonical.
    if 'novibet' in nm:
        eid = _extract_event_id(src) or (fallback_eid if source_is_novibet else '')
        if eid:
            return f"https://www.novibet.bet.br/apostas-ao-vivo/{eid}"
        return ''

    # ExpektDK/BetMGM BR.
    if 'expekt' in nm or 'betmgm' in nm:
        return ''

    # LuvaBet canonical.
    if 'luvabet' in nm or 'luva.bet.br' in nm:
        out = _build_same_path_clone_url(src, 'luva.bet.br', '/')
        if _is_http_url(out):
            return out
        return ''
    if '1pra1' in nm:
        out = _build_same_path_clone_url(src, '1pra1.bet.br', '/')
        if _is_http_url(out):
            return out
        return ''
    if 'esporte365' in nm:
        out = _build_same_path_clone_url(src, 'esporte365.bet.br', '/')
        if _is_http_url(out):
            return out
        return ''
    if nm in ('ona', 'onabet') or 'ona.bet.br' in nm:
        out = _build_same_path_clone_url(src, 'ona.bet.br', '/')
        if _is_http_url(out):
            return out
        return ''
    if nm == 'start' or 'start.bet.br' in nm:
        out = _build_same_path_clone_url(src, 'start.bet.br', '/')
        if _is_http_url(out):
            return out
        return ''
    if nm == 'bigbet' or 'big.bet.br' in nm:
        eid_big = _extract_query_value(src, 'e') or _extract_event_id(src) or fallback_eid
        if eid_big:
            return f"https://big.bet.br/sportsbook/?e={eid_big}"
        return "https://big.bet.br/sportsbook/"

    # Nenhuma casa especifica reconhecida: retornar vazio.
    return ''


def _direct_link_debug(msg):
    if DIRECT_LINK_DEBUG:
        print(f"[DirectLink] {msg}")


def _build_oddsrabbit_headers():
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/json;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Upgrade-Insecure-Requests": "1",
        "Connection": "keep-alive",
    }
    if BETBURGER_SESSION_COOKIE:
        headers["Cookie"] = BETBURGER_SESSION_COOKIE
    if BETBURGER_EXTRA_REQUEST_HEADERS:
        headers.update(BETBURGER_EXTRA_REQUEST_HEADERS)
    return headers


def _iter_oddsrabbit_links(bet_txt, arb_txt, is_live=None):
    seen = set()
    base_order = [ODDSRABBIT_BETS_BASE, 'https://www.betburger.com/bets', 'https://lv.oddsrabbit.org/bets']
    for base in base_order:
        base = str(base or '').strip().rstrip('/')
        if not base:
            continue
        norm = base.lower()
        if not (norm.startswith('http://') or norm.startswith('https://')):
            norm = f"https://{norm}"
        if norm in seen:
            continue
        seen.add(norm)
        link = build_oddsrabbit_bet_link(bet_txt, arb_txt, is_live=is_live, base_url=base)
        if link:
            yield link


def _extract_url_from_redirect(url_text):
    try:
        parsed = urlsplit(str(url_text or '').strip())
        qs = parse_qs(parsed.query or '')
    except Exception:
        return ''
    for key in ('url', 'target', 'redirect', 'to', 'next', 'link'):
        for raw in (qs.get(key) or []):
            candidate = str(raw or '').strip()
            if not candidate:
                continue
            if re.match(r'^https?://', candidate, flags=re.I):
                return candidate
            decoded = unquote(candidate)
            if re.match(r'^https?://', decoded, flags=re.I):
                return decoded
    return ''

def _is_auth_login_url(candidate_url):
    lower = str(candidate_url or '').lower()
    if not lower:
        return False
    if '/users/sign_in' in lower:
        return True
    if '/sign_in' in lower and ('betburger' in lower or 'oddsrabbit' in lower):
        return True
    if '/login' in lower and ('betburger' in lower or 'oddsrabbit' in lower):
        return True
    return False


def _query_string_as_pairs(candidate_url):
    try:
        parsed = urlsplit(candidate_url)
    except Exception:
        return {}

    out = {}
    try:
        for key, values in parse_qs(parsed.query or '').items():
            if values:
                out[key.lower()] = out.get(key.lower(), [])
                out[key.lower()] = list(values)
    except Exception:
        pass

    fragment = (parsed.fragment or '').strip()
    if fragment.startswith('?'):
        try:
            for key, values in parse_qs(fragment[1:]).items():
                if values:
                    out[key.lower()] = out.get(key.lower(), [])
                    out[key.lower()].extend(values)
        except Exception:
            pass

    return out


def _has_eventish_query(candidate_url):
    params = _query_string_as_pairs(candidate_url)
    if not params:
        return False

    keys = {
        "eventid",
        "event_id",
        "event",
        "match",
        "matchid",
        "match_id",
        "eventcode",
        "bt-path",
        "bt_path",
        "btpath",
    }

    for key, values in params.items():
        if key not in keys:
            continue
        raw = str((values[0] if values else '') or '').strip()
        if key in {"bt-path", "bt_path", "btpath"}:
            if raw:
                return True
            continue
        if raw and any(ch.isdigit() for ch in raw):
            return True

    return False


def _is_home_like_path(path):
    if not path:
        return True
    norm = path.strip().lower()
    if norm in ('', '/'):
        return True
    if norm.startswith('//'):
        return True

    tokens = [s for s in norm.split('/') if s]
    if not tokens:
        return True
    if len(tokens) == 1 and tokens[0] in {
        "sports", "apostas", "esportes", "live", "home", "index",
        "en", "pt", "pt-br", "aposta-esportiva", "apostas-esportivas"
    }:
        return True
    if len(tokens) == 1 and tokens[0] in {
        "aposta", "apostas-ao-vivo", "sportsbook", "resultado", "eventos"
    }:
        return True

    if len(tokens) >= 2 and tokens[0] in {"sports", "esportes"} and tokens[1] in {
        "live", "prematch", "odds", "resultados"
    }:
        if len(tokens) == 2:
            return True
    return False


def _has_eventish_path(candidate_url):
    try:
        parsed = urlsplit(candidate_url)
    except Exception:
        return False

    path = (parsed.path or "").strip().lower()
    fragment = (parsed.fragment or "").strip().lower()
    if _is_home_like_path(path):
        # URLs with path home-like can still be valid if hash carries event route (ex: bet365 #/IP/EV...)
        if re.search(r"/ip/ev[a-z0-9]{4,}", fragment, flags=re.I) or re.search(r"/event|/liveevent|/le-|/e-\d{4,}|ev[a-z0-9]{4,}|eventid=", fragment, flags=re.I):
            return True
        return False

    path_with_fragment = f"{path} {('#' + fragment) if fragment else ''}".strip()

    # Evita home-like em hash sem evento.
    if fragment.startswith("sports") or fragment.startswith("/sports") or fragment.startswith("/esportes"):
        if re.search(r"/event|/liveevent|/le-|/e-\d{4,}|ev[a-z0-9]{4,}|/ip/ev[a-z0-9]{4,}", fragment, flags=re.I):
            pass
        else:
            return False

    if re.search(r"/e-\d{4,}", path):
        return True
    if re.search(r"/le-\d{4,}", path):
        return True
    if "/liveevent/" in path or re.search(r"/event[s]?/", path):
        return True
    if "/ip/" in path_with_fragment and re.search(r"/ip/ev[a-z0-9]{4,}", path_with_fragment, flags=re.I):
        return True
    if re.search(r"/events?/", path) and re.search(r"/events?/[^/]{10,}", path):
        return True
    if re.search(r"/sportsbook/standard/", path):
        return True
    if re.search(r"/standard/[^/]+/[^/]+/\d+", path):
        return True
    if re.search(r"/odds/.+-\d{4,}$", path):
        return True
    if re.search(r"/offer-event/.+-\d{4,}$", path):
        return True

    if re.search(r"/(live|aposta|apostas|evento|event|eventos|match|matches)[/?]", path):
        return True

    segments = [segment for segment in path.split("/") if segment]
    if not segments:
        return False
    tail = segments[-1]
    if len(segments) == 2 and segments[0] in {"sports", "esportes"} and re.search(r"^\d{4,}$", segments[1]):
        return False
    if len(segments) >= 2 and re.search(r"^-?\d{4,}$", tail) and re.search(r"[a-z]{2,}", segments[-2]):
        return True
    if re.search(r"-\d{4,}$", tail):
        return True
    if re.search(r"^ev[a-z0-9]{3,}", tail):
        return True
    if re.search(r"^le-\d{4,}$", tail):
        return True

    return False


def _is_valid_event_final_url(candidate_url):
    lower = str(candidate_url or '').lower()
    if not (lower.startswith('https://') or lower.startswith('http://')):
        return False
    if 'available_in_api_plan' in lower:
        return False
    if _is_auth_login_url(lower):
        return False
    host = _normalize_redirect_host(candidate_url)
    if not host:
        return False
    if 'oddsrabbit.org' in host:
        return False
    if host == 'w3.org':
        return False
    if host == 'betburger.com' and '/users/sign_in' in lower:
        return False
    if ('betburger.com' in host and '/login' in lower and '/live/' not in lower):
        return False
    if host in (
        'oddsrabbit.org',
        'rest-api-lv.betburger.com',
        'rest-api-pr.betburger.com',
    ):
        return False
    if _has_eventish_query(candidate_url):
        return True
    if not _has_eventish_path(candidate_url):
        return False
    return True


def _is_valid_publishable_url(candidate_url):
    txt = str(candidate_url or '').strip()
    if not _is_http_url(txt):
        return False
    if 'available_in_api_plan' in txt.lower():
        return False
    if _is_auth_login_url(txt):
        return False
    host = _normalize_redirect_host(txt)
    if not host:
        return False
    if 'oddsrabbit.org' in host:
        return False
    if host in (
        'rest-api-lv.betburger.com',
        'rest-api-pr.betburger.com',
        'api-mst.betburger.com',
        'w3.org',
    ):
        return False
    return True
def extract_direct_link_from_html(html_text, page_url=''):
    if not html_text:
        return ''

    patterns = (
        re.compile(r"direct_link\s*=\s*'([^']+)'", flags=re.I),
        re.compile(r'direct_link\s*=\s*"([^"]+)"', flags=re.I),
        re.compile(r'"direct_link"\s*:\s*"([^"]+)"', flags=re.I),
    )
    raw_link = ''
    for pattern in patterns:
        match = pattern.search(html_text)
        if match:
            raw_link = str(match.group(1) or '').strip()
            break
    if not raw_link:
        return ''

    direct_link = unescape(raw_link).replace('\\/', '/').strip()
    if direct_link.startswith('//'):
        direct_link = f"https:{direct_link}"
    if not re.match(r'^https?://', direct_link, flags=re.I):
        return ''
    return direct_link

def _prune_direct_link_cache_locked(now_ts):
    # Limpa expirados por TTL.
    for key, row in list(DIRECT_LINK_CACHE.items()):
        try:
            ts = float(row.get('ts', 0.0))
        except Exception:
            ts = 0.0
        if (now_ts - ts) > DIRECT_LINK_CACHE_TTL_SEC:
            DIRECT_LINK_CACHE.pop(key, None)

    # Mantem limite de memoria do cache.
    if len(DIRECT_LINK_CACHE) <= DIRECT_LINK_CACHE_MAX_ITEMS:
        return
    overflow = max(1, len(DIRECT_LINK_CACHE) - DIRECT_LINK_CACHE_MAX_ITEMS)
    oldest = sorted(
        DIRECT_LINK_CACHE.items(),
        key=lambda kv: float((kv[1] or {}).get('ts', 0.0))
    )[:overflow]
    for key, _ in oldest:
        DIRECT_LINK_CACHE.pop(key, None)

def fetch_direct_event_link_for_bet(bet_id, arb_hash, is_live=None):
    if (not DIRECT_LINK_ENABLED) or (not BETBURGER_ACCESS_TOKEN):
        return ''

    bet_txt = str(bet_id or '').strip()
    arb_txt = str(arb_hash or '').strip()
    if not bet_txt or not arb_txt:
        return ''

    cache_key = f"{bet_txt}|{arb_txt}"
    now_ts = time.time()
    with DIRECT_LINK_CACHE_LOCK:
        cached = DIRECT_LINK_CACHE.get(cache_key)
        if cached is not None:
            try:
                ts = float(cached.get('ts', 0.0))
            except Exception:
                ts = 0.0
            try:
                ttl = float(cached.get('ttl', DIRECT_LINK_CACHE_TTL_SEC))
            except Exception:
                ttl = DIRECT_LINK_CACHE_TTL_SEC
            if (now_ts - ts) <= ttl:
                return str(cached.get('link') or '')
            DIRECT_LINK_CACHE.pop(cache_key, None)

    request_headers = _build_oddsrabbit_headers()
    for oddsrabbit_link in _iter_oddsrabbit_links(bet_txt, arb_txt, is_live=is_live):
        try:
            req = Request(
                oddsrabbit_link,
                method="GET",
                headers=request_headers
            )
            with urlopen(req, timeout=DIRECT_LINK_FETCH_TIMEOUT_SEC) as resp:
                final_url = str(resp.geturl() or '').strip()
                status = getattr(resp, 'status', None)
                _direct_link_debug(f"resolve candidate={oddsrabbit_link} status={status} final={final_url}")
                direct_from_qs = _extract_url_from_redirect(final_url)
                if direct_from_qs and _is_valid_event_final_url(direct_from_qs):
                    with DIRECT_LINK_CACHE_LOCK:
                        DIRECT_LINK_CACHE[cache_key] = {"link": direct_from_qs, "ts": now_ts, "ttl": DIRECT_LINK_CACHE_TTL_SEC}
                        _prune_direct_link_cache_locked(now_ts)
                    return direct_from_qs

                if final_url and _is_valid_event_final_url(final_url):
                    with DIRECT_LINK_CACHE_LOCK:
                        DIRECT_LINK_CACHE[cache_key] = {"link": final_url, "ts": now_ts, "ttl": DIRECT_LINK_CACHE_TTL_SEC}
                        _prune_direct_link_cache_locked(now_ts)
                    return final_url

                html_text = resp.read().decode("utf-8", errors="replace")
                direct_link = extract_direct_link_from_html(html_text, page_url=final_url)
                if direct_link and _is_valid_event_final_url(direct_link):
                    with DIRECT_LINK_CACHE_LOCK:
                        DIRECT_LINK_CACHE[cache_key] = {"link": direct_link, "ts": now_ts, "ttl": DIRECT_LINK_CACHE_TTL_SEC}
                        _prune_direct_link_cache_locked(now_ts)
                    return direct_link
                _direct_link_debug(f"resolve no link for {oddsrabbit_link}")
        except Exception as ex:
            _direct_link_debug(f"resolve failed {oddsrabbit_link} - {type(ex).__name__}: {ex}")
            continue

    direct_link = ''
    with DIRECT_LINK_CACHE_LOCK:
        DIRECT_LINK_CACHE[cache_key] = {"link": direct_link, "ts": now_ts, "ttl": DIRECT_LINK_EMPTY_CACHE_TTL_SEC}
        _prune_direct_link_cache_locked(now_ts)
    return direct_link


def build_house_event_link(base_event_link, house_home_url, family_root, house_name=''):
    event_link = str(base_event_link or '').strip()
    if not event_link:
        return ''
    if not _is_valid_event_final_url(event_link):
        return ''

    family_root_id = None
    try:
        family_root_id = int(family_root)
    except Exception:
        family_root_id = None

    house_key = _house_key_from_name(house_name)

    # Bet365 (root 10 e clone id 199): normaliza para rota BR com evento.
    if family_root_id in (10, 199) or house_key == 'bet365':
        normalized = _normalize_bet365_clone_event_link(event_link)
        if normalized and _is_valid_event_final_url(normalized):
            return normalized
        # Evita enviar link de dominio errado quando a casa exibida eh Bet365.
        return ''

    # SuperbetBR (root 329): normaliza /offer-event -> /odds no dominio BR.
    if family_root_id == 329 or house_key == 'superbet':
        normalized = _normalize_superbet_clone_event_link(event_link)
        if normalized and _is_valid_event_final_url(normalized):
            return normalized
        return ''

    # Pinnacle: normalize event link to BR clone route even when house url is missing.
    if family_root_id == 1 or house_key == 'pinnacle':
        normalized = _normalize_pinnacle_clone_event_link(event_link)
        if normalized and _is_valid_event_final_url(normalized):
            return normalized
        return ''

    if not house_home_url:
        return event_link

    try:
        parsed = urlsplit(event_link)
        parsed_house = urlsplit(house_home_url)
    except Exception:
        return event_link

    base_host = _normalize_redirect_host(event_link)
    target_host = _normalize_redirect_host(house_home_url)
    if not base_host or not target_host:
        return event_link
    if base_host == target_host:
        return event_link
    if base_host == 'oddsrabbit.org':
        return event_link

    # Pinnacle: preserve event path and normalize to BR clone route.
    if family_root_id == 1 and ('pinnacle.bet.br' in target_host):
        normalized = _normalize_pinnacle_clone_event_link(event_link)
        if not _is_valid_event_final_url(normalized):
            _direct_link_debug(
                f"house swap pinnacle invalid normalized={normalized} source={event_link}"
            )
            return ''
        _direct_link_debug(
            f"house swap pinnacle root={family_root} source={event_link} normalized={normalized}"
        )
        return normalized

    if family_root_id in DIRECT_LINK_DISABLE_SWAP_ROOT_IDS:
        _direct_link_debug(
            f"house swap disabled root={family_root} host={base_host} target={target_host} source={event_link}"
        )
        return event_link

    if DIRECT_LINK_SWAP_ROOT_IDS:
        if family_root_id is None or family_root_id not in DIRECT_LINK_SWAP_ROOT_IDS:
            return event_link

    scheme = parsed.scheme or parsed_house.scheme or 'https'
    netloc = parsed_house.netloc or target_host
    if not netloc:
        return event_link

    swapped = urlunsplit((scheme, netloc, parsed.path, parsed.query, parsed.fragment))
    if _is_valid_event_final_url(swapped):
        _direct_link_debug(f"house swap root={family_root} host={base_host} -> {target_host} source={event_link} swapped={swapped}")
        return swapped

    _direct_link_debug(f"house swap invalid result root={family_root} host={base_host} -> {target_host} source={event_link} swapped={swapped}")
    return event_link


def build_house_safe_link(
    base_event_link,
    house_home_url,
    family_root,
    house_name='',
    fallback_event_id=None,
    fallback_event_name='',
    source_bookmaker_name='',
    source_bookmaker_id=None,
):
    canonical = _canonicalize_link_for_house(
        house_name=house_name,
        house_home_url=house_home_url,
        source_event_link=base_event_link,
        fallback_event_id=fallback_event_id,
        fallback_event_name=fallback_event_name,
        source_bookmaker_name=source_bookmaker_name,
        source_bookmaker_id=source_bookmaker_id,
    )
    if canonical and _is_valid_event_final_url(canonical):
        return canonical

    event_link = build_house_event_link(base_event_link, house_home_url, family_root, house_name=house_name)
    if event_link and _is_valid_event_final_url(event_link):
        return event_link
    # Regra acordada: sem evento -> usa home da clone (nunca oddsrabbit/login).
    clone_home = _clone_home_for_house(house_name, house_home_url=house_home_url)
    if clone_home and _is_valid_publishable_url(clone_home):
        return clone_home
    if house_home_url and _is_valid_publishable_url(house_home_url):
        return str(house_home_url).strip()
    return ''
def apply_event_link_fields(target, event_link):
    if not isinstance(target, dict):
        return
    if not event_link:
        return
    if not _is_valid_publishable_url(event_link):
        return
    target["url"] = event_link
    target["link"] = event_link
    target["eventUrl"] = event_link
    target["event_url"] = event_link
    target["directLink"] = event_link
    target["direct_link"] = event_link

def extract_existing_event_link(bet_obj):
    if not isinstance(bet_obj, dict):
        return ''
    for key in ("direct_link", "directLink", "event_url", "eventUrl", "link", "url"):
        value = str(bet_obj.get(key) or '').strip()
        if value and _is_valid_event_final_url(value):
            return value
    return ''

def coerce_to_iso_utc(value):
    if value is None or value == '':
        return None

    from datetime import datetime, timezone

    # unix timestamp support (seconds or milliseconds)
    numeric = None
    if isinstance(value, (int, float)):
        numeric = float(value)
    else:
        txt = str(value).strip()
        if txt:
            try:
                numeric = float(txt)
            except ValueError:
                numeric = None

    if numeric is not None:
        if numeric > 1e12:
            numeric = numeric / 1000.0
        try:
            return datetime.fromtimestamp(numeric, timezone.utc).isoformat().replace('+00:00', 'Z')
        except Exception:
            pass

    # ISO-like string support
    try:
        txt = str(value).strip()
        if txt.endswith('Z'):
            txt = txt[:-1] + '+00:00'
        dt = datetime.fromisoformat(txt)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).isoformat().replace('+00:00', 'Z')
    except Exception:
        return None

def infer_is_live_from_start(starts_at_iso):
    if not starts_at_iso:
        return None
    try:
        from datetime import datetime, timezone
        txt = starts_at_iso[:-1] + '+00:00' if starts_at_iso.endswith('Z') else starts_at_iso
        starts_dt = datetime.fromisoformat(txt)
        return starts_dt <= datetime.now(timezone.utc)
    except Exception:
        return None

def make_arb_cache_key(arb):
    b1 = arb.get('bet1') if isinstance(arb, dict) else {}
    b2 = arb.get('bet2') if isinstance(arb, dict) else {}
    if not isinstance(b1, dict):
        b1 = {}
    if not isinstance(b2, dict):
        b2 = {}
    parts = [
        str(arb.get('arbId') if isinstance(arb, dict) else ''),
        normalize_match_text(b1.get('bookmaker')),
        normalize_match_text(b2.get('bookmaker')),
        str(b1.get('entryType') or ''),
        str(b2.get('entryType') or ''),
    ]
    return '||'.join(parts)

def get_live_cache_rows():
    rows = sorted(
        LIVE_ARBS_CACHE.values(),
        key=lambda row: row.get('_lastSeenTs', 0.0),
        reverse=True
    )
    out = []
    for row in rows:
        cp = dict(row)
        cp.pop('_lastSeenTs', None)
        out.append(cp)
    return out

def update_live_cache(new_rows):
    now_ts = time.time()

    for arb in new_rows:
        key = make_arb_cache_key(arb)
        cp = dict(arb)
        cp['_lastSeenTs'] = now_ts
        LIVE_ARBS_CACHE[key] = cp

    if ARBS_RETENTION_SEC > 0:
        cutoff = now_ts - ARBS_RETENTION_SEC
        for key, row in list(LIVE_ARBS_CACHE.items()):
            if row.get('_lastSeenTs', 0.0) < cutoff:
                del LIVE_ARBS_CACHE[key]

    if len(LIVE_ARBS_CACHE) > ARBS_CACHE_MAX_ROWS:
        ordered = sorted(
            LIVE_ARBS_CACHE.items(),
            key=lambda kv: kv[1].get('_lastSeenTs', 0.0),
            reverse=True
        )
        keep_keys = {key for key, _ in ordered[:ARBS_CACHE_MAX_ROWS]}
        for key in list(LIVE_ARBS_CACHE.keys()):
            if key not in keep_keys:
                del LIVE_ARBS_CACHE[key]

    return get_live_cache_rows()

def parse_datetime_to_hour_utc(value):
    if value is None or value == '':
        return None
    try:
        from datetime import datetime, timezone
        numeric = None
        if isinstance(value, (int, float)):
            numeric = float(value)
        else:
            txt = str(value).strip()
            if txt:
                try:
                    numeric = float(txt)
                except ValueError:
                    numeric = None
        if numeric is not None:
            if numeric > 1e12:
                numeric = numeric / 1000.0
            return datetime.fromtimestamp(numeric, timezone.utc).hour

        txt = str(value).strip()
        if txt.endswith('Z'):
            txt = txt[:-1] + '+00:00'
        dt = datetime.fromisoformat(txt)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).hour
    except Exception:
        return None

def build_cronograma(rows):
    slots = []
    for hour in range(24):
        nxt = (hour + 1) % 24
        slots.append({
            "hour": hour,
            "label": f"{hour:02d}h - {nxt:02d}h",
            "live": 0,
            "prelive": 0,
            "total": 0,
        })

    for row in rows or []:
        if not isinstance(row, dict):
            continue
        hour = parse_datetime_to_hour_utc(row.get('startsAt'))
        if hour is None:
            hour = parse_datetime_to_hour_utc(row.get('receivedAt'))
        if hour is None or hour < 0 or hour > 23:
            continue
        # Converte do bucket UTC para horario local configurado (padrao Brasil UTC-3).
        hour = (hour + CRONOGRAMA_TZ_OFFSET_HOURS) % 24

        is_live = row.get('isLive')
        if not isinstance(is_live, bool):
            as_int = to_int_or_none(is_live)
            if as_int is not None:
                is_live = as_int != 0
            else:
                continue

        if is_live:
            slots[hour]["live"] += 1
        else:
            slots[hour]["prelive"] += 1
        slots[hour]["total"] += 1

    return slots

def transform_arbs(arbs):
    transformed_arbs = []
    direct_fetch_budget = DIRECT_LINK_MAX_FETCH_PER_TICK if DIRECT_LINK_ENABLED else 0
    direct_force_fetch_budget = DIRECT_LINK_FORCE_MAX_FETCH_PER_TICK if DIRECT_LINK_ENABLED else 0
    for item in arbs:
        try:
            # Extract basic fields
            percent = (
                item.get('percent')
                if item.get('percent') is not None
                else item.get('percentage', 0)
            )
            sport = item.get('sport') or item.get('sportName') or ''
            event_name = item.get('event_name') or item.get('eventName') or ''
            league = item.get('league') or ''
            
            # Scraper V2 now provides enriched data in bet1_data/bet2_data
            b1 = item.get('bet1_data', {})
            b2 = item.get('bet2_data', {})
            raw = item.get('raw', {})
            
            # Fallback for legacy JSON
            if not b1 or not b2:
                # Payload vindo do distribuidor/familias usa bet1/bet2 diretamente.
                if not b1 and isinstance(item.get('bet1'), dict):
                    b1 = item.get('bet1') or {}
                if not b2 and isinstance(item.get('bet2'), dict):
                    b2 = item.get('bet2') or {}
            if not isinstance(raw, dict) or not raw:
                raw = item if isinstance(item, dict) else {}

            # Resolve sport name if it arrived as numeric id
            sport_id = to_int_or_none(sport)
            if sport_id is None:
                sport_id = to_int_or_none(raw.get('sport_id'))
            if sport_id is not None:
                sport = SPORTS_REF_MAP.get(sport_id, f"Sport {sport_id}")
            sport = translate_sport_name_to_pt(sport)

            def resolve_bookmaker_name(bet_obj):
                if not isinstance(bet_obj, dict):
                    return 'Casa Desconhecida'
                name = bet_obj.get('bookmaker_name') or bet_obj.get('bookmaker')
                name_id = to_int_or_none(name)
                bid = to_int_or_none(bet_obj.get('bookmaker_id'))
                lookup_id = bid if bid is not None else name_id
                if lookup_id is not None:
                    mapped = BOOKMAKERS_REF_MAP.get(lookup_id)
                    if mapped:
                        return mapped
                if name and str(name).strip() != '-' and name_id is None:
                    return str(name).strip()
                if lookup_id is not None:
                    if lookup_id not in UNKNOWN_BOOKMAKER_IDS_SEEN:
                        UNKNOWN_BOOKMAKER_IDS_SEEN.add(lookup_id)
                        print(f"[Warn] Unknown bookmaker_id without name mapping: {lookup_id}")
                    return 'Casa Desconhecida'
                return 'Casa Desconhecida'
            
            # Construct Bet Objects
            eventName = b1.get('bookmaker_event_name') or b2.get('bookmaker_event_name') or event_name
            bookmaker1 = resolve_bookmaker_name(b1)
            bookmaker2 = resolve_bookmaker_name(b2)
            root1, family_ids1, family_names1 = get_bookmaker_family_info(b1, bookmaker1)
            root2, family_ids2, family_names2 = get_bookmaker_family_info(b2, bookmaker2)

            # Fallback de roots quando payload ja vem transformado (bet1/bet2 do distribuidor).
            if root1 is None:
                root1 = (
                    to_int_or_none(item.get('bookmakerFamilyRoot1'))
                    or to_int_or_none(raw.get('bookmakerFamilyRoot1'))
                    or to_int_or_none(item.get('family_root1'))
                    or to_int_or_none(raw.get('family_root1'))
                )
                if root1 is not None:
                    family_ids1.update(BOOKMAKER_FAMILY_IDS.get(root1, set()))
                    family_ids1.add(root1)
                    family_names1 = dedupe_sorted_names(list(family_names1) + BOOKMAKER_FAMILY_NAMES.get(root1, []))
            if root2 is None:
                root2 = (
                    to_int_or_none(item.get('bookmakerFamilyRoot2'))
                    or to_int_or_none(raw.get('bookmakerFamilyRoot2'))
                    or to_int_or_none(item.get('family_root2'))
                    or to_int_or_none(raw.get('family_root2'))
                )
                if root2 is not None:
                    family_ids2.update(BOOKMAKER_FAMILY_IDS.get(root2, set()))
                    family_ids2.add(root2)
                    family_names2 = dedupe_sorted_names(list(family_names2) + BOOKMAKER_FAMILY_NAMES.get(root2, []))

            # Modo sem expansao: respeita somente as casas recebidas da API (sem expandir clones/familias).
            if not USE_BOOKMAKER_FAMILY_EXPANSION:
                family_names1 = [bookmaker1]
                family_names2 = [bookmaker2]
                bid1 = to_int_or_none(b1.get('bookmaker_id')) or to_int_or_none(b1.get('bookmaker'))
                bid2 = to_int_or_none(b2.get('bookmaker_id')) or to_int_or_none(b2.get('bookmaker'))
                family_ids1 = set([bid1]) if bid1 is not None else set()
                family_ids2 = set([bid2]) if bid2 is not None else set()
            else:
                # Nunca combinar lados da mesma casa-mae (familia/clones entre si).
                if root1 is not None and root2 is not None and root1 == root2:
                    continue

            # Filtro por casas permitidas (casas.txt)
            if (not DISABLE_HOUSES_FILTER) and (ALLOWED_BOOKMAKER_IDS or ALLOWED_BOOKMAKER_NAMES):
                # Filtro estrito por ID (bookmaker_id) para eliminar vazamento por nome.
                family_names1 = resolve_allowed_house_names_by_ids(family_ids1, family_names1)
                family_names2 = resolve_allowed_house_names_by_ids(family_ids2, family_names2)
                if not family_names1 or not family_names2:
                    continue

            # Modo clone-only: remove a casa-mae de cada lado, mantendo somente clones.
            family_names1 = filter_clone_only_names(root1, family_names1)
            family_names2 = filter_clone_only_names(root2, family_names2)
            if not family_names1 or not family_names2:
                continue

            starts_at = (
                coerce_to_iso_utc(b1.get('started_at')) or
                coerce_to_iso_utc(b2.get('started_at')) or
                coerce_to_iso_utc(raw.get('started_at'))
            )
            raw_is_live = raw.get('is_live')
            is_live = raw_is_live if isinstance(raw_is_live, bool) else None
            if is_live is None:
                as_int = to_int_or_none(raw_is_live)
                if as_int is not None:
                    is_live = as_int != 0
            
            arb_hash = item.get('arb_id') or raw.get('id') or ''
            bet1_id = b1.get('id') or raw.get('bet1_id') or ''
            bet2_id = b2.get('id') or raw.get('bet2_id') or ''
            bet1_event_id = (
                b1.get('raw_id') or
                b1.get('bookmaker_event_id') or
                b1.get('event_id') or
                raw.get('bet1_raw_id') or
                raw.get('bookmaker_event_id_1') or
                raw.get('event_id')
            )
            bet2_event_id = (
                b2.get('raw_id') or
                b2.get('bookmaker_event_id') or
                b2.get('event_id') or
                raw.get('bet2_raw_id') or
                raw.get('bookmaker_event_id_2') or
                raw.get('event_id')
            )
            bet1_event_name = b1.get('bookmaker_event_name') or b1.get('event_name') or eventName
            bet2_event_name = b2.get('bookmaker_event_name') or b2.get('event_name') or eventName

            # Prioriza links já presentes no payload e limita resoluções síncronas por ciclo.
            bet1_direct_link = extract_existing_event_link(b1)
            bet2_direct_link = extract_existing_event_link(b2)
            force_fetch_bet1 = root1 in DIRECT_LINK_FORCE_FETCH_ROOT_IDS
            force_fetch_bet2 = root2 in DIRECT_LINK_FORCE_FETCH_ROOT_IDS

            if (not bet1_direct_link):
                can_force = force_fetch_bet1 and (direct_force_fetch_budget > 0)
                can_regular = direct_fetch_budget > 0
                if can_force or can_regular:
                    bet1_direct_link = fetch_direct_event_link_for_bet(bet1_id, arb_hash, is_live=is_live)
                    if can_force:
                        direct_force_fetch_budget -= 1
                    else:
                        direct_fetch_budget -= 1

            if (not bet2_direct_link):
                can_force = force_fetch_bet2 and (direct_force_fetch_budget > 0)
                can_regular = direct_fetch_budget > 0
                if can_force or can_regular:
                    bet2_direct_link = fetch_direct_event_link_for_bet(bet2_id, arb_hash, is_live=is_live)
                    if can_force:
                        direct_force_fetch_budget -= 1
                    else:
                        direct_fetch_budget -= 1
            bet1_event_link = bet1_direct_link
            bet2_event_link = bet2_direct_link

            b1_odd = b1.get('koef')
            if b1_odd is None:
                b1_odd = b1.get('odd')
            if b1_odd is None:
                b1_odd = item.get('odd1') or raw.get('odd1')
            b2_odd = b2.get('koef')
            if b2_odd is None:
                b2_odd = b2.get('odd')
            if b2_odd is None:
                b2_odd = item.get('odd2') or raw.get('odd2')

            bet1_entry = format_market_entry(
                b1,
                str(
                    b1.get('entryType')
                    or item.get('entry1')
                    or raw.get('entry1')
                    or item.get('bet1_entry_type')
                    or ''
                ) or "M1"
            )
            bet2_entry = format_market_entry(
                b2,
                str(
                    b2.get('entryType')
                    or item.get('entry2')
                    or raw.get('entry2')
                    or item.get('bet2_entry_type')
                    or ''
                ) or "M2"
            )

            period_ref1 = (
                to_int_or_none(b1.get('period_id'))
                or to_int_or_none(raw.get('bet1_period_id'))
                or to_int_or_none(raw.get('period_id'))
            )
            period_ref2 = (
                to_int_or_none(b2.get('period_id'))
                or to_int_or_none(raw.get('bet2_period_id'))
                or to_int_or_none(raw.get('period_id'))
            )
            period_id1 = (
                to_int_or_none(b1.get('period_identifier'))
                or to_int_or_none(raw.get('bet1_period_identifier'))
                or to_int_or_none(raw.get('period_identifier'))
            )
            period_id2 = (
                to_int_or_none(b2.get('period_identifier'))
                or to_int_or_none(raw.get('bet2_period_identifier'))
                or to_int_or_none(raw.get('period_identifier'))
            )
            period_title1 = pick_first_text(
                b1.get('periodName'),
                b1.get('period_name'),
                b1.get('periodLabel'),
                b1.get('period_label'),
                raw.get('bet1_period_name'),
                raw.get('period_name'),
                raw.get('periodName'),
            )
            period_title2 = pick_first_text(
                b2.get('periodName'),
                b2.get('period_name'),
                b2.get('periodLabel'),
                b2.get('period_label'),
                raw.get('bet2_period_name'),
                raw.get('period_name'),
                raw.get('periodName'),
            )
            period_label1 = build_period_label(period_id1, sport, period_title1)
            period_label2 = build_period_label(period_id2, sport, period_title2)
            event_period_label = pick_first_text(
                item.get('periodLabel'),
                item.get('period_label'),
                raw.get('period_name'),
                raw.get('periodName'),
                period_label1,
                period_label2,
            )

            bet1_base = {
                "eventName": eventName,
                "league": b1.get('league') or league,
                "odd": b1_odd if b1_odd is not None else 0.0,
                "entryType": bet1_entry,
                "periodIdentifier": period_id1,
                "period_identifier": period_id1,
                "periodId": period_ref1,
                "period_id": period_ref1,
                "periodLabel": period_label1,
                "period_label": period_label1,
                "periodName": period_title1,
                "period_name": period_title1,
                "marketTypeCode": to_int_or_none(b1.get('market_and_bet_type')),
                "marketParam": b1.get('market_and_bet_type_param'),
                "title": str(b1.get('title') or '').strip(),
                "bc_title": str(b1.get('bc_title') or '').strip(),
                "betId": str(bet1_id) if bet1_id else "",
                "arbHash": str(arb_hash) if arb_hash else "",
            }
            apply_event_link_fields(bet1_base, bet1_event_link)
            
            bet2_base = {
                "eventName": eventName,
                "league": b2.get('league') or league,
                "odd": b2_odd if b2_odd is not None else 0.0,
                "entryType": bet2_entry,
                "periodIdentifier": period_id2,
                "period_identifier": period_id2,
                "periodId": period_ref2,
                "period_id": period_ref2,
                "periodLabel": period_label2,
                "period_label": period_label2,
                "periodName": period_title2,
                "period_name": period_title2,
                "marketTypeCode": to_int_or_none(b2.get('market_and_bet_type')),
                "marketParam": b2.get('market_and_bet_type_param'),
                "title": str(b2.get('title') or '').strip(),
                "bc_title": str(b2.get('bc_title') or '').strip(),
                "betId": str(bet2_id) if bet2_id else "",
                "arbHash": str(arb_hash) if arb_hash else "",
            }
            apply_event_link_fields(bet2_base, bet2_event_link)
            
            # ReceivedAt robusto: aceita unix seconds/ms e ISO string.
            received_at = (
                coerce_to_iso_utc(raw.get('updated_at')) or
                coerce_to_iso_utc(item.get('captured_at')) or
                datetime_now_iso()
            )

            try:
                import sys, os
                TESTELOCAL_DIR = os.path.join(BASE_DIR, '..', 'TESTELOCAL')
                if TESTELOCAL_DIR not in sys.path:
                    sys.path.insert(0, TESTELOCAL_DIR)
                from catalogar_casa_local import build_clone_urls, normalize_host
                bk1_id = b1.get('bookmaker_id') or b1.get('bookmaker')
                bk2_id = b2.get('bookmaker_id') or b2.get('bookmaker')
                c_urls1 = build_clone_urls(bk1_id, bet1_event_id, bet1_event_link)
                c_urls2 = build_clone_urls(bk2_id, bet2_event_id, bet2_event_link)
            except Exception as e:
                print(f"[Error] Failed to load catalogar_casa_local: {e}")
                c_urls1 = []
                c_urls2 = []
                normalize_host = lambda x: _normalize_redirect_host(x)  # fallback local

            parent_block = PARENT_BLOCK_BOOKMAKERS

            def _build_clone_side_list(
                family_names,
                catalog_urls,
                base_event_link,
                event_id,
                event_name,
                source_bookmaker_name,
                source_bookmaker_id,
                family_root,
            ):
                best_by_house = {}

                def _candidate_score(url_txt):
                    txt = str(url_txt or '').strip()
                    if not _is_valid_publishable_url(txt):
                        return -1
                    if _is_valid_event_final_url(txt):
                        return 200
                    return 100

                def _keep_best(house_norm, display_name, final_url, source_rank):
                    score = _candidate_score(final_url)
                    if score < 0:
                        return
                    cur = best_by_house.get(house_norm)
                    cand_key = (score, -int(source_rank))
                    if cur is None:
                        best_by_house[house_norm] = {
                            "name": display_name,
                            "url": final_url,
                            "score": score,
                            "source_rank": int(source_rank),
                        }
                        return
                    cur_key = (cur["score"], -int(cur["source_rank"]))
                    if cand_key > cur_key:
                        cur["name"] = display_name
                        cur["url"] = final_url
                        cur["score"] = score
                        cur["source_rank"] = int(source_rank)

                # 1) Prioriza nomes da familia (casas permitidas/clone-only).
                for house_name in dedupe_sorted_names(family_names or []):
                    raw_house_name = str(house_name or '').strip()
                    raw_house_norm = normalize_match_text(raw_house_name)
                    if not raw_house_norm or raw_house_norm in parent_block:
                        continue

                    display_name = canonical_clone_display_name(raw_house_name) or raw_house_name
                    house_norm = normalize_match_text(display_name)
                    if not house_norm or house_norm in parent_block:
                        continue

                    mapped_home = (
                        ALLOWED_BOOKMAKER_URL_BY_NAME.get(raw_house_norm, '')
                        or ALLOWED_BOOKMAKER_URL_BY_NAME.get(house_norm, '')
                    )
                    clone_home = _clone_home_for_house(raw_house_name, house_home_url=mapped_home)
                    final_url = build_house_safe_link(
                        base_event_link=base_event_link,
                        house_home_url=clone_home,
                        family_root=family_root,
                        house_name=raw_house_name,
                        fallback_event_id=event_id,
                        fallback_event_name=event_name,
                        source_bookmaker_name=source_bookmaker_name,
                        source_bookmaker_id=source_bookmaker_id,
                    )
                    _keep_best(
                        house_norm=house_norm,
                        display_name=display_name,
                        final_url=final_url,
                        source_rank=0,
                    )

                # 2) Complementa com URLs catalogadas (quando houver), mas sem casa-mae.
                for raw_url in (catalog_urls or []):
                    url_txt = str(raw_url or '').strip()
                    if not url_txt:
                        continue
                    host_txt = (normalize_host(url_txt) or _normalize_redirect_host(url_txt) or '').replace('www.', '').strip()
                    if not host_txt:
                        continue
                    raw_host_norm = normalize_match_text(host_txt)
                    if not raw_host_norm or raw_host_norm in parent_block:
                        continue

                    display_name = canonical_clone_display_name(host_txt) or host_txt
                    host_norm = normalize_match_text(display_name)
                    if not host_norm or host_norm in parent_block:
                        continue
                    _keep_best(
                        house_norm=host_norm,
                        display_name=display_name,
                        final_url=url_txt,
                        source_rank=1,
                    )

                out = []
                for house_norm, payload in best_by_house.items():
                    _ = house_norm
                    out.append((payload["name"], payload["url"]))
                return out

            c1_list = _build_clone_side_list(
                family_names=family_names1,
                catalog_urls=c_urls1,
                base_event_link=bet1_event_link,
                event_id=bet1_event_id,
                event_name=bet1_event_name,
                source_bookmaker_name=bookmaker1,
                source_bookmaker_id=b1.get('bookmaker_id') or b1.get('bookmaker'),
                family_root=root1,
            )
            c2_list = _build_clone_side_list(
                family_names=family_names2,
                catalog_urls=c_urls2,
                base_event_link=bet2_event_link,
                event_id=bet2_event_id,
                event_name=bet2_event_name,
                source_bookmaker_name=bookmaker2,
                source_bookmaker_id=b2.get('bookmaker_id') or b2.get('bookmaker'),
                family_root=root2,
            )

            if not c1_list or not c2_list:
                continue

            seen_pairs = set()
            for house1, house1_event_link in c1_list:
                for house2, house2_event_link in c2_list:
                    norm_house1 = normalize_match_text(house1)
                    norm_house2 = normalize_match_text(house2)

                    pair_key = (norm_house1, norm_house2)
                    if pair_key in seen_pairs:
                        continue
                    if norm_house1 == norm_house2:
                        continue
                    seen_pairs.add(pair_key)

                    bet1 = {"bookmaker": house1}
                    bet1_home_url = f"https://{normalize_host(house1_event_link)}"
                    bet1["bookmakerHomeUrl"] = bet1_home_url
                    bet1["bookmakerUrl"] = bet1_home_url
                    bet1.update(bet1_base)
                    apply_event_link_fields(bet1, house1_event_link)
                    bet1["bookmaker"] = resolve_bookmaker_display_name(
                        bet1.get("bookmaker"),
                        fallback_root=root1,
                        event_link=house1_event_link,
                    )

                    bet2 = {"bookmaker": house2}
                    bet2_home_url = f"https://{normalize_host(house2_event_link)}"
                    bet2["bookmakerHomeUrl"] = bet2_home_url
                    bet2["bookmakerUrl"] = bet2_home_url
                    bet2.update(bet2_base)
                    apply_event_link_fields(bet2, house2_event_link)
                    bet2["bookmaker"] = resolve_bookmaker_display_name(
                        bet2.get("bookmaker"),
                        fallback_root=root2,
                        event_link=house2_event_link,
                    )

                    # Gate: só publica se AMBOS os lados tiverem URL de evento válida, odd e entry.
                    bet1_final_url = bet1.get('url') or bet1.get('eventUrl') or ''
                    bet2_final_url = bet2.get('url') or bet2.get('eventUrl') or ''
                    bet1_has_valid_url = bool(bet1_final_url) and _is_valid_publishable_url(bet1_final_url)
                    bet2_has_valid_url = bool(bet2_final_url) and _is_valid_publishable_url(bet2_final_url)

                    if not (bet1_has_valid_url and bet2_has_valid_url):
                        continue

                    transformed_arbs.append({
                        "percentage": percent,
                        "sportName": sport,
                        "periodIdentifier": period_id1 if period_id1 is not None else period_id2,
                        "periodLabel": event_period_label,
                        "receivedAt": received_at,
                        "startsAt": starts_at,
                        "isLive": is_live,
                        "bet1": bet1,
                        "bet2": bet2,
                        "arbId": item.get('arb_id'),
                        "bookmakerFamilyRoot1": root1,
                        "bookmakerFamilyRoot2": root2,
                    })
        except Exception as e:
            print(f"[Warn] Error transforming item: {e}")
            continue
    return transformed_arbs


def sanitize_prebuilt_arbs(arbs):
    """
    Quando a fonte do feed ja e arbs_current (payload pronto),
    evita re-transformacao: apenas valida e saneia para envio socket.
    """
    out = []
    for item in (arbs or []):
        if not isinstance(item, dict):
            continue
        b1 = item.get("bet1") if isinstance(item.get("bet1"), dict) else None
        b2 = item.get("bet2") if isinstance(item.get("bet2"), dict) else None
        if not b1 or not b2:
            continue

        # Pass-through: nao bloquear lote por filtro agressivo.
        # Apenas normaliza campos de URL quando existir valor valido.
        u1 = str(b1.get("url") or b1.get("eventUrl") or b1.get("link") or "").strip()
        u2 = str(b2.get("url") or b2.get("eventUrl") or b2.get("link") or "").strip()
        if _is_valid_publishable_url(u1):
            apply_event_link_fields(b1, u1)
        if _is_valid_publishable_url(u2):
            apply_event_link_fields(b2, u2)

        root1 = to_int_or_none(item.get("bookmakerFamilyRoot1"))
        root2 = to_int_or_none(item.get("bookmakerFamilyRoot2"))
        b1_name = resolve_bookmaker_display_name(
            b1.get("bookmaker"),
            fallback_root=root1,
            event_link=u1,
        )
        b2_name = resolve_bookmaker_display_name(
            b2.get("bookmaker"),
            fallback_root=root2,
            event_link=u2,
        )
        # Pass-through do prebuilt: so completa nome se necessario.
        if b1_name and not str(b1.get("bookmaker") or "").strip():
            b1["bookmaker"] = b1_name
        if b2_name and not str(b2.get("bookmaker") or "").strip():
            b2["bookmaker"] = b2_name

        for clones_key, fallback_root in (("bet1_clones", root1), ("bet2_clones", root2)):
            clone_rows = item.get(clones_key)
            if not isinstance(clone_rows, list):
                continue
            for row in clone_rows:
                if not isinstance(row, dict):
                    continue
                clone_url = str(row.get("url") or row.get("eventUrl") or row.get("link") or "").strip()
                clone_name = resolve_bookmaker_display_name(
                    row.get("bookmaker"),
                    fallback_root=fallback_root,
                    event_link=clone_url,
                )
                if clone_name and not str(row.get("bookmaker") or "").strip():
                    row["bookmaker"] = clone_name

        # Recalcula entryType para preservar legenda BetBurger no modo postgres_raw
        # (inclusive quando vier fallback tecnico Txxx(...)).
        entry1_current = str(b1.get("entryType") or b1.get("entry_type") or "").strip()
        entry2_current = str(b2.get("entryType") or b2.get("entry_type") or "").strip()
        entry1_new = format_market_entry(b1, entry1_current or "M1")
        entry2_new = format_market_entry(b2, entry2_current or "M2")
        if entry1_new != entry1_current:
            b1["entryType"] = entry1_new
            b1["entry_type"] = entry1_new
        if entry2_new != entry2_current:
            b2["entryType"] = entry2_new
            b2["entry_type"] = entry2_new

        sport_name = (
            str(item.get("sportName") or item.get("sport_name") or item.get("sport") or "").strip()
            or str(b1.get("sportName") or b1.get("sport_name") or b1.get("sport") or "").strip()
            or str(b2.get("sportName") or b2.get("sport_name") or b2.get("sport") or "").strip()
        )
        period_ref1 = to_int_or_none(b1.get("periodId"))
        if period_ref1 is None:
            period_ref1 = to_int_or_none(b1.get("period_id"))
        period_ref2 = to_int_or_none(b2.get("periodId"))
        if period_ref2 is None:
            period_ref2 = to_int_or_none(b2.get("period_id"))
        period_id1 = to_int_or_none(b1.get("periodIdentifier"))
        if period_id1 is None:
            period_id1 = to_int_or_none(b1.get("period_identifier"))
        period_id2 = to_int_or_none(b2.get("periodIdentifier"))
        if period_id2 is None:
            period_id2 = to_int_or_none(b2.get("period_identifier"))

        period_label1_current = str(b1.get("periodLabel") or b1.get("period_label") or "").strip()
        period_title1 = pick_first_text(
            b1.get("periodName"),
            b1.get("period_name"),
            item.get("periodName"),
            item.get("period_name"),
        )
        period_label1_candidate = build_period_label(period_id1, sport_name, period_title1)
        period_label1 = period_label1_current
        if period_label1_candidate:
            if (
                not period_label1_current
                or is_hidden_period_label(period_label1_current)
                or (
                    is_generic_ordinal_period_label(period_label1_current)
                    and not is_generic_ordinal_period_label(period_label1_candidate)
                )
            ):
                period_label1 = period_label1_candidate
                b1["periodLabel"] = period_label1
                b1["period_label"] = period_label1

        period_label2_current = str(b2.get("periodLabel") or b2.get("period_label") or "").strip()
        period_title2 = pick_first_text(
            b2.get("periodName"),
            b2.get("period_name"),
            item.get("periodName"),
            item.get("period_name"),
        )
        period_label2_candidate = build_period_label(period_id2, sport_name, period_title2)
        period_label2 = period_label2_current
        if period_label2_candidate:
            if (
                not period_label2_current
                or is_hidden_period_label(period_label2_current)
                or (
                    is_generic_ordinal_period_label(period_label2_current)
                    and not is_generic_ordinal_period_label(period_label2_candidate)
                )
            ):
                period_label2 = period_label2_candidate
                b2["periodLabel"] = period_label2
                b2["period_label"] = period_label2

        if period_id1 is not None and b1.get("periodIdentifier") is None:
            b1["periodIdentifier"] = period_id1
            b1["period_identifier"] = period_id1
        if period_id2 is not None and b2.get("periodIdentifier") is None:
            b2["periodIdentifier"] = period_id2
            b2["period_identifier"] = period_id2

        event_period = pick_first_text(
            item.get("periodLabel"),
            item.get("period_label"),
            item.get("periodName"),
            item.get("period_name"),
            period_label1,
            period_label2,
        )
        if event_period:
            item["periodLabel"] = event_period
            item["periodIdentifier"] = period_id1 if period_id1 is not None else period_id2

        out.append(item)
    return out

async def background_reader():
    """
    Fonte JSON (legado): poll em surebets_live.json.
    Fonte postgres_raw: poll na tabela do scraper.
    Sempre transforma e transmite para 'arbs_live_room'.
    """
    global last_mtime, LAST_PG_FEED_SIGNATURE
    if ARBS_SOURCE_MODE == 'postgres_raw':
        print(f"[System] Watching Postgres feed table {SCRAPER_PG_FEED_TABLE} for updates...")
    else:
        print(f"[System] Watching {JSON_FILE} for updates...")

    while True:
        await asyncio.sleep(PG_FEED_POLL_INTERVAL_SEC if ARBS_SOURCE_MODE == 'postgres_raw' else JSON_POLL_INTERVAL_SEC)

        try:
            if ARBS_SOURCE_MODE == 'postgres_raw':
                sig = await asyncio.to_thread(read_pg_feed_signature)
                if sig is None or sig == LAST_PG_FEED_SIGNATURE:
                    continue
                LAST_PG_FEED_SIGNATURE = sig

                arbs = await asyncio.to_thread(read_arbs_data_from_pg_feed, PG_FEED_MAX_ROWS)
                if str(SCRAPER_PG_FEED_TABLE).strip().lower() == 'arbs_current':
                    transformed_arbs = await asyncio.to_thread(sanitize_prebuilt_arbs, arbs or [])
                else:
                    transformed_arbs = await asyncio.to_thread(transform_arbs, arbs or [])
                batch_size = len(transformed_arbs)

                if pg_runtime_enabled():
                    if str(SCRAPER_PG_FEED_TABLE).strip().lower() == 'arbs_current':
                        # Feed ja vem da tabela final; nao regravar para evitar loop/wipe.
                        live_rows = transformed_arbs[:SOCKET_BROADCAST_MAX_ROWS]
                        if not live_rows:
                            live_rows = await asyncio.to_thread(get_rows_for_socket)
                    else:
                        await asyncio.to_thread(persist_rows_to_postgres, transformed_arbs, True)
                        live_rows = await asyncio.to_thread(get_rows_for_socket)
                else:
                    live_rows = update_live_cache(transformed_arbs)

                payload = {
                    "data": { 
                        "arbs": live_rows,
                        "timestamp": datetime_now_iso(),
                        "prefilterOptions": PREFILTER_OPTIONS,
                        "cronograma": build_cronograma(live_rows),
                    },
                    "arbs": live_rows,
                    "timestamp": datetime_now_iso(),
                    "prefilterOptions": PREFILTER_OPTIONS,
                    "cronograma": build_cronograma(live_rows),
                }
                
                print(
                    f"[Broadcast] Sending {len(live_rows)} arbs to clients. "
                    f"(batch={batch_size} source={'postgres' if pg_runtime_enabled() else 'memory-cache'})"
                )
                await sio.emit('data', payload) # Broadcast to all
                continue

            if not os.path.exists(JSON_FILE):
                continue

            mtime = os.path.getmtime(JSON_FILE)
            if mtime > last_mtime:
                arbs = read_arbs_data()
                if arbs is None:
                    continue
                last_mtime = mtime

                transformed_arbs = await asyncio.to_thread(transform_arbs, arbs)
                batch_size = len(transformed_arbs)

                # Persistencia principal no PostgreSQL (365 dias no historico).
                if pg_runtime_enabled():
                    # Em modo clone-only com gate estrito/publicavel, manter apenas lote atual
                    # evita vazar linhas antigas com casa-mae.
                    await asyncio.to_thread(persist_rows_to_postgres, transformed_arbs, True)
                    live_rows = await asyncio.to_thread(get_rows_for_socket)
                else:
                    live_rows = update_live_cache(transformed_arbs)

                payload = {
                    "data": {
                        "arbs": live_rows,
                        "timestamp": datetime_now_iso(),
                        "prefilterOptions": PREFILTER_OPTIONS,
                        "cronograma": build_cronograma(live_rows),
                    },
                    "arbs": live_rows,
                    "timestamp": datetime_now_iso(),
                    "prefilterOptions": PREFILTER_OPTIONS,
                    "cronograma": build_cronograma(live_rows),
                }

                print(
                    f"[Broadcast] Sending {len(live_rows)} arbs to clients. "
                    f"(batch={batch_size} source={'postgres' if pg_runtime_enabled() else 'memory-cache'})"
                )
                await sio.emit('data', payload) # Broadcast to all

        except Exception as e:
            print(f"[Error] Background loop: {e}")

async def init_app():
    global PG_ENABLED, ARBS_SOURCE_MODE
    global SPORTS_REF_MAP, BOOKMAKERS_REF_MAP, PERIODS_REF_MAP, PERIOD_TRANSLATIONS_REF_MAP
    global ALLOWED_BOOKMAKER_IDS, ALLOWED_BOOKMAKER_NAMES
    global MARKET_VARIATION_TITLE_MAP, MARKET_VARIATION_MARKET_ID_MAP, MARKET_ID_NEED_VALUE_MAP
    global BOOKMAKER_PARENT_BY_ID, BOOKMAKER_FAMILY_NAMES, BOOKMAKER_FAMILY_IDS
    global ALLOWED_BOOKMAKER_DISPLAY_NAMES, ALLOWED_BOOKMAKER_URL_BY_NAME, ALLOWED_BOOKMAKER_NAME_BY_HOST
    global PREFILTER_OPTIONS, LIVE_ARBS_CACHE

    (SPORTS_REF_MAP,
     BOOKMAKERS_REF_MAP,
     PERIODS_REF_MAP,
     PERIOD_TRANSLATIONS_REF_MAP,
     MARKET_VARIATION_TITLE_MAP,
     MARKET_VARIATION_MARKET_ID_MAP,
     MARKET_ID_NEED_VALUE_MAP,
     BOOKMAKER_FAMILY_NAMES,
     BOOKMAKER_FAMILY_IDS,
     BOOKMAKER_PARENT_BY_ID) = load_reference_maps(REFERENCE_FILE)

    # Atualiza mapas criticos (mercado/periodo/esporte) direto do directories da BetBurger.
    # Evita depender de arquivo local desatualizado.
    if BETBURGER_ACCESS_TOKEN:
        (live_sports_map,
         live_periods_map,
         live_period_translations_map,
         live_market_map,
         live_market_id_by_variation,
         live_market_need_value) = load_live_directories_maps(
            BETBURGER_ACCESS_TOKEN,
            BETBURGER_LINK_LOCALE,
        )
        if live_sports_map:
            SPORTS_REF_MAP.update(live_sports_map)
        if live_periods_map:
            PERIODS_REF_MAP.update(live_periods_map)
        if live_period_translations_map:
            for sid, period_map in live_period_translations_map.items():
                if not isinstance(period_map, dict):
                    continue
                bucket = PERIOD_TRANSLATIONS_REF_MAP.setdefault(sid, {})
                bucket.update(period_map)
        if live_market_map:
            MARKET_VARIATION_TITLE_MAP.update(live_market_map)
        if live_market_id_by_variation:
            MARKET_VARIATION_MARKET_ID_MAP.update(live_market_id_by_variation)
        if live_market_need_value:
            MARKET_ID_NEED_VALUE_MAP.update(live_market_need_value)
        print(
            f"[System] Live directories merged: sports={len(live_sports_map)} "
            f"periods={len(live_periods_map)} period_translations={len(live_period_translations_map)} "
            f"market_variations={len(live_market_map)} "
            f"market_need_value={len(live_market_need_value)}"
        )

    status_list = load_status_bookmakers(STATUS_FILE)
    status_list.extend(load_status_bookmakers(HOUSES_FILE))
    for bid, bname, parent_id in status_list:
        BOOKMAKERS_REF_MAP[bid] = bname
        if parent_id is not None:
            BOOKMAKER_PARENT_BY_ID[bid] = parent_id
            BOOKMAKER_FAMILY_IDS.setdefault(parent_id, set()).add(parent_id)
            BOOKMAKER_FAMILY_IDS[parent_id].add(bid)
        else:
            BOOKMAKER_PARENT_BY_ID[bid] = bid

    # Enriquece familias com nomes adicionais do status e dos mapas.
    for bid, bname in BOOKMAKERS_REF_MAP.items():
        root = resolve_family_root(bid)
        if root is None:
            root = bid
            BOOKMAKER_PARENT_BY_ID.setdefault(root, root)
        BOOKMAKER_FAMILY_IDS.setdefault(root, set()).add(root)
        BOOKMAKER_FAMILY_IDS[root].add(bid)
        names_list = BOOKMAKER_FAMILY_NAMES.setdefault(root, [])
        append_unique_name(names_list, bname)

    if DISABLE_HOUSES_FILTER:
        ALLOWED_BOOKMAKER_IDS, ALLOWED_BOOKMAKER_NAMES = set(), set()
        ALLOWED_BOOKMAKER_DISPLAY_NAMES = []
        ALLOWED_BOOKMAKER_URL_BY_NAME = {}
        ALLOWED_BOOKMAKER_NAME_BY_HOST = {}
    else:
        ALLOWED_BOOKMAKER_IDS, ALLOWED_BOOKMAKER_NAMES = load_allowed_bookmakers(HOUSES_FILE)
        ALLOWED_BOOKMAKER_DISPLAY_NAMES = load_allowed_bookmaker_display_names(HOUSES_FILE)
        ALLOWED_BOOKMAKER_URL_BY_NAME = load_allowed_bookmaker_url_map(HOUSES_FILE)
        ALLOWED_BOOKMAKER_NAME_BY_HOST = load_allowed_bookmaker_host_map(HOUSES_FILE)

    PREFILTER_OPTIONS = build_fixed_prefilter_options()
    LIVE_ARBS_CACHE = {}

    print(
        f"[System] Loaded reference maps: sports={len(SPORTS_REF_MAP)} "
        f"bookmakers={len(BOOKMAKERS_REF_MAP)} periods={len(PERIODS_REF_MAP)} "
        f"period_translations={len(PERIOD_TRANSLATIONS_REF_MAP)} "
        f"market_variations={len(MARKET_VARIATION_TITLE_MAP)} "
        f"market_need_value={len(MARKET_ID_NEED_VALUE_MAP)}"
    )
    print(f"[System] Loaded bookmaker families: {len(BOOKMAKER_FAMILY_NAMES)}")
    print(
        "[System] Family expansion mode: "
        + ("ENABLED (clone combinations)" if USE_BOOKMAKER_FAMILY_EXPANSION else "DISABLED (strict API houses)")
    )
    print(f"[System] Source mode: {ARBS_SOURCE_MODE}")
    print(
        "[System] Memory cache mode: "
        + ("STANDBY/FALLBACK" if pg_runtime_enabled() else ("SNAPSHOT (no retention)" if ARBS_RETENTION_SEC <= 0 else f"RETENTION ({ARBS_RETENTION_SEC:.0f}s)"))
    )
    print(
        f"[System] PreFilter fixed options: houses={len(PREFILTER_OPTIONS.get('houses', []))} "
        f"sports={len(PREFILTER_OPTIONS.get('sports', []))}"
    )
    if BETBURGER_ACCESS_TOKEN:
        mode_txt = "direct-only" if DIRECT_LINK_ENABLED else "oddsrabbit-only"
        print(
            f"[System] Fast bet-link mode: ENABLED ({mode_txt}; base={ODDSRABBIT_BETS_BASE}, locale={BETBURGER_LINK_LOCALE})"
        )
        if DIRECT_LINK_ENABLED:
            print(f"[System] Direct link sync fetch budget per tick: {DIRECT_LINK_MAX_FETCH_PER_TICK}")
            forced_roots_txt = ", ".join(str(x) for x in sorted(DIRECT_LINK_FORCE_FETCH_ROOT_IDS))
            print(
                f"[System] Direct link force-fetch roots: [{forced_roots_txt}] "
                f"(budget={DIRECT_LINK_FORCE_MAX_FETCH_PER_TICK})"
            )
        if DIRECT_LINK_ENABLED:
            roots_txt = ", ".join(str(x) for x in sorted(DIRECT_LINK_SWAP_ROOT_IDS))
            print(f"[System] Direct link domain-swap roots: [{roots_txt}]")
    else:
        print("[System] Fast bet-link mode: DISABLED (BETBURGER_ACCESS_TOKEN ausente no ambiente)")
    if DISABLE_HOUSES_FILTER:
        print("[System] Loaded houses filter: DISABLED (DISABLE_HOUSES_FILTER=1)")
    else:
        print(f"[System] Loaded houses filter: ids={len(ALLOWED_BOOKMAKER_IDS)} names={len(ALLOWED_BOOKMAKER_NAMES)}")
    app.router.add_post('/api/auth/login', api_auth_login)
    app.router.add_get('/api/arbs/current', api_arbs_current)
    app.router.add_get('/api/arbs/history', api_arbs_history)
    auth_targets = panel_auth_endpoints()
    print(f"[System] Auth endpoint enabled: POST /api/auth/login -> {PANEL_AUTH_ENDPOINT}")
    if len(auth_targets) > 1:
        print(f"[System] Auth fallback endpoints: {auth_targets[1:]}")

    if pg_runtime_enabled():
        ok = await asyncio.to_thread(init_postgres_schema)
        if ok:
            print(
                f"[System] Postgres enabled: {PG_HOST}:{PG_PORT}/{PG_DB} "
                f"(retention={PG_RETENTION_DAYS}d, current_stale={PG_CURRENT_STALE_SEC}s, socket_max={SOCKET_BROADCAST_MAX_ROWS})"
            )
            if ARBS_SOURCE_MODE == 'postgres_raw':
                raw_ok = await asyncio.to_thread(init_postgres_raw_feed_schema)
                if not raw_ok:
                    print("[Warn] Nao foi possivel preparar a tabela raw do scraper.")
        else:
            PG_ENABLED = False
            pg_close_conn()
            print("[System] Postgres schema init failed. Falling back to memory cache mode.")
    else:
        if PG_ENABLED:
            print("[System] Postgres requested but psycopg2 is missing. Falling back to memory cache mode.")
        else:
            print("[System] Postgres disabled by PG_ENABLED=0.")

    if ARBS_SOURCE_MODE == 'postgres_raw' and not pg_runtime_enabled():
        ARBS_SOURCE_MODE = 'json'
        print("[System] Source mode fallback: postgres_raw -> json (Postgres indisponivel).")
    elif ARBS_SOURCE_MODE == 'postgres_raw':
        print(
            f"[System] Postgres raw feed: table={SCRAPER_PG_FEED_TABLE} "
            f"(poll={PG_FEED_POLL_INTERVAL_SEC:.3f}s, max_rows={PG_FEED_MAX_ROWS})"
        )

    sio.start_background_task(background_reader)
    return app

if __name__ == '__main__':
    web.run_app(init_app(), port=PORT)










