#!/usr/bin/env python3
"""
PaddlePilot — build-time OpenStreetMap launch / hazard / portage / water database.

Fetches OSM features for the United States + Canada from the public Overpass API
(tile by tile, cached on disk), normalises them to PaddlePilot's `Launch` / `Hazard`
/ `Portage` / `WaterSummary` shapes, groups launches into named "waters", and
writes:

  PaddlePilot/Resources/OSMData/launchdb.json.zlib   raw-DEFLATE compressed JSON
  PaddlePilot/Resources/OSMData/launchdb-meta.json   build info, counts, ODbL notice
  PaddlePilot/Resources/OSMData/demo_eno.json        reviewer Demo Trip reach (Eno River, NC)

Python 3.9+, standard library only. See README.md next to this file for usage,
schema and licence notes. Data © OpenStreetMap contributors, ODbL 1.0.
"""

import argparse
import concurrent.futures
import datetime
import gzip
import hashlib
import json
import math
import os
import re
import sys
import threading
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
import zlib

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.normpath(os.path.join(HERE, "..", ".."))
CACHE_DIR = os.path.join(HERE, ".cache")
TILE_CACHE = os.path.join(CACHE_DIR, "tiles")
OUT_DIR = os.path.join(REPO, "PaddlePilot", "Resources", "OSMData")

USER_AGENT = "PaddlePilot-pipeline/1.0 (info@orlproducts.com)"
ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    # Back-end hosts of overpass-api.de; used only when the dispatcher above is overloaded.
    "https://lz4.overpass-api.de/api/interpreter",
    "https://z.overpass-api.de/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
]
SCHEMA_VERSION = 1
QUERY_VERSION = "q3"          # bump to invalidate the tile cache when the query changes
QUERY_TIMEOUT = 300           # seconds, Overpass [timeout:] (larger values get 504s when busy)
QUERY_MAXSIZE = 512 * 1024 * 1024
MAX_SPLIT_DEPTH = 3
WATER_RADIUS_M = 200          # launch → named water association radius
AMENITY_RADIUS_M = 150        # launch → nearby parking / toilets
SIZE_BUDGET_BYTES = 15 * 1024 * 1024

ODBL_ATTRIBUTION = (
    "Contains information from OpenStreetMap (© OpenStreetMap contributors), which is made "
    "available under the Open Database License (ODbL) 1.0: https://opendatacommons.org/licenses/odbl/1-0/ . "
    "See https://www.openstreetmap.org/copyright . This derivative database (launches, hazards, "
    "portages, waters) is itself licensed under the ODbL 1.0."
)

# --------------------------------------------------------------------------------------
# Tiling
# --------------------------------------------------------------------------------------

# (name, south, north, west, east, dlat, dlon)
REGIONS = [
    ("conus", 24.0, 50.0, -125.0, -65.0, 3.0, 4.0),
    ("ca-south", 50.0, 56.0, -141.0, -52.0, 6.0, 8.0),
    ("ca-mid", 56.0, 62.0, -141.0, -52.0, 6.0, 12.0),
    ("alaska", 50.0, 62.0, -180.0, -141.0, 6.0, 13.0),
    ("north", 62.0, 72.0, -170.0, -52.0, 10.0, 20.0),
    ("arctic", 72.0, 84.0, -141.0, -52.0, 12.0, 30.0),
    ("hawaii", 18.5, 22.5, -161.0, -154.5, 4.0, 6.5),
]

# Rough state / province boxes used to prioritise and report coverage (not to filter data).
PRIORITY = {
    "NC": (33.8, -84.4, 36.6, -75.4), "VA": (36.5, -83.7, 39.5, -75.2), "MN": (43.5, -97.3, 49.4, -89.5),
    "WI": (42.5, -92.9, 47.1, -86.2), "MI": (41.7, -90.5, 48.3, -82.1), "NY": (40.5, -79.8, 45.1, -71.8),
    "PA": (39.7, -80.6, 42.3, -74.7), "FL": (24.4, -87.7, 31.0, -79.9), "TX": (25.8, -106.7, 36.5, -93.5),
    "WA": (45.5, -124.9, 49.0, -116.9), "OR": (41.9, -124.6, 46.3, -116.4), "CA": (32.5, -124.5, 42.0, -114.1),
    "MO": (36.0, -95.8, 40.6, -89.1), "ON": (41.6, -95.2, 56.9, -74.3), "QC": (45.0, -79.8, 62.6, -57.1),
    "BC": (48.2, -139.1, 60.0, -114.0),
}

# Approximate US–Mexico border, west → east, (lon, lat). Used only to drop features clearly
# south of it (with a 0.15° tolerance, so features on the Rio Grande are kept).
MX_BORDER = [(-117.12, 32.53), (-114.81, 32.49), (-111.07, 31.33), (-108.21, 31.33), (-108.2, 31.78),
             (-106.53, 31.78), (-105.4, 31.06), (-104.37, 29.56), (-103.16, 28.98), (-102.68, 29.75),
             (-101.56, 29.81), (-100.9, 29.36), (-100.5, 28.71), (-99.5, 27.5), (-99.27, 26.9),
             (-99.17, 26.56), (-98.82, 26.37), (-98.26, 26.1), (-97.5, 25.9), (-97.14, 25.96)]
# Greenland's west coast at high latitude, (lat, lon threshold): exclude lon > threshold.
GREENLAND = [(59.5, -60.0), (74.0, -60.0), (75.5, -65.0), (76.5, -70.0), (78.0, -73.0), (80.0, -68.0),
             (81.0, -64.0), (82.0, -61.0), (84.5, -60.0)]


def _interp(points, x):
    for (x0, y0), (x1, y1) in zip(points, points[1:]):
        if x0 <= x <= x1:
            t = 0.0 if x1 == x0 else (x - x0) / (x1 - x0)
            return y0 + t * (y1 - y0)
    return None


def mexico_border_lat(lon):
    if lon < MX_BORDER[0][0]:
        return 32.53                 # Pacific: Baja California is south of 32.53
    if lon > MX_BORDER[-1][0]:
        return None                  # Gulf of Mexico / Florida: no land border
    return _interp(MX_BORDER, lon)


def in_us_canada(lat, lon):
    """Coarse US + Canada mask (drops Mexico, Bahamas, Bermuda, Greenland, St-Pierre, Chukotka)."""
    b = mexico_border_lat(lon)
    if b is not None and lat < b - 0.15:
        return False
    if lat < 27.4 and lon > -79.5:                      # Bahamas
        return False
    if lat < 41.0 and lon > -66.0:                      # Bermuda / open Atlantic
        return False
    if 46.7 <= lat <= 47.15 and -56.45 <= lon <= -56.1:  # Saint-Pierre-et-Miquelon (FR)
        return False
    if lat >= 59.5:
        th = _interp(GREENLAND, lat)
        if th is not None and lon > th:
            return False
    if lat > 64.3 and lon < -168.95:                    # Chukotka (RU)
        return False
    return True


class Tile(object):
    __slots__ = ("s", "w", "n", "e", "region")

    def __init__(self, s, w, n, e, region):
        self.s, self.w, self.n, self.e, self.region = s, w, n, e, region

    @property
    def name(self):
        return "t_%g_%g_%g_%g" % (self.s, self.w, self.n, self.e)

    def split(self):
        ml, mo = (self.s + self.n) / 2.0, (self.w + self.e) / 2.0
        return [Tile(self.s, self.w, ml, mo, self.region), Tile(self.s, mo, ml, self.e, self.region),
                Tile(ml, self.w, self.n, mo, self.region), Tile(ml, mo, self.n, self.e, self.region)]

    def intersects(self, s, w, n, e):
        return not (n < self.s or s > self.n or e < self.w or w > self.e)

    def mostly_outside(self):
        # Entire tile south of the Mexican border (all corners and midpoints)?
        for lon in (self.w, (self.w + self.e) / 2.0, self.e):
            b = mexico_border_lat(lon)
            if b is None or self.n >= b - 0.15:
                return False
        return True


