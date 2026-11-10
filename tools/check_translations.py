#!/usr/bin/env python3
"""Check machine-assisted translations in site/src/data/i18n against the source app text.

Usage:  python3 tools/check_translations.py
Flags a translation when it changes the text's structure (blocks, bullets), drops a URL, email,
number or protected name, or has a meta description outside the allowed length.
"""
import glob, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROTECTED = ["iPhone", "iPad", "Apple Watch", "Apple Vision Pro", "App Store", "Google Play", "Android", "Wear OS",
             "iCloud", "Siri", "NOAA", "LiDAR", "IPTV", "M3U", "ORIENTPRO"]
META = {"ja": (40, 120), "es": (100, 160), "fr": (100, 160), "de": (100, 160)}

def shape(text):
    blocks = [b for b in re.split(r"\n\s*\n", text.strip()) if b.strip()]
    bullets = len(re.findall(r"^\s*[•\-–\*]\s+", text, re.M))
    return len(blocks), bullets

def main():
    apps = {json.load(open(f))["slug"]: json.load(open(f)) for f in glob.glob(os.path.join(ROOT, "site/src/data/apps/*.json"))}
    problems, ok = [], 0
    for f in sorted(glob.glob(os.path.join(ROOT, "site/src/data/i18n/*/*.json"))):
        t = json.load(open(f))
        src = apps[t["slug"]]
        where = f'{t["lang"]}/{t["slug"]}'
        issues = []
        sb, sbul = shape(src["description"])
        tb, tbul = shape(t["description"])
        if sb != tb: issues.append(f"{tb} blocks vs {sb} in source")
        if sbul != tbul: issues.append(f"{tbul} bullets vs {sbul} in source")
        for pat in (r"https?://\S+", r"[\w.+-]+@[\w-]+\.\w+"):
            for m in set(re.findall(pat, src["description"])):
                if m not in t["description"]: issues.append(f"missing {m}")
        names = [src["name"].split(":")[0].split(" - ")[0].split(" – ")[0].strip()] + [p for p in PROTECTED if p in src["description"]]
        for n in names:
            if n in src["description"] and n not in t["description"]: issues.append(f"'{n}' missing")
        lo, hi = META.get(t["lang"], (70, 160))
        if not lo <= len(t["metaDescription"]) <= hi: issues.append(f"metaDescription {len(t['metaDescription'])} chars (want {lo}-{hi})")
        ratio = len(t["description"]) / max(1, len(src["description"]))
        if not (0.25 if t["lang"] == "ja" else 0.8) <= ratio <= (1.0 if t["lang"] == "ja" else 1.6):
            issues.append(f"length ratio {ratio:.2f} looks off")
        if issues: problems.append((where, issues))
        else: ok += 1
    for w, i in problems: print(f"{w}: " + "; ".join(i))
    print(f"{ok} translations OK, {len(problems)} with notes")
    return 1 if problems else 0

if __name__ == "__main__":
    sys.exit(main())
