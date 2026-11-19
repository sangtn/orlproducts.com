#!/usr/bin/env python3
"""ORIENTPRO storytelling films (1080x1920, 30fps) + story stills.
Usage: python3 build_film.py <films.json> <outroot> [filter]
Shots: broll (Mixkit clip), real (real app screen recording inside phone),
       screen (App Store screenshot inside phone over blurred b-roll), title, end.
Styles: cinema, vhs, tech, modern, classic, doc.
"""
import json, os, sys, math, subprocess, random
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_kho as K

W, H, FPS = 1080, 1920, 30
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
BROLL = os.path.expanduser('~/kho/v')
REAL = os.path.expanduser('~/kho/real')
MUSIC = os.path.join(HERE, 'music_mixkit')
LOGO = os.path.join(ROOT, 'assets', 'images', 'favicon.png')
U = '/usr/share/fonts/opentype/urw-base35/'
FONTS = {
    'sans': os.path.join(HERE, 'GTW-Bold.ttf'), 'sansm': os.path.join(HERE, 'GTW-Medium.ttf'),
    'serif': U + 'P052-Bold.otf', 'serifi': U + 'P052-BoldItalic.otf', 'mono': U + 'NimbusMonoPS-Bold.otf',
}
STY = {  # font, highlight mode, text colour
    'cinema': dict(font='serif', hl='color', size=78, fill=(250, 246, 238)),
    'classic': dict(font='serifi', hl='underline', size=80, fill=(255, 248, 235)),
    'vhs': dict(font='mono', hl='box', size=70, fill=(255, 255, 255)),
    'tech': dict(font='mono', hl='color', size=70, fill=(230, 255, 250)),
    'modern': dict(font='sans', hl='box', size=84, fill=(255, 255, 255)),
    'doc': dict(font='sans', hl='box', size=76, fill=(255, 255, 255)),
}
CX = K.CX; TXT_W = K.TXT_W
_f = {}


def font(k, s):
    key = (k, s)
    if key not in _f: _f[key] = ImageFont.truetype(FONTS[k], s)
    return _f[key]


def rgb(h): return K.rgb(h)


def ease(t): return K.ease(t)


