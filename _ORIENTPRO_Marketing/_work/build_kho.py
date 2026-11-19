#!/usr/bin/env python3
"""ORIENTPRO kho video builder (17/11/2026).
Templates: A hook->app, B problem->solution, C 3 reasons, D before/after wipe,
E POV/comment poll, F pseudo-3D tilt showcase. All 1080x1920, 30fps, H.264.
Usage: python3 build_kho.py <spec.json> <outroot> [filter]
Temp files go to /tmp (connected folder can't delete)."""
import json, os, subprocess, sys, math, random, glob
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
FB = os.path.join(HERE, 'GTW-Bold.ttf'); FM = os.path.join(HERE, 'GTW-Medium.ttf')
W, H, FPS = 1080, 1920, 30
SAFE_R = 150; SAFE_B = 250          # TikTok UI zones (right, bottom)
CX = (W - SAFE_R + 60) / 2          # text centre shifted left of right UI rail
TXT_W = W - SAFE_R - 100            # usable text width
_fc = {}


def F(p, s):
    k = (p, s)
    if k not in _fc: _fc[k] = ImageFont.truetype(p, s)
    return _fc[k]


def rgb(h):
    h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def ease(t):
    t = max(0.0, min(1.0, t)); return 1 - (1 - t) ** 3


def ease_io(t):
    t = max(0.0, min(1.0, t)); return t * t * (3 - 2 * t)


def gradient(w, h, top, bot, angle=False):
    t, b = np.array(rgb(top), float), np.array(rgb(bot), float)
    y = np.linspace(0, 1, h)[:, None]
    if angle:
        x = np.linspace(0, 1, w)[None, :]; k = np.clip(0.65 * y + 0.35 * x, 0, 1)
    else:
        k = np.repeat(y, w, 1)
    arr = t[None, None, :] * (1 - k[..., None]) + b[None, None, :] * k[..., None]
    return Image.fromarray(arr.astype(np.uint8), 'RGB').convert('RGBA')