def make_tiles():
    tiles = []
    for region, s0, n0, w0, e0, dl, dn in REGIONS:
        lat = s0
        while lat < n0 - 1e-9:
            lat1 = min(n0, lat + dl)
            lon = w0
            while lon < e0 - 1e-9:
                lon1 = min(e0, lon + dn)
                t = Tile(lat, lon, lat1, lon1, region)
                if not t.mostly_outside():
                    tiles.append(t)
                lon = lon1
            lat = lat1

    def prio(t):
        return 0 if any(t.intersects(*b) for b in PRIORITY.values()) else 1
    tiles.sort(key=prio)
    return tiles


# --------------------------------------------------------------------------------------
# Overpass
# --------------------------------------------------------------------------------------

WATER_HAZARD_VALUES = [
    "shallow_water", "shallow", "shoal", "shoals", "tide", "current", "strong_current", "rip_current",
    "undertow", "whirlpool", "rapids", "rapid", "weir", "dam", "low_head_dam", "strainer", "sweeper",
    "submerged_rocks", "rocks", "low_bridge", "dangerous_water", "drowning", "waves", "thin_ice",
]


def tile_query(t):
    pad = 0.02
    xb = "(%.4f,%.4f,%.4f,%.4f)" % (max(-90.0, t.s - pad), max(-180.0, t.w - pad),
                                    min(90.0, t.n + pad), min(180.0, t.e + pad))
    hz = "".join(' nwr[hazard="%s"];' % v for v in WATER_HAZARD_VALUES)
    return (
        "[out:json][timeout:%d][maxsize:%d][bbox:%.4f,%.4f,%.4f,%.4f];\n"
        "(\n"
        " nwr[waterway=access_point];\n"
        " nwr[leisure=slipway];\n"
        ' nwr[canoe=put_in]; nwr[canoe=egress]; nwr[canoe="put_in;egress"];\n'
        ' nwr[whitewater=put_in]; nwr[whitewater=egress]; nwr[whitewater="put_in;egress"];\n'
        ")->.l;\n"
        ".l out meta center;\n"
        "(\n"
        " nwr[waterway=weir]; nwr[waterway=dam];\n"
        " nwr[whitewater=rapid]; nwr[whitewater=hazard];\n"
        "%s\n"
        ")->.h;\n"
        ".h out meta center;\n"
        "(way[canoe=portage]; way[portage=yes]; way[portage=canoe]; node[canoe=portage];)->.p;\n"
        ".p out meta geom;\n"
        # ---- context around launches (explicit, padded bbox so tile edges do not starve it)
        'way(around.l:%d)[waterway~"^(river|stream|canal)$"][name]%s->.rw;\n'
        ".rw out tags geom;\n"
        "way(around.l:%d)[natural=water][name]%s->.lw;\n"
        ".lw out tags geom;\n"
        "rel(around.l:%d)[natural=water][name]%s->.lr;\n"
        ".lr out tags bb;\n"
        "rel(bw.rw)[type=waterway][name]->.rr;\n"
        ".rr out bb;\n"
        "nwr(around.l:%d)[natural=bay][name]%s->.bay;\n"
        ".bay out tags bb;\n"
        "nwr(around.l:%d)[amenity=parking]%s->.pk;\n"
        ".pk out tags center;\n"
        "nwr(around.l:%d)[amenity=toilets]%s->.wc;\n"
        ".wc out tags center;\n"
    ) % (QUERY_TIMEOUT, QUERY_MAXSIZE, t.s, t.w, t.n, t.e, hz,
         WATER_RADIUS_M, xb, WATER_RADIUS_M, xb, WATER_RADIUS_M, xb, 1000, xb,
         AMENITY_RADIUS_M, xb, AMENITY_RADIUS_M, xb)


class OverpassError(Exception):
    def __init__(self, msg, splittable=False):
        Exception.__init__(self, msg)
        self.splittable = splittable


class Overpass(object):
    def __init__(self, endpoints, pause, verbose=True):
        self.endpoints = list(endpoints)
        self.pause = pause
        self.verbose = verbose
        self.lock = threading.Lock()
        self.health = {}

    def log(self, *a):
        if self.verbose:
            with self.lock:
                print(*a, flush=True)

    def status(self, ep):
        """Returns the /api/status text, or None when the endpoint does not answer."""
        try:
            req = urllib.request.Request(ep.replace("/interpreter", "/status"), headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=20) as r:
                return r.read().decode("utf-8", "replace") if r.status == 200 else None
        except Exception:
            return None

    def healthy(self, ep):
        with self.lock:
            if ep in self.health:
                ok, when = self.health[ep]
                if ok or time.time() - when < 600:
                    return ok
        ok = self.status(ep) is not None
        with self.lock:
            first = ep not in self.health or self.health[ep][0] != ok
            self.health[ep] = (ok, time.time())
        if not ok and first:
            self.log("   endpoint unhealthy, skipping for 10 min:", ep)
        return ok

    def slot_wait(self, ep):
        """Seconds until the endpoint has a free slot for us (0 = now, None = unreachable)."""
        st = self.status(ep)
        if st is None:
            return None
        m = re.search(r"(\d+) slots? available now", st)
        if m and int(m.group(1)) > 0:
            return 0
        waits = [int(x) for x in re.findall(r"in (\d+) seconds", st)]
        return min(waits) if waits else 15

    def pick_endpoint(self, max_wait=300):
        """Overpass etiquette: only send a query to an endpoint that reports a free slot for us;
        otherwise sleep until the soonest one frees up. Endpoints are tried in preference order."""
        t_end = time.time() + max_wait
        while True:
            best = None
            for ep in self.endpoints:
                if not self.healthy(ep):
                    continue
                w = self.slot_wait(ep)
                if w is None:
                    continue
                if w == 0:
                    return ep
                if best is None or w < best[0]:
                    best = (w, ep)
            if best is None or time.time() > t_end:
                return best[1] if best else None
            time.sleep(min(60, best[0]) + 1)

    def run(self, query, label):
        data = urllib.parse.urlencode({"data": query}).encode("utf-8")
        last = None
        attempt = 0
        while attempt < 8:
            limited = False
            for _ in range(1):
                ep = self.pick_endpoint()
                if ep is None:
                    break
                t0 = time.time()
                try:
                    req = urllib.request.Request(ep, data=data, headers={
                        "User-Agent": USER_AGENT, "Accept-Encoding": "gzip",
                        "Content-Type": "application/x-www-form-urlencoded"})
                    with urllib.request.urlopen(req, timeout=QUERY_TIMEOUT + 120) as r:
                        raw = r.read()
                        if r.headers.get("Content-Encoding") == "gzip":
                            raw = gzip.decompress(raw)
                    text = raw.decode("utf-8")
                    if not text.lstrip().startswith("{"):
                        if "too busy" in text or "Dispatcher_Client" in text or "rate_limited" in text:
                            raise OverpassError("server busy")
                        raise OverpassError("non-JSON response: " + re.sub(r"<[^>]+>", " ", text)[:200])
                    doc = json.loads(text)
                    remark = doc.get("remark") or ""
                    if "runtime error" in remark or "runtime remark" in remark:
                        split = ("timed out" in remark) or ("out of memory" in remark) or ("memory" in remark)
                        raise OverpassError("remark: " + remark[:200], splittable=split)
                    self.log("   %s ok via %s in %.0fs (%d elements)" % (
                        label, ep.split("/")[2], time.time() - t0, len(doc.get("elements", []))))
                    time.sleep(self.pause)
                    return doc, text
                except OverpassError as e:
                    last = e
                    self.log("   %s: %s (%s)" % (label, e, ep.split("/")[2]))
                    if e.splittable:
                        raise
                except urllib.error.HTTPError as e:
                    last = e
                    if e.code == 400:                    # malformed query: retrying will not help
                        raise OverpassError("HTTP 400 (bad query)")
                    if e.code == 429:
                        self.log("   %s: HTTP 429 from %s, waiting for a slot" % (label, ep.split("/")[2]))
                        limited = True
                        time.sleep(3)
                        continue
                    if e.code in (502, 503, 504):
                        with self.lock:                  # overloaded: skip this endpoint for ~3 min
                            self.health[ep] = (False, time.time() - 420)
                    wait = 20 * (attempt + 1) if e.code in (504, 503, 502) else 10
                    self.log("   %s: HTTP %d from %s, waiting %ds" % (label, e.code, ep.split("/")[2], wait))
                    time.sleep(wait)
                    continue
                except Exception as e:                       # timeouts, resets, JSON errors
                    last = e
                    self.log("   %s: %s from %s" % (label, repr(e)[:160], ep.split("/")[2]))
                    if time.time() - t0 > QUERY_TIMEOUT:
                        raise OverpassError("client timeout", splittable=True)
                time.sleep(5)
            if limited:
                continue
            attempt += 1
            backoff = min(120, 10 * 2 ** attempt)
            self.log("   %s: attempt %d failed, backing off %ds" % (label, attempt, backoff))
            time.sleep(backoff)
        raise OverpassError("giving up: %s" % last, splittable=True)


