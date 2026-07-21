#!/usr/bin/env python3
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


PRESETS: dict[str, list[str]] = {
    "core": [
        "447:localgeralvps_bet7k_current:localgeralvps_bet7k_history",
        "10:localgeralvps_bet365_current:localgeralvps_bet365_history",
    ],
    "plus": [
        "447:localgeralvps_bet7k_current:localgeralvps_bet7k_history",
        "10:localgeralvps_bet365_current:localgeralvps_bet365_history",
        "61:localgeralvps_goldenpalace_current:localgeralvps_goldenpalace_history",
    ],
    "all": [
        "447:localgeralvps_bet7k_current:localgeralvps_bet7k_history",
        "10:localgeralvps_bet365_current:localgeralvps_bet365_history",
        "61:localgeralvps_goldenpalace_current:localgeralvps_goldenpalace_history",
        "34:localgeralvps_vbet_current:localgeralvps_vbet_history",
    ],
}


def main() -> int:
    parser = argparse.ArgumentParser(description="Runner distribuido de familias locais.")
    parser.add_argument("--preset", default="core", choices=sorted(PRESETS.keys()), help="Conjunto base de workers.")
    parser.add_argument("--cycles", type=int, default=0, help="0=infinito")
    parser.add_argument("--interval", type=float, help="sobrescreve INTERVAL_SEC")
    parser.add_argument("--token", default="", help="sobrescreve BETBURGER_ACCESS_TOKEN")
    parser.add_argument("--workers", action="append", help="Sobrescreve workers (formato root:current:history)")
    parser.add_argument("--no-link-resolve", action="store_true", help="Nao resolve links")
    parser.add_argument("--target-side-only", action="store_true", help="Mantem a familia alvo no lado bet1")
    args, passthrough = parser.parse_known_args()

    root_dir = Path(__file__).resolve().parent
    cmd = [
        sys.executable,
        str(root_dir / "run_local_pipeline.py"),
    ]

    if args.target_side_only:
        cmd.append("--target-side-only")
    if args.cycles:
        cmd.extend(["--cycles", str(args.cycles)])
    else:
        cmd.extend(["--cycles", "0"])

    if args.interval is not None:
        cmd.extend(["--interval", str(args.interval)])

    if args.token:
        cmd.extend(["--token", args.token])

    if args.no_link_resolve:
        cmd.append("--no-link-resolve")

    worker_specs = args.workers if args.workers else PRESETS[args.preset]
    for spec in worker_specs:
        cmd.extend(["--workers", spec])

    if passthrough:
        cmd.extend(passthrough)

    try:
        return subprocess.call(cmd)
    except KeyboardInterrupt:
        print("interrompido=1")
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
