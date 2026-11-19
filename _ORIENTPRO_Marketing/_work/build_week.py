#!/usr/bin/env python3
"""Build ORIENTPRO vertical videos (1080x1920, ~20s) and carousels (1080x1350)
from App Store screenshots in assets/apps/<app>/iphone-NN.webp.
Usage: python3 build_week.py <spec.json> <outdir>
"""
import json, os, subprocess, sys, math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))  # orlproductscom
APPS = os.path.join(ROOT, 'assets', 'apps')
ICONS = os.path.join(ROOT, 'assets', 'icons')
FB = os.path.join(HERE, 'GTW-Bold.ttf')
FM = os.path.join(HERE, 'GTW-Medium.ttf')
W, H, FPS = 1080, 1920, 30


def font(p, s):
    return ImageFont.truetype(p, s)


def hexrgb(h):
    h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def gradient(w, h, top, bot):
    t, b = hexrgb(top), hexrgb(bot)
    g = Image.new('RGB', (1, h))
    for y in range(h):
        k = y / (h - 1)
        g.putpixel((0, y), tuple(int(t[i] + (b[i] - t[i]) * k) for i in range(3)))
    return g.resize((w, h))


def wrap(draw, text, f, maxw):
    words, lines, cur = text.split(), [], ''
    for wd in words:
        t = (cur + ' ' + wd).strip()
        if draw.textlength(t, font=f) <= maxw:
            cur = t
        else:
            if cur: lines.append(cur)
            cur = wd
    if cur: lines.append(cur)
    return lines


def text_block(draw, text, f, cx, y, maxw, fill, lh=1.15, shadow=True):
    lines = wrap(draw, text, f, maxw)
    for ln in lines:
        tw = draw.textlength(ln, font=f)
        x = cx - tw / 2
        if shadow:
            draw.text((x + 3, y + 4), ln, font=f, fill=(0, 0, 0))
        draw.text((x, y), ln, font=f, fill=fill)
        y += int(f.size * lh)
    return y


def card(img, width, radius=44):
    im = img.convert('RGB')
    h = int(im.height * width / im.width)
    im = im.resize((width, h), Image.LANCZOS)
    mask = Image.new('L', im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, im.width - 1, im.height - 1], radius, fill=255)
    out = Image.new('RGBA', im.size)
    out.paste(im, (0, 0), mask)
    return out


def shadowed(c):
    pad = 60
    sh = Image.new('RGBA', (c.width + pad * 2, c.height + pad * 2), (0, 0, 0, 0))
    m = Image.new('L', sh.size, 0)
    ImageDraw.Draw(m).rounded_rectangle([pad, pad + 20, pad + c.width, pad + c.height + 20], 44, fill=150)
    m = m.filter(ImageFilter.GaussianBlur(28))
    sh.putalpha(m)
    sh.paste(c, (pad, pad), c)
    return sh, pad


def ease(t):
    t = max(0.0, min(1.0, t)); return 1 - (1 - t) ** 3


def shot(app, n):
    return Image.open(os.path.join(APPS, app, 'iphone-%02d.webp' % n))


