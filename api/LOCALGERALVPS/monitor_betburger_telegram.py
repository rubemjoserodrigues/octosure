from __future__ import annotations

import argparse
import html
import json
import os
import socket
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from localgeralvps.betburger_api import ApiError, fetch_arbs_page
from localgeralvps.settings import load_settings

try:
    import psycopg2
except Exception:  # pragma: no cover
    psycopg2 = None


BASE_DIR = Path(__file__).resolve().parent
STATE_FILE = BASE_DIR / ".monitor_betburger_state.json"


def _env_int(name: str, default: int, min_value: int | None = None) -> int:
    raw = str(os.getenv(name, "")).strip()
    try:
        value = int(raw) if raw else int(default)
    except Exception:
        value = int(default)
    if min_value is not None and value < min_value:
        value = min_value
    return value


def _env_float(name: str, default: float, min_value: float | None = None) -> float:
    raw = str(os.getenv(name, "")).strip()
    try:
        value = float(raw) if raw else float(default)
    except Exception:
        value = float(default)
    if min_value is not None and value < min_value:
        value = min_value
    return value


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _parse_dt(value: str) -> datetime | None:
    text = str(value or "").strip()
    if not text:
        return None
    try:
        if text.endswith("Z"):
            text = text[:-1] + "+00:00"
        parsed = datetime.fromisoformat(text)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
    except Exception:
        return None


def _age_sec(value: str) -> int | None:
    parsed = _parse_dt(value)
    if parsed is None:
        return None
    return max(0, int((_utc_now() - parsed).total_seconds()))


def _count_betburger_payload(payload: dict) -> int:
    total = payload.get("total")
    if isinstance(total, int) and total > 0:
        return total
    count = 0
    for key in ("arbs", "event_arbs", "bets"):
        value = payload.get(key)
        if isinstance(value, list):
            count += len(value)
    return count


def _is_token_error(text: str) -> bool:
    raw = str(text or "").lower()
    return (
        "http 401" in raw
        or "http 403" in raw
        or "http 422" in raw
        or "invalid parameter 'access_token'" in raw
        or "access_token" in raw and "invalid" in raw
    )


def _safe_int(value, default: int = 0) -> int:
    try:
        return int(value)
    except Exception:
        return default


@dataclass
class CheckResult:
    ok: bool
    api_total: int
    api_newest_age_sec: int | None
    api_error: str
    pg_total: int
    pg_newest_age_sec: int | None
    pg_error: str
    bb_live_count: int
    bb_prematch_count: int
    bb_error: str
    reason: str