def cache_path(tile):
    h = hashlib.sha1((QUERY_VERSION + tile_query(tile)).encode("utf-8")).hexdigest()[:10]
    return os.path.join(TILE_CACHE, "%s-%s.json.gz" % (tile.name, h))


def fetch_tile(op, tile, depth, deadline):
    """Returns a list of (tile, path) leaves that are cached on disk, or raises."""
    path = cache_path(tile)
    if os.path.exists(path):
        return [(tile, path)]
    if deadline and time.time() > deadline:
        return []
    try:
        _, text = op.run(tile_query(tile), tile.name)
    except OverpassError as e:
        if e.splittable and depth < MAX_SPLIT_DEPTH:
            op.log("   splitting", tile.name)
            out = []
            for sub in tile.split():
                out.extend(fetch_tile(op, sub, depth + 1, deadline))
            return out
        op.log("   FAILED", tile.name, e)
        return []
    tmp = path + ".tmp"
    with gzip.open(tmp, "wt", encoding="utf-8") as f:
        f.write(text)
    os.replace(tmp, path)
    return [(tile, path)]


def cached_leaves(tile, depth=0):
    """Finds cached results for a tile or (recursively) for all four of its children."""
    path = cache_path(tile)
    if os.path.exists(path):
        return [(tile, path)]
    if depth >= MAX_SPLIT_DEPTH:
        return None
    out = []
    for sub in tile.split():
        r = cached_leaves(sub, depth + 1)
        if r is None:
            return None
        out.extend(r)
    return out


# --------------------------------------------------------------------------------------
# Geometry helpers
# --------------------------------------------------------------------------------------

R_EARTH = 6371008.8


def haversine(a_lat, a_lon, b_lat, b_lon):
    p1, p2 = math.radians(a_lat), math.radians(b_lat)
    dp, dl = p2 - p1, math.radians(b_lon - a_lon)
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R_EARTH * math.asin(min(1.0, math.sqrt(h)))


def seg_dist_m(plat, plon, alat, alon, blat, blon):
    k = math.cos(math.radians(plat)) * 111319.49
    kl = 111132.95
    ax, ay = (alon - plon) * k, (alat - plat) * kl
    bx, by = (blon - plon) * k, (blat - plat) * kl
    dx, dy = bx - ax, by - ay
    l2 = dx * dx + dy * dy
    t = 0.0 if l2 == 0 else max(0.0, min(1.0, -(ax * dx + ay * dy) / l2))
    px, py = ax + t * dx, ay + t * dy
    return math.sqrt(px * px + py * py)


def point_in_ring(lat, lon, ring):
    inside = False
    j = len(ring) - 1
    for i in range(len(ring)):
        yi, xi = ring[i]
        yj, xj = ring[j]
        if (yi > lat) != (yj > lat):
            x = (xj - xi) * (lat - yi) / ((yj - yi) or 1e-12) + xi
            if lon < x:
                inside = not inside
        j = i
    return inside


def line_length(pts):
    return sum(haversine(a[0], a[1], b[0], b[1]) for a, b in zip(pts, pts[1:]))


def point_along(pts, meters):
    rem = meters
    for a, b in zip(pts, pts[1:]):
        d = haversine(a[0], a[1], b[0], b[1])
        if d > 0 and rem <= d:
            t = rem / d
            return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
        rem -= d
    return pts[-1]


def r5(x):
    return round(x, 5)


# --------------------------------------------------------------------------------------
# Tag normalisation
# --------------------------------------------------------------------------------------

PAVED = {"concrete", "asphalt", "paved", "paving_stones", "concrete:plates", "concrete:lanes", "metal", "wood",
         "sett", "bricks"}
BEACHY = {"sand", "pebblestone", "shingle", "shells"}
NATURAL = {"ground", "dirt", "earth", "grass", "mud", "gravel", "fine_gravel", "unpaved", "rock", "compacted",
           "stone", "rocks"}


PADDLE_NAME = re.compile(r"(?i)\b(paddle|canoe|kayak|carry[- ]?in|hand[- ]?launch|put[- ]?in)\b")


def multi(v):
    return set(x.strip() for x in (v or "").split(";") if x.strip())


def is_launch(t):
    if t.get("waterway") == "access_point" or t.get("leisure") == "slipway":
        return True
    c, w = multi(t.get("canoe")), multi(t.get("whitewater"))
    return bool((c | w) & {"put_in", "egress"})


def launch_kind(t):
    vals = multi(t.get("canoe")) | multi(t.get("whitewater"))
    put, egress = "put_in" in vals, "egress" in vals
    surf = (t.get("surface") or "").lower()
    if t.get("leisure") == "slipway":
        if surf in BEACHY:
            return "beach"
        if surf in NATURAL:
            return "slipway"
        if surf in PAVED:
            return "ramp"
        # Untagged surface: hand-launch sites ("Paddle Access", canoe=yes + trailer=no) are canoe launches.
        if PADDLE_NAME.search(t.get("name") or "") or (
                (t.get("canoe") in ("yes", "designated") or t.get("kayak") in ("yes", "designated"))
                and (t.get("trailer") == "no" or t.get("motorboat") == "no")):
            return "accessPoint"
        return "ramp"
    if egress and not put and t.get("waterway") != "access_point":
        return "takeOut"
    if t.get("natural") == "beach" or surf in BEACHY:
        return "beach"
    ap = (t.get("access_point") or "").lower()
    if t.get("man_made") in ("pier", "jetty") or t.get("floating") == "yes" or ap in ("dock", "pier", "floating_dock", "pontoon"):
        return "dock"
    if ap in ("ramp", "slipway"):
        return "ramp"
    if ap == "beach":
        return "beach"
    if surf in NATURAL or ap == "bank":
        return "bank"
    return "accessPoint"


def parse_height_m(v):
    if not v:
        return None
    s = v.strip().lower().replace(",", ".")
    m = re.match(r"^([0-9]+(?:\.[0-9]+)?)\s*(m|meters?|metres?|ft|feet|')?\s*$", s)
    if not m:
        return None
    x = float(m.group(1))
    if m.group(2) in ("ft", "feet", "'"):
        x *= 0.3048
    return x


def is_low_head(t):
    dt = (t.get("dam:type") or t.get("dam") or "").lower()
    if dt in ("low_head", "lowhead", "low-head", "weir", "overflow", "run_of_river", "run-of-river"):
        return True
    if t.get("low_head") == "yes" or t.get("hazard") == "low_head_dam":
        return True
    name = (t.get("name") or "").lower()
    if "low head" in name or "lowhead" in name or "low-head" in name:
        return True
    h = parse_height_m(t.get("height"))
    return h is not None and h <= 4.6


