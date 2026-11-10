#!/usr/bin/env python3
"""Full SEO audit of the built site (site/dist), the way a crawler would see it.

Usage:  python3 tools/seo_audit.py [--json report.json]
Checks every HTML page for: title, description, canonical (absolute, self-referencing), robots,
lang, viewport, one <h1>, Open Graph, JSON-LD validity and required fields, image alt text,
broken internal links and assets, hreflang reciprocity, mixed content and page weight;
then checks sitemap.xml and robots.txt against the pages. Exit code 1 if any error is found.
"""
import json, os, re, sys, html
from collections import defaultdict
from html.parser import HTMLParser
from urllib.parse import urlparse, unquote

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, "site", "dist")
SITE = "https://orlproducts.com"

# Redirects served by Vercel (vercel.json) count as valid link targets
REDIRECTS = {r["source"]: r["destination"] for r in json.load(open(os.path.join(ROOT, "vercel.json"))).get("redirects", [])}


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.title = ""; self._in_title = False; self.meta = {}; self.links = []; self.hreflang = []
        self.h1 = 0; self.lang = None; self.imgs = []; self.refs = []; self.ld = []; self._ld = None
        self.in_svg = 0

    def handle_starttag(self, tag, a):
        a = dict(a)
        if tag == "svg": self.in_svg += 1
        if tag == "html": self.lang = a.get("lang")
        if tag == "title" and not self.in_svg: self._in_title = True
        if tag == "meta":
            k = a.get("name") or a.get("property")
            if k: self.meta[k.lower()] = a.get("content", "")
            if a.get("charset"): self.meta["charset"] = a["charset"]
        if tag == "link":
            rel = (a.get("rel") or "").lower()
            if rel == "canonical": self.meta["canonical"] = a.get("href", "")
            if rel == "alternate" and a.get("hreflang"): self.hreflang.append((a["hreflang"], a.get("href", "")))
            if rel in ("stylesheet", "icon", "apple-touch-icon", "preload") and a.get("href"): self.refs.append(a["href"])
        if tag == "h1" and not self.in_svg: self.h1 += 1
        if tag == "img":
            self.imgs.append(a)
            if a.get("src"): self.refs.append(a["src"])
        if tag == "source" and a.get("srcset"): self.refs += [p.strip().split()[0] for p in a["srcset"].split(",")]
        if tag == "script":
            if a.get("src"): self.refs.append(a["src"])
            if a.get("type") == "application/ld+json": self._ld = ""
        if tag == "a" and a.get("href"): self.links.append(a["href"])
        if tag == "use" and (a.get("href") or a.get("xlink:href")): self.refs.append(a.get("href") or a.get("xlink:href"))

    def handle_endtag(self, tag):
        if tag == "svg": self.in_svg = max(0, self.in_svg - 1)
        if tag == "title": self._in_title = False
        if tag == "script" and self._ld is not None: self.ld.append(self._ld); self._ld = None

    def handle_data(self, d):
        if self._in_title: self.title += d
        if self._ld is not None: self._ld += d


def page_url(rel):
    return f"{SITE}/" if rel == "index.html" else f"{SITE}/{rel}"


def target_exists(url, here_rel):
    """Does an internal link or asset resolve to a file in dist (or a configured redirect)?"""
    u = urlparse(url)
    if u.scheme in ("mailto", "tel", "data", "javascript") or (u.scheme and u.netloc and u.netloc not in ("orlproducts.com", "www.orlproducts.com")):
        return True
    path = unquote(u.path)
    if not path:
        return True  # same-page anchor
    if not path.startswith("/"):
        path = "/" + os.path.normpath(os.path.join(os.path.dirname(here_rel), path)).lstrip("./")
    if path in REDIRECTS: return True
    if path.endswith("/"): path += "index.html"
    return os.path.exists(os.path.join(DIST, path.lstrip("/")))