# ---------------- background motion layers ----------------
class Particles:
    """Theme particles drawn each frame: stars, dots, bokeh, grid, rain, confetti."""
    def __init__(self, kind, color, seed=1, n=70):
        r = random.Random(seed); self.kind = kind; self.c = rgb(color)
        self.p = [(r.random() * W, r.random() * H, r.uniform(2, 7), r.uniform(0.2, 1.0), r.random() * 6.28) for _ in range(n)]

    def draw(self, img, t):
        ov = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
        k = self.kind
        if k == 'grid':
            off = (t * 40) % 90
            for x in range(-90, W + 90, 90):
                d.line([(x + off, 0), (x + off, H)], fill=self.c + (28,), width=2)
            for y in range(-90, H + 90, 90):
                d.line([(0, y + off), (W, y + off)], fill=self.c + (28,), width=2)
        for (x, y, s, sp, ph) in self.p:
            if k == 'stars':
                a = int(90 + 120 * (0.5 + 0.5 * math.sin(t * 2.2 * sp + ph)))
                d.ellipse([x - s / 2, y - s / 2, x + s / 2, y + s / 2], fill=self.c + (a,))
            elif k == 'rise':  # bokeh rising
                yy = (y - t * 60 * sp) % (H + 100) - 50; r_ = s * 4
                d.ellipse([x - r_, yy - r_, x + r_, yy + r_], fill=self.c + (int(40 * sp) + 15,))
            elif k == 'drift':  # sideways streaks (wind / speed)
                xx = (x + t * 500 * sp) % (W + 300) - 150
                d.line([(xx, y), (xx + 60 + 120 * sp, y)], fill=self.c + (int(70 * sp) + 20,), width=int(s / 2) + 1)
            elif k == 'paper':  # rotating little squares
                yy = (y + t * 70 * sp) % (H + 100) - 50; a = t * sp * 2 + ph; r_ = s * 3.2
                pts = [(x + r_ * math.cos(a + i * math.pi / 2), yy + r_ * math.sin(a + i * math.pi / 2)) for i in range(4)]
                d.polygon(pts, fill=self.c + (int(60 * sp) + 30,))
            elif k == 'grain':
                pass
        if k == 'grain':
            n = (np.random.default_rng(int(t * 30)).random((H // 4, W // 4)) * 40).astype(np.uint8)
            g = Image.fromarray(n, 'L').resize((W, H))
            ov = Image.merge('RGBA', (g, g, g, g.point(lambda v: v)))
        img.alpha_composite(ov)


def glow_blob(img, t, color, cx, cy, r):
    """Soft moving colour blob (aurora / ambient light)."""
    pass


def make_aurora_band(color1, color2):
    """Pre-render a wavy aurora curtain layer (W*2 wide for scrolling)."""
    w2 = W * 2; arr = np.zeros((H, w2, 4), np.uint8)
    xs = np.arange(w2)
    c1, c2 = np.array(rgb(color1)), np.array(rgb(color2))
    for band, (amp, base, thick, col) in enumerate([(120, 520, 260, c1), (90, 760, 180, c2)]):
        yc = base + amp * np.sin(xs / w2 * 4 * math.pi) + 40 * np.sin(xs / w2 * 10 * math.pi)
        ys = np.arange(H)[:, None]
        dist = (ys - yc[None, :]) / thick
        a = np.clip(np.exp(-dist ** 2 * 2.5) * (dist < 0.3) + np.exp(-dist ** 2 * 0.6) * (dist < 0) * 0.6, 0, 1) * 150
        m = a > arr[..., 3]
        arr[..., :3][m] = col; arr[..., 3] = np.maximum(arr[..., 3], a.astype(np.uint8))
    return Image.fromarray(arr, 'RGBA').filter(ImageFilter.GaussianBlur(18))


# ---------------- text ----------------
def wrap(text, f, maxw):
    d = ImageDraw.Draw(Image.new('L', (1, 1)))
    words, lines, cur = text.split(), [], ''
    for wd in words:
        t = (cur + ' ' + wd).strip()
        if d.textlength(t, font=f) <= maxw: cur = t
        else:
            if cur: lines.append(cur)
            cur = wd
    if cur: lines.append(cur)
    return lines


def fit_font(text, path, size, maxw, maxlines):
    while size > 30:
        f = F(path, size)
        ls = wrap(text, f, maxw)
        if len(ls) <= maxlines and all(ImageDraw.Draw(Image.new('L', (1, 1))).textlength(l, font=f) <= maxw for l in ls):
            return f, ls
        size -= 4
    f = F(path, size); return f, wrap(text, f, maxw)


def draw_lines(img, lines, f, cx, y, fill, lh=1.12, shadow=True, alpha=255, box=None, words_visible=None):
    d = ImageDraw.Draw(img)
    if box:
        widths = [d.textlength(l, font=f) for l in lines]
        bw = max(widths) + 70; bh = int(f.size * lh) * len(lines) + 46
        ov = Image.new('RGBA', img.size, (0, 0, 0, 0))
        ImageDraw.Draw(ov).rounded_rectangle([cx - bw / 2, y - 22, cx + bw / 2, y - 22 + bh], 34, fill=rgb(box[0]) + (int(box[1] * alpha / 255),))
        img.alpha_composite(ov)
    count = 0
    for ln in lines:
        if words_visible is not None:
            ws = ln.split(); show = ws[:max(0, words_visible - count)]; count += len(ws)
            ln_draw = ' '.join(show)
            tw = d.textlength(ln, font=f); x = cx - tw / 2
        else:
            ln_draw = ln; tw = d.textlength(ln, font=f); x = cx - tw / 2
        if ln_draw:
            if shadow: d.text((x + 3, y + 4), ln_draw, font=f, fill=(0, 0, 0, int(160 * alpha / 255)))
            d.text((x, y), ln_draw, font=f, fill=tuple(fill[:3]) + (alpha,))
        y += int(f.size * lh)
    return y


def text_layer(lines, f, fill, lh=1.12, box=None, shadow=True):
    """Pre-render a text block to an RGBA layer (for fade/scale anims)."""
    d = ImageDraw.Draw(Image.new('L', (1, 1)))
    wmax = int(max(d.textlength(l, font=f) for l in lines)) + 90
    hh = int(f.size * lh) * len(lines) + 60
    L = Image.new('RGBA', (wmax, hh), (0, 0, 0, 0))
    draw_lines(L, lines, f, wmax / 2, 26, fill, lh, shadow, 255, box)
    return L


def paste_center(img, layer, cx, y, alpha=1.0, scale=1.0):
    if scale != 1.0:
        layer = layer.resize((max(1, int(layer.width * scale)), max(1, int(layer.height * scale))), Image.BILINEAR)
    if alpha < 1.0:
        a = layer.getchannel('A').point(lambda v: int(v * alpha)); layer = layer.copy(); layer.putalpha(a)
    img.alpha_composite(layer, (int(cx - layer.width / 2), int(y - (layer.height - layer.height) )))


# ---------------- phone / card ----------------
def load_shot(path):
    return Image.open(os.path.join(ROOT, path)).convert('RGB')


def phone(shot, screen_w, frame=True, island=True):
    """Code-drawn iPhone: rounded body, bezel, Dynamic Island, screen = real screenshot."""
    sh = shot.resize((screen_w, int(shot.height * screen_w / shot.width)), Image.LANCZOS)
    if not frame:  # framed App Store image -> rounded card only
        m = Image.new('L', sh.size, 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, sh.width - 1, sh.height - 1], 40, fill=255)
        out = Image.new('RGBA', sh.size, (0, 0, 0, 0)); out.paste(sh, (0, 0), m); return add_shadow(out, 40)
    bez = int(screen_w * 0.045); rad = int(screen_w * 0.13)
    bw, bh = sh.width + 2 * bez, sh.height + 2 * bez
    body = Image.new('RGBA', (bw, bh), (0, 0, 0, 0)); d = ImageDraw.Draw(body)
    d.rounded_rectangle([0, 0, bw - 1, bh - 1], rad + bez, fill=(28, 28, 32, 255))
    d.rounded_rectangle([3, 3, bw - 4, bh - 4], rad + bez - 3, outline=(120, 120, 130, 255), width=3)
    d.rounded_rectangle([bez - 2, bez - 2, bw - bez + 1, bh - bez + 1], rad + 2, fill=(0, 0, 0, 255))
    m = Image.new('L', sh.size, 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, sh.width - 1, sh.height - 1], rad, fill=255)
    body.paste(sh, (bez, bez), m)
    if island:
        iw, ih = int(screen_w * 0.30), int(screen_w * 0.085)
        ImageDraw.Draw(body).rounded_rectangle([bw / 2 - iw / 2, bez + ih * 0.35, bw / 2 + iw / 2, bez + ih * 1.35], ih / 2, fill=(0, 0, 0, 255))
    # side buttons
    d = ImageDraw.Draw(body)
    return add_shadow(body, rad + bez)


def add_shadow(c, rad):
    pad = 60
    out = Image.new('RGBA', (c.width + pad * 2, c.height + pad * 2), (0, 0, 0, 0))
    m = Image.new('L', out.size, 0)
    ImageDraw.Draw(m).rounded_rectangle([pad + 10, pad + 30, pad + c.width - 10, pad + c.height + 24], rad, fill=140)
    m = m.filter(ImageFilter.GaussianBlur(26))
    sh = Image.new('RGBA', out.size, (0, 0, 0, 255)); sh.putalpha(m)
    out.alpha_composite(sh); out.alpha_composite(c, (pad, pad))
    return out


def fit_phone(app, shot_path, maxw, maxh):
    s = load_shot(shot_path)
    raw = app['raw']
    ratio = s.height / s.width
    sw = maxw
    if raw:
        sw = int(maxw / 1.09)
    hh = sw * ratio * (1.09 if raw else 1)
    if hh > maxh: sw = int(sw * maxh / hh)
    return phone(s, sw, frame=raw, island=raw and ratio > 2.0)


def perspective(img, k):
    """Fake 3D Y-rotation: k in [-1,1]; shrinks one vertical edge."""
    w, h = img.size; s = abs(k) * 0.16; sx = 1 - abs(k) * 0.25
    nw = int(w * sx)
    if k >= 0:  # right edge farther
        dst = [(0, 0), (nw, h * s / 2), (nw, h - h * s / 2), (0, h)]
    else:
        dst = [(0, h * s / 2), (nw, 0), (nw, h), (0, h - h * s / 2)]
    src = [(0, 0), (w, 0), (w, h), (0, h)]
    coeffs = _persp_coeffs(dst, src)
    return img.transform((nw, h), Image.PERSPECTIVE, coeffs, Image.BICUBIC)


def _persp_coeffs(pa, pb):
    A = []
    for p1, p2 in zip(pa, pb):
        A.append([p1[0], p1[1], 1, 0, 0, 0, -p2[0] * p1[0], -p2[0] * p1[1]])
        A.append([0, 0, 0, p1[0], p1[1], 1, -p2[1] * p1[0], -p2[1] * p1[1]])
    A = np.array(A, float); B = np.array(pb, float).reshape(8)
    return np.linalg.solve(A, B).tolist()


# ---------------- shared pieces ----------------
def icon_img(app, size):
    ic = Image.open(os.path.join(ROOT, 'assets', 'icons', app['icon'])).convert('RGBA').resize((size, size), Image.LANCZOS)
    m = Image.new('L', ic.size, 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, size - 1, size - 1], int(size * 0.225), fill=255)
    ic.putalpha(Image.composite(ic.getchannel('A'), Image.new('L', ic.size, 0), m)); return ic


