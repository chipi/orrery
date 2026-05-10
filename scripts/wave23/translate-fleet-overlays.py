#!/usr/bin/env python3
"""
Argos-translate the 124 en-US fleet overlays into the 11 locales
argos has packages for: fr, de, it, pt-BR, nl, zh-CN, ja, ko, hi, ar, ru.
sr-Cyrl is NOT covered (no en→sr argos pack); deferred for manual fill.

For each locale:
  - Reads static/data/i18n/en-US/fleet/{category}/{id}.json
  - Translates the four fields (name, tagline, description, best_known_for)
  - Writes static/data/i18n/{locale}/fleet/{category}/{id}.json

Quality is machine-translation level — Marko can iterate per-locale later.

Run from repo root after installing argos-translate language packs:
  ./.venv-argos/bin/python scripts/wave23/translate-fleet-overlays.py
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

os.environ.setdefault("XDG_DATA_HOME", str(ROOT / ".xdg-data"))
os.environ.setdefault("XDG_CONFIG_HOME", str(ROOT / ".xdg-config"))
os.environ.setdefault("XDG_CACHE_HOME", str(ROOT / ".xdg-cache"))

from argostranslate import package, translate as argos_translate_mod

# (orrery locale, argos target code).
# pt-BR uses 'pt' generic Portuguese; argos quality is good enough for V1.
# zh-CN uses 'zh' (Simplified). sr-Cyrl deliberately omitted — no en→sr.
LOCALES: list[tuple[str, str]] = [
    ("fr", "fr"),
    ("de", "de"),
    ("it", "it"),
    ("pt-BR", "pt"),
    ("nl", "nl"),
    ("zh-CN", "zh"),
    ("ja", "ja"),
    ("ko", "ko"),
    ("hi", "hi"),
    ("ar", "ar"),
    ("ru", "ru"),
]

EN_FLEET = ROOT / "static/data/i18n/en-US/fleet"


def install_packages_if_missing(targets: list[str]) -> None:
    package.update_package_index()
    available = package.get_available_packages()
    installed = {p.to_code for p in package.get_installed_packages() if p.from_code == "en"}
    missing = [t for t in targets if t not in installed]
    if not missing:
        return
    print(f"Installing argos packs en→ {missing}…", flush=True)
    for code in missing:
        match = next((p for p in available if p.from_code == "en" and p.to_code == code), None)
        if not match:
            print(f"  ⚠ no argos package for en→{code}; skipping", file=sys.stderr)
            continue
        package.install_from_path(match.download())
        print(f"  ✓ {code}", flush=True)


def translate_value(text: str, target: str) -> str:
    if not text or not text.strip():
        return text
    return argos_translate_mod.translate(text, "en", target)


def translate_entry(entry: dict, target: str) -> dict:
    out: dict[str, str] = {}
    for key in ("name", "tagline", "description", "best_known_for"):
        if key in entry and isinstance(entry[key], str):
            out[key] = translate_value(entry[key], target)
        elif key in entry:
            out[key] = entry[key]
    return out


def main() -> int:
    targets = sorted({argos_code for _, argos_code in LOCALES})
    install_packages_if_missing(targets)

    fleet_files: list[Path] = sorted(EN_FLEET.rglob("*.json"))
    print(f"Translating {len(fleet_files)} fleet overlay files into {len(LOCALES)} locales…")

    for locale, argos_code in LOCALES:
        out_root = ROOT / "static/data/i18n" / locale / "fleet"
        out_root.mkdir(parents=True, exist_ok=True)
        print(f"\n[{locale}] (argos: en→{argos_code})", flush=True)
        ok = 0
        for src in fleet_files:
            rel = src.relative_to(EN_FLEET)
            dst = out_root / rel
            dst.parent.mkdir(parents=True, exist_ok=True)
            with src.open(encoding="utf-8") as f:
                src_data = json.load(f)
            translated = translate_entry(src_data, argos_code)
            with dst.open("w", encoding="utf-8") as f:
                json.dump(translated, f, ensure_ascii=False, indent=2)
                f.write("\n")
            ok += 1
            if ok % 20 == 0:
                print(f"  ... {ok}/{len(fleet_files)}", flush=True)
        print(f"  ✓ {locale} ({ok} files)")

    print("\nDone. Run `npm run preflight` to validate.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
