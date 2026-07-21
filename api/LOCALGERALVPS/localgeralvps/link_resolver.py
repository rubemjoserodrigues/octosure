from __future__ import annotations

import re
import time
from html import unescape
from urllib.error import HTTPError
from urllib.parse import parse_qs, urljoin, urlsplit, urlunsplit
from urllib.request import Request, urlopen


def normalize_host(url_text: str) -> str:
    try:
        host = (urlsplit(str(url_text or "")).hostname or "").lower().strip()
    except Exception:
        host = ""
    if host.startswith("www."):
        host = host[4:]
    return host


def is_ipv4_host(host: str) -> bool:
    return bool(re.match(r"^\d{1,3}(?:\.\d{1,3}){3}$", str(host or "")))


def is_tracking_intermediate(url_text: str) -> bool:
    txt = str(url_text or "").strip().lower()
    host = normalize_host(txt)
    if not txt or not host:
        return False
    if is_ipv4_host(host):
        return True
    if ("ttid=" in txt and "a=" in txt) or "#pe/" in txt:
        return True
    return False


def is_viable_final_url(url_text: str) -> bool:
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


def extract_candidate_url(raw_url: str) -> str:
    url_txt = str(raw_url or "").strip()
    if not url_txt:
        return ""
    url_txt = unescape(url_txt)
    url_txt = url_txt.replace("\\/", "/").replace("\\u0026", "&").replace("&amp;", "&")
    url_txt = url_txt.strip().strip('"').strip("'")
    if url_txt.startswith("//"):
        return "https:" + url_txt
    return url_txt


def extract_redirect_qs_url(candidate: str) -> str:
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


def _extract_bet365_ev_path(txt: str) -> str:
    text = str(txt or "")
    if not text:
        return ""
    m = re.search(r"(?:^|[#?/])/?IP/EV([0-9A-Z]+)(?:/|#|$)", text, flags=re.I)
    if m:
        return f"/IP/EV{m.group(1)}"
    return ""


def _normalize_pinnacle_event_url(txt: str) -> str:
    source = str(txt or "").strip()
    if not source:
        return "https://pinnacle.bet.br/"
    if "available_in_api_plan" in source.lower():
        return ""
    try:
        parsed = urlsplit(source)
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
    return urlunsplit(("https", "pinnacle.bet.br", target_path.rstrip("/") + "/", "", "all"))


def normalize_catalog_url(bookmaker_id, url_text: str) -> str:
    txt = str(url_text or "").strip()
    if not txt:
        return ""
    try:
        bid = int(str(bookmaker_id).strip()) if bookmaker_id is not None else None
    except Exception:
        bid = None

    # Bet365 family: normalize to BR stable link.
    if bid in (10, 199):
        ev_path = _extract_bet365_ev_path(txt)
        if ev_path:
            return f"https://www.bet365.bet.br/?bet=1#{ev_path}/"
        host = normalize_host(txt)
        if "bet365.com" in host or "bet365.bet.br" in host:
            return "https://www.bet365.bet.br/?bet=1#/"

    # Superbet BR: canonical event route in BR domain.
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

    # Pinnacle: canonical BR host with sportsbook standard event route.
    if bid == 1:
        return _normalize_pinnacle_event_url(txt)
    return txt


def extract_direct_link_from_html(html_text: str, base_url: str = "") -> str:
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
        r"(https?://(?:www\.)?bet365\.(?:com|bet\.br)/dl/sportsbookredirect/\?[^'\"\s<>]+)",
        r"(/dl/sportsbookredirect/\?[^'\"\s<>]+)",
        r"(#?/IP/EV[0-9A-Z]+/?)(?:[\"'\\s<]|$)",
    ]

    candidates = []
    for pattern in patterns:
        for match in re.finditer(pattern, html_text, flags=re.I):
            candidate = extract_candidate_url(match.group(1))
            if not candidate:
                continue
            if candidate.lower().startswith("0;url="):
                candidate = extract_candidate_url(candidate.split("=", 1)[-1])
            if candidate.startswith("/"):
                candidate = urljoin(base_url or "", candidate)
            elif candidate.startswith("#"):
                parsed = urlsplit(base_url or "")
                host = parsed.netloc or "www.bet365.com"
                scheme = parsed.scheme or "https"
                candidate = f"{scheme}://{host}/?bet=1{candidate}"
            if re.match(r"^https?://", candidate, flags=re.I):
                candidates.append(candidate)

    for match in re.finditer(r"https?://[^\"'\s<>]+", str(html_text)):
        candidate = extract_candidate_url(match.group(0))
        if re.match(r"^https?://", candidate, flags=re.I):
            candidates.append(candidate)

    for candidate in candidates:
        if is_viable_final_url(candidate):
            return candidate
    return candidates[0] if candidates else ""


class OddsRabbitResolver:
    def __init__(self, timeout_sec: float = 20.0, retries: int = 2, retry_backoff_sec: float = 1.2):
        self.timeout_sec = float(timeout_sec)
        self.retries = int(retries)
        self.retry_backoff_sec = float(retry_backoff_sec)
        self._cache: dict[str, dict] = {}

    def _request_once(self, url: str):
        req_headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            ),
            "Accept": "text/html,application/json;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Upgrade-Insecure-Requests": "1",
            "Connection": "keep-alive",
            "Referer": "https://www.betburger.com/",
        }
        req = Request(url, method="GET", headers=req_headers)
        with urlopen(req, timeout=self.timeout_sec) as resp:
            final_url = str(resp.geturl() or "").strip()
            html_text = resp.read().decode("utf-8", errors="replace")
        return final_url, html_text

    def resolve_oddsrabbit(self, oddsrabbit_url: str) -> dict:
        url_txt = str(oddsrabbit_url or "").strip()
        if not url_txt:
            return {"final_url": "", "direct_link": "", "resolved_url": "", "error": "empty_url"}
        cached = self._cache.get(url_txt)
        if cached is not None:
            return dict(cached)

        last_error = ""
        for attempt in range(1, self.retries + 1):
            try:
                final_url, html_text = self._request_once(url_txt)

                direct_from_qs = extract_redirect_qs_url(final_url)
                direct_from_html = extract_direct_link_from_html(html_text, base_url=final_url)
                direct_link = direct_from_qs or direct_from_html

                if is_viable_final_url(direct_link):
                    resolved = direct_link
                elif is_viable_final_url(final_url) and (not is_tracking_intermediate(final_url)):
                    resolved = final_url
                else:
                    resolved = ""
                    if final_url and is_tracking_intermediate(final_url):
                        try:
                            final_url2, html_text2 = self._request_once(final_url)
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

                result = {
                    "final_url": final_url,
                    "direct_link": direct_link,
                    "resolved_url": resolved,
                    "error": "",
                }
                self._cache[url_txt] = dict(result)
                return result
            except HTTPError as err:
                last_error = f"HTTP {err.code}"
            except Exception as err:
                last_error = f"{type(err).__name__}: {err}"

            if attempt < self.retries:
                time.sleep(self.retry_backoff_sec * attempt)

        result = {"final_url": "", "direct_link": "", "resolved_url": "", "error": last_error or "unknown_error"}
        self._cache[url_txt] = dict(result)
        return result