HAZARD_TAG_KIND = {
    "shallow_water": "shallow", "shallow": "shallow", "shoal": "shallow", "shoals": "shallow",
    "rapids": "rapid", "rapid": "rapid", "weir": "weir", "low_head_dam": "lowHeadDam", "dam": "dam",
    "strainer": "strainer", "sweeper": "strainer", "low_bridge": "bridge", "submerged_rocks": "shallow",
    "rocks": "shallow",
}


def hazard_kind(t):
    ww = t.get("waterway")
    if ww == "weir":
        return "weir"
    if ww == "dam":
        return "lowHeadDam" if is_low_head(t) else "dam"
    wh = t.get("whitewater")
    if wh == "rapid":
        return "rapid"
    hz = t.get("hazard")
    if hz in WATER_HAZARD_VALUES:
        k = HAZARD_TAG_KIND.get(hz, "other")
        if k == "dam" and is_low_head(t):
            k = "lowHeadDam"
        return k
    if wh == "hazard":
        return "other"
    return None


def is_portage(e):
    t = e.get("tags", {})
    if t.get("canoe") == "portage":
        return True
    return e["type"] == "way" and t.get("portage") in ("yes", "canoe")


def edited_at(e):
    t = e.get("tags", {})
    for k in ("check_date", "survey:date", "survey_date", "check_date:slipway"):
        v = t.get(k)
        if v and re.match(r"^\d{4}(-\d{2}(-\d{2})?)?$", v.strip()):
            return v.strip()
    ts = e.get("timestamp")
    return ts[:10] if ts else None


def element_point(e):
    if "lat" in e and "lon" in e:
        return e["lat"], e["lon"]
    c = e.get("center")
    if c:
        return c["lat"], c["lon"]
    g = e.get("geometry")
    if g:
        pts = [(p["lat"], p["lon"]) for p in g if p]
        return sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)
    b = e.get("bounds")
    if b:
        return (b["minlat"] + b["maxlat"]) / 2.0, (b["minlon"] + b["maxlon"]) / 2.0
    return None


def eid(e):
    return e["type"][0] + str(e["id"])


def clean(v, maxlen=120):
    if v is None:
        return None
    v = " ".join(str(v).split())
    return v[:maxlen] if v else None


def water_kind_for_area(t):
    w = (t.get("water") or "").lower()
    if w in ("river", "canal", "stream", "ditch", "rapids", "riverbank", "stream_pool"):
        return "river"
    if w in ("lagoon", "bay", "cove", "sea", "estuary", "tidal"):
        return "coast"
    return "lake"


# --------------------------------------------------------------------------------------
# Per-tile processing
# --------------------------------------------------------------------------------------

