from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path


# IDs conhecidos da familia Bet7k para evitar erro de root em feeds inconsistentes.
FORCED_FAMILY_ROOT_BY_ID = {
    10: 10,
    199: 10,
    447: 447,
    1280: 447,
    1305: 447,
    1307: 447,
    1308: 447,
    1311: 447,
    1312: 447,
    1313: 447,
    1314: 447,
    1315: 447,
    1316: 447,
    1318: 447,
    1319: 447,
    1335: 447,
    1418: 447,
    1420: 447,
    1421: 447,
    1423: 447,
    1424: 447,
    1502: 447,
    1532: 447,
    1734: 447,
    1735: 447,
}


def to_int_or_none(value):
    try:
        if value is None or isinstance(value, bool):
            return None
        return int(str(value).strip())
    except Exception:
        return None


def normalize_match_text(value):
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value).strip().lower())


def dedupe_sorted_names(names):
    seen = set()
    out = []
    for raw in names:
        txt = str(raw or "").strip()
        if not txt:
            continue
        key = normalize_match_text(txt)
        if not key or key in seen:
            continue
        seen.add(key)
        out.append(txt)
    out.sort(key=lambda x: x.lower())
    return out


@dataclass
class ReferenceData:
    sports_map: dict[int, str] = field(default_factory=dict)
    bookmakers_map: dict[int, str] = field(default_factory=dict)
    periods_map: dict[int, str] = field(default_factory=dict)
    market_variation_titles: dict[int, str] = field(default_factory=dict)
    parent_by_id: dict[int, int] = field(default_factory=dict)
    family_ids: dict[int, set[int]] = field(default_factory=dict)
    family_names: dict[int, list[str]] = field(default_factory=dict)

    def resolve_family_root(self, bookmaker_id: int | None) -> int | None:
        if bookmaker_id is None:
            return None
        forced = FORCED_FAMILY_ROOT_BY_ID.get(bookmaker_id)
        if forced is not None:
            return forced
        current = bookmaker_id
        visited = set()
        while current not in visited:
            visited.add(current)
            parent = self.parent_by_id.get(current)
            forced_parent = FORCED_FAMILY_ROOT_BY_ID.get(parent)
            if forced_parent is not None:
                return forced_parent
            if parent is None or parent == current:
                return current
            current = parent
        return bookmaker_id

    def bookmaker_name(self, bookmaker_id: int | None, fallback: str = "") -> str:
        if bookmaker_id is None:
            return str(fallback or "").strip()
        name = self.bookmakers_map.get(bookmaker_id)
        if name:
            return str(name).strip()
        return str(fallback or "").strip()

    def casa_mae(self, bookmaker_id: int | None, fallback_name: str = "") -> tuple[int | None, str]:
        root = self.resolve_family_root(bookmaker_id)
        if root is None:
            return None, str(fallback_name or "").strip()
        mother_name = self.bookmaker_name(root, fallback=fallback_name)
        return root, mother_name

    def market_variation_title(self, market_code: int | None) -> str:
        if market_code is None:
            return ""
        return str(self.market_variation_titles.get(market_code) or "").strip()

    def period_title(self, period_identifier: int | None) -> str:
        if period_identifier is None:
            return ""
        return str(self.periods_map.get(period_identifier) or "").strip()


def load_reference_data(path: Path) -> ReferenceData:
    ref = ReferenceData()
    if not path.exists():
        return ref

    text = path.read_text(encoding="utf-8", errors="replace")
    lines = text.splitlines()

    sections = []
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if line.startswith("http://") or line.startswith("https://"):
            url = line
            i += 1
            chunk = []
            while i < len(lines):
                nxt = lines[i].strip()
                if nxt.startswith("http://") or nxt.startswith("https://"):
                    break
                chunk.append(lines[i])
                i += 1
            json_text = "\n".join(chunk).strip()
            if json_text:
                sections.append((url, json_text))
        else:
            i += 1

    for url, json_text in sections:
        if "/api/v1/directories" not in url:
            continue
        try:
            payload = json.loads(json_text)
        except Exception:
            continue

        for sport in payload.get("sports", []):
            if not isinstance(sport, dict):
                continue
            sid = to_int_or_none(sport.get("id"))
            sname = sport.get("name")
            if sid is not None and sname:
                ref.sports_map[sid] = str(sname).strip()

        for period in payload.get("periods", []):
            if not isinstance(period, dict):
                continue
            pid = to_int_or_none(period.get("identifier"))
            if pid is None:
                pid = to_int_or_none(period.get("id"))
            ptitle = str(period.get("title") or "").strip()
            if pid is not None and ptitle:
                ref.periods_map[pid] = ptitle

        # Cobre codigos de mercado altos (ex.: 727/728) para evitar fallback T<codigo>.
        for mv in payload.get("market_variations", []):
            if not isinstance(mv, dict):
                continue
            mid = to_int_or_none(mv.get("id"))
            mtitle = str(mv.get("title") or "").strip()
            if mid is not None and mtitle:
                ref.market_variation_titles[mid] = mtitle

        bk_root = payload.get("bookmakers", {})
        bk_lists = []
        if isinstance(bk_root, dict):
            for key in ("arbs", "valuebets"):
                items = bk_root.get(key)
                if isinstance(items, list):
                    bk_lists.append(items)
        elif isinstance(bk_root, list):
            bk_lists.append(bk_root)

        for bk_list in bk_lists:
            for b in bk_list:
                if not isinstance(b, dict):
                    continue
                bid = to_int_or_none(b.get("id"))
                name = b.get("name") or b.get("bookmaker")
                if bid is None or not name:
                    continue
                name_txt = str(name).strip()
                ref.bookmakers_map[bid] = name_txt
                ref.parent_by_id.setdefault(bid, bid)
                ref.family_ids.setdefault(bid, set()).add(bid)
                ref.family_names.setdefault(bid, set()).add(name_txt)

        for clone in payload.get("bookmaker_clones", []):
            if not isinstance(clone, dict):
                continue
            clone_id = to_int_or_none(clone.get("id"))
            base_id = to_int_or_none(clone.get("bookmaker_id"))
            clone_name = clone.get("name") or clone.get("bookmaker")
            clone_name_txt = str(clone_name).strip() if clone_name else ""

            if clone_id is not None and clone_name_txt and clone_id not in ref.bookmakers_map:
                ref.bookmakers_map[clone_id] = clone_name_txt

            if base_id is None and clone_id is not None:
                base_id = clone_id
            if base_id is None:
                continue

            ref.parent_by_id.setdefault(base_id, base_id)
            ref.family_ids.setdefault(base_id, set()).add(base_id)
            ref.family_names.setdefault(base_id, set())

            if clone_id is not None:
                ref.parent_by_id[clone_id] = base_id
                ref.family_ids[base_id].add(clone_id)
            if clone_name_txt:
                ref.family_names[base_id].add(clone_name_txt)
            if base_id not in ref.bookmakers_map and clone_name_txt:
                ref.bookmakers_map[base_id] = clone_name_txt

    ref.family_names = {k: dedupe_sorted_names(v) for k, v in ref.family_names.items()}
    return ref
