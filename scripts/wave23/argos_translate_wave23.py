#!/usr/bin/env python3
"""
Offline translation (Argos Translate) of Wave 2/3 locales from English:
- messages/*.json values (preserves keys, $schema, Paraglide placeholders in curly braces)
- static/data/i18n overlay strings via packed-lines → maps → apply-translations.mjs

Requires: python venv with argostranslate; network on first run to download language packages.

Usage (repo root):
  ./.venv-argos/bin/python scripts/wave23/argos_translate_wave23.py
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

os.environ.setdefault("XDG_DATA_HOME", str(ROOT / ".xdg-data"))
os.environ.setdefault("XDG_CONFIG_HOME", str(ROOT / ".xdg-config"))
os.environ.setdefault("XDG_CACHE_HOME", str(ROOT / ".xdg-cache"))

from argostranslate import package  # noqa: E402
from argostranslate.translate import translate as argos_translate  # noqa: E402

# Paraglide / UI placeholders like {dest}, {count}, {value}
PH_RE = re.compile(r"(\{[a-zA-Z][a-zA-Z0-9_]*\})")

LOCALES: list[tuple[str, str]] = [
    ("zh-CN", "zh"),
    ("ja", "ja"),
    ("ko", "ko"),
    ("hi", "hi"),
    ("ar", "ar"),
    ("ru", "ru"),
]


def protect_placeholders(s: str) -> tuple[str, list[str]]:
    out: list[str] = []
    placeholders: list[str] = []

    def repl(m: re.Match[str]) -> str:
        placeholders.append(m.group(1))
        out.append(f"⟦{len(placeholders) - 1}⟧")
        return out[-1]

    pieces: list[str] = []
    last = 0
    for m in PH_RE.finditer(s):
        pieces.append(s[last : m.start()])
        pieces.append(repl(m))
        last = m.end()
    pieces.append(s[last:])
    return "".join(pieces), placeholders


def restore_placeholders(s: str, placeholders: list[str]) -> str:
    for i, ph in enumerate(placeholders):
        s = s.replace(f"⟦{i}⟧", ph)
    return s


def translate_phrase(text: str, to_code: str) -> str:
    prot, phs = protect_placeholders(text)
    tr = argos_translate(prot, "en", to_code)
    return restore_placeholders(tr, phs)


def ensure_en_to(to_code: str) -> None:
    try:
        translate_phrase("ok", to_code)
        return
    except Exception:
        pass
    print(f"Installing Argos package en → {to_code} …", flush=True)
    package.update_package_index()
    avail = package.get_available_packages()
    pkg = next((p for p in avail if p.from_code == "en" and p.to_code == to_code), None)
    if pkg is None:
        raise SystemExit(f"No Argos package for en → {to_code}")
    package.install_from_path(pkg.download())


def write_catalog_lines(locale_id: str, to_code: str) -> None:
    catalog_path = ROOT / "scripts/wave23/catalog.json"
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    out_dir = ROOT / "scripts/wave23/packed-lines" / locale_id
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "all.txt"
    lines: list[str] = []
    for i, s in enumerate(catalog):
        lines.append(translate_phrase(s, to_code))
        if (i + 1) % 100 == 0:
            print(f"  catalog {locale_id}: {i + 1}/{len(catalog)}", flush=True)
    out_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def translate_messages(locale_id: str, to_code: str) -> None:
    src = ROOT / "messages" / "en-US.json"
    raw = json.loads(src.read_text(encoding="utf-8"))
    out: dict[str, str] = {}
    items = list(raw.items())
    for i, (k, v) in enumerate(items):
        if k == "$schema":
            out[k] = v
        elif isinstance(v, str):
            out[k] = translate_phrase(v, to_code)
        else:
            out[k] = v
        if (i + 1) % 80 == 0:
            print(f"  messages {locale_id}: {i + 1}/{len(items)}", flush=True)
    dest = ROOT / "messages" / f"{locale_id}.json"
    dest.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {dest.relative_to(ROOT)}", flush=True)


def run_node(script: str, args: list[str]) -> None:
    r = subprocess.run(["node", script, *args], cwd=ROOT, check=False)
    if r.returncode != 0:
        raise SystemExit(r.returncode)


def main() -> None:
    for _loc_id, code in LOCALES:
        ensure_en_to(code)

    for loc_id, code in LOCALES:
        print(f"Messages: {loc_id} …", flush=True)
        translate_messages(loc_id, code)

    for loc_id, code in LOCALES:
        print(f"Overlay catalog lines: {loc_id} …", flush=True)
        write_catalog_lines(loc_id, code)

    for loc_id, _code in LOCALES:
        run_node("scripts/wave23/build-map-from-lines-dir.mjs", [loc_id])
        run_node("scripts/wave23/apply-translations.mjs", [loc_id])

    run_node("scripts/wave23/sync-i18n-enums-from-en-us.mjs", [])
    print("Done.", flush=True)


if __name__ == "__main__":
    main()