# ---------------- frame sources ----------------
class Clip:
    """Streams frames of a (pre-cropped 1080x1920) b-roll clip, looping, with speed."""
    def __init__(self, cid, start=0.0, speed=1.0, size=(W, H)):
        self.size = size
        path = os.path.join(BROLL, '%s.mp4' % cid) if not str(cid).startswith('real:') else os.path.join(REAL, cid[5:])
        vf = 'setpts=PTS/%.3f,fps=30,scale=%d:%d:force_original_aspect_ratio=increase,crop=%d:%d' % (speed, size[0], size[1], size[0], size[1])
        self.p = subprocess.Popen(['ffmpeg', '-loglevel', 'error', '-stream_loop', '-1', '-ss', str(start), '-i', path,
                                   '-vf', vf, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
        self.n = size[0] * size[1] * 3; self.last = None

    def next(self):
        b = self.p.stdout.read(self.n)
        if len(b) == self.n:
            self.last = np.frombuffer(b, np.uint8).reshape(self.size[1], self.size[0], 3)
        return self.last

    def close(self):
        try: self.p.kill()
        except Exception: pass


# ---------------- grading / overlays ----------------
_rng = np.random.default_rng(7)
GRAIN = [(_rng.normal(0, 1, (H // 2, W // 2)) * 9).astype(np.float32) for _ in range(6)]
yy, xx = np.mgrid[0:H, 0:W]
VIG = (1 - 0.55 * np.clip(((xx - W / 2) / (W * 0.75)) ** 2 + ((yy - H / 2) / (H * 0.7)) ** 2, 0, 1)).astype(np.float32)[..., None]
SCAN = np.ones((H, 1, 1), np.float32); SCAN[::4] = 0.82; SCAN[1::4] = 0.92


def grade(arr, style, fi, dark=0.0):
    a = arr.astype(np.float32)
    if style == 'cinema':
        lum = a.mean(2, keepdims=True) / 255
        a = (a - 128) * 1.12 + 128
        a += (np.array([-10, 0, 12], np.float32) * (1 - lum) + np.array([14, 4, -10], np.float32) * lum)
        a *= VIG
    elif style == 'classic':
        g = a.mean(2, keepdims=True)
        sep = np.concatenate([g * 1.07 + 18, g * 0.95 + 8, g * 0.78], 2)
        a = a * 0.45 + sep * 0.55; a *= VIG
    elif style == 'vhs':
        g = a.mean(2, keepdims=True); a = a * 0.7 + g * 0.3
        a[..., 0] = np.roll(a[..., 0], 5, 1); a[..., 2] = np.roll(a[..., 2], -4, 1)
        a = a * 1.02 + np.array([10, 4, -6], np.float32); a *= SCAN
    elif style == 'tech':
        a = a * np.array([0.85, 0.98, 1.08], np.float32); a = (a - 128) * 1.08 + 128
    elif style == 'doc':
        a = (a - 128) * 1.05 + 132
    elif style == 'modern':
        a = (a - 128) * 1.06 + 128
    if style in ('cinema', 'classic', 'vhs', 'doc'):
        gr = GRAIN[fi % 6]; a += np.kron(gr, np.ones((2, 2), np.float32))[..., None] * (1.6 if style == 'vhs' else 1)
    if dark: a *= (1 - dark)
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGB').convert('RGBA')


def blur_bg(arr, dark=0.45):
    im = Image.fromarray(arr).resize((135, 240), Image.BILINEAR).filter(ImageFilter.GaussianBlur(4)).resize((W, H), Image.BILINEAR)
    a = np.asarray(im).astype(np.float32) * (1 - dark)
    return Image.fromarray(a.astype(np.uint8)).convert('RGBA')


def overlays(img, style, t, acc, total):
    d = ImageDraw.Draw(img)
    if style == 'cinema':
        d.rectangle([0, 0, W, 90], fill=(0, 0, 0, 255)); d.rectangle([0, H - 90, W, H], fill=(0, 0, 0, 255))
    elif style == 'vhs':
        f = font('mono', 46)
        if int(t * 2) % 2 == 0 or t > 1.5: d.text((70, 120), 'PLAY ▶', font=f, fill=(255, 255, 255))
        d.text((70, H - SAFE_B() - 80), 'NOV 27 1998  %02d:%02d' % (19 + int(t) // 60, int(t * 3) % 60), font=font('mono', 40), fill=(255, 255, 255))
    elif style == 'tech':
        c = rgb(acc) + (230,); L = 70; m = 60
        for (x, y, sx, sy) in [(m, 150, 1, 1), (W - m - 150, 150, -1, 1), (m, H - 330, 1, -1), (W - m - 150, H - 330, -1, -1)]:
            d.line([(x, y), (x + sx * L, y)], fill=c, width=5); d.line([(x, y), (x, y + sy * L)], fill=c, width=5)
        d.text((m + 10, 165), 'REC %05.2f' % t, font=font('mono', 30), fill=c)
        if int(t * 2) % 2 == 0: d.ellipse([m + 210, 172, m + 228, 190], fill=(255, 60, 60, 255))


def SAFE_B(): return K.SAFE_B


# ---------------- text with highlights ----------------
def parse_hl(text):
    """'Your *sky* is different' -> [(word, highlighted)]"""
    out = []; on = False
    for tok in text.split(' '):
        w = tok; h = on
        if w.startswith('*'): h = True; w = w[1:]; on = True
        if w.endswith('*') or w.endswith('*,') or w.endswith('*.'):
            w = w.replace('*', ''); out.append((w, True)); on = False; continue
        out.append((w, h or on))
    return out


def story_text(img, text, style, acc, y, alpha=1.0, size=None, words=None, align='center'):
    st = STY[style]; sz = size or st['size']
    f = font(st['font'], sz)
    words_l = parse_hl(text)
    d = ImageDraw.Draw(img)
    # wrap
    lines, cur, curw = [], [], 0
    sp = d.textlength(' ', font=f)
    for w, h in words_l:
        ww = d.textlength(w, font=f)
        if cur and curw + sp + ww > TXT_W: lines.append(cur); cur, curw = [], 0
        cur.append((w, h, ww)); curw += (sp if len(cur) > 1 else 0) + ww
    if cur: lines.append(cur)
    lh = int(sz * 1.22); a = int(255 * alpha); acc_c = rgb(acc)
    ov = Image.new('RGBA', img.size, (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
    shown = 0
    for li, ln in enumerate(lines):
        tw = sum(x[2] for x in ln) + sp * (len(ln) - 1)
        x = CX - tw / 2 if align == 'center' else 90
        yy_ = y + li * lh
        for w, h, ww in ln:
            shown += 1
            if words is not None and shown > words: break
            if h:
                if st['hl'] == 'box':
                    od.rectangle([x - 10, yy_ + sz * 0.08, x + ww + 10, yy_ + sz * 1.12], fill=acc_c + (int(235 * alpha),))
                elif st['hl'] == 'underline':
                    od.rectangle([x, yy_ + sz * 1.0, x + ww, yy_ + sz * 1.0 + 8], fill=acc_c + (a,))
                elif st['hl'] == 'bracket':
                    od.text((x - sp * 0.9, yy_), '[', font=f, fill=acc_c + (a,)); od.text((x + ww + 4, yy_), ']', font=f, fill=acc_c + (a,))
            fill = st['fill']
            if h and st['hl'] in ('color', 'bracket'): fill = acc_c
            if h and st['hl'] == 'box': fill = (18, 18, 18)
            if not (h and st['hl'] == 'box'):
                od.text((x + 3, yy_ + 4), w, font=f, fill=(0, 0, 0, int(170 * alpha)))
            od.text((x, yy_), w, font=f, fill=tuple(fill) + (a,))
            x += ww + sp
    img.alpha_composite(ov)
    return y + lh * len(lines)


def small_text(img, text, style, y, alpha=1.0, fill=(235, 235, 235), size=44):
    f = font('sansm' if style not in ('vhs', 'tech') else 'mono', size)
    lines = K.wrap(text, f, TXT_W)
    return K.draw_lines(img, lines, f, CX, y, fill, alpha=int(255 * alpha))


# ---------------- phone ----------------
def phone_frame(sw, sh, raw=True):
    """Return (body RGBA, screen offset, screen mask) for a code-drawn iPhone."""
    bez = int(sw * 0.045); rad = int(sw * 0.13)
    bw, bh = sw + 2 * bez, sh + 2 * bez
    body = Image.new('RGBA', (bw, bh), (0, 0, 0, 0)); d = ImageDraw.Draw(body)
    d.rounded_rectangle([0, 0, bw - 1, bh - 1], rad + bez, fill=(26, 26, 30, 255))
    d.rounded_rectangle([3, 3, bw - 4, bh - 4], rad + bez - 3, outline=(130, 130, 140, 255), width=3)
    m = Image.new('L', (sw, sh), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, sw - 1, sh - 1], rad, fill=255)
    pad = 50
    sh_img = Image.new('RGBA', (bw + 2 * pad, bh + 2 * pad), (0, 0, 0, 0))
    mm = Image.new('L', sh_img.size, 0); ImageDraw.Draw(mm).rounded_rectangle([pad + 10, pad + 30, pad + bw - 10, pad + bh + 20], rad, fill=150)
    sh_img.putalpha(mm.filter(ImageFilter.GaussianBlur(24)))
    sh_img = Image.merge('RGBA', (Image.new('L', sh_img.size, 0),) * 3 + (sh_img.getchannel('A'),))
    return dict(body=body, shadow=sh_img, pad=pad, bez=bez, mask=m, sw=sw, sh=sh, island=(int(sw * 0.30), int(sw * 0.085)))


def draw_phone(img, P, screen, cx, top, island=True, angle=0.0, scale=1.0):
    lay = Image.new('RGBA', P['shadow'].size, (0, 0, 0, 0))
    lay.alpha_composite(P['shadow'])
    lay.alpha_composite(P['body'], (P['pad'], P['pad']))
    lay.paste(screen.convert('RGB'), (P['pad'] + P['bez'], P['pad'] + P['bez']), P['mask'])
    if island:
        iw, ih = P['island']; bw = P['body'].width
        ImageDraw.Draw(lay).rounded_rectangle([P['pad'] + bw / 2 - iw / 2, P['pad'] + P['bez'] + ih * 0.35, P['pad'] + bw / 2 + iw / 2, P['pad'] + P['bez'] + ih * 1.35], ih / 2, fill=(0, 0, 0, 255))
    if scale != 1.0: lay = lay.resize((int(lay.width * scale), int(lay.height * scale)), Image.BILINEAR)
    if angle: lay = lay.rotate(angle, resample=Image.BICUBIC, expand=True)
    img.alpha_composite(lay, (int(cx - lay.width / 2), int(top - P['pad'] * scale)))


def card_img(path, crop_top=0.0):
    im = Image.open(os.path.join(ROOT, path)).convert('RGB')
    if crop_top: im = im.crop((0, int(im.height * crop_top), im.width, im.height))
    return im


# ---------------- end card ----------------
def end_card(img, app, acc, lt, style, cta):
    a = ease(lt / 0.6)
    ic = K.icon_img(app, 260)
    img.alpha_composite(ic, (int(CX - 130), int(470 + (1 - a) * 60)))
    f1, l1 = K.fit_font(app['name'], FONTS['sans'], 72, TXT_W, 2)
    y = K.draw_lines(img, l1, f1, CX, 790, (255, 255, 255), alpha=int(255 * a))
    f2 = font('sans', 52)
    y = K.draw_lines(img, K.wrap('Search "%s" on the App Store' % app['search'], f2, TXT_W), f2, CX, y + 34, rgb(acc), alpha=int(255 * a))
    if app.get('android'): y = K.draw_lines(img, ['Also on Google Play'], font('sansm', 40), CX, y + 8, (230, 230, 230), alpha=int(255 * a))
    if cta: y = story_text(img, cta, 'modern', acc, y + 50, alpha=a, size=50)
    # ORIENTPRO brand line
    lg = Image.open(LOGO).convert('RGBA').resize((64, 64), Image.LANCZOS)
    f3 = font('sansm', 34); txt = 'by ORIENTPRO  ·  orlproducts.com'
    tw = ImageDraw.Draw(img).textlength(txt, font=f3)
    x0 = CX - (tw + 80) / 2; yb = H - K.SAFE_B - 150
    lg.putalpha(lg.getchannel('A').point(lambda v: int(v * a)))
    img.alpha_composite(lg, (int(x0), int(yb)))
    ImageDraw.Draw(img).text((x0 + 80, yb + 14), txt, font=f3, fill=(240, 240, 240, int(255 * a)))


def disclaimer(img, app):
    K.disclaimer(img, app)


# ---------------- film render ----------------
def render_film(fm, app, outdir):
    style = fm['style']; acc = fm['accent']
    shots = fm['shots']
    durs = [s.get('dur', 3.2) for s in shots]
    total = sum(durs)
    raw = '/tmp/film_%s.mp4' % os.path.splitext(fm['file'])[0]
    enc = subprocess.Popen(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', '%dx%d' % (W, H), '-r', str(FPS),
                            '-i', '-', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-threads', '2', '-pix_fmt', 'yuv420p', raw], stdin=subprocess.PIPE)
    fi = 0; t0 = 0.0; last_arr = None
    for si, s in enumerate(shots):
        d = durs[si]; n = int(round(d * FPS)); kind = s['type']
        src = None; P = None; screen_clip = None; scr_img = None
        if kind == 'broll':
            src = Clip(s['clip'], s.get('start', 0), s.get('speed', 1.0))
        elif kind in ('real', 'screen'):
            bgc = s.get('bg')
            if bgc: src = Clip(bgc, s.get('bgstart', 0), 0.6)
            if kind == 'real':
                sw = s.get('sw', 560); sh = int(sw * s.get('ratio', 2.174))
                screen_clip = Clip('real:' + s['file'], s.get('start', 0), s.get('speed', 1.0), size=(sw, sh))
                P = phone_frame(sw, sh)
            else:
                im = card_img(s['shot'], s.get('crop_top', 0))
                maxh = s.get('maxh', 1020); sw = s.get('sw', 520)
                if sw * im.height / im.width > maxh: sw = int(maxh * im.width / im.height)
                sh = int(sw * im.height / im.width)
                scr_img = im.resize((sw, sh), Image.LANCZOS)
                P = phone_frame(sw, sh) if app['raw'] else None
        for k in range(n):
            t = k / FPS; T = t0 + t
            if src is not None:
                arr = src.next(); last_arr = arr if arr is not None else last_arr
            if kind == 'broll':
                z = 1 + s.get('zoom', 0.06) * (t / d)
                im = Image.fromarray(last_arr)
                if z != 1:
                    cw, ch = int(W / z), int(H / z); im = im.crop(((W - cw) // 2, (H - ch) // 2, (W + cw) // 2, (H + ch) // 2)).resize((W, H), Image.BILINEAR)
                fr = grade(np.asarray(im), style, fi, dark=s.get('dark', 0.25))
            elif kind in ('real', 'screen'):
                if last_arr is not None: fr = grade(np.asarray(blur_bg(last_arr, 0.5).convert('RGB')), style, fi)
                else: fr = K.gradient(W, H, fm['top'], fm['bot'])
            else:
                fr = K.gradient(W, H, fm['top'], fm['bot']) if last_arr is None else grade(np.asarray(blur_bg(last_arr, 0.55).convert('RGB')), style, fi)
            # content
            a_in = ease(t / 0.45)
            if kind in ('real', 'screen'):
                top = s.get('top', 600) + (1 - a_in) * 140
                ang = s.get('tilt', 0) * math.sin(t * 0.8)
                if kind == 'real':
                    scr = Image.fromarray(screen_clip.next())
                    draw_phone(fr, P, scr, CX, top, island=True, angle=ang)
                elif P is not None:
                    draw_phone(fr, P, scr_img, CX, top, island=scr_img.height / scr_img.width > 2.0, angle=ang)
                else:
                    c = K.add_shadow(_rounded(scr_img), 40)
                    if ang: c = c.rotate(ang, resample=Image.BICUBIC, expand=True)
                    fr.alpha_composite(c, (int(CX - c.width / 2), int(top - 60)))
            if kind == 'end':
                end_card(fr, app, acc, t, style, fm.get('cta'))
            if s.get('text'):
                ty = {'top': 270, 'center': 760, 'lower': 1180}[s.get('pos', 'top' if kind in ('real', 'screen') else 'center')]
                wv = int(t / 0.12) + 1 if s.get('type_on', style in ('tech', 'vhs')) else None
                al = a_in if wv is None else 1.0
                if t > d - 0.3 and si < len(shots) - 1 and not s.get('hold'): al *= max(0, (d - t) / 0.3)
                y2 = story_text(fr, s['text'], style, acc, ty, alpha=al, words=wv, size=s.get('size'))
                if s.get('sub'): small_text(fr, s['sub'], style, y2 + 20, alpha=al * ease((t - 0.4) / 0.4))
            overlays(fr, style, T, acc, total)
            K.brand_tag(fr, app, acc)
            disclaimer(fr, app)
            # transitions
            if si > 0 and t < 0.25:
                tr = fm.get('trans', 'dip')
                if tr == 'dip': fr.alpha_composite(Image.new('RGBA', (W, H), (0, 0, 0, int(255 * (1 - t / 0.25)))))
                elif tr == 'flash': fr.alpha_composite(Image.new('RGBA', (W, H), (255, 255, 255, int(200 * (1 - t / 0.25)))))
                elif tr == 'glitch' and k < 5:
                    a2 = np.asarray(fr).copy(); off = (5 - k) * 14
                    a2[..., 0] = np.roll(a2[..., 0], off, 1); a2[::7] = np.roll(a2[::7], -off * 2, 1); fr = Image.fromarray(a2)
            if T < 0.3: fr.alpha_composite(Image.new('RGBA', (W, H), (0, 0, 0, int(255 * (1 - T / 0.3)))))
            enc.stdin.write(fr.convert('RGB').tobytes()); fi += 1
        for c in (src, screen_clip):
            if c: c.close()
        t0 += d
    enc.stdin.close(); enc.wait()
    os.makedirs(outdir, exist_ok=True); out = os.path.join(outdir, fm['file'])
    m = os.path.join(MUSIC, 'mixkit_%s.mp3' % fm['music'])
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', raw, '-ss', str(fm.get('music_start', 0)), '-i', m, '-filter_complex',
                    '[1:a]atrim=0:%.2f,asetpts=PTS-STARTPTS,afade=t=in:d=0.6,afade=t=out:st=%.2f:d=1.8,loudnorm=I=-14:TP=-1.5:LRA=11[a]' % (total, total - 1.9),
                    '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-shortest', '-movflags', '+faststart', out], check=True)
    os.remove(raw)
    return out


def _rounded(im):
    m = Image.new('L', im.size, 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, im.width - 1, im.height - 1], 40, fill=255)
    o = Image.new('RGBA', im.size, (0, 0, 0, 0)); o.paste(im, (0, 0), m); return o


# ---------------- story stills ----------------
def render_still(sp, app, outdir):
    style = sp['style']; acc = sp['accent']
    if sp.get('clip'):
        c = Clip(sp['clip'], sp.get('start', 1.0)); arr = c.next(); c.close()
        fr = grade(arr, style, 3, dark=sp.get('dark', 0.3))
    else:
        fr = K.gradient(W, H, sp['top'], sp['bot'], angle=True)
    if sp.get('shot'):
        im = card_img(sp['shot'], sp.get('crop_top', 0))
        sw = sp.get('sw', 500); maxh = sp.get('maxh', 900)
        if sw * im.height / im.width > maxh: sw = int(maxh * im.width / im.height)
        im = im.resize((sw, int(sw * im.height / im.width)), Image.LANCZOS)
        if app['raw']:
            P = phone_frame(im.width, im.height); draw_phone(fr, P, im, CX + sp.get('dx', 0), sp.get('ptop', 760), island=im.height / im.width > 2.0, angle=sp.get('tilt', 0))
        else:
            cc = K.add_shadow(_rounded(im), 40)
            if sp.get('tilt'): cc = cc.rotate(sp['tilt'], resample=Image.BICUBIC, expand=True)
            fr.alpha_composite(cc, (int(CX - cc.width / 2 + sp.get('dx', 0)), sp.get('ptop', 760) - 60))
    if sp.get('kicker'):
        story_text(fr, sp['kicker'], 'modern', acc, 270, size=40)
    y = story_text(fr, sp['headline'], style, acc, sp.get('hy', 360), size=sp.get('size'))
    if sp.get('sub'): small_text(fr, sp['sub'], style, y + 24, size=46)
    overlays(fr, style, 2.0, acc, 3)
    K.brand_tag(fr, app, acc)
    # CTA sticker zone (bottom) + brand
    f = font('sans', 46); txt = 'Search "%s" on the App Store' % app['search']
    d = ImageDraw.Draw(fr); tw = d.textlength(txt, font=f)
    yb = H - 250 - 120
    d.rounded_rectangle([CX - tw / 2 - 34, yb, CX + tw / 2 + 34, yb + 86], 43, fill=rgb(acc) + (255,))
    d.text((CX - tw / 2, yb + 18), txt, font=f, fill=(18, 18, 18))
    if app.get('disclaimer'):
        f2 = font('sansm', 32); t2 = app['disclaimer']; tw2 = d.textlength(t2, font=f2)
        d.text((CX - tw2 / 2, yb - 52), t2, font=f2, fill=(255, 255, 255))
    os.makedirs(outdir, exist_ok=True); out = os.path.join(outdir, sp['file'])
    fr.convert('RGB').save(out, quality=92)
    return out


if __name__ == '__main__':
    spec = json.load(open(sys.argv[1])); outroot = sys.argv[2]
    flt = sys.argv[3] if len(sys.argv) > 3 else None
    force = '--force' in sys.argv
    for fm in spec.get('films', []):
        if flt and flt not in fm['file']: continue
        app = spec['apps'][fm['app']]; od = os.path.join(outroot, app['folder'])
        if os.path.exists(os.path.join(od, fm['file'])) and not force: print('skip', fm['file']); continue
        print(render_film(fm, app, od), flush=True)
    for sp in spec.get('stills', []):
        if flt and flt not in sp['file']: continue
        app = spec['apps'][sp['app']]
        print(render_still(sp, app, os.path.join(outroot, app['folder'], 'Story_1080x1920')), flush=True)
