from __future__ import annotations

import hashlib
import re
from datetime import datetime, timezone
from urllib.parse import quote

from .reference_data import ReferenceData, to_int_or_none

def _format_market_param(value):
    if value is None or value == "":
        return ""
    try:
        num = float(str(value).replace(",", ".").strip())
    except Exception:
        return str(value).strip()
    if num.is_integer():
        return str(int(num))
    return f"{num:.6f}".rstrip("0").rstrip(".")


def _to_float_or_none(value):
    try:
        if value is None or value == "":
            return None
        return float(str(value).replace("%", "").strip())
    except Exception:
        return None


def _pick_odd_value(bet_obj: dict):
    if not isinstance(bet_obj, dict):
        return None
    odd = bet_obj.get("odd")
    if isinstance(odd, str) and odd.strip() == "":
        odd = None
    if odd is None:
        odd = bet_obj.get("koef")
    return odd


def _extract_event_link(bet_obj: dict) -> str:
    if not isinstance(bet_obj, dict):
        return ""
    for key in ("direct_link", "directLink", "url", "link", "eventUrl", "event_url"):
        value = str(bet_obj.get(key) or "").strip()
        if value:
            return value
    return ""


def _extract_period_identifier(obj: dict) -> int | None:
    if not isinstance(obj, dict):
        return None
    return to_int_or_none(obj.get("period_identifier") if obj.get("period_identifier") is not None else obj.get("periodIdentifier"))


def _extract_period_title(obj: dict) -> str:
    if not isinstance(obj, dict):
        return ""
    for key in ("period_name", "periodName", "period_title", "periodTitle", "period", "part"):
        value = str(obj.get(key) or "").strip()
        if value and re.sub(r"\s+", "", value.lower()) not in {"-", "--", "—", "na", "n/a", "null", "none"}:
            return value
    return ""


def _extract_entry_type(bet_obj: dict, ref: ReferenceData) -> str:
    if not isinstance(bet_obj, dict):
        return ""
    _ = ref
    # Modo estrito: manter nomenclatura crua da API (sem aliases/abreviacoes sinteticas).
    direct = str(
        bet_obj.get("bc_title")
        or bet_obj.get("title")
        or bet_obj.get("entry_type")
        or bet_obj.get("entryType")
        or ""
    ).strip()
    if direct and re.sub(r"\s+", "", direct.lower()) not in {"-", "--", "—", "na", "n/a", "null", "none", "m1", "m2"}:
        return direct
    return ""


def _extract_bet_id(bet_obj: dict) -> str:
    if not isinstance(bet_obj, dict):
        return ""
    return str(bet_obj.get("id") or bet_obj.get("betId") or "").strip()


def _build_oddsrabbit_url(bet_id: str, arb_hash: str, token: str, locale: str, is_live: bool) -> str:
    if not bet_id or not arb_hash or not token:
        return ""
    return (
        "https://lv.oddsrabbit.org/bets/"
        f"{quote(bet_id)}"
        f"?locale={quote(locale)}&access_token={quote(token)}&domain=&arb_hash={quote(arb_hash)}"
        f"&is_live={'1' if is_live else '0'}"
    )


def _arb_key(arb_hash: str, bet1_id: str, bet2_id: str, is_live: bool) -> str:
    base = f"{arb_hash}|{bet1_id}|{bet2_id}|{1 if is_live else 0}"
    if arb_hash and bet1_id and bet2_id:
        return base
    return hashlib.md5(base.encode("utf-8")).hexdigest()


def _to_iso_utc_now():
    return datetime.now(timezone.utc).isoformat()


