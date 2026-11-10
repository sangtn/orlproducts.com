#!/usr/bin/env python3
"""Extract the legal text of the old WordPress pages into clean HTML fragments.

Usage:  python3 tools/extract_legal.py
One-time migration: the WordPress pages were removed from the tree, so the source is read from
git commit a15c423 when the file is not present.
Keeps only meaningful tags (p, headings, lists, links, emphasis, tables); drops theme wrappers,
styles and scripts. Verifies that the visible words are identical before and after.
"""
import html, os, re, sys
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEEP = {"p", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "a", "strong", "b", "em", "i", "br",
        "table", "thead", "tbody", "tr", "th", "td"}
BLOCK = {"div", "section", "article"}

class Clean(HTMLParser):
    def __init__(s):
        super().__init__(convert_charrefs=True); s.out = []; s.skip = 0
    def handle_starttag(s, t, a):
        if t in ("script", "style", "svg", "noscript", "form", "button", "select", "textarea"): s.skip += 1; return
        if s.skip: return
        if t in KEEP:
            t2 = {"h1": "h2", "h4": "h3", "h5": "h3", "h6": "h3", "b": "strong", "i": "em"}.get(t, t)
            attrs = ""
            if t == "a":
                href = dict(a).get("href") or ""
                href = re.sub(r"^https?://(www\.)?orlproducts\.com", "", href)
                if href.startswith("/cdn-cgi/l/email-protection"): href = "mailto:info@orlproducts.com"
                if "@" in href and ":" not in href: href = "mailto:" + href
                if href: attrs = f' href="{html.escape(href, quote=True)}"'
            s.out.append(f"<{t2}{attrs}>" if t2 != "br" else "<br>")
        elif t in BLOCK:
            s.out.append("\n")
    def handle_endtag(s, t):
        if t in ("script", "style", "svg", "noscript", "form", "button", "select", "textarea"): s.skip = max(0, s.skip - 1); return
        if s.skip: return
        if t in KEEP and t != "br":
            t2 = {"h1": "h2", "h4": "h3", "h5": "h3", "h6": "h3", "b": "strong", "i": "em"}.get(t, t)
            s.out.append(f"</{t2}>")
    def handle_data(s, d):
        if not s.skip: s.out.append(html.escape(d, quote=False))

def words(h):
    t = html.unescape(re.sub(r"<[^>]+>", " ", h))
    t = t.replace("[email protected]", "info@orlproducts.com").replace("[email\xa0protected]", "info@orlproducts.com")
    return re.sub(r"\s+", " ", t).strip()

def extract(src, start_marker):
    path = os.path.join(ROOT, src)
    if os.path.exists(path):
        s = open(path, encoding="utf-8").read()
    else:
        import subprocess
        s = subprocess.run(["git", "-C", ROOT, "show", f"a15c423:{src}"], capture_output=True, text=True, check=True).stdout
    i = s.find(start_marker); j = s.find("<footer", i)
    assert i > 0 and j > i, (src, i, j)
    raw = s[i:j]
    raw = re.sub(r"<(style|script)[^>]*>.*?</\1>", "", raw, flags=re.S)
    p = Clean(); p.feed(raw); out = "".join(p.out)
    out = re.sub(r"<(p|li|h2|h3|strong|em)>\s*</\1>", "", out)        # empty wrappers
    out = re.sub(r"\s+", " ", out)                                       # HTML collapses spacing anyway
    out = re.sub(r"<p>\s*<strong>([^<]{2,120})</strong>\s*</p>", r"<h2>\1</h2>", out)   # bold-only paragraphs are section headings
    out = re.sub(r"\s*(</?(?:p|h2|h3|ul|ol|li|table|tr)>)\s*", r"\1", out)
    out = re.sub(r"(</(?:p|h2|h3|ul|ol|li|table)>)", r"\1\n", out).strip()
    before, after = words(raw), words(out)
    # The theme split words across tags ("anal<span>i</span>se"), so compare characters, not spacing
    same = re.sub(r"\s+", "", before) == re.sub(r"\s+", "", after)
    return out, same, before, after

for src, marker, dst in [("privacy.html", "Privacy Policy</h2>", "privacy.html"), ("terms.html", "Terms Of Services</h2>", "terms.html")]:
    out, same, b, a = extract(src, marker)
    out = re.sub(r"^\s*(Privacy Policy|Terms Of Services)</h2>", "", out).strip()   # the page template supplies the h1
    out = out.replace("LAM AN INVESTMENT &amp; TRADE.,Jsc", "LA INVESTMENT &amp; TRADE.,Jsc")   # company name decided 2026-11-10
    open(os.path.join(ROOT, "site/src/content/legal", dst), "w").write(out + "\n")
    print(f"{src}: {len(a.split())} words, identical text: {same}")
    if not same:
        import difflib
        for l in list(difflib.unified_diff(b.split(), a.split(), lineterm=""))[:40]: print("  ", l)
        sys.exit(1)
