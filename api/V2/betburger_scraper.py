#!/usr/bin/env python3
import argparse
import csv
import json
import os
import re
import signal
import sys
import time
import shutil
import tempfile
from datetime import datetime, timezone
from urllib.parse import urlencode, quote
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

try:
    import psycopg2
    from psycopg2.extras import Json, execute_values
except Exception:
    psycopg2 = None
    Json = None
    execute_values = None

# Endpoints
BASE_API_LV = 'https://rest-api-lv.betburger.com/api/v1'
BASE_API_PR = 'https://rest-api-pr.betburger.com/api/v1'
BASE_API_MST = 'https://api-mst.betburger.com/api/v1'

ARBS_URL = f'{BASE_API_LV}/arbs/pro_search'
ARBS_URL_PREMATCH = f'{BASE_API_PR}/arbs/pro_search'
STATUS_URL = f'{BASE_API_MST}/bookmakers_statuses'
REFRESH_URL = f'{BASE_API_LV}/refresh_token'
SETTINGS_URL = 'https://www.betburger.com/update_search_settings.json' # Endpoint de settings web

# Headers padrao (mimicando navegador)
DEFAULT_HEADERS = {
    'accept': 'application/json, text/plain, */*',
    'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'origin': 'https://www.betburger.com',
    'referer': 'https://www.betburger.com/',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
}

DISABLE_HOUSES_FILTER = os.getenv('DISABLE_HOUSES_FILTER', '0').strip().lower() in ('1', 'true', 'yes', 'on')
DEFAULT_SEARCH_FILTER_IDS_LIVE = ['2028569']
DEFAULT_SEARCH_FILTER_IDS_PREMATCH = ['1296400']

# --- Postgres Direct Feed (scraper -> DB) ---
def _clean_env_text(name, default=''):
    val = str(os.getenv(name, default)).strip()
    if len(val) >= 2 and ((val[0] == '"' and val[-1] == '"') or (val[0] == "'" and val[-1] == "'")):
        val = val[1:-1].strip()
    return val

PG_ENABLED = os.getenv('PG_ENABLED', '1').strip().lower() in ('1', 'true', 'yes', 'on')
SCRAPER_PG_DIRECT = os.getenv('SCRAPER_PG_DIRECT', '1').strip().lower() in ('1', 'true', 'yes', 'on')
SCRAPER_WRITE_JSON = os.getenv('SCRAPER_WRITE_JSON', '0').strip().lower() in ('1', 'true', 'yes', 'on')
PG_HOST = _clean_env_text('PG_HOST', '127.0.0.1') or '127.0.0.1'
PG_PORT = int(_clean_env_text('PG_PORT', '5432') or '5432')
PG_DB = _clean_env_text('PG_DB', 'surebet') or 'surebet'
PG_USER = _clean_env_text('PG_USER', 'postgres') or 'postgres'
PG_PASSWORD = _clean_env_text('PG_PASSWORD', '')
PG_SSLMODE = _clean_env_text('PG_SSLMODE', 'prefer') or 'prefer'
PG_FEED_TABLE = os.getenv('SCRAPER_PG_FEED_TABLE', 'scraper_arbs_current').strip() or 'scraper_arbs_current'
SCRAPER_APPLY_HOUSES_FILTER = os.getenv('SCRAPER_APPLY_HOUSES_FILTER', '0').strip().lower() in ('1', 'true', 'yes', 'on')

def pg_scraper_runtime_enabled():
    return PG_ENABLED and SCRAPER_PG_DIRECT and psycopg2 is not None and execute_values is not None and Json is not None

def pg_connect():
    if not pg_scraper_runtime_enabled():
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
        print(f"[Warn] Postgres connect failed (scraper): {e}", file=sys.stderr)
        return None

def init_pg_feed_schema():
    if not pg_scraper_runtime_enabled():
        return False
    conn = pg_connect()
    if conn is None:
        return False
    ddl = f"""
    CREATE TABLE IF NOT EXISTS {PG_FEED_TABLE} (
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
    CREATE INDEX IF NOT EXISTS idx_{PG_FEED_TABLE}_updated_at ON {PG_FEED_TABLE}(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_{PG_FEED_TABLE}_is_live ON {PG_FEED_TABLE}(is_live);
    """
    try:
        with conn.cursor() as cur:
            cur.execute(ddl)
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        print(f"[Warn] Postgres feed schema init failed (scraper): {e}", file=sys.stderr)
        return False
    finally:
        try:
            conn.close()
        except Exception:
            pass

