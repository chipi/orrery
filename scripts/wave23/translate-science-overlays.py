#!/usr/bin/env python3
"""
Argos-translate the new /science overlay files (life-in-space,
observation, and 3 new mission-phases sections) into the 11 locales
argos has packages for: fr, de, it, pt-BR, nl, zh-CN, ja, ko, hi, ar, ru.
sr-Cyrl is NOT covered (no en→sr argos pack); deferred for manual fill.

For each locale + each en-US source file in the target set:
  - Reads the JSON from static/data/i18n/en-US/science/...
  - Recursively translates every string-typed leaf value, preserving
    array structure (body_paragraphs / paragraphs / narrative_101).
  - Writes static/data/i18n/{locale}/science/...

Run from repo root:
  ./.venv-argos/bin/python scripts/wave23/translate-science-overlays.py
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

EN_SCIENCE = ROOT / "static/data/i18n/en-US/science"

# Files to translate this round — only the new content from the
# 4-issue science expansion. Existing sections already have overlays
# (the other 42 sections were translated in a previous wave).
TARGET_PATTERNS = [
    "life-in-space/*.json",
    "observation/*.json",
    "mission-phases/star-trackers.json",
    "mission-phases/dead-reckoning.json",
    "mission-phases/dsn.json",
]


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


def translate_node(node, target: str):
    """Recursively translate string leaves; preserve list + dict shape."""
    if isinstance(node, str):
        return translate_value(node, target)
    if isinstance(node, list):
        return [translate_node(v, target) for v in node]
    if isinstance(node, dict):
        return {k: translate_node(v, target) for k, v in node.items()}
    return node


def collect_target_files() -> list[Path]:
    out: list[Path] = []
    for pattern in TARGET_PATTERNS:
        out.extend(sorted(EN_SCIENCE.glob(pattern)))
    return out


def main() -> int:
    targets = sorted({argos_code for _, argos_code in LOCALES})
    install_packages_if_missing(targets)

    files = collect_target_files()
    print(f"Translating {len(files)} science overlay files into {len(LOCALES)} locales…")
    for f in files:
        print(f"  • {f.relative_to(EN_SCIENCE)}")

    for locale, argos_code in LOCALES:
        out_root = ROOT / "static/data/i18n" / locale / "science"
        print(f"\n[{locale}] (argos: en→{argos_code})", flush=True)
        ok = 0
        for src in files:
            rel = src.relative_to(EN_SCIENCE)
            dst = out_root / rel
            dst.parent.mkdir(parents=True, exist_ok=True)
            with src.open(encoding="utf-8") as fp:
                src_data = json.load(fp)
            translated = translate_node(src_data, argos_code)
            with dst.open("w", encoding="utf-8") as fp:
                json.dump(translated, fp, ensure_ascii=False, indent=2)
                fp.write("\n")
            ok += 1
        print(f"  ✓ {locale} ({ok} files)")

    print("\nDone. Run `npm run preflight` to validate.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