def main():
    pages = {}
    for d, _, files in os.walk(DIST):
        for f in files:
            if f.endswith(".html"):
                rel = os.path.relpath(os.path.join(d, f), DIST)
                if re.match(r"google[0-9a-f]+\.html$", rel): continue
                p = Page(); raw = open(os.path.join(DIST, rel), encoding="utf-8", errors="ignore").read(); p.feed(raw)
                p.size = len(raw.encode()); p.raw = raw
                # url(...) inside inline CSS: fonts and backgrounds
                p.refs += [u for u in re.findall(r"url\(\s*['\"]?([^'\")]+)['\"]?\s*\)", raw) if not u.startswith(("data:", "#"))]
                pages[rel] = p

    errors, warnings = defaultdict(list), defaultdict(list)
    titles, descs = defaultdict(list), defaultdict(list)
    url_to_rel = {page_url(r): r for r in pages}

    for rel, p in sorted(pages.items()):
        indexable = rel != "404.html" and "noindex" not in p.meta.get("robots", "")
        E = errors if indexable else warnings
        t = re.sub(r"\s+", " ", p.title).strip(); d = p.meta.get("description", "")
        if not t: E["missing title"].append(rel)
        elif len(t) > 70: warnings["title over 70 characters"].append(f"{rel} ({len(t)})")
        if not d: E["missing meta description"].append(rel)
        elif len(d) > 165: warnings["description over 165 characters"].append(f"{rel} ({len(d)})")
        if indexable:
            titles[t].append(rel); descs[d].append(rel)
            c = p.meta.get("canonical", "")
            if not c: errors["missing canonical"].append(rel)
            elif c != page_url(rel): errors["canonical is not this page"].append(f"{rel} -> {c}")
        if not p.lang: E["missing <html lang>"].append(rel)
        if "viewport" not in p.meta: E["missing viewport"].append(rel)
        if "charset" not in p.meta: warnings["missing <meta charset>"].append(rel)
        if p.h1 != 1: E[f"<h1> count is not 1"].append(f"{rel} ({p.h1})")
        for k in ("og:title", "og:description", "og:image"):
            if indexable and not p.meta.get(k): warnings[f"missing {k}"].append(rel)
        og = p.meta.get("og:image", "")
        if og and og.startswith(SITE) and not target_exists(og, rel): errors["og:image file missing"].append(f"{rel}: {og}")
        for img in p.imgs:
            if "alt" not in img: E["image without alt attribute"].append(f"{rel}: {img.get('src','')[:60]}")
        for ref in p.refs + p.links:
            if ref.startswith("http://") and "localhost" not in ref and ref in p.refs: E["mixed content (http:// asset)"].append(f"{rel}: {ref[:70]}")
            if not target_exists(ref, rel): E["broken internal link or asset"].append(f"{rel}: {ref[:80]}")
        for block in p.ld:
            try:
                data = json.loads(block)
            except Exception:
                E["invalid JSON-LD"].append(rel); continue
            nodes = data.get("@graph", [data]) if isinstance(data, dict) else data
            for n in nodes if isinstance(nodes, list) else [nodes]:
                if isinstance(n, dict) and n.get("@type") in ("MobileApplication", "SoftwareApplication"):
                    for k in ("name", "operatingSystem", "applicationCategory", "offers"):
                        if not n.get(k): E[f"app schema missing {k}"].append(rel)
                    if not n.get("aggregateRating"): warnings["app schema has no aggregateRating (no star rich result possible)"].append(rel)
        if p.size > 300_000: warnings["HTML over 300 KB"].append(f"{rel} ({p.size // 1024} KB)")
        # hreflang
        if p.hreflang:
            langs = dict(p.hreflang)
            if page_url(rel) not in langs.values(): errors["hreflang set does not include the page itself"].append(rel)
            if "x-default" not in langs: warnings["hreflang without x-default"].append(rel)
            if p.lang and langs.get(p.lang) not in (page_url(rel), None):
                errors["hreflang for the page's own lang points elsewhere"].append(rel)
            for hl, href in p.hreflang:
                other = url_to_rel.get(href)
                if not other: errors["hreflang target does not exist"].append(f"{rel} -> {href}"); continue
                if hl != "x-default" and page_url(rel) not in dict(pages[other].hreflang).values():
                    errors["hreflang not reciprocal"].append(f"{rel} -> {other}")

    for t, rs in titles.items():
        if len(rs) > 1: errors["duplicate title"].append(f"{t!r}: {', '.join(rs)}")
    for d, rs in descs.items():
        if len(rs) > 1: errors["duplicate description"].append(", ".join(rs))

    # sitemap and robots
    sm = open(os.path.join(DIST, "sitemap.xml")).read()
    locs = re.findall(r"<loc>([^<]+)</loc>", sm)
    for u in locs:
        r = url_to_rel.get(u)
        if not r: errors["sitemap URL has no page"].append(u)
        elif "noindex" in pages[r].meta.get("robots", ""): errors["noindex page in sitemap"].append(u)
    for rel, p in pages.items():
        if rel != "404.html" and "noindex" not in p.meta.get("robots", "") and page_url(rel) not in locs:
            errors["indexable page missing from sitemap"].append(rel)
    robots = open(os.path.join(DIST, "robots.txt")).read()
    if f"Sitemap: {SITE}/sitemap.xml" not in robots: errors["robots.txt has no Sitemap line"].append("robots.txt")
    if re.search(r"^Disallow:\s*/\s*$", robots, re.M): errors["robots.txt blocks the whole site"].append("robots.txt")

    n_err = sum(len(v) for v in errors.values()); n_warn = sum(len(v) for v in warnings.values())
    print(f"Audited {len(pages)} pages, {len(locs)} sitemap URLs: {n_err} errors, {n_warn} warnings\n")
    for title, group in (("ERRORS", errors), ("WARNINGS", warnings)):
        for k, v in sorted(group.items(), key=lambda x: -len(x[1])):
            print(f"{title[:-1]}: {k} ({len(v)})")
            for x in v[:6]: print(f"    {x}")
            if len(v) > 6: print(f"    … {len(v) - 6} more")
    if "--json" in sys.argv:
        json.dump({"pages": len(pages), "sitemap": len(locs), "errors": errors, "warnings": warnings},
                  open(sys.argv[sys.argv.index("--json") + 1], "w"), indent=1)
    return 1 if n_err else 0


if __name__ == "__main__":
    sys.exit(main())