def build_scraper_cache_key(row):
    if not isinstance(row, dict):
        return ''
    raw = row.get('raw') if isinstance(row.get('raw'), dict) else {}
    b1 = row.get('bet1_data') if isinstance(row.get('bet1_data'), dict) else {}
    b2 = row.get('bet2_data') if isinstance(row.get('bet2_data'), dict) else {}

    arb_id = row.get('arb_id') or raw.get('id') or ''
    bet1_id = raw.get('bet1_id') or b1.get('id') or ''
    bet2_id = raw.get('bet2_id') or b2.get('id') or ''
    is_live = raw.get('is_live')
    is_live_txt = ''
    if isinstance(is_live, bool):
        is_live_txt = '1' if is_live else '0'
    elif is_live is not None:
        is_live_txt = str(is_live)

    parts = [str(arb_id), str(bet1_id), str(bet2_id), is_live_txt]
    key = "||".join(parts)
    if key.strip("|"):
        return key
    try:
        # Fallback estavel
        return json.dumps(row, ensure_ascii=False, sort_keys=True)
    except Exception:
        return str(time.time())

def persist_rows_to_pg_feed(rows):
    if not pg_scraper_runtime_enabled():
        return False
    conn = pg_connect()
    if conn is None:
        return False
    now_dt = datetime.now(timezone.utc)
    try:
        with conn.cursor() as cur:
            if not rows:
                cur.execute(f"DELETE FROM {PG_FEED_TABLE}")
                conn.commit()
                return True

            rows_by_key = {}
            for row in rows:
                if not isinstance(row, dict):
                    continue
                key = build_scraper_cache_key(row)
                raw = row.get('raw') if isinstance(row.get('raw'), dict) else {}
                is_live = raw.get('is_live')
                if not isinstance(is_live, bool):
                    iv = to_int_or_none(is_live)
                    is_live = (iv != 0) if iv is not None else None
                captured_at = row.get('captured_at')
                rows_by_key[key] = (
                    key,
                    now_dt,
                    is_live,
                    str(row.get('arb_id') or ''),
                    float(row.get('percent') or 0.0),
                    str(row.get('sport') or ''),
                    str(row.get('event_name') or ''),
                    captured_at if captured_at else None,
                    Json(row),
                )

            tuples = list(rows_by_key.values())
            keys = list(rows_by_key.keys())

            if not tuples:
                cur.execute(f"DELETE FROM {PG_FEED_TABLE}")
                conn.commit()
                return True

            upsert_sql = f"""
            INSERT INTO {PG_FEED_TABLE} (
                cache_key, updated_at, is_live, arb_id, percent, sport, event_name, captured_at, payload
            ) VALUES %s
            ON CONFLICT (cache_key) DO UPDATE SET
                updated_at = EXCLUDED.updated_at,
                is_live = EXCLUDED.is_live,
                arb_id = EXCLUDED.arb_id,
                percent = EXCLUDED.percent,
                sport = EXCLUDED.sport,
                event_name = EXCLUDED.event_name,
                captured_at = EXCLUDED.captured_at,
                payload = EXCLUDED.payload
            """
            execute_values(cur, upsert_sql, tuples, page_size=1000)
            cur.execute(
                f"DELETE FROM {PG_FEED_TABLE} WHERE cache_key <> ALL(%s)",
                (list(dict.fromkeys(keys)),),
            )
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        print(f"[Warn] Postgres feed persist failed (scraper): {e}", file=sys.stderr)
        return False
    finally:
        try:
            conn.close()
        except Exception:
            pass

def now_iso():
    return datetime.now(timezone.utc).isoformat()

def to_int_or_none(value):
    try:
        if value is None or isinstance(value, bool):
            return None
        return int(str(value).strip())
    except (TypeError, ValueError):
        return None

def normalize_match_text(value):
    if value is None:
        return ''
    return re.sub(r'\s+', ' ', str(value).strip().lower())

def load_allowed_bookmakers(path):
    """
    Carrega IDs e nomes permitidos a partir de um TXT com objetos JSON-like.
    Aceita campos: id, bookmaker_id, name, bookmaker.
    """
    allowed_ids = set()
    allowed_names = set()

    if not path or not os.path.exists(path):
        return allowed_ids, allowed_names

    try:
        with open(path, 'r', encoding='utf-8', errors='replace') as f:
            text = f.read()
    except Exception as e:
        print(f"[Warn] Erro lendo lista de casas {path}: {e}", file=sys.stderr)
        return allowed_ids, allowed_names

    for obj_text in re.findall(r'\{[^{}]*\}', text, flags=re.S):
        id_match = re.search(r'"id"\s*:\s*(-?\d+)', obj_text)
        if id_match:
            allowed_ids.add(int(id_match.group(1)))

        base_id_match = re.search(r'"bookmaker_id"\s*:\s*(-?\d+)', obj_text)
        if base_id_match:
            allowed_ids.add(int(base_id_match.group(1)))

        name_match = re.search(r'"name"\s*:\s*"([^"]+)"', obj_text)
        if name_match:
            nm = normalize_match_text(name_match.group(1))
            if nm:
                allowed_names.add(nm)

        bookmaker_match = re.search(r'"bookmaker"\s*:\s*"([^"]+)"', obj_text)
        if bookmaker_match:
            nm = normalize_match_text(bookmaker_match.group(1))
            if nm:
                allowed_names.add(nm)

    return allowed_ids, allowed_names