def brand_tag(img, app, acc, alpha=1.0):
    """Small app-name tag top-left (keeps app name on screen the whole video)."""
    ic = icon_img(app, 64)
    f = F(FB, 36)
    d = ImageDraw.Draw(img)
    lay = Image.new('RGBA', (700, 90), (0, 0, 0, 0)); dl = ImageDraw.Draw(lay)
    tw = dl.textlength(app['short'], font=f)
    dl.rounded_rectangle([0, 0, 64 + 30 + tw + 30, 84], 42, fill=(0, 0, 0, 110))
    lay.alpha_composite(ic, (10, 10)); dl.text((90, 22), app['short'], font=f, fill=(255, 255, 255, 255))
    if alpha < 1: lay.putalpha(lay.getchannel('A').point(lambda v: int(v * alpha)))
    img.alpha_composite(lay, (60, 110))


def disclaimer(img, app):
    if not app.get('disclaimer'): return
    f = F(FM, 34); d = ImageDraw.Draw(img)
    tw = d.textlength(app['disclaimer'], font=f)
    ov = Image.new('RGBA', img.size, (0, 0, 0, 0))
    y = H - SAFE_B - 70
    ImageDraw.Draw(ov).rounded_rectangle([CX - tw / 2 - 26, y - 12, CX + tw / 2 + 26, y + 50], 28, fill=(0, 0, 0, 150))
    img.alpha_composite(ov)
    d.text((CX - tw / 2, y), app['disclaimer'], font=f, fill=(255, 255, 255, 235))