class Builder(object):
    def __init__(self):
        self.launches = {}      # id -> record
        self.hazards = {}
        self.portages = {}
        self.cands = {}         # launch id -> (dist, elem key)
        self.elems = {}         # elem key -> {n, k, rel, bb, ends}
        self.rels = {}          # waterway relation key -> {n, bb}
        self.osm_ts = None
        self.dropped_private = 0
        self.dropped_outside = 0

    def add_tile(self, path):
        with gzip.open(path, "rt", encoding="utf-8") as f:
            doc = json.load(f)
        ts = (doc.get("osm3s") or {}).get("timestamp_osm_base")
        if ts and (self.osm_ts is None or ts < self.osm_ts):
            self.osm_ts = ts
        els = doc.get("elements", [])

        tile_launches = []
        rivers, lake_ways, lake_rels, bays, parkings, toilets = [], [], [], [], [], []
        way_rel = {}
        for e in els:
            t = e.get("tags") or {}
            typ = e["type"]
            if is_launch(t) and "timestamp" in e:
                rec = self._launch(e)
                if rec:
                    tile_launches.append(rec)
                    continue
            if "timestamp" in e and hazard_kind(t):
                self._hazard(e)
                continue
            if "timestamp" in e and is_portage(e):
                self._portage(e)
                continue
            if typ == "relation" and t.get("type") == "waterway" and t.get("name"):
                key = eid(e)
                b = e.get("bounds")
                self.rels[key] = {"n": clean(t["name"]), "bb": b and (b["minlat"], b["minlon"], b["maxlat"], b["maxlon"])}
                for m in e.get("members", []):
                    if m.get("type") == "way":
                        way_rel["w" + str(m["ref"])] = key
                continue
            if is_launch(t):
                continue                     # a launch mapped as an area/line is not a water
            if t.get("waterway") in ("river", "stream", "canal") and t.get("name") and e.get("geometry"):
                rivers.append(e)
            elif t.get("natural") == "water" and t.get("name"):
                (lake_ways if typ == "way" else lake_rels).append(e)
            elif t.get("natural") == "bay" and t.get("name"):
                bays.append(e)
            elif t.get("amenity") == "parking":
                p = element_point(e)
                if p:
                    parkings.append((p, t))
            elif t.get("amenity") == "toilets":
                p = element_point(e)
                if p:
                    toilets.append(p)

        if not tile_launches:
            return
        self._associate(tile_launches, rivers, lake_ways, lake_rels, bays, way_rel)
        self._amenities(tile_launches, parkings, toilets)

    # -- records -------------------------------------------------------------------

    def _launch(self, e):
        t = e.get("tags") or {}
        p = element_point(e)
        if not p:
            return None
        if not in_us_canada(*p):
            self.dropped_outside += 1
            return None
        if (t.get("access") in ("private", "no") or t.get("boat") == "private") and t.get("canoe") not in ("yes", "designated", "put_in", "egress"):
            self.dropped_private += 1
            return None
        key = eid(e)
        if key in self.launches:
            return self.launches[key]
        rec = {"i": key, "k": launch_kind(t), "a": r5(p[0]), "o": r5(p[1])}
        name = clean(t.get("name") or t.get("official_name"))
        if name:
            rec["n"] = name
        if t.get("parking"):
            rec["p"] = clean(t["parking"], 40)
        cap = t.get("capacity:car") or t.get("capacity") or t.get("capacity:trailer")
        if cap:
            rec["c"] = clean(cap, 20)
        for src, dst in (("fee", "f"), ("surface", "s"), ("toilets", "t"), ("wheelchair", "x"),
                         ("opening_hours", "r"), ("seasonal", "z")):
            if t.get(src):
                rec[dst] = clean(t[src], 80)
        ed = edited_at(e)
        if ed:
            rec["e"] = ed
        rec["_tags"] = len(t)
        self.launches[key] = rec
        return rec

    def _hazard(self, e):
        t = e.get("tags") or {}
        p = element_point(e)
        if not p:
            return
        if not in_us_canada(*p):
            self.dropped_outside += 1
            return
        key = eid(e)
        if key in self.hazards:
            return
        rec = {"i": key, "k": hazard_kind(t), "a": r5(p[0]), "o": r5(p[1])}
        name = clean(t.get("name"))
        if name:
            rec["n"] = name
        ed = edited_at(e)
        if ed:
            rec["e"] = ed
        self.hazards[key] = rec

    def _portage(self, e):
        t = e.get("tags") or {}
        key = eid(e)
        if key in self.portages:
            return
        if e["type"] == "way":
            pts = [(g["lat"], g["lon"]) for g in (e.get("geometry") or []) if g]
            if len(pts) < 2:
                return
            length = line_length(pts)
            mid = point_along(pts, length / 2.0)
        else:
            if "lat" not in e:
                return
            mid, length = (e["lat"], e["lon"]), None
        if not in_us_canada(*mid):
            self.dropped_outside += 1
            return
        rec = {"i": key, "a": r5(mid[0]), "o": r5(mid[1])}
        name = clean(t.get("name"))
        if name:
            rec["n"] = name
        if length is not None:
            rec["m"] = int(round(length))
        ed = edited_at(e)
        if ed:
            rec["e"] = ed
        self.portages[key] = rec

    # -- water association ---------------------------------------------------------

    def _associate(self, launches, rivers, lake_ways, lake_rels, bays, way_rel):
        CELL = 0.005
        grid = {}

        def add_line(key, pts):
            for a, b in zip(pts, pts[1:]):
                la0, la1 = int(math.floor(min(a[0], b[0]) / CELL)), int(math.floor(max(a[0], b[0]) / CELL))
                lo0, lo1 = int(math.floor(min(a[1], b[1]) / CELL)), int(math.floor(max(a[1], b[1]) / CELL))
                if (la1 - la0 + 1) * (lo1 - lo0 + 1) > 400:      # absurdly long segment: index ends only
                    for c in ((la0, lo0), (la1, lo1)):
                        grid.setdefault(c, []).append((key, a, b))
                    continue
                for i in range(la0, la1 + 1):
                    for j in range(lo0, lo1 + 1):
                        grid.setdefault((i, j), []).append((key, a, b))

        polys = {}
        for e in rivers:
            t = e["tags"]
            key = eid(e)
            pts = [(g["lat"], g["lon"]) for g in e["geometry"] if g]
            if len(pts) < 2:
                continue
            if key not in self.elems:
                self.elems[key] = {"n": clean(t["name"]), "k": "river", "rel": way_rel.get(key),
                                   "bb": _bb(pts), "ends": (_ck(pts[0]), _ck(pts[-1]))}
            elif way_rel.get(key) and not self.elems[key]["rel"]:
                self.elems[key]["rel"] = way_rel[key]
            add_line(key, pts)
        for e in lake_ways:
            t = e["tags"]
            key = eid(e)
            pts = [(g["lat"], g["lon"]) for g in (e.get("geometry") or []) if g]
            if len(pts) < 3:
                continue
            if key not in self.elems:
                self.elems[key] = {"n": clean(t["name"]), "k": water_kind_for_area(t), "rel": None,
                                   "bb": _bb(pts), "ends": None}
            add_line(key, pts)
            if pts[0] == pts[-1]:
                polys[key] = pts
        rel_boxes = []
        for e in lake_rels:
            b = e.get("bounds")
            if not b:
                continue
            key = eid(e)
            bb = (b["minlat"], b["minlon"], b["maxlat"], b["maxlon"])
            if key not in self.elems:
                self.elems[key] = {"n": clean(e["tags"]["name"]), "k": water_kind_for_area(e["tags"]),
                                   "rel": None, "bb": bb, "ends": None}
            rel_boxes.append((key, bb))
        bay_list = []
        for e in bays:
            key = eid(e)
            if "lat" in e:
                bb = (e["lat"], e["lon"], e["lat"], e["lon"])
            elif e.get("bounds"):
                b = e["bounds"]
                bb = (b["minlat"], b["minlon"], b["maxlat"], b["maxlon"])
            else:
                continue
            if key not in self.elems:
                self.elems[key] = {"n": clean(e["tags"]["name"]), "k": "coast", "rel": None, "bb": bb, "ends": None}
            bay_list.append((key, bb))

        for rec in launches:
            lat, lon = rec["a"], rec["o"]
            best_d, best_k = None, None
            ci, cj = int(math.floor(lat / CELL)), int(math.floor(lon / CELL))
            seen = {}
            for i in (ci - 1, ci, ci + 1):
                for j in (cj - 1, cj, cj + 1):
                    for key, a, b in grid.get((i, j), ()):
                        d = seg_dist_m(lat, lon, a[0], a[1], b[0], b[1])
                        if d < seen.get(key, 1e18):
                            seen[key] = d
            for key in list(seen):
                pts = polys.get(key)
                if pts is not None and point_in_ring(lat, lon, pts):
                    seen[key] = 0.0
            for key, d in seen.items():
                if d <= WATER_RADIUS_M and (best_d is None or d < best_d):
                    best_d, best_k = d, key
            if best_k is None:
                # Fallbacks without exact geometry: named lake relations, then named bays.
                pad = 0.002
                for coll, dist in ((rel_boxes, 150.0), (bay_list, 400.0)):
                    pick, area = None, None
                    for key, bb in coll:
                        if bb[0] == bb[2]:          # node bay: radius test
                            d = haversine(lat, lon, bb[0], bb[1])
                            ok = d <= 1000
                        else:
                            ok = bb[0] - pad <= lat <= bb[2] + pad and bb[1] - pad <= lon <= bb[3] + pad
                        if ok:
                            ar = (bb[2] - bb[0]) * (bb[3] - bb[1])
                            if area is None or ar < area:
                                pick, area = key, ar
                    if pick:
                        best_d, best_k = dist, pick
                        break
            if best_k is not None:
                prev = self.cands.get(rec["i"])
                if prev is None or best_d < prev[0]:
                    self.cands[rec["i"]] = (best_d, best_k)

    def _amenities(self, launches, parkings, toilets):
        CELL = 0.01
        pg, tg = {}, {}
        for p, t in parkings:
            pg.setdefault((int(math.floor(p[0] / CELL)), int(math.floor(p[1] / CELL))), []).append((p, t))
        for p in toilets:
            tg.setdefault((int(math.floor(p[0] / CELL)), int(math.floor(p[1] / CELL))), []).append(p)
        for rec in launches:
            lat, lon = rec["a"], rec["o"]
            ci, cj = int(math.floor(lat / CELL)), int(math.floor(lon / CELL))
            if "p" not in rec:
                best = None
                for i in (ci - 1, ci, ci + 1):
                    for j in (cj - 1, cj, cj + 1):
                        for p, t in pg.get((i, j), ()):
                            d = haversine(lat, lon, p[0], p[1])
                            if d <= AMENITY_RADIUS_M and (best is None or d < best[0]):
                                best = (d, t)
                if best:
                    t = best[1]
                    if t.get("access") in ("private", "no", "customers"):
                        pass
                    else:
                        rec["p"] = "nearby"
                        cap = t.get("capacity")
                        if cap and "c" not in rec:
                            rec["c"] = clean(cap, 20)
                        if "f" not in rec and t.get("fee"):
                            rec["pf"] = clean(t["fee"], 40)
            if "t" not in rec:
                for i in (ci - 1, ci, ci + 1):
                    for j in (cj - 1, cj, cj + 1):
                        for p in tg.get((i, j), ()):
                            if haversine(lat, lon, p[0], p[1]) <= AMENITY_RADIUS_M:
                                rec["t"] = "nearby"
                                break

    # -- finishing -----------------------------------------------------------------

    def dedupe(self):
        """Hide near-duplicates (same feature mapped as node + way): launches ≤ 25 m, dams/weirs ≤ 40 m."""
        def run(records, radius, cls):
            CELL = 0.002
            grid = {}
            order = sorted(records.values(), key=lambda r: (-(("n" in r) * 1000 + r.get("_tags", 0)), r["i"]))
            keep = {}
            removed = 0
            for r in order:
                ci, cj = int(math.floor(r["a"] / CELL)), int(math.floor(r["o"] / CELL))
                dup = False
                for i in (ci - 1, ci, ci + 1):
                    for j in (cj - 1, cj, cj + 1):
                        for o in grid.get((i, j), ()):
                            if cls(o) == cls(r) and haversine(r["a"], r["o"], o["a"], o["o"]) <= radius:
                                dup = True
                                break
                        if dup:
                            break
                    if dup:
                        break
                if dup:
                    removed += 1
                    continue
                grid.setdefault((ci, cj), []).append(r)
                keep[r["i"]] = r
            return keep, removed

        self.launches, ld = run(self.launches, 25.0, lambda r: "launch")
        damish = lambda r: "dam" if r["k"] in ("dam", "lowHeadDam", "weir") else r["k"]
        self.hazards, hd = run(self.hazards, 40.0, damish)
        return ld, hd

    def group_waters(self):
        ids = [k for k in self.launches if k in self.cands]
        parent = {k: k for k in ids}

        def find(x):
            while parent[x] != x:
                parent[x] = parent[parent[x]]
                x = parent[x]
            return x

        def union(a, b):
            ra, rb = find(a), find(b)
            if ra != rb:
                parent[max(ra, rb)] = min(ra, rb)

        # 1. same primary key (waterway relation, else the matched element)
        by_key = {}
        for k in ids:
            el = self.elems[self.cands[k][1]]
            pk = el["rel"] or self.cands[k][1]
            by_key.setdefault(pk, []).append(k)
        # 2. same-name river ways that touch
        end_map = {}
        for ek, el in self.elems.items():
            if el["ends"]:
                for c in el["ends"]:
                    end_map.setdefault((_norm(el["n"]), c), []).append(ek)
        elem_parent = {}

        def efind(x):
            while elem_parent.get(x, x) != x:
                x = elem_parent[x]
            return x
        for lst in end_map.values():
            for o in lst[1:]:
                ra, rb = efind(lst[0]), efind(o)
                if ra != rb:
                    elem_parent[rb] = ra
        by_ekey = {}
        for k in ids:
            ek = self.cands[k][1]
            el = self.elems[ek]
            if el["ends"]:
                by_ekey.setdefault(efind(ek), []).append(k)
        for groups in (by_key, by_ekey):
            for lst in groups.values():
                for o in lst[1:]:
                    union(lst[0], o)
        # 3. same name + same kind, launches within 8 km (rivers) / 3 km (lakes, coast)
        CELL = 0.1
        buckets = {}
        for k in ids:
            el = self.elems[self.cands[k][1]]
            buckets.setdefault((_norm(el["n"]), el["k"]), []).append(k)
        for (name, kind), lst in buckets.items():
            if len(lst) < 2:
                continue
            radius = 8000.0 if kind == "river" else 3000.0
            grid = {}
            for k in lst:
                r = self.launches[k]
                grid.setdefault((int(math.floor(r["a"] / CELL)), int(math.floor(r["o"] / CELL))), []).append(k)
            for k in lst:
                r = self.launches[k]
                ci, cj = int(math.floor(r["a"] / CELL)), int(math.floor(r["o"] / CELL))
                for i in (ci - 1, ci, ci + 1):
                    for j in (cj - 1, cj, cj + 1):
                        for o in grid.get((i, j), ()):
                            if o != k and find(o) != find(k):
                                q = self.launches[o]
                                if haversine(r["a"], r["o"], q["a"], q["o"]) <= radius:
                                    union(k, o)
        # 4. lakes / coast: same-named water elements whose extents overlap (arms of one reservoir)
        for (name, kind), lst in buckets.items():
            if kind == "river" or len(lst) < 2:
                continue
            by_elem = {}
            for k in lst:
                by_elem.setdefault(self.cands[k][1], k)
            elems = list(by_elem.items())
            if len(elems) > 2000:
                continue
            pad = 0.01
            for x in range(len(elems)):
                bx = self.elems[elems[x][0]]["bb"]
                for y in range(x + 1, len(elems)):
                    by = self.elems[elems[y][0]]["bb"]
                    if not (by[2] + pad < bx[0] or by[0] - pad > bx[2] or by[3] + pad < bx[1] or by[1] - pad > bx[3]):
                        union(elems[x][1], elems[y][1])

        groups = {}
        for k in ids:
            groups.setdefault(find(k), []).append(k)

        waters = []
        for members in groups.values():
            names, kinds, rels, ekeys = {}, {}, {}, {}
            lat0, lon0, lat1, lon1 = 90.0, 180.0, -90.0, -180.0
            for k in members:
                ek = self.cands[k][1]
                el = self.elems[ek]
                nm = el["n"]
                if el["rel"] and self.rels.get(el["rel"], {}).get("n"):
                    nm = self.rels[el["rel"]]["n"]
                    rels[el["rel"]] = rels.get(el["rel"], 0) + 1
                names[nm] = names.get(nm, 0) + 1
                kinds[el["k"]] = kinds.get(el["k"], 0) + 1
                ekeys[ek] = ekeys.get(ek, 0) + 1
                r = self.launches[k]
                lat0, lon0, lat1, lon1 = min(lat0, r["a"]), min(lon0, r["o"]), max(lat1, r["a"]), max(lon1, r["o"])
            kind = max(kinds.items(), key=lambda kv: (kv[1], kv[0]))[0]
            name = max(names.items(), key=lambda kv: (kv[1], kv[0]))[0]
            if rels:
                wid = max(rels.items(), key=lambda kv: (kv[1], kv[0]))[0]
            else:
                wid = max(ekeys.items(), key=lambda kv: (kv[1], kv[0]))[0]
            if kind in ("lake",):
                # include the lake's own extent (when it is not continental-scale)
                for ek in ekeys:
                    bb = self.elems[ek]["bb"]
                    if bb and (bb[2] - bb[0]) < 3 and (bb[3] - bb[1]) < 3:
                        lat0, lon0, lat1, lon1 = min(lat0, bb[0]), min(lon0, bb[1]), max(lat1, bb[2]), max(lon1, bb[3])
            mlat = sum(self.launches[k]["a"] for k in members) / len(members)
            mlon = sum(self.launches[k]["o"] for k in members) / len(members)
            medoid = min(members, key=lambda k: haversine(mlat, mlon, self.launches[k]["a"], self.launches[k]["o"]))
            waters.append({"i": wid, "n": name, "k": kind,
                           "a": self.launches[medoid]["a"], "o": self.launches[medoid]["o"],
                           "b": [r5(lat0), r5(lon0), r5(lat1), r5(lon1)],
                           "_m": members})
        # unique ids (a relation can only own one group, but be defensive)
        seen = {}
        for w in waters:
            if w["i"] in seen:
                seen[w["i"]] += 1
                w["i"] = "%s-%d" % (w["i"], seen[w["i"]])
            else:
                seen[w["i"]] = 1
        waters.sort(key=lambda w: (-len(w["_m"]), w["n"]))
        return waters