def bet_is_allowed(bet_obj, allowed_ids=None, allowed_names=None):
    allowed_ids = allowed_ids or set()
    allowed_names = allowed_names or set()

    if not allowed_ids and not allowed_names:
        return True
    if not isinstance(bet_obj, dict):
        return False

    id_candidates = [
        to_int_or_none(bet_obj.get('bookmaker_id')),
        to_int_or_none(bet_obj.get('bookmaker_name')),
        to_int_or_none(bet_obj.get('bookmaker')),
    ]
    for candidate in id_candidates:
        if candidate is not None and candidate in allowed_ids:
            return True

    name_candidates = [
        bet_obj.get('bookmaker_name'),
        bet_obj.get('bookmaker'),
    ]
    for name in name_candidates:
        norm = normalize_match_text(name)
        if norm and norm in allowed_names:
            return True

    return False

def atomic_write_json(path, data):
    """Escreve JSON atomicamente para evitar leitura de arquivo incompleto pelo frontend."""
    if not path: return
    dir_name = os.path.dirname(os.path.abspath(path)) or '.'
    # Cria arquivo temporario no mesmo diretorio
    fd, temp_path = tempfile.mkstemp(dir=dir_name, text=True)
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        # Substitui o arquivo original atomicamente
        shutil.move(temp_path, path)
    except Exception as e:
        print(f'[{now_iso()}] Erro ao salvar JSON atomicamente: {e}', file=sys.stderr)
        os.remove(temp_path)

def build_bk_ids():
    return [str(i) for i in range(1, 721)]

def split_csv_values(values):
    out = []
    if not values:
        return out
    for value in values:
        for part in str(value).split(','):
            p = part.strip()
            if p:
                out.append(p)
    return out

def load_search_filter_ids(raw_values, env_var_name, defaults):
    # Prioridade: CLI > ENV > default
    if raw_values:
        return split_csv_values(raw_values)
    env_raw = os.getenv(env_var_name, '')
    env_vals = split_csv_values([env_raw]) if env_raw else []
    if env_vals:
        return env_vals
    return defaults.copy()

def build_search_data(per_page, page, live_only, search_filter_ids=None, use_all_bk_ids=False):
    data = [
        ('auto_update', 'true'),
        ('notification_sound', 'false'),
        ('notification_popup', 'false'),
        ('show_event_arbs', 'true'),
        ('grouped', 'true'),
        ('per_page', str(per_page)),
        ('page', str(page)),
        ('sort_by', 'percent'),
        ('koef_format', 'decimal'),
        ('mode', ''),
        ('event_id', ''),
        ('q', ''),
    ]
    for t in range(1, 11):
        data.append(('event_arb_types[]', str(t)))
    
    active_filters = search_filter_ids or []
    if not active_filters:
        raise ValueError('Nenhum search_filter_id configurado. Defina --search-filter-id-live/--search-filter-id-prematch ou as variaveis BETBURGER_SEARCH_FILTER_IDS_LIVE/BETBURGER_SEARCH_FILTER_IDS_PREMATCH.')
    for sf in active_filters:
        data.append(('search_filter[]', sf))

    if live_only:
        data.append(('is_live', 'true'))
    
    # Quando usamos search_filter dedicado de usuario, evitamos abrir todas as casas.
    if use_all_bk_ids or not search_filter_ids:
        bk_ids = build_bk_ids()
        for bk in bk_ids:
            data.append(('bk_ids[]', bk))
        
    return data

def request_json(url, method='GET', data=None, token=None, locale='pt', extra_headers=None):
    """Funcao generica para requests."""
    full_url = url
    if token:
        # Se ja tem query params, usa &, senao ?
        sep = '&' if '?' in url else '?'
        full_url = f'{url}{sep}access_token={token}&locale={locale}'
    
    headers = DEFAULT_HEADERS.copy()
    if extra_headers:
        headers.update(extra_headers)

    body = None
    if data is not None:
        if isinstance(data, dict) or isinstance(data, list):
            # Se for lista de tuplas (form-data), codifica. Se for string, usa direto.
            body = urlencode(data).encode('utf-8')
        elif isinstance(data, str):
            body = data.encode('utf-8')

    req = Request(full_url, method=method, data=body, headers=headers)
    
    try:
        with urlopen(req, timeout=15.0) as resp:
            return json.loads(resp.read().decode('utf-8', errors='replace'))
    except HTTPError as e:
        print(f'[{now_iso()}] HTTP Error {e.code} em {url}: {e.read().decode("utf-8", errors="replace")[:100]}', file=sys.stderr)
        return None
    except Exception as e:
        print(f'[{now_iso()}] Erro em {url}: {e}', file=sys.stderr)
        return None