def end_card(img, app, acc, lt, cta=None):
    a = ease(lt / 0.5)
    ic = icon_img(app, 280)
    img.alpha_composite(ic, (int(CX - 140), int(520 + (1 - a) * 80)))
    f1, l1 = fit_font(app['name'], FB, 74, TXT_W, 2)
    y = draw_lines(img, l1, f1, CX, 860, (255, 255, 255), alpha=int(255 * a))
    f2 = F(FB, 54)
    y = draw_lines(img, wrap('Search "%s" on the App Store' % app['search'], f2, TXT_W), f2, CX, y + 40, rgb(acc), alpha=int(255 * a))
    if app.get('android'):
        y = draw_lines(img, ['Also on Google Play'], F(FM, 40), CX, y + 10, (230, 230, 230), alpha=int(255 * a))
    if cta:
        f3 = F(FM, 44)
        y = draw_lines(img, wrap(cta, f3, TXT_W - 40), f3, CX, y + 50, (240, 240, 240), alpha=int(255 * a), box=('#000000', 90))


# ---------------- templates ----------------
class Ctx:
    def __init__(s, v, app):
        s.v, s.app = v, app
        s.acc = v['accent']; s.bg = gradient(W, H, v['top'], v['bot'], angle=v.get('angle', False))
        s.parts = Particles(v.get('fx', app.get('fx', 'stars')), v.get('fxcolor', '#FFFFFF'), seed=hash(v['file']) % 999)
        s.band = make_aurora_band(v['accent'], v.get('accent2', '#7FD6FF')) if v.get('aurora') else None

    def base(s, t):
        fr = s.bg.copy()
        if s.band is not None:
            off = int((t * 50) % W); fr.alpha_composite(s.band.crop((off, 0, off + W, H)))
        s.parts.draw(fr, t)
        return fr


def phones(ctx, shots, maxw=700, maxh=1080):
    return [fit_phone(ctx.app, sp, maxw, maxh) for sp in shots]