def _bb(pts):
    return (min(p[0] for p in pts), min(p[1] for p in pts), max(p[0] for p in pts), max(p[1] for p in pts))


def _ck(p):
    return (round(p[0], 7), round(p[1], 7))


def _norm(s):
    s = unicodedata.normalize("NFKD", s or "")
    s = "".join(c for c in s if not unicodedata.combining(c)).lower()
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


# --------------------------------------------------------------------------------------
# Output
# --------------------------------------------------------------------------------------

def raw_deflate(data):
    # Apple's COMPRESSION_ZLIB / NSData.CompressionAlgorithm.zlib is RFC 1951 raw DEFLATE
    # (no zlib header, no Adler-32 trailer): wbits = -15.
    c = zlib.compressobj(9, zlib.DEFLATED, -15, 9)
    return c.compress(data) + c.flush()


def build_db(b, leaves, tiles_total, failed, args):
    for _, path in leaves:
        b.add_tile(path)
    ld, hd = b.dedupe()
    waters = b.group_waters()

    launches = sorted(b.launches.values(), key=lambda r: (r["a"], r["o"]))
    index = {r["i"]: n for n, r in enumerate(launches)}
    out_waters = []
    for wi, w in enumerate(waters):
        idx = sorted(index[k] for k in w["_m"] if k in index)
        if not idx:
            continue
        for i in idx:
            launches[i]["w"] = len(out_waters)
        rec = {k: v for k, v in w.items() if not k.startswith("_")}
        rec["l"] = idx
        out_waters.append(rec)
    for r in launches:
        r.pop("_tags", None)
    hazards = sorted(b.hazards.values(), key=lambda r: (r["a"], r["o"]))
    for r in hazards:
        r.pop("_tags", None)
    portages = sorted(b.portages.values(), key=lambda r: (r["a"], r["o"]))

    db = {"v": SCHEMA_VERSION, "ts": b.osm_ts, "l": launches, "h": hazards, "p": portages, "w": out_waters}
    raw = json.dumps(db, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    comp = raw_deflate(raw)

    os.makedirs(OUT_DIR, exist_ok=True)
    with open(os.path.join(OUT_DIR, "launchdb.json.zlib"), "wb") as f:
        f.write(comp)

    def count(items, key):
        c = {}
        for r in items:
            c[r[key]] = c.get(r[key], 0) + 1
        return dict(sorted(c.items()))

    water_kinds = count(out_waters, "k")
    with_water = sum(1 for r in launches if "w" in r)
    coverage = {}
    for st, bb in PRIORITY.items():
        tiles = [t for t in make_tiles() if t.intersects(*bb)]
        ok = sum(1 for t in tiles if cached_leaves(t) is not None)
        coverage[st] = "%d/%d tiles" % (ok, len(tiles))

    meta = {
        "schemaVersion": SCHEMA_VERSION,
        "buildDate": datetime.datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
        "osmDataTimestamp": b.osm_ts,
        "source": "OpenStreetMap via Overpass API (%s)" % ", ".join(e.split("/")[2] for e in ENDPOINTS),
        "attribution": "© OpenStreetMap contributors",
        "attributionURL": "https://www.openstreetmap.org/copyright",
        "license": "ODbL-1.0",
        "licenseText": ODBL_ATTRIBUTION,
        "compression": "raw DEFLATE (RFC 1951), decode with NSData.decompressed(using: .zlib)",
        "file": "launchdb.json.zlib",
        "bytesCompressed": len(comp),
        "bytesUncompressed": len(raw),
        "sha256": hashlib.sha256(comp).hexdigest(),
        "counts": {
            "launches": len(launches),
            "launchesByKind": count(launches, "k"),
            "launchesWithWater": with_water,
            "hazards": len(hazards),
            "hazardsByKind": count(hazards, "k"),
            "portages": len(portages),
            "waters": len(out_waters),
            "watersByKind": water_kinds,
            "duplicatesHidden": {"launches": ld, "hazards": hd},
            "droppedPrivateLaunches": b.dropped_private,
            "droppedOutsideUSCanada": b.dropped_outside,
        },
        "coverage": {
            "tilesTotal": tiles_total,
            "tilesCompleted": tiles_total - len(failed),
            "missingTiles": [[t.s, t.w, t.n, t.e] for t in failed],
            "priorityRegions": coverage,
            "bbox": "US + Canada (CONUS 24–50°N, Canada 50–84°N, Alaska, Hawaii); coarse country mask",
        },
    }
    with open(os.path.join(OUT_DIR, "launchdb-meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(json.dumps(meta["counts"], indent=2))
    print("compressed %.2f MB (raw %.2f MB)" % (len(comp) / 1048576.0, len(raw) / 1048576.0))
    if len(comp) > SIZE_BUDGET_BYTES:
        print("WARNING: over the %d MB size budget" % (SIZE_BUDGET_BYTES // 1048576))
    return meta


# --------------------------------------------------------------------------------------
# Demo reach: Eno River, Few's Ford → Pleasant Green (PRD §4.4, Appendix G)
# --------------------------------------------------------------------------------------

DEMO = {
    "id": "demo-eno",
    "title": "Eno River: Fews Ford to Pleasant Green",
    "river": "Eno River",
    "bbox": (36.02, -79.16, 36.13, -78.80),
    # PRD Appendix G coordinates (approximate) and the OSM name patterns of the real access points.
    "putIn": {"hint": (36.0712, -79.0033), "pattern": r"(?i)\bfews?'?s? ford\b"},
    "takeOut": {"hint": (36.0655, -78.9788), "pattern": r"(?i)pleasant green.*access"},
}


def demo_query():
    s, w, n, e = DEMO["bbox"]
    return (
        "[out:json][timeout:180][bbox:%f,%f,%f,%f];\n"
        'way[waterway~"^(river|stream)$"][name="%s"]->.r;\n'
        ".r out meta geom;\n"
        "rel(bw.r)[type=waterway];\n"
        "out tags;\n"
        "(\n"
        " nwr[waterway=access_point]; nwr[leisure=slipway];\n"
        ' nwr[canoe~"put_in|egress"]; nwr[whitewater~"put_in|egress"];\n'
        " nwr[waterway~\"^(dam|weir)$\"]; nwr[whitewater~\"^(rapid|hazard)$\"];\n"
        " nwr[hazard];\n"
        ' nwr[name~"(ford|access)",i][~"^(highway|ford|amenity|leisure|tourism)$"~"."];\n'
        ");\n"
        "out meta center;\n"
    ) % (s, w, n, e, DEMO["river"])


def stitch(ways):
    """Orders river ways head→tail by shared end nodes (OSM waterways point downstream)."""
    by_first = {}
    lasts = set()
    for w in ways:
        by_first.setdefault(w["nodes"][0], []).append(w)
        lasts.add(w["nodes"][-1])
    heads = [w for w in ways if w["nodes"][0] not in lasts]
    best = []
    for h in heads:
        chain, cur, used = [h], h, {h["id"]}
        while True:
            nxt = [w for w in by_first.get(cur["nodes"][-1], []) if w["id"] not in used]
            if not nxt:
                break
            cur = max(nxt, key=lambda w: len(w["nodes"]))
            used.add(cur["id"])
            chain.append(cur)
        if sum(len(w["nodes"]) for w in chain) > sum(len(w["nodes"]) for w in best):
            best = chain
    pts = []
    for w in best:
        g = [(p["lat"], p["lon"]) for p in w["geometry"]]
        pts.extend(g if not pts else g[1:])
    return pts, [w["id"] for w in best]


def project(pts, lat, lon):
    best = None
    walked = 0.0
    for idx, (a, b) in enumerate(zip(pts, pts[1:])):
        k = math.cos(math.radians(lat)) * 111319.49
        kl = 111132.95
        ax, ay = (a[1] - lon) * k, (a[0] - lat) * kl
        bx, by = (b[1] - lon) * k, (b[0] - lat) * kl
        dx, dy = bx - ax, by - ay
        l2 = dx * dx + dy * dy
        t = 0.0 if l2 == 0 else max(0.0, min(1.0, -(ax * dx + ay * dy) / l2))
        d = math.hypot(ax + t * dx, ay + t * dy)
        seg = haversine(a[0], a[1], b[0], b[1])
        if best is None or d < best[0]:
            best = (d, idx, t, walked + t * seg, (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
        walked += seg
    return best


def build_demo(op):
    os.makedirs(TILE_CACHE, exist_ok=True)
    q = demo_query()
    path = os.path.join(TILE_CACHE, "demo_eno-%s.json.gz" % hashlib.sha1(q.encode()).hexdigest()[:10])
    if not os.path.exists(path):
        _, text = op.run(q, "demo_eno")
        with gzip.open(path, "wt", encoding="utf-8") as f:
            f.write(text)
    with gzip.open(path, "rt", encoding="utf-8") as f:
        doc = json.load(f)
    els = doc["elements"]
    ways = [e for e in els if e["type"] == "way" and e.get("tags", {}).get("name") == DEMO["river"] and e.get("geometry")
            and e["tags"].get("waterway") == "river"]
    rel = next((e for e in els if e["type"] == "relation" and e.get("tags", {}).get("type") == "waterway"), None)
    line, way_ids = stitch(ways)
    others = [e for e in els if "center" in e or "lat" in e]

    def pick(spec, role):
        hint = spec["hint"]
        cands = []
        for e in others:
            t = e.get("tags", {})
            p = element_point(e)
            if not p:
                continue
            launchy = is_launch(t)
            named = bool(re.search(spec["pattern"], t.get("name", "")))
            if launchy or named:
                d = haversine(hint[0], hint[1], p[0], p[1])
                # Prefer the named access point; a tagged launch wins only when it is much closer.
                score = d - (2000 if named else 0)
                if d < 6000:
                    cands.append((score, d, e, p))
        if not cands:
            raise SystemExit("demo: no OSM feature found for " + role)
        cands.sort(key=lambda c: c[0])
        _, d, e, p = cands[0]
        return e, p, d

    def as_launch(e, p, kind, along):
        t = e.get("tags", {})
        rec = {"id": "osm:" + eid(e), "name": t.get("name") or ("Put-in" if kind == "accessPoint" else "Take-out"),
               "kind": kind, "coordinate": {"lat": r5(p[0]), "lon": r5(p[1])}, "waterName": DEMO["river"],
               "source": "OpenStreetMap"}
        if t.get("parking") or t.get("amenity") == "parking":
            rec["parking"] = "yes" if t.get("amenity") == "parking" else t["parking"]
        for src, dst in (("fee", "fee"), ("surface", "surface"), ("toilets", "toilets"), ("wheelchair", "accessible"),
                         ("opening_hours", "hours"), ("seasonal", "seasonal")):
            if t.get(src):
                rec[dst] = t[src]
        rec["editedAt"] = edited_at(e)
        rec["timeZoneID"] = "America/New_York"
        return rec

    pe, pp, pdist = pick(DEMO["putIn"], "put-in")
    te, tp, tdist = pick(DEMO["takeOut"], "take-out")
    pj, tj = project(line, *pp), project(line, *tp)
    if pj[3] > tj[3]:
        raise SystemExit("demo: put-in is downstream of take-out — check the river direction")
    seg = [pj[4]] + line[pj[1] + 1: tj[1] + 1] + [tj[4]]
    seg = [(r5(a), r5(b)) for a, b in seg]
    dedup = [seg[0]]
    for p in seg[1:]:
        if p != dedup[-1]:
            dedup.append(p)
    seg = dedup
    length = line_length(seg)

    hazards, launches = [], []
    for e in others:
        t = e.get("tags", {})
        p = element_point(e)
        if not p or e in (pe, te):
            continue
        pr = project(seg, *p)
        if pr is None:
            continue
        hk = hazard_kind(t)
        if hk and pr[0] <= 100:
            h = {"id": "osm:" + eid(e), "kind": hk, "coordinate": {"lat": r5(p[0]), "lon": r5(p[1])},
                 "source": "OpenStreetMap", "editedAt": edited_at(e)}
            if t.get("name"):
                h["name"] = t["name"]
            hazards.append((pr[3], h))
        elif is_launch(t) and pr[0] <= 150:
            launches.append((pr[3], as_launch(e, p, launch_kind(t), pr[3])))
    hazards.sort(key=lambda x: x[0])
    launches.sort(key=lambda x: x[0])

    demo = {
        "id": DEMO["id"],
        "title": DEMO["title"],
        "waterName": DEMO["river"],
        "waterID": "osm:" + eid(rel) if rel else None,
        "putIn": as_launch(pe, pp, "accessPoint", pj[3]),
        "takeOut": as_launch(te, tp, "takeOut", tj[3]),
        "line": [{"lat": a, "lon": b} for a, b in seg],
        "lengthMeters": round(length, 1),
        "hazards": [h for _, h in hazards],
        "launches": [l for _, l in launches],
        "osmWayIDs": way_ids,
        "osmDataTimestamp": (doc.get("osm3s") or {}).get("timestamp_osm_base"),
        "attribution": "© OpenStreetMap contributors (ODbL 1.0)",
        "notes": [
            "Centreline: OSM waterway=river ways %s, stitched head-to-tail (OSM waterways point downstream) and cut "
            "at the projections of the put-in and take-out." % ", ".join(str(i) for i in way_ids),
            "Put-in: OSM %s '%s' (%.0f m from the PRD Appendix G coordinate 36.0712,-79.0033), %.0f m from the "
            "centreline." % (eid(pe), pe.get("tags", {}).get("name"), pdist, pj[0]),
            "Take-out: OSM %s '%s' (%.0f m from the PRD coordinate 36.0655,-78.9788, which actually lies near "
            "Cole Mill Road), %.0f m from the centreline." % (eid(te), te.get("tags", {}).get("name"), tdist, tj[0]),
            "Real river length between them is %.2f mi (%.0f m); PRD Appendix G uses an illustrative 4.1 mi." % (
                length / 1609.344, length),
            "OSM has %d dam/weir/rapid features within 100 m of this reach and %d tagged launches within 150 m. "
            "The Appendix G low-head dam at mile 1.2 is illustrative only and is not in OSM." % (
                len(hazards), len(launches)),
        ],
    }
    os.makedirs(OUT_DIR, exist_ok=True)
    with open(os.path.join(OUT_DIR, "demo_eno.json"), "w", encoding="utf-8") as f:
        json.dump(demo, f, ensure_ascii=False, indent=1)
        f.write("\n")
    print("demo_eno: %d points, %.0f m (%.2f mi), %d hazards, %d launches" % (
        len(seg), length, length / 1609.344, len(hazards), len(launches)))
    for n in demo["notes"]:
        print("  -", n)


# --------------------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--workers", type=int, default=2, help="concurrent Overpass requests (≤ 2 is polite)")
    ap.add_argument("--pause", type=float, default=3.0, help="seconds each worker sleeps after a request")
    ap.add_argument("--max-minutes", type=float, default=0, help="stop starting new tiles after N minutes")
    ap.add_argument("--priority-only", action="store_true", help="only tiles touching the priority states/provinces")
    ap.add_argument("--offline", action="store_true", help="build only from the tile cache, no network")
    ap.add_argument("--endpoint", action="append", help="override the Overpass endpoint list (repeatable)")
    ap.add_argument("--skip-demo", action="store_true")
    ap.add_argument("--demo-only", action="store_true")
    ap.add_argument("--list-tiles", action="store_true")
    args = ap.parse_args()

    os.makedirs(TILE_CACHE, exist_ok=True)
    op = Overpass(args.endpoint or ENDPOINTS, args.pause)

    if not args.skip_demo and not args.offline:
        build_demo(op)
    if args.demo_only:
        return

    tiles = make_tiles()
    if args.priority_only:
        tiles = [t for t in tiles if any(t.intersects(*b) for b in PRIORITY.values())]
    if args.list_tiles:
        for t in tiles:
            print(t.name, t.region, "cached" if cached_leaves(t) else "")
        print(len(tiles), "tiles")
        return

    deadline = time.time() + args.max_minutes * 60 if args.max_minutes else None
    leaves, failed = [], []
    start = time.time()
    if args.offline:
        for t in tiles:
            r = cached_leaves(t)
            if r is None:
                failed.append(t)
            else:
                leaves.extend(r)
    else:
        todo = []
        for t in tiles:
            r = cached_leaves(t)
            if r is None:
                todo.append(t)
            else:
                leaves.extend(r)
        print("%d tiles, %d cached, %d to fetch" % (len(tiles), len(tiles) - len(todo), len(todo)), flush=True)
        with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, args.workers)) as ex:
            futs = {ex.submit(fetch_tile, op, t, 0, deadline): t for t in todo}
            done_n = 0
            for f in concurrent.futures.as_completed(futs):
                t = futs[f]
                done_n += 1
                try:
                    r = f.result()
                except Exception as e:      # pragma: no cover
                    print("tile error", t.name, e)
                    r = []
                if r and cached_leaves(t) is not None:
                    leaves.extend(r)
                else:
                    failed.append(t)
                print("[%d/%d] %s %s  (%.1f min)" % (done_n, len(todo), t.name, "ok" if r else "MISSING",
                                                     (time.time() - start) / 60.0), flush=True)
    print("building from %d cached leaf tiles (%d tiles missing)" % (len(leaves), len(failed)), flush=True)
    b = Builder()
    build_db(b, leaves, len(tiles), failed, args)


if __name__ == "__main__":
    main()