def get_pro_same(bet_id, token, locale):
    """Busca outras casas para a mesma aposta (Deep Dive)."""
    # Garante que bet_id seja string
    if not bet_id: return None
    url = f'https://api-lv.betburger.com/api/v1/bets/{quote(str(bet_id))}/pro-same'
    return request_json(url, token=token, locale=locale)

def refresh_token_func(token, locale):
    """Tenta dar refresh no token para manter a sessao viva."""
    # Payload observado nos logs (pode variar, mas vamos tentar o padrao)
    # data={"iv":"...","v":1,...} - Parece criptografado. 
    # Por segurança, vamos apenas replicar a chamada se o usuario fornecer o payload, ou tentar um dummy.
    # Como o payload é criptografado e dinâmico, o script pode falhar aqui se a API for RIGIDA.
    # Vamos pular a implementação complexa de criptografia "gcm" por enquanto e focar em manter o cookie/headers ativos.
    # Mas podemos simular o "touch" na API de settings.
    pass

def touch_session(locale):
    """Simula atividade do usuario atualizando settings (Keep-Alive)."""
    # PUT https://www.betburger.com/update_search_settings.json
    # Requer X-CSRF-Token que nao temos facil sem scrapar o HTML.
    # Vamos focar apenas nos endpoints de API que usam o access_token por enquanto.
    pass

# Mapa basico de esportes por ID (fallback quando a API vier so com sport_id)
SPORTS_MAP = {
    1: "Baseball",
    2: "Basketball",
    4: "Futsal",
    5: "Handball",
    6: "Ice Hockey",
    7: "Soccer",
    8: "Tennis",
    9: "Volleyball",
}

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

def translate_sport_name_to_pt(value):
    if value is None:
        return value
    raw = str(value).strip()
    if not raw:
        return value
    if raw in SPORT_NAME_PT_MAP:
        return SPORT_NAME_PT_MAP[raw]
    return SPORT_NAME_PT_MAP_NORM.get(normalize_match_text(raw), value)

# Mapa de Bookmakers (IDs comuns do BetBurger inferred)
# Adicione mais conforme for descobrindo
BOOKMAKERS_MAP = {
    1: "Pinnacle",
    3: "Marathonbet",
    4: "Unibet",
    6: "William Hill",
    8: "Betway",
    10: "Bet365",
    12: "888Sport",
    15: "Bwin",
    20: "Betsson",
    21: "1xBet",
    23: "BetVictor",
    25: "Betfair",
    27: "Coral",
    28: "Ladbrokes",
    34: "NordicBet",
    36: "Titanbet",
    42: "10Bet",
    45: "188Bet",
    51: "Dafabet",
    64: "Sbobet",
    65: "Sportingbet",
    76: "Vbet",
    92: "22Bet",
    105: "Bet365 (Clone)",
    106: "1xBet (Clone)",
    143: "Melbet",
    255: "GGBet",
    318: "Stake",
    319: "Roobet",
    486: "PixBet",
    489: "EstrelaBet",
    712: "Novibet",
}

def load_reference_maps(path):
    """
    Carrega mapas de Sports e Bookmakers a partir do arquivo
    TODASURLSEFORMATOS.txt (se existir).
    """
    if not path or not os.path.exists(path):
        return {}, {}

    sports_map = {}
    bookmakers_map = {}

    try:
        with open(path, 'r', encoding='utf-8', errors='replace') as f:
            lines = f.readlines()
    except Exception as e:
        print(f"[Warn] Erro lendo arquivo de referencia {path}: {e}", file=sys.stderr)
        return {}, {}

    # Quebra o arquivo em secoes: URL + bloco JSON ate a proxima URL
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
        # Queremos o payload de /directories
        if '/api/v1/directories' not in url:
            continue
        try:
            payload = json.loads(json_text)
        except Exception as e:
            print(f"[Warn] Erro parseando JSON de directories em {path}: {e}", file=sys.stderr)
            continue

        # Sports
        for s in payload.get('sports', []):
            if not isinstance(s, dict):
                continue
            sid = to_int_or_none(s.get('id'))
            sname = s.get('name')
            if sid is not None and sname:
                sports_map[sid] = str(sname).strip()

        # Bookmakers: pode vir em object {arbs:[], valuebets:[]} ou lista direta
        bk_root = payload.get('bookmakers', {})
        bk_lists = []
        if isinstance(bk_root, dict):
            for key in ('arbs', 'valuebets'):
                val = bk_root.get(key)
                if isinstance(val, list):
                    bk_lists.append(val)
        elif isinstance(bk_root, list):
            bk_lists.append(bk_root)

        for bk_list in bk_lists:
            for b in bk_list:
                if not isinstance(b, dict):
                    continue
                bid = to_int_or_none(b.get('id'))
                bname = b.get('name') or b.get('bookmaker')
                if bid is not None and bname:
                    bookmakers_map[bid] = str(bname).strip()

        # Clones trazem IDs adicionais usados em bookmaker_id (ex.: 254)
        for clone in payload.get('bookmaker_clones', []):
            if not isinstance(clone, dict):
                continue
            cid = to_int_or_none(clone.get('id'))
            base_id = to_int_or_none(clone.get('bookmaker_id'))
            cname = clone.get('name') or clone.get('bookmaker')
            if not cname:
                continue
            if cid is not None and cid not in bookmakers_map:
                bookmakers_map[cid] = str(cname).strip()
            # Alguns bookmaker_id base nao existem na lista principal.
            # Nesses casos, usamos o nome do clone como melhor inferencia.
            if base_id is not None and base_id not in bookmakers_map:
                bookmakers_map[base_id] = str(cname).strip()

    return sports_map, bookmakers_map