class TelegramClient:
    def __init__(self, token: str, chat_id: str, timeout_sec: float = 10.0):
        self.token = token.strip()
        self.chat_id = chat_id.strip()
        self.timeout_sec = timeout_sec

    def enabled(self) -> bool:
        return bool(self.token and self.chat_id)

    def _post(self, method: str, data: dict) -> dict:
        if not self.enabled():
            return {}
        url = f"https://api.telegram.org/bot{self.token}/{method}"
        body = urlencode(data).encode("utf-8")
        req = Request(url, method="POST", data=body, headers={
            "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        })
        with urlopen(req, timeout=self.timeout_sec) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
        try:
            payload = json.loads(raw)
        except Exception:
            return {}
        if not payload.get("ok", False):
            description = payload.get("description") or payload
            raise RuntimeError(f"Telegram {method} falhou: {description}")
        return payload

    def send(self, text: str) -> None:
        if not self.enabled():
            print("telegram=off msg=" + text.replace("\n", " | "))
            return
        self._post("sendMessage", {
            "chat_id": self.chat_id,
            "text": text,
            "parse_mode": "HTML",
            "disable_web_page_preview": "true",
        })

    def get_updates(self, offset: int | None = None) -> list[dict]:
        if not self.enabled():
            return []
        data = {
            "timeout": "0",
            "allowed_updates": json.dumps(["message"], ensure_ascii=False),
        }
        if offset is not None and offset > 0:
            data["offset"] = str(offset)
        payload = self._post("getUpdates", data)
        result = payload.get("result")
        return result if isinstance(result, list) else []

    def delete_webhook(self) -> None:
        if not self.enabled():
            return
        self._post("deleteWebhook", {
            "drop_pending_updates": "false",
        })


def load_state() -> dict:
    try:
        if STATE_FILE.exists():
            return json.loads(STATE_FILE.read_text(encoding="utf-8"))
    except Exception:
        pass
    return {}


def save_state(state: dict) -> None:
    tmp = STATE_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(STATE_FILE)


def fetch_local_api(api_url: str, timeout_sec: float) -> tuple[int, int | None, str]:
    try:
        with urlopen(api_url, timeout=timeout_sec) as resp:
            payload = json.loads(resp.read().decode("utf-8", errors="replace"))
        items = payload.get("items") or payload.get("data") or payload.get("arbs") or []
        total = _safe_int(payload.get("total"), len(items) if isinstance(items, list) else 0)
        newest: datetime | None = None
        if isinstance(items, list):
            for item in items:
                if not isinstance(item, dict):
                    continue
                for key in ("receivedAt", "received_at", "captured_at", "updated_at"):
                    parsed = _parse_dt(str(item.get(key) or ""))
                    if parsed and (newest is None or parsed > newest):
                        newest = parsed
        age = max(0, int((_utc_now() - newest).total_seconds())) if newest else None
        return total, age, ""
    except Exception as exc:
        return 0, None, f"{type(exc).__name__}: {exc}"


def fetch_postgres_snapshot(settings, timeout_sec: float) -> tuple[int, int | None, str]:
    if psycopg2 is None:
        return 0, None, "psycopg2 indisponivel"
    try:
        conn = psycopg2.connect(
            host=settings.pg_host,
            port=settings.pg_port,
            dbname=settings.pg_db,
            user=settings.pg_user,
            password=settings.pg_password,
            sslmode=settings.pg_sslmode,
            connect_timeout=max(1, int(timeout_sec)),
        )
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = 'arbs_current'
                    """
                )
                columns = {str(row[0]) for row in cur.fetchall()}
                time_column = ""
                for candidate in ("received_at", "receivedAt", "captured_at", "updated_at", "last_seen"):
                    if candidate in columns:
                        time_column = candidate
                        break

                if time_column:
                    cur.execute(f'SELECT COUNT(*), MAX("{time_column}") FROM arbs_current')
                    total, newest = cur.fetchone()
                else:
                    cur.execute("SELECT COUNT(*) FROM arbs_current")
                    total = cur.fetchone()[0]
                    newest = None
        finally:
            conn.close()
        age = None
        if newest:
            if newest.tzinfo is None:
                newest = newest.replace(tzinfo=timezone.utc)
            age = max(0, int((_utc_now() - newest.astimezone(timezone.utc)).total_seconds()))
        return int(total or 0), age, ""
    except Exception as exc:
        return 0, None, f"{type(exc).__name__}: {exc}"


def fetch_betburger_health(settings) -> tuple[int, int, str]:
    live_count = 0
    prematch_count = 0
    errors: list[str] = []

    token_error = probe_betburger_token(settings)
    if token_error:
        return 0, 0, f"token={token_error}"

    try:
        payload = fetch_arbs_page(
            token=settings.token,
            locale=settings.locale,
            filter_id=settings.search_filter_live,
            page=0,
            per_page=5,
            is_live=True,
            timeout_sec=settings.timeout_sec,
            retries=1,
            retry_backoff_sec=settings.retry_backoff_sec,
        )
        live_count = _count_betburger_payload(payload)
    except ApiError as exc:
        errors.append(f"live={exc}")
    except Exception as exc:
        errors.append(f"live={type(exc).__name__}: {exc}")

    try:
        payload = fetch_arbs_page(
            token=settings.token,
            locale=settings.locale,
            filter_id=settings.search_filter_prematch,
            page=0,
            per_page=5,
            is_live=False,
            timeout_sec=settings.timeout_sec,
            retries=1,
            retry_backoff_sec=settings.retry_backoff_sec,
        )
        prematch_count = _count_betburger_payload(payload)
    except ApiError as exc:
        errors.append(f"prematch={exc}")
    except Exception as exc:
        errors.append(f"prematch={type(exc).__name__}: {exc}")

    return live_count, prematch_count, "; ".join(errors)


def probe_betburger_token(settings) -> str:
    token = str(settings.token or "").strip()
    if not token:
        return "token vazio"

    query = urlencode({
        "access_token": token,
        "locale": settings.locale or "en",
    })
    url = f"https://api-lv.betburger.com/api/v1/search_filters?{query}"
    req = Request(url, method="GET", headers={
        "accept": "application/json, text/plain, */*",
        "origin": "https://www.betburger.com",
        "referer": "https://www.betburger.com/",
        "user-agent": "Mozilla/5.0",
    })
    try:
        with urlopen(req, timeout=settings.timeout_sec) as resp:
            resp.read(256)
            if 200 <= int(resp.status) < 300:
                return ""
            return f"HTTP {resp.status}"
    except HTTPError as err:
        try:
            body = err.read().decode("utf-8", errors="replace")
        except Exception:
            body = ""
        return f"HTTP {err.code}: {body[:180]}"
    except (URLError, TimeoutError, OSError) as err:
        return f"{type(err).__name__}: {err}"
    except Exception as err:
        return f"{type(err).__name__}: {err}"


def run_check(settings, args) -> CheckResult:
    api_total, api_age, api_error = fetch_local_api(args.api_url, args.timeout)
    pg_total, pg_age, pg_error = fetch_postgres_snapshot(settings, args.timeout)
    bb_live, bb_prematch, bb_error = fetch_betburger_health(settings)

    reasons: list[str] = []
    if api_error and pg_error:
        reasons.append("API local e Postgres indisponiveis")
    if api_total <= 0 and pg_total <= 0:
        reasons.append("sem oportunidades no app e no banco")
    if api_age is not None and api_age > args.max_age_sec:
        reasons.append(f"API local sem atualizacao ha {api_age}s")
    if pg_age is not None and pg_age > args.max_age_sec:
        reasons.append(f"Postgres sem atualizacao ha {pg_age}s")
    if bb_error:
        if _is_token_error(bb_error):
            reasons.append("token BetBurger invalido ou sem sessao ativa")
        else:
            reasons.append("erro consultando BetBurger")
    elif bb_live <= 0 and bb_prematch <= 0:
        reasons.append("BetBurger retornou 0 no Live e Pre-Live")

    ok = not reasons
    return CheckResult(
        ok=ok,
        api_total=api_total,
        api_newest_age_sec=api_age,
        api_error=api_error,
        pg_total=pg_total,
        pg_newest_age_sec=pg_age,
        pg_error=pg_error,
        bb_live_count=bb_live,
        bb_prematch_count=bb_prematch,
        bb_error=bb_error,
        reason="; ".join(reasons),
    )


def format_message(prefix: str, result: CheckResult) -> str:
    def h(value) -> str:
        return html.escape(str(value or ""), quote=False)

    def age_label(seconds: int | None) -> str:
        if seconds is None:
            return "sem horario"
        if seconds < 60:
            return f"{seconds}s"
        minutes = seconds // 60
        if minutes < 60:
            return f"{minutes}min"
        return f"{minutes // 60}h{minutes % 60:02d}min"

    host = h(socket.gethostname())
    is_ok = result.ok
    status = "Sistema online" if is_ok else "Precisa verificar"
    reason = h(result.reason or "feed normal")
    app_age = h(age_label(result.api_newest_age_sec))
    feed_line = (
        f"Dados chegando normalmente. Ultima atualizacao ha <b>{app_age}</b>."
        if is_ok
        else f"Ultima atualizacao vista ha <b>{app_age}</b>."
    )
    token_line = (
        "<b>Ativo</b>. Eventos chegando da BetBurger."
        if not result.bb_error and (result.bb_live_count > 0 or result.bb_prematch_count > 0)
        else "<b>Com problema</b>. Sem retorno valido da BetBurger."
    )

    lines = [
        "<b>OCTOSURE MONITOR</b>",
        "",
        f"<b>{h(status)}</b>",
        f"<i>Servidor</i>: <code>{host}</code>",
        "",
        f"<b>Resumo</b>",
        f"<i>Feed</i>: {feed_line}",
        f"<i>Token</i>: {token_line}",
    ]
    if not is_ok:
        lines.extend(["", f"<b>Motivo do alerta</b>", reason])
        if result.api_error:
            lines.append(f"API local: <code>{h(result.api_error[:180])}</code>")
        if result.pg_error:
            lines.append(f"Postgres: <code>{h(result.pg_error[:220])}</code>")
        if result.bb_error:
            lines.append(f"BetBurger: <code>{h(result.bb_error[:180])}</code>")
    return "\n".join(lines)


def is_token_problem(result: CheckResult) -> bool:
    if result.bb_error:
        return _is_token_error(result.bb_error)
    return result.bb_live_count <= 0 and result.bb_prematch_count <= 0


def handle_telegram_commands(telegram: TelegramClient, settings, args, state: dict) -> None:
    if args.no_commands or not telegram.enabled():
        return

    last_update_id = _safe_int(state.get("telegram_last_update_id"), 0)
    updates = telegram.get_updates(last_update_id + 1 if last_update_id else None)
    newest_update_id = last_update_id
    first_run = "telegram_last_update_id" not in state
    now_ts = int(time.time())
    for update in updates:
        update_id = _safe_int(update.get("update_id"), 0)
        if update_id > newest_update_id:
            newest_update_id = update_id

        message = update.get("message")
        if not isinstance(message, dict):
            continue
        chat = message.get("chat") if isinstance(message.get("chat"), dict) else {}
        chat_id = str(chat.get("id") or "")
        if chat_id != str(telegram.chat_id):
            continue

        if first_run:
            message_age = now_ts - _safe_int(message.get("date"), now_ts)
            if message_age > 600:
                continue

        text = str(message.get("text") or message.get("caption") or "").strip().lower()
        command = text.split()[0].split("@")[0] if text else ""
        if command not in ("status", "/status"):
            continue

        result = run_check(settings, args)
        telegram.send(format_message("STATUS", result))

    if newest_update_id > last_update_id:
        state["telegram_last_update_id"] = newest_update_id


def main() -> int:
    parser = argparse.ArgumentParser(description="Monitor BetBurger -> Telegram sem alterar o pipeline atual.")
    parser.add_argument("--once", action="store_true", help="Roda uma vez e sai.")
    parser.add_argument("--interval", type=float, default=_env_float("MONITOR_INTERVAL_SEC", 60.0, min_value=5.0))
    parser.add_argument("--timeout", type=float, default=_env_float("MONITOR_TIMEOUT_SEC", 12.0, min_value=2.0))
    parser.add_argument("--fail-cycles", type=int, default=_env_int("MONITOR_FAIL_CYCLES", 3, min_value=1))
    parser.add_argument("--max-age-sec", type=int, default=_env_int("MONITOR_MAX_FEED_AGE_SEC", 180, min_value=30))
    parser.add_argument("--api-url", default=os.getenv("MONITOR_API_URL", "http://127.0.0.1:3005/api/arbs/current?page_size=20"))
    parser.add_argument("--telegram-token", default=os.getenv("TELEGRAM_BOT_TOKEN", ""))
    parser.add_argument("--telegram-chat-id", default=os.getenv("TELEGRAM_CHAT_ID", ""))
    parser.add_argument("--send-ok-once", action="store_true", help="Envia mensagem OK mesmo sem falha.")
    parser.add_argument("--no-commands", action="store_true", help="Nao responde comandos do grupo.")
    args = parser.parse_args()

    settings = load_settings()
    telegram = TelegramClient(args.telegram_token, args.telegram_chat_id, args.timeout)
    if telegram.enabled() and not args.no_commands:
        try:
            telegram.delete_webhook()
            print("telegram_webhook=off", flush=True)
        except Exception as exc:
            print(f"telegram_webhook_error={type(exc).__name__}: {exc}", flush=True)
    state = load_state()
    fail_count = int(state.get("fail_count") or 0)
    alerting = bool(state.get("alerting") or False)

    while True:
        result = run_check(settings, args)
        print(json.dumps({
            "ok": result.ok,
            "api_total": result.api_total,
            "api_age": result.api_newest_age_sec,
            "pg_total": result.pg_total,
            "pg_age": result.pg_newest_age_sec,
            "bb_live": result.bb_live_count,
            "bb_prematch": result.bb_prematch_count,
            "reason": result.reason,
        }, ensure_ascii=False), flush=True)

        if result.ok:
            if alerting:
                telegram.send(format_message("RECUPERADO", result))
                print("telegram_alert=recovered", flush=True)
            elif args.send_ok_once and args.once:
                telegram.send(format_message("OK", result))
            fail_count = 0
            alerting = False
        else:
            fail_count += 1
            required_fail_cycles = 1 if is_token_problem(result) else args.fail_cycles
            if fail_count >= required_fail_cycles and not alerting:
                telegram.send(format_message("ALERTA", result))
                print("telegram_alert=sent", flush=True)
                alerting = True

        state.update({
            "fail_count": fail_count,
            "alerting": alerting,
            "last_ok": result.ok,
            "last_reason": result.reason,
            "updated_at": _utc_now().isoformat(),
        })
        try:
            handle_telegram_commands(telegram, settings, args, state)
        except Exception as exc:
            print(f"telegram_commands_error={type(exc).__name__}: {exc}", flush=True)
        save_state(state)

        if args.once:
            return 0 if result.ok else 2
        time.sleep(args.interval)


if __name__ == "__main__":
    raise SystemExit(main())
