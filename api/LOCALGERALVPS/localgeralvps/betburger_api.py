from __future__ import annotations

import json
import os
import threading
import time
from collections import deque
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


BASE_API_LV = "https://rest-api-lv.betburger.com/api/v1"
BASE_API_PR = "https://rest-api-pr.betburger.com/api/v1"
BASE_API_MST = "https://api-mst.betburger.com/api/v1"

ARBS_URL_LIVE = f"{BASE_API_LV}/arbs/pro_search"
ARBS_URL_PREMATCH = f"{BASE_API_PR}/arbs/pro_search"
STATUS_URL = f"{BASE_API_MST}/bookmakers_statuses?last_updated_at=0"

DEFAULT_HEADERS = {
    "accept": "application/json, text/plain, */*",
    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
    "origin": "https://www.betburger.com",
    "referer": "https://www.betburger.com/",
    "user-agent": "Mozilla/5.0",
}

_RATE_LIMIT_MAX_REQUESTS = max(1, int(str(os.getenv("BETBURGER_RATE_LIMIT_MAX_REQUESTS", "19")).strip() or "19"))
_RATE_LIMIT_WINDOW_SEC = max(0.1, float(str(os.getenv("BETBURGER_RATE_LIMIT_WINDOW_SEC", "30")).strip() or "30"))
_RATE_LIMIT_SAFETY_SEC = max(0.0, float(str(os.getenv("BETBURGER_RATE_LIMIT_SAFETY_SEC", "0.35")).strip() or "0.35"))
_RATE_LIMIT_LOCK = threading.Lock()
_RATE_LIMIT_HITS = deque()


class ApiError(RuntimeError):
    pass


def _respect_rate_limit() -> None:
    """
    Enforce BetBurger API budget in-process.
    Default budget matches API message: 19 requests / 30 sec.
    """
    while True:
        wait_sec = 0.0
        with _RATE_LIMIT_LOCK:
            now = time.time()
            while _RATE_LIMIT_HITS and (now - _RATE_LIMIT_HITS[0]) >= _RATE_LIMIT_WINDOW_SEC:
                _RATE_LIMIT_HITS.popleft()
            if len(_RATE_LIMIT_HITS) < _RATE_LIMIT_MAX_REQUESTS:
                _RATE_LIMIT_HITS.append(now)
                return
            oldest = _RATE_LIMIT_HITS[0]
            wait_sec = (_RATE_LIMIT_WINDOW_SEC - (now - oldest)) + _RATE_LIMIT_SAFETY_SEC
        if wait_sec > 0:
            time.sleep(wait_sec)


def build_search_payload(filter_id: str, page: int, per_page: int, is_live: bool):
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
        ("is_live", "true" if is_live else "false"),
    ]
    for t in range(1, 11):
        data.append(("event_arb_types[]", str(t)))
    return data


def _request_json(url: str, method: str, body: bytes | None, timeout_sec: float, retries: int, retry_backoff_sec: float):
    last_error = None
    for attempt in range(1, retries + 1):
        req = Request(url, method=method, data=body, headers=DEFAULT_HEADERS)
        _respect_rate_limit()
        try:
            with urlopen(req, timeout=timeout_sec) as resp:
                raw = resp.read().decode("utf-8", errors="replace")
            try:
                return json.loads(raw)
            except Exception as exc:
                raise ApiError(f"Resposta nao JSON: {exc}") from exc
        except HTTPError as err:
            try:
                body_txt = err.read().decode("utf-8", errors="replace")
            except Exception:
                body_txt = str(err)
            last_error = f"HTTP {err.code}: {body_txt[:240]}"
            if err.code == 429 and attempt < retries:
                time.sleep(retry_backoff_sec * attempt)
                continue
            raise ApiError(last_error) from err
        except (URLError, TimeoutError, OSError) as err:
            last_error = f"{type(err).__name__}: {err}"
            if attempt < retries:
                time.sleep(retry_backoff_sec * attempt)
                continue
            raise ApiError(last_error) from err
        except Exception as err:
            last_error = f"{type(err).__name__}: {err}"
            if attempt < retries:
                time.sleep(retry_backoff_sec * attempt)
                continue
            raise ApiError(last_error) from err
    raise ApiError(last_error or "Erro desconhecido na API")


def fetch_status(timeout_sec: float, retries: int, retry_backoff_sec: float):
    return _request_json(
        url=STATUS_URL,
        method="GET",
        body=None,
        timeout_sec=timeout_sec,
        retries=retries,
        retry_backoff_sec=retry_backoff_sec,
    )


def fetch_arbs_page(
    token: str,
    locale: str,
    filter_id: str,
    page: int,
    per_page: int,
    is_live: bool,
    timeout_sec: float,
    retries: int,
    retry_backoff_sec: float,
):
    base = ARBS_URL_LIVE if is_live else ARBS_URL_PREMATCH
    url = f"{base}?access_token={token}&locale={locale}"
    body = urlencode(build_search_payload(filter_id, page, per_page, is_live)).encode("utf-8")
    return _request_json(
        url=url,
        method="POST",
        body=body,
        timeout_sec=timeout_sec,
        retries=retries,
        retry_backoff_sec=retry_backoff_sec,
    )