def load_bk_map(path):
    """Carrega mapa de ID -> Nome de bookmakers."""
    if not os.path.exists(path):
        return {}
    try:
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        if isinstance(data, dict):
            data = data.get('data') or data.get('bookmakers') or []

        if not isinstance(data, list):
            return {}

        bk_map = {}
        for b in data:
            if not isinstance(b, dict):
                continue
            bk_id = to_int_or_none(b.get('id'))
            bk_name = b.get('bookmaker') or b.get('name')
            if bk_id is None or not bk_name:
                continue
            bk_map[bk_id] = bk_name

        return bk_map
    except Exception as e:
        print(f"[Warn] Erro ao carregar status bookmakers: {e}", file=sys.stderr)
        return {}

def normalize_rows(payload, min_percent, bk_map=None, sport_map=None, allowed_ids=None, allowed_names=None, stats=None):
    if not payload: return []
    
    # 1. Extrair Arbs e Bets do payload
    # O payload raiz tem 'arbs': [...] e 'bets': [...]
    items = []
    all_bets = {}
    
    if isinstance(payload, dict):
        items = payload.get('arbs', [])
        # Cria mapa de bets por ID para lookup rapido
        raw_bets = payload.get('bets', [])
        for b in raw_bets:
            if isinstance(b, dict) and 'id' in b:
                # Resolve nome do bookmaker
                bk_id_raw = b.get('bookmaker_id')
                bk_id = to_int_or_none(bk_id_raw)
                bk_name = str(bk_id_raw)
                
                # Prioridade 1: Mapa do Status JSON (Dinâmico)
                if bk_map and bk_id is not None:
                     bk_name = bk_map.get(bk_id, str(bk_id_raw))
                
                # Prioridade 2: Mapa Hardcoded (Backup) se o dinamico falhar/tiver ID faltando
                if bk_name == str(bk_id_raw) and bk_id in BOOKMAKERS_MAP:
                    bk_name = BOOKMAKERS_MAP[bk_id]

                # Nunca deixar numero cru no campo de nome
                if to_int_or_none(bk_name) is not None:
                    bk_name = 'Casa Desconhecida'
                    
                b['bookmaker_name'] = bk_name
                all_bets[b['id']] = b
    elif isinstance(payload, list):
        items = payload # Fallback, mas improvavel na API v1
        
    if not items:
        # Tenta pegar de 'data' se for outro formato
        if isinstance(payload, dict):
            items = payload.get('data', [])

    if isinstance(stats, dict):
        stats.setdefault('payload_items', 0)
        stats.setdefault('skipped_non_dict', 0)
        stats.setdefault('skipped_bad_percent', 0)
        stats.setdefault('skipped_min_percent', 0)
        stats.setdefault('skipped_house_filter', 0)
        stats.setdefault('rows_kept', 0)
        stats['payload_items'] += len(items) if isinstance(items, list) else 0

    rows = []
    for item in items:
        if not isinstance(item, dict):
            if isinstance(stats, dict):
                stats['skipped_non_dict'] += 1
            continue
        try:
            percent = float(item.get('percent'))
        except (TypeError, ValueError):
            if isinstance(stats, dict):
                stats['skipped_bad_percent'] += 1
            continue
        
        if percent < min_percent:
            if isinstance(stats, dict):
                stats['skipped_min_percent'] += 1
            continue
        
        # 2. Enriquecer Arb com dados das Bets
        bet1_id = item.get('bet1_id')
        bet2_id = item.get('bet2_id')
        
        bet1_data = all_bets.get(bet1_id, {})
        bet2_data = all_bets.get(bet2_id, {})

        # Filtro de casas no scraper (opcional).
        # Recomendado deixar DESATIVADO quando o server aplica clones+filtro final.
        if SCRAPER_APPLY_HOUSES_FILTER and (not DISABLE_HOUSES_FILTER) and (allowed_ids or allowed_names):
            if (not bet_is_allowed(bet1_data, allowed_ids, allowed_names) or
                not bet_is_allowed(bet2_data, allowed_ids, allowed_names)):
                if isinstance(stats, dict):
                    stats['skipped_house_filter'] += 1
                continue
        
        # Resolver Esporte (Nome ou ID)
        sport_val = item.get('sport')
        sport_id = to_int_or_none(sport_val)
        if sport_id is None:
            # Tenta pegar do raw (sport_id)
            raw_data = item.get('raw') or item
            sport_id = to_int_or_none(raw_data.get('sport_id'))

        if sport_id is not None:
            # Prioridade 1: mapa vindo do arquivo de referencia
            if sport_map:
                sport_val = sport_map.get(sport_id, sport_val)
            # Prioridade 2: fallback local
            if not sport_val or to_int_or_none(sport_val) is not None:
                sport_val = SPORTS_MAP.get(sport_id, f"Sport {sport_id}")

        if not sport_val:
            sport_val = "Unknown"
        else:
            sport_val = translate_sport_name_to_pt(sport_val)
            
        rows.append({
            'captured_at': now_iso(),
            'arb_id': item.get('id'),
            'percent': percent,
            'event_name': item.get('event_name') or '',
            'sport': sport_val,
            'league': item.get('league') or '',
            'bookmakers': item.get('bookmakers', []), 
            'bets': item.get('bets', []),             
            # Novos campos enriquecidos para o Server consumir facil
            'bet1_data': bet1_data,
            'bet2_data': bet2_data,
            'raw': item
        })
        if isinstance(stats, dict):
            stats['rows_kept'] += 1
    return rows