def build_video(v, outdir, workdir):
    app, top, bot, acc = v['app'], v['top'], v['bot'], v.get('accent', '#FFC27A')
    bg = gradient(W, H, top, bot).convert('RGBA')
    fh, fc, fe, fs = font(FB, 86), font(FB, 58), font(FB, 64), font(FM, 40)
    scenes = v['scenes']  # list of {shot, text}
    hook_t, scene_t, end_t = 2.6, 3.6, 3.4
    total = hook_t + scene_t * len(scenes) + end_t
    cards = []
    for s in scenes:
        c = card(shot(app, s['shot']), 820)
        if c.height > 1300:
            c = card(shot(app, s['shot']), int(820 * 1300 / c.height))
        cards.append(shadowed(c))
    icon = Image.open(os.path.join(ICONS, v['icon'])).convert('RGBA').resize((300, 300), Image.LANCZOS)
    im = Image.new('L', icon.size, 0); ImageDraw.Draw(im).rounded_rectangle([0, 0, 299, 299], 68, fill=255)
    icon.putalpha(Image.composite(icon.getchannel('A'), Image.new('L', icon.size, 0), im))
    frames = int(total * FPS)
    raw = '/tmp/tmp_video.mp4'
    p = subprocess.Popen(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', '%dx%d' % (W, H),
                          '-r', str(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23',
                          '-pix_fmt', 'yuv420p', raw], stdin=subprocess.PIPE)
    for fi in range(frames):
        t = fi / FPS
        fr = bg.copy(); d = ImageDraw.Draw(fr)
        if t < hook_t:
            # hook: big text + first card rising
            text_block(d, v['hook'], fh, W / 2, 230, 940, (255, 255, 255))
            sh, pad = cards[0]
            k = ease(t / 1.2)
            y = int(1920 - (1920 - 700) * k)
            fr.alpha_composite(sh, (int(W / 2 - sh.width / 2), y - pad))
        elif t < hook_t + scene_t * len(scenes):
            i = int((t - hook_t) // scene_t); lt = (t - hook_t) - i * scene_t
            sh, pad = cards[i]
            z = 1 + 0.04 * (lt / scene_t)
            shz = sh.resize((int(sh.width * z), int(sh.height * z)))
            cx = W / 2
            if lt < 0.35 and i > 0:  # slide in
                cx = W / 2 + (1 - ease(lt / 0.35)) * W
                ps, pp = cards[i - 1]
                fr.alpha_composite(ps, (int(W / 2 - ps.width / 2 - ease(lt / 0.35) * W), 560 - pp))
            fr.alpha_composite(shz, (int(cx - shz.width / 2), 560 - pad))
            # caption pill at top
            text_block(d, scenes[i]['text'], fc, W / 2, 250, 940, (255, 255, 255))
        else:
            lt = t - hook_t - scene_t * len(scenes)
            a = ease(lt / 0.5)
            fr.alpha_composite(icon, (int(W / 2 - 150), int(560 + (1 - a) * 60)))
            y = text_block(d, v['name'], fe, W / 2, 920, 960, (255, 255, 255))
            y = text_block(d, 'Search "%s" on the App Store' % v['search'], fc, W / 2, y + 40, 960, hexrgb(acc))
            if v.get('android'):
                y = text_block(d, 'Also on Google Play', fs, W / 2, y + 10, 960, (230, 230, 230))
            text_block(d, v['sub'], fs, W / 2, y + 30, 900, (230, 230, 230))
        p.stdin.write(fr.convert('RGB').tobytes())
    p.stdin.close(); p.wait()
    out = os.path.join(outdir, v['file'])
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', raw, '-i', os.path.join(workdir, v['music']),
                    '-filter_complex', '[1:a]afade=t=out:st=%.2f:d=1.2[a]' % (total - 1.3), '-map', '0:v', '-map', '[a]',
                    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-shortest', out], check=True)
    os.remove(raw)
    return out


def build_carousel(c, outdir):
    fh, fb, fs = font(FB, 74), font(FM, 44), font(FM, 34)
    paths = []
    for k, s in enumerate(c['slides'], 1):
        img = gradient(1080, 1350, c['top'], c['bot']).convert('RGBA'); d = ImageDraw.Draw(img)
        y = text_block(d, s['title'], fh, 540, 80 if s.get('shot') else 380, 960, (255, 255, 255))
        if s.get('body'):
            y = text_block(d, s['body'], fb, 540, y + 20, 920, (235, 235, 235), shadow=False)
        if s.get('shot'):
            cd = card(shot(c['app'], s['shot']), 520)
            avail = 1350 - (y + 40) - 70
            if cd.height > avail:
                cd = card(shot(c['app'], s['shot']), int(520 * avail / cd.height))
            sh, pad = shadowed(cd)
            img.alpha_composite(sh, (int(540 - sh.width / 2), y + 40 - pad))
        d.text((540, 1305), c['footer'], font=fs, fill=(220, 220, 220), anchor='mm')
        d.text((1040, 50), '%d/%d' % (k, len(c['slides'])), font=fs, fill=(220, 220, 220), anchor='rm')
        p = os.path.join(outdir, '%s_%02d.jpg' % (c['prefix'], k))
        img.convert('RGB').save(p, quality=90); paths.append(p)
    return paths


if __name__ == '__main__':
    spec = json.load(open(sys.argv[1])); outdir = sys.argv[2]; os.makedirs(outdir, exist_ok=True)
    only = sys.argv[3] if len(sys.argv) > 3 else None
    for v in spec.get('videos', []):
        if only and only not in v['file']: continue
        print(build_video(v, outdir, HERE), flush=True)
    if not only:
        for c in spec.get('carousels', []):
            print(build_carousel(c, outdir), flush=True)
