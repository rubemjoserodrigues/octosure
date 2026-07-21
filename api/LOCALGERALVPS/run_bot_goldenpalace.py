#!/usr/bin/env python3
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path


def main() -> int:
    root = Path(__file__).resolve().parent
    base_cmd = [
        sys.executable,
        str(root / "run_local_pipeline.py"),
        "--family-root",
        "61",
        "--target-side-only",
    ]
    cmd = base_cmd + sys.argv[1:]
    env = dict(os.environ)
    env.setdefault("PG_TABLE_CURRENT", "localgeralvps_goldenpalace_current")
    env.setdefault("PG_TABLE_HISTORY", "localgeralvps_goldenpalace_history")
    try:
        return subprocess.call(cmd, env=env)
    except KeyboardInterrupt:
        print("interrompido=1")
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