def append_csv(path, rows):
    if not path or not rows: return
    exists = os.path.exists(path)
    with open(path, 'a', newline='', encoding='utf-8') as f:
        # Simplificando colunas para o CSV historico
        fields = ['captured_at', 'arb_id', 'percent', 'event_name', 'sport', 'league', 'bookmakers']
        writer = csv.DictWriter(f, fieldnames=fields, extrasaction='ignore')
        if not exists: writer.writeheader()
        for r in rows:
            # Converter lista de bookmakers para string simples no CSV
            row_cp = r.copy()
            row_cp['bookmakers'] = json.dumps(r.get('bookmakers', []))
            writer.writerow(row_cp)

def parse_args():
    p = argparse.ArgumentParser(description='Scraper BetBurger Completo (Deep Data + Dashboard)')
    p.add_argument('--access-token', default=os.getenv('BETBURGER_ACCESS_TOKEN'))
    p.add_argument('--locale', default='pt')
    p.add_argument('--interval', type=float, default=0.0)
    p.add_argument('--per-page', type=int, default=10)
    p.add_argument('--max-pages', type=int, default=3)
    p.add_argument('--min-percent', type=float, default=0.0)
    p.add_argument('--timeout', type=float, default=30.0)
    p.add_argument('--json', default='surebets_live.json')
    p.add_argument('--csv', default='surebets_history.csv')
    p.add_argument('--status-json', default='bookmakers_statuses.json')
    p.add_argument('--reference-file', default='TODASURLSEFORMATOS.txt', help='Arquivo com URLs+formatos (sports/bookmakers).')
    p.add_argument('--houses-file', default='casas.txt', help='Arquivo TXT com casas permitidas (id/name/bookmaker_id).')
    p.add_argument('--search-filter-id-live', action='append', help='ID do search_filter LIVE da BetBurger (aceita repeticao ou CSV).')
    p.add_argument('--search-filter-id-prematch', action='append', help='ID do search_filter PREMATCH da BetBurger (aceita repeticao ou CSV).')
    p.add_argument('--use-all-bk-ids', action='store_true', help='Forca envio de bk_ids[] 1..720 mesmo com search_filter.')
    p.add_argument('--deep-dive', action='store_true', help='Ativa a busca profunda (pro-same) para cada aposta. MAIS LENTO.')
    p.add_argument('--no-live-only', action='store_true', help='(LEGADO) ignorado no modo dual atual.')
    p.add_argument('--debug-counters', action='store_true', help='Exibe contadores de diagnostico por pagina/ciclo.')
    args = p.parse_args()
    if not args.access_token:
        p.error('Informe --access-token ou BETBURGER_ACCESS_TOKEN')
    args.search_filter_ids_live = load_search_filter_ids(
        args.search_filter_id_live,
        'BETBURGER_SEARCH_FILTER_IDS_LIVE',
        DEFAULT_SEARCH_FILTER_IDS_LIVE,
    )
    args.search_filter_ids_prematch = load_search_filter_ids(
        args.search_filter_id_prematch,
        'BETBURGER_SEARCH_FILTER_IDS_PREMATCH',
        DEFAULT_SEARCH_FILTER_IDS_PREMATCH,
    )
    return args