def T_A(ctx):
    """Hook b-roll style -> phone slides up -> 3-4 screens -> end card."""
    v = ctx.v; sc = v['scenes']; P = phones(ctx, [s['shot'] for s in sc], 700, 1060)
    fh, lh = fit_font(v['hook'], FB, 104, TXT_W, 3)
    caps = [fit_font(s['text'], FB, 62, TXT_W, 2) for s in sc]
    hook_t, st, end_t = 3.0, 3.6, 3.4
    total = hook_t + st * len(sc) + end_t

    def frame(t):
        fr = ctx.base(t)
        if t < hook_t:
            nw = int(t / 0.18) + 1
            y0 = 640 if t < 1.6 else 640 - (ease((t - 1.6) / 0.6)) * 380
            draw_lines(fr, lh, fh, CX, y0, (255, 255, 255), words_visible=nw)
            if t > 1.6:
                p = P[0]; k = ease((t - 1.6) / 1.2); y = int(H - (H - 640) * k)
                fr.alpha_composite(p, (int(CX - p.width / 2), y - 60))
        elif t < hook_t + st * len(sc):
            i = int((t - hook_t) // st); lt = t - hook_t - i * st
            p = P[i]; x = CX
            if i > 0 and lt < 0.4:
                k = ease(lt / 0.4); q = P[i - 1]
                fr.alpha_composite(q, (int(CX - q.width / 2 - k * W), 640 - 60))
                x = CX + (1 - k) * W
            fr.alpha_composite(p, (int(x - p.width / 2), 640 - 60))
            f, ls = caps[i]; a = ease(lt / 0.3)
            draw_lines(fr, ls, f, CX, 300, (255, 255, 255), alpha=int(255 * a), box=(v['bot'], 150))
        else:
            end_card(fr, ctx.app, ctx.acc, t - hook_t - st * len(sc), v.get('cta'))
        brand_tag(fr, ctx.app, ctx.acc); disclaimer(fr, ctx.app)
        return fr
    return total, frame


def T_B(ctx):
    """Problem (dark, grain, red) -> flash -> solution screens -> CTA."""
    v = ctx.v; sc = v['scenes']; P = phones(ctx, [s['shot'] for s in sc], 660, 1040)
    prob_bg = gradient(W, H, '#1a1a1a', '#3a3a3a')
    grain = Particles('grain', '#ffffff')
    fp, lp = fit_font(v['hook'], FB, 98, TXT_W, 4)
    fs_, ls_ = fit_font(v.get('problem2', ''), FM, 52, TXT_W, 3) if v.get('problem2') else (None, [])
    caps = [fit_font(s['text'], FB, 62, TXT_W, 2) for s in sc]
    pt, st, end_t = 4.2, 4.0, 3.6
    total = pt + 0.6 + st * len(sc) + end_t

    def frame(t):
        if t < pt:
            fr = prob_bg.copy(); grain.draw(fr, t)
            d = ImageDraw.Draw(fr)
            # red "problem" chip
            draw_lines(fr, ['THE PROBLEM'], F(FB, 44), CX, 470, (255, 255, 255), box=('#D93B3B', 230), shadow=False)
            draw_lines(fr, lp, fp, CX, 640, (255, 255, 255), words_visible=int(t / 0.16) + 1)
            if ls_ and t > 2.2:
                draw_lines(fr, ls_, fs_, CX, 640 + len(lp) * int(fp.size * 1.12) + 60, (220, 220, 220), alpha=int(255 * ease((t - 2.2) / 0.5)))
            brand_tag(fr, ctx.app, ctx.acc)
            return fr
        fr = ctx.base(t); t2 = t - pt
        if t2 < 0.6:
            draw_lines(fr, ['THE FIX'], F(FB, 120), CX, 820, rgb(ctx.acc), shadow=True)
            fl = Image.new('RGBA', (W, H), (255, 255, 255, int(255 * (1 - t2 / 0.6)))); fr.alpha_composite(fl)
        elif t2 < 0.6 + st * len(sc):
            i = int((t2 - 0.6) // st); lt = t2 - 0.6 - i * st
            p = P[i]; k = ease(lt / 0.5)
            s = 0.85 + 0.15 * k
            q = p.resize((int(p.width * s), int(p.height * s)), Image.BILINEAR)
            q.putalpha(q.getchannel('A').point(lambda a_: int(a_ * k)))
            fr.alpha_composite(q, (int(CX - q.width / 2), int(660 + (p.height - q.height) / 2 - 60)))
            draw_lines(fr, ['FIX %d' % (i + 1)], F(FB, 40), CX, 250, (20, 20, 20), box=(ctx.acc, 255), shadow=False)
            f, ls = caps[i]; draw_lines(fr, ls, f, CX, 370, (255, 255, 255), alpha=int(255 * ease(lt / 0.35)))
        else:
            end_card(fr, ctx.app, ctx.acc, t2 - 0.6 - st * len(sc), v.get('cta'))
        brand_tag(fr, ctx.app, ctx.acc); disclaimer(fr, ctx.app)
        return fr
    return total, frame


def T_C(ctx):
    """Numbered list 1-2-3; each item: big number badge + phone."""
    v = ctx.v; sc = v['scenes']; P = phones(ctx, [s['shot'] for s in sc], 640, 1000)
    fh, lh = fit_font(v['hook'], FB, 108, TXT_W, 3)
    caps = [fit_font(s['text'], FB, 60, TXT_W - 170, 2) for s in sc]
    hook_t, st, end_t = 2.6, 4.2, 3.4
    total = hook_t + st * len(sc) + end_t

    def frame(t):
        fr = ctx.base(t)
        if t < hook_t:
            s = 0.6 + 0.4 * ease(t / 0.5)
            L = text_layer(lh, fh, (255, 255, 255))
            L = L.resize((int(L.width * s), int(L.height * s)), Image.BILINEAR)
            fr.alpha_composite(L, (int(CX - L.width / 2), int(780 - L.height / 2)))
            # three dots preview
            for j in range(len(sc)):
                a = ease((t - 0.8 - j * 0.3) / 0.3)
                if a > 0:
                    x = CX - 160 + j * 160; y = 1150
                    ov = Image.new('RGBA', (W, H), (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
                    od.ellipse([x - 56, y - 56, x + 56, y + 56], fill=rgb(ctx.acc) + (int(255 * a),))
                    fr.alpha_composite(ov)
                    ImageDraw.Draw(fr).text((x, y), str(j + 1), font=F(FB, 64), fill=(20, 20, 20), anchor='mm')
        elif t < hook_t + st * len(sc):
            i = int((t - hook_t) // st); lt = t - hook_t - i * st
            # number badge pops
            k = ease(lt / 0.35); r = int(70 * (0.5 + 0.5 * k))
            ov = Image.new('RGBA', (W, H), (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
            bx, by = 130, 330
            od.ellipse([bx - r, by - r, bx + r, by + r], fill=rgb(ctx.acc) + (255,)); fr.alpha_composite(ov)
            ImageDraw.Draw(fr).text((bx, by), str(i + 1), font=F(FB, int(84 * (0.5 + 0.5 * k))), fill=(20, 20, 20), anchor='mm')
            f, ls = caps[i]
            ImageDraw.Draw(fr)
            yy = by - int(f.size * 1.12) * len(ls) / 2 - 4
            for ln in ls:
                d = ImageDraw.Draw(fr); d.text((233, yy + 3), ln, font=f, fill=(0, 0, 0)); d.text((230, yy), ln, font=f, fill=(255, 255, 255)); yy += int(f.size * 1.12)
            p = P[i]; y = 520 + (1 - ease(lt / 0.5)) * 300
            pa = p.copy(); pa.putalpha(pa.getchannel('A').point(lambda a_: int(a_ * ease(lt / 0.4))))
            fr.alpha_composite(pa, (int(CX - p.width / 2), int(y - 60)))
            # progress pips
            for j in range(len(sc)):
                x = CX - 60 + j * 60; c = rgb(ctx.acc) if j <= i else (255, 255, 255)
                ImageDraw.Draw(fr).ellipse([x - 12, 470 - 12, x + 12, 470 + 12], fill=c + (255 if j <= i else 120,))
        else:
            end_card(fr, ctx.app, ctx.acc, t - hook_t - st * len(sc), v.get('cta'))
        brand_tag(fr, ctx.app, ctx.acc); disclaimer(fr, ctx.app)
        return fr
    return total, frame


def T_D(ctx):
    """Before / After with a moving wipe divider."""
    v = ctx.v; sc = v['scenes']; P = phones(ctx, [s['shot'] for s in sc], 680, 1060)
    fh, lh = fit_font(v['hook'], FB, 100, TXT_W, 3)
    fb_, lb = fit_font(v['before'], FB, 74, TXT_W - 60, 4)
    caps = [fit_font(s['text'], FB, 60, TXT_W, 2) for s in sc]
    before = gradient(W, H, '#2b2b2b', '#4a4a4a'); grain = Particles('grain', '#ffffff')
    hook_t, bt, wipe_t, st, end_t = 2.4, 2.8, 1.6, 3.4, 3.2
    extra = len(sc) - 1
    total = hook_t + bt + wipe_t + st + extra * st + end_t

    def before_frame(t):
        b = before.copy(); grain.draw(b, t)
        draw_lines(b, ['BEFORE'], F(FB, 48), CX, 380, (255, 255, 255), box=('#D93B3B', 230), shadow=False)
        y = draw_lines(b, lb, fb_, CX, 700, (235, 235, 235))
        # big X
        d = ImageDraw.Draw(b); x0, y0 = CX, y + 160
        d.line([(x0 - 80, y0 - 80), (x0 + 80, y0 + 80)], fill=(217, 59, 59), width=22)
        d.line([(x0 + 80, y0 - 80), (x0 - 80, y0 + 80)], fill=(217, 59, 59), width=22)
        return b

    def after_frame(t, i, lt):
        a = ctx.base(t)
        draw_lines(a, ['AFTER'], F(FB, 48), CX, 250, (20, 20, 20), box=(ctx.acc, 255), shadow=False)
        f, ls = caps[i]; draw_lines(a, ls, f, CX, 360, (255, 255, 255))
        p = P[i]; a.alpha_composite(p, (int(CX - p.width / 2), 640 - 60))
        return a

    def frame(t):
        if t < hook_t:
            fr = ctx.base(t)
            draw_lines(fr, lh, fh, CX, 700, (255, 255, 255), words_visible=int(t / 0.18) + 1)
            # split preview label
            a = ease((t - 1.2) / 0.5)
            if a > 0:
                draw_lines(fr, ['BEFORE  vs  AFTER'], F(FB, 56), CX, 1200, rgb(ctx.acc), alpha=int(255 * a))
        elif t < hook_t + bt:
            fr = before_frame(t)
        elif t < hook_t + bt + wipe_t:
            lt = t - hook_t - bt; k = ease_io(lt / wipe_t)
            b = before_frame(t); a = after_frame(t, 0, 0)
            xw = int(W * (1 - k))
            fr = b.copy(); fr.paste(a.crop((xw, 0, W, H)), (xw, 0))
            ImageDraw.Draw(fr).rectangle([xw - 5, 0, xw + 5, H], fill=(255, 255, 255))
            ImageDraw.Draw(fr).ellipse([xw - 44, H / 2 - 44, xw + 44, H / 2 + 44], fill=(255, 255, 255))
            ImageDraw.Draw(fr).text((xw, H / 2), '<>', font=F(FB, 40), fill=(30, 30, 30), anchor='mm')
        elif t < hook_t + bt + wipe_t + st * len(sc):
            lt = t - hook_t - bt - wipe_t; i = int(lt // st); l2 = lt - i * st
            fr = after_frame(t, i, l2)
            if i > 0 and l2 < 0.3:
                fl = Image.new('RGBA', (W, H), (255, 255, 255, int(160 * (1 - l2 / 0.3)))); fr.alpha_composite(fl)
        else:
            fr = ctx.base(t); end_card(fr, ctx.app, ctx.acc, t - hook_t - bt - wipe_t - st * len(sc), v.get('cta'))
        brand_tag(fr, ctx.app, ctx.acc); disclaimer(fr, ctx.app)
        return fr
    return total, frame


def T_E(ctx):
    """POV text + comment poll bubbles + screens + 'Comment your answer'."""
    v = ctx.v; sc = v['scenes']; P = phones(ctx, [s['shot'] for s in sc], 620, 960)
    fh, lh = fit_font(v['hook'], FB, 100, TXT_W, 3)
    fq, lq = fit_font(v['question'], FB, 70, TXT_W, 2)
    caps = [fit_font(s['text'], FB, 58, TXT_W, 2) for s in sc]
    opts = v['options']
    hook_t, st, poll_t, end_t = 2.8, 3.6, 4.0, 3.0
    total = hook_t + st * len(sc) + poll_t + end_t

    def frame(t):
        fr = ctx.base(t)
        if t < hook_t:
            draw_lines(fr, ['POV'], F(FB, 60), CX, 520, (20, 20, 20), box=(ctx.acc, 255), shadow=False)
            draw_lines(fr, lh, fh, CX, 700, (255, 255, 255), words_visible=int(t / 0.2) + 1)
        elif t < hook_t + st * len(sc):
            lt = t - hook_t; i = int(lt // st); l2 = lt - i * st
            p = P[i]; ang = math.sin(l2 * 0.9) * 2.0
            pr = p.rotate(ang, resample=Image.BICUBIC, expand=True)
            k = ease(l2 / 0.45)
            fr.alpha_composite(pr, (int(CX - pr.width / 2), int(620 + (1 - k) * 200 - 60)))
            f, ls = caps[i]
            # chat-bubble caption
            draw_lines(fr, ls, f, CX, 330, (20, 20, 20), alpha=int(255 * k), box=('#FFFFFF', 235), shadow=False)
        elif t < hook_t + st * len(sc) + poll_t:
            lt = t - hook_t - st * len(sc)
            draw_lines(fr, lq, fq, CX, 420, (255, 255, 255))
            for j, o in enumerate(opts):
                a = ease((lt - 0.3 - j * 0.35) / 0.35)
                if a <= 0: continue
                y = 760 + j * 190
                ov = Image.new('RGBA', (W, H), (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
                x0 = CX - 400 + (1 - a) * -300
                od.rounded_rectangle([x0, y, x0 + 800, y + 140], 70, fill=(255, 255, 255, int(235 * a)))
                od.ellipse([x0 + 24, y + 24, x0 + 116, y + 116], fill=rgb(ctx.acc) + (int(255 * a),))
                fr.alpha_composite(ov)
                d = ImageDraw.Draw(fr)
                d.text((x0 + 70, y + 70), 'ABCD'[j], font=F(FB, 50), fill=(20, 20, 20), anchor='mm')
                d.text((x0 + 150, y + 70), o, font=F(FB, 54), fill=(20, 20, 20), anchor='lm')
            a = ease((lt - 1.8) / 0.4)
            if a > 0:
                draw_lines(fr, ['Comment A, B or C' if len(opts) == 3 else 'Comment A or B'], F(FB, 58), CX, 760 + len(opts) * 190 + 40, rgb(ctx.acc), alpha=int(255 * a))
        else:
            end_card(fr, ctx.app, ctx.acc, t - hook_t - st * len(sc) - poll_t, v.get('cta'))
        brand_tag(fr, ctx.app, ctx.acc); disclaimer(fr, ctx.app)
        return fr
    return total, frame


def T_F(ctx):
    """Pseudo-3D tilt showcase: phone swings in perspective, screens change mid-swing."""
    v = ctx.v; sc = v['scenes']; P = phones(ctx, [s['shot'] for s in sc], 640, 1000)
    fh, lh = fit_font(v['hook'], FB, 100, TXT_W, 3)
    caps = [fit_font(s['text'], FB, 60, TXT_W, 2) for s in sc]
    hook_t, st, end_t = 2.6, 4.0, 3.4
    total = hook_t + st * len(sc) + end_t
    cache = {}

    def tilt(i, k):
        key = (i, round(k, 2))
        if key not in cache: cache[key] = perspective(P[i], k)
        return cache[key]

    def frame(t):
        fr = ctx.base(t)
        if t < hook_t:
            draw_lines(fr, lh, fh, CX, 380, (255, 255, 255), words_visible=int(t / 0.18) + 1)
            k = 1 - ease(t / hook_t)
            p = tilt(0, round(-0.9 * k, 1)); y = 900 + k * 400
            fr.alpha_composite(p, (int(CX - p.width / 2), int(y - 60)))
        elif t < hook_t + st * len(sc):
            lt = t - hook_t; i = int(lt // st); l2 = lt - i * st
            # swing: last 0.5s turns away, first 0.5s turns in
            if l2 < 0.5 and i > 0: k = 0.9 * (1 - ease(l2 / 0.5)) * (1 if i % 2 else -1)
            elif l2 > st - 0.5 and i < len(sc) - 1: k = 0.9 * ease((l2 - (st - 0.5)) / 0.5) * (-1 if i % 2 else 1)
            else: k = 0.12 * math.sin(l2 * 1.2)
            p = tilt(i, round(k, 1))
            fr.alpha_composite(p, (int(CX - p.width / 2), 640 - 60))
            f, ls = caps[i]; draw_lines(fr, ls, f, CX, 320, (255, 255, 255), alpha=int(255 * ease(min(l2, st - l2) / 0.35)))
        else:
            end_card(fr, ctx.app, ctx.acc, t - hook_t - st * len(sc), v.get('cta'))
        brand_tag(fr, ctx.app, ctx.acc); disclaimer(fr, ctx.app)
        return fr
    return total, frame


TEMPLATES = {'A': T_A, 'B': T_B, 'C': T_C, 'D': T_D, 'E': T_E, 'F': T_F}


def render(v, app, outroot, workdir):
    ctx = Ctx(v, app)
    total, frame = TEMPLATES[v['tpl']](ctx)
    frames = int(total * FPS)
    raw = '/tmp/kho_%s.mp4' % os.path.splitext(v['file'])[0]
    p = subprocess.Popen(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', '%dx%d' % (W, H),
                          '-r', str(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22', '-threads', '1',
                          '-pix_fmt', 'yuv420p', raw], stdin=subprocess.PIPE)
    for fi in range(frames):
        p.stdin.write(frame(fi / FPS).convert('RGB').tobytes())
    p.stdin.close(); p.wait()
    od = os.path.join(outroot, app['folder']); os.makedirs(od, exist_ok=True)
    out = os.path.join(od, v['file'])
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', raw, '-i', os.path.join(workdir, v['music']),
                    '-filter_complex', '[1:a]afade=t=in:d=0.5,afade=t=out:st=%.2f:d=1.2[a]' % (total - 1.3), '-map', '0:v', '-map', '[a]',
                    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', out], check=True)
    os.remove(raw)
    return out


if __name__ == '__main__':
    spec = json.load(open(sys.argv[1])); outroot = sys.argv[2]
    flt = sys.argv[3] if len(sys.argv) > 3 else None
    for v in spec['videos']:
        if flt and flt not in v['file']: continue
        out = os.path.join(outroot, spec['apps'][v['app']]['folder'], v['file'])
        if os.path.exists(out) and '--force' not in sys.argv: print('skip', out, flush=True); continue
        print(render(v, spec['apps'][v['app']], outroot, HERE), flush=True)