def normalize_payload(
    payload: dict,
    is_live: bool,
    token: str,
    locale: str,
    ref: ReferenceData,
):
    if not isinstance(payload, dict):
        return []

    arbs = payload.get("arbs") or []
    bets = payload.get("bets") or []
    if not isinstance(arbs, list) or not isinstance(bets, list):
        return []

    bet_map = {}
    for b in bets:
        if not isinstance(b, dict):
            continue
        bid = _extract_bet_id(b)
        if bid:
            bet_map[bid] = b

    out = []
    now_iso = _to_iso_utc_now()
    for arb in arbs:
        if not isinstance(arb, dict):
            continue

        arb_hash = str(arb.get("arb_hash") or arb.get("id") or "").strip()
        bet1_id = str(arb.get("bet1_id") or "").strip()
        bet2_id = str(arb.get("bet2_id") or "").strip()

        b1 = bet_map.get(bet1_id, {})
        b2 = bet_map.get(bet2_id, {})

        period_id_arb = _extract_period_identifier(arb)
        period_title_arb = _extract_period_title(arb)

        period_id1 = _extract_period_identifier(b1)
        if period_id1 is None:
            period_id1 = period_id_arb
        period_id2 = _extract_period_identifier(b2)
        if period_id2 is None:
            period_id2 = period_id_arb

        period_title1 = _extract_period_title(b1)
        if not period_title1:
            period_title1 = period_title_arb

        period_title2 = _extract_period_title(b2)
        if not period_title2:
            period_title2 = period_title_arb

        b1_bookmaker_id = to_int_or_none(b1.get("bookmaker_id"))
        b2_bookmaker_id = to_int_or_none(b2.get("bookmaker_id"))

        b1_bookmaker_name = ref.bookmaker_name(
            b1_bookmaker_id,
            fallback=str(b1.get("bookmaker") or b1.get("bookmaker_name") or ""),
        )
        b2_bookmaker_name = ref.bookmaker_name(
            b2_bookmaker_id,
            fallback=str(b2.get("bookmaker") or b2.get("bookmaker_name") or ""),
        )

        b1_root, b1_casa_mae = ref.casa_mae(b1_bookmaker_id, fallback_name=b1_bookmaker_name)
        b2_root, b2_casa_mae = ref.casa_mae(b2_bookmaker_id, fallback_name=b2_bookmaker_name)

        # Sport: prioriza nome textual; quando vier apenas ID (sport_id/sport),
        # resolve pelo mapa de esportes.
        sport_name = ""
        sport_text_candidates = [
            arb.get("sport_name"),
            arb.get("sportName"),
            b1.get("sport_name"),
            b1.get("sportName"),
            b2.get("sport_name"),
            b2.get("sportName"),
            arb.get("sport"),
            b1.get("sport"),
            b2.get("sport"),
        ]
        for raw_txt in sport_text_candidates:
            txt = str(raw_txt or "").strip()
            if not txt:
                continue
            # Ignora valor numérico para não salvar "2" em vez de "Basketball".
            if to_int_or_none(txt) is not None:
                continue
            sport_name = txt
            break

        if not sport_name:
            sport_id_candidates = [
                arb.get("sport_id"),
                arb.get("sport"),
                b1.get("sport_id"),
                b1.get("sport"),
                b2.get("sport_id"),
                b2.get("sport"),
            ]
            fallback_sport_id = None
            for raw_id in sport_id_candidates:
                sid = to_int_or_none(raw_id)
                if sid is None:
                    continue
                if fallback_sport_id is None:
                    fallback_sport_id = sid
                mapped = str(ref.sports_map.get(sid) or "").strip()
                if mapped:
                    sport_name = mapped
                    break
            if not sport_name and fallback_sport_id is not None:
                sport_name = f"Sport {fallback_sport_id}"

        event_name = str(
            arb.get("event_name")
            or b1.get("event_name")
            or b1.get("eventName")
            or b2.get("event_name")
            or b2.get("eventName")
            or ""
        ).strip()

        starts_at = str(arb.get("started_at") or arb.get("starts_at") or "").strip()
        percentage = _to_float_or_none(arb.get("percent") or arb.get("percentage"))

        bet1_link = _extract_event_link(b1)
        bet2_link = _extract_event_link(b2)
        bet1_oddsrabbit = _build_oddsrabbit_url(bet1_id, arb_hash, token, locale, is_live)
        bet2_oddsrabbit = _build_oddsrabbit_url(bet2_id, arb_hash, token, locale, is_live)

        b1_payload = dict(b1) if isinstance(b1, dict) else {}
        b2_payload = dict(b2) if isinstance(b2, dict) else {}
        arb_payload = dict(arb) if isinstance(arb, dict) else {}

        if period_id1 is not None:
            b1_payload["period_identifier"] = period_id1
        if period_title1:
            b1_payload["period_title"] = period_title1

        if period_id2 is not None:
            b2_payload["period_identifier"] = period_id2
        if period_title2:
            b2_payload["period_title"] = period_title2

        if period_id_arb is not None:
            arb_payload["period_identifier"] = period_id_arb
        if period_title_arb:
            arb_payload["period_title"] = period_title_arb

        row = {
            "row_key": _arb_key(arb_hash, bet1_id, bet2_id, is_live),
            "captured_at": now_iso,
            "is_live": bool(is_live),
            "arb_hash": arb_hash,
            "event_name": event_name,
            "sport_name": sport_name,
            "percentage": percentage,
            "starts_at": starts_at,
            "bet1_bookmaker_id": b1_bookmaker_id,
            "bet1_bookmaker": b1_bookmaker_name,
            "bet1_family_root": b1_root,
            "bet1_casa_mae_id": b1_root,
            "bet1_casa_mae": b1_casa_mae,
            "bet1_odd": _to_float_or_none(_pick_odd_value(b1)),
            "bet1_entry_type": _extract_entry_type(b1, ref),
            "bet1_bet_id": bet1_id,
            "bet1_link": bet1_link,
            "bet1_oddsrabbit_url": bet1_oddsrabbit,
            "bet2_bookmaker_id": b2_bookmaker_id,
            "bet2_bookmaker": b2_bookmaker_name,
            "bet2_family_root": b2_root,
            "bet2_casa_mae_id": b2_root,
            "bet2_casa_mae": b2_casa_mae,
            "bet2_odd": _to_float_or_none(_pick_odd_value(b2)),
            "bet2_entry_type": _extract_entry_type(b2, ref),
            "bet2_bet_id": bet2_id,
            "bet2_link": bet2_link,
            "bet2_oddsrabbit_url": bet2_oddsrabbit,
            "payload": {
                "arb": arb_payload,
                "bet1": b1_payload,
                "bet2": b2_payload,
            },
        }
        out.append(row)
    return out