def main():
    args = parse_args()
    stop = False

    def _stop(*_):
        nonlocal stop
        stop = True

    signal.signal(signal.SIGINT, _stop)
    signal.signal(signal.SIGTERM, _stop)

    print(f'>>> Iniciando Scraper "Foda" BetBurger <<<')
    print(f'    Intervalo: {args.interval}s | Max Paginas: {args.max_pages}')
    print(f'    Deep Dive: {"ATIVADO" if args.deep_dive else "DESATIVADO"}')
    print(f'    Saida: {args.json} (Live) | {args.csv} (Historico)')
    print(f'    Search Filters LIVE: {",".join(args.search_filter_ids_live)}')
    print(f'    Search Filters PREMATCH: {",".join(args.search_filter_ids_prematch)}')
    print(f'    bk_ids[] global: {"ATIVADO" if args.use_all_bk_ids else "DESATIVADO"}')
    print(
        f'    Postgres Feed: '
        f'{"ATIVADO" if pg_scraper_runtime_enabled() else "DESATIVADO"} '
        f'({"{0}:{1}/{2}".format(PG_HOST, PG_PORT, PG_DB) if pg_scraper_runtime_enabled() else "sem psycopg2/flag"})'
    )
    print(f'    JSON Snapshot: {"ATIVADO" if SCRAPER_WRITE_JSON else "DESATIVADO"}')
    if args.debug_counters:
        print('    Debug Counters: ATIVADO')
    
    # Carrega referencia (sports/bookmakers) uma vez no startup
    ref_sports_map, ref_bk_map = load_reference_maps(args.reference_file)
    merged_sports_map = SPORTS_MAP.copy()
    merged_sports_map.update(ref_sports_map)
    merged_bk_map = BOOKMAKERS_MAP.copy()
    merged_bk_map.update(ref_bk_map)
    print(f'    Mapa Sports: {len(merged_sports_map)} | Mapa Bookmakers: {len(merged_bk_map)}')

    allowed_ids, allowed_names = load_allowed_bookmakers(args.houses_file)
    if DISABLE_HOUSES_FILTER:
        print('    Filtro Casas: DESATIVADO (DISABLE_HOUSES_FILTER=1)')
    elif allowed_ids or allowed_names:
        print(f'    Filtro Casas: IDs={len(allowed_ids)} Nomes={len(allowed_names)} ({args.houses_file})')
    else:
        print(f'    Filtro Casas: desativado (arquivo vazio/ausente: {args.houses_file})')
    print(f'    Filtro Casas no Scraper: {"ATIVADO" if SCRAPER_APPLY_HOUSES_FILTER else "DESATIVADO"}')

    if pg_scraper_runtime_enabled():
        ok = init_pg_feed_schema()
        if not ok:
            print('[Warn] Falha ao inicializar tabela feed no Postgres. Continuando sem feed direto.')
    
    while not stop:
        loop_start = time.time()
        
        # 0. Base de bookmakers vem do arquivo de referencia + fallback local
        bk_map = merged_bk_map.copy()

        # 1. Status Bookmakers
        # print(f'[{now_iso()}] Checando status bookmakers...')
        statuses = request_json(f'{STATUS_URL}?last_updated_at=0')
        if statuses:
            atomic_write_json(args.status_json, statuses)
            # Recarrega mapa com dados frescos
            bk_map.update(load_bk_map(args.status_json))
            
        # 2. Coleta Arbs
        all_rows = []
        page = 1
        cycle_stats = {
            'api_arbs': 0,
            'api_bets': 0,
            'payload_items': 0,
            'skipped_non_dict': 0,
            'skipped_bad_percent': 0,
            'skipped_min_percent': 0,
            'skipped_house_filter': 0,
            'rows_kept': 0,
        }
        
        while page <= args.max_pages and not stop:
            print(f'[{now_iso()}] Pagina {page}... ', end='', flush=True)
            try:
                page_rows_live = []
                page_rows_pre = []

                # LIVE (api-lv)
                post_data_live = build_search_data(
                    args.per_page,
                    page,
                    True,
                    search_filter_ids=args.search_filter_ids_live,
                    use_all_bk_ids=args.use_all_bk_ids
                )
                payload_live = request_json(ARBS_URL, method='POST', data=post_data_live, token=args.access_token, locale=args.locale)
                if isinstance(payload_live, dict):
                    api_arbs = payload_live.get('arbs')
                    api_bets = payload_live.get('bets')
                    if isinstance(api_arbs, list):
                        cycle_stats['api_arbs'] += len(api_arbs)
                    if isinstance(api_bets, list):
                        cycle_stats['api_bets'] += len(api_bets)
                page_rows_live = normalize_rows(
                    payload_live,
                    args.min_percent,
                    bk_map=bk_map,
                    sport_map=merged_sports_map,
                    allowed_ids=allowed_ids,
                    allowed_names=allowed_names,
                    stats=cycle_stats
                )
                for row in page_rows_live:
                    if isinstance(row, dict):
                        raw = row.get('raw')
                        if isinstance(raw, dict):
                            raw['is_live'] = True

                # PREMATCH (api-pr)
                post_data_pre = build_search_data(
                    args.per_page,
                    page,
                    False,
                    search_filter_ids=args.search_filter_ids_prematch,
                    use_all_bk_ids=args.use_all_bk_ids
                )
                payload_pre = request_json(ARBS_URL_PREMATCH, method='POST', data=post_data_pre, token=args.access_token, locale=args.locale)
                if isinstance(payload_pre, dict):
                    api_arbs = payload_pre.get('arbs')
                    api_bets = payload_pre.get('bets')
                    if isinstance(api_arbs, list):
                        cycle_stats['api_arbs'] += len(api_arbs)
                    if isinstance(api_bets, list):
                        cycle_stats['api_bets'] += len(api_bets)
                page_rows_pre = normalize_rows(
                    payload_pre,
                    args.min_percent,
                    bk_map=bk_map,
                    sport_map=merged_sports_map,
                    allowed_ids=allowed_ids,
                    allowed_names=allowed_names,
                    stats=cycle_stats
                )
                for row in page_rows_pre:
                    if isinstance(row, dict):
                        raw = row.get('raw')
                        if isinstance(raw, dict):
                            raw['is_live'] = False

                rows = page_rows_live + page_rows_pre
                if not rows:
                    print('Vazia/Fim.')
                    if args.debug_counters:
                        print(
                            f"    [Debug] page={page} api_arbs={cycle_stats['api_arbs']} "
                            f"payload_items={cycle_stats['payload_items']} kept={cycle_stats['rows_kept']} "
                            f"drop_house={cycle_stats['skipped_house_filter']} "
                            f"drop_percent={cycle_stats['skipped_min_percent']} "
                            f"drop_bad_percent={cycle_stats['skipped_bad_percent']}"
                        )
                    break

                print(f'{len(rows)} itens (live={len(page_rows_live)} pre={len(page_rows_pre)}). ', end='', flush=True)

                # 3. Deep Dive (Se ativado)
                if args.deep_dive:
                    print('Deep Dive...', end='', flush=True)
                    for row in rows:
                        row['deep_data'] = []
                        # Cada 'row' é uma Arb que pode ter várias 'bets' (lados da aposta)
                        # A estrutura bruta da arb tem 'bets': [{'id': '...', ...}, {'id': '...', ...}]
                        arb_bets = row.get('raw', {}).get('bets', [])
                        
                        deep_results = []
                        for bet in arb_bets:
                            bet_id = bet.get('id')
                            if bet_id:
                                # Busca outras casas para essa aposta
                                pro_same_data = get_pro_same(bet_id, args.access_token, args.locale)
                                if pro_same_data:
                                    # Normaliza caso venha como dict {'bets': [...]} ou lista direta
                                    if isinstance(pro_same_data, dict):
                                        pro_same_data = pro_same_data.get('bets', []) or pro_same_data.get('data', [])
                                    
                                    deep_results.append({
                                        'bet_id': bet_id,
                                        'alternatives': pro_same_data
                                    })
                                else:
                                    print(f'[WARN: No Data for {bet_id}] ', end='', flush=True)

                        row['deep_data'] = deep_results
                    print('OK. ', end='', flush=True)

                all_rows.extend(rows)
                print('') # Nova linha

                if len(page_rows_live) < args.per_page and len(page_rows_pre) < args.per_page:
                    break
                    
                page += 1
                
            except Exception as e:
                print(f'\nErro: {e}', file=sys.stderr)
                break
        
        # 4. Salvar
        if all_rows:
            if SCRAPER_WRITE_JSON:
                atomic_write_json(args.json, all_rows)
            if pg_scraper_runtime_enabled():
                persist_rows_to_pg_feed(all_rows)
            append_csv(args.csv, all_rows)
            print(f'[{now_iso()}] Ciclo completado. {len(all_rows)} arbs salvas.')
            if args.debug_counters:
                print(
                    f"    [Debug-Cycle] api_arbs={cycle_stats['api_arbs']} api_bets={cycle_stats['api_bets']} "
                    f"payload_items={cycle_stats['payload_items']} kept={cycle_stats['rows_kept']} "
                    f"drop_house={cycle_stats['skipped_house_filter']} "
                    f"drop_percent={cycle_stats['skipped_min_percent']} "
                    f"drop_bad_percent={cycle_stats['skipped_bad_percent']}"
                )
        else:
            # Se nao achou nada, salva lista vazia para limpar o dashboard
            if SCRAPER_WRITE_JSON:
                atomic_write_json(args.json, [])
            if pg_scraper_runtime_enabled():
                persist_rows_to_pg_feed([])
            print(f'[{now_iso()}] Nada encontrado.')
            if args.debug_counters:
                print(
                    f"    [Debug-Cycle] api_arbs={cycle_stats['api_arbs']} api_bets={cycle_stats['api_bets']} "
                    f"payload_items={cycle_stats['payload_items']} kept={cycle_stats['rows_kept']} "
                    f"drop_house={cycle_stats['skipped_house_filter']} "
                    f"drop_percent={cycle_stats['skipped_min_percent']} "
                    f"drop_bad_percent={cycle_stats['skipped_bad_percent']}"
                )

        # Sem delay artificial entre ciclos.

    print('\nParando...')

if __name__ == '__main__':
    main()
