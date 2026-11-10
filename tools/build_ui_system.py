#!/usr/bin/env python3
"""Build ui-system.html: the living ORIENTPRO Paper reference, rendered from the real CSS and app data.

Usage:  python3 tools/build_ui_system.py
Reads   site/src/data/apps/*.json, site/src/styles/*.css, assets/badges, assets/icons
Writes  ui-system.html (repo root, excluded from the public site by .vercelignore)
"""
import glob, html, json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
E = lambda s: html.escape(str(s), quote=True)

apps = [json.load(open(f)) for f in sorted(glob.glob(os.path.join(ROOT, "site/src/data/apps/*.json")))]
order = {"current": 0, "legacy": 1}
apps.sort(key=lambda a: (order[a["group"]], not a["priority"], a["name"].lower()))
by = {a["slug"]: a for a in apps}

ICON = lambda name: f'<svg aria-hidden="true"><use href="assets/ui/platform-icons.svg#{name}"/></svg>'


def chips(a, surfaces=True):
    p, s = a["platforms"], a["surfaces"]
    items = []
    if p.get("iphone"): items.append(("iphone", "iPhone"))
    if p.get("ipad"): items.append(("ipad", "iPad"))
    if p.get("mac") == "native": items.append(("mac", "Mac"))
    if p.get("watch"): items.append(("watch", "Apple Watch"))
    if p.get("vision") == "native": items.append(("vision", "Apple Vision Pro"))
    if p.get("android"): items.append(("android", "Android"))
    if p.get("wearOs"): items.append(("wear", "Wear OS"))
    if surfaces:
        if s.get("widgets"): items.append(("widgets", "Widgets"))
        if s.get("liveActivities"): items.append(("live-activities", "Live Activities"))
        if s.get("controlCenter"): items.append(("control-center", "Control Center"))
        if s.get("siri"): items.append(("voice", "Siri"))
    li = "".join(f'<li class="op-chip">{ICON(i)}{E(t)}</li>' for i, t in items)
    if a.get("iosStatus") == "in-review":
        li += '<li class="op-chip op-chip--note">iOS in review</li>'
    return f'<ul class="op-chips">{li}</ul>'


def appcard(a):
    href = ("https://orlproducts.com" + a["web"]["landing"]) if a["web"]["landing"] else None
    href = href or (a["appStore"] or {}).get("url") or a["googlePlay"]["url"]
    return (f'<a class="op-appcard" data-app="{a["slug"]}" href="{E(href)}">'
            f'<img class="op-icon" src="assets/icons/{a["slug"]}.png" alt="" width="64" height="64" loading="lazy">'
            f'<div><p class="op-appcard__name">{E(a["name"])}</p>'
            f'<p class="op-appcard__sub">{E(a["subtitle"] or a["category"] or "")}</p></div>'
            f'{chips(a, surfaces=False)}</a>')


def swatch(a):
    ac = a["accent"]
    return (f'<div class="ds-acc" data-app="{a["slug"]}"><img class="op-icon" src="assets/icons/{a["slug"]}.png" alt="" width="40" height="40" loading="lazy">'
            f'<div><b>{E(a["name"].split(":")[0].split(" - ")[0].split(" – ")[0])}</b>'
            f'<span class="ds-dots"><i style="background:{ac["base"]}"></i><code>{ac["base"]}</code></span>'
            f'<span class="ds-dots"><i style="background:{ac["ink"]}"></i><code>{ac["ink"]}</code> chữ nền sáng</span>'
            f'<span class="ds-dots"><i style="background:{ac["inkDark"]}"></i><code>{ac["inkDark"]}</code> chữ nền tối</span></div></div>')


badge_langs = [("en-us", "en", "English"), ("vi-vn", "vi", "Tiếng Việt"), ("ja-jp", "ja", "日本語"),
               ("es-es", "es", "Español"), ("fr-fr", "fr", "Français"), ("de-de", "de", "Deutsch")]
badges = "".join(
    f'<div class="ds-badgerow" lang="{g}"><span class="ds-label">{E(n)}</span><div class="op-badges">'
    f'<a href="https://apps.apple.com/app/id6822687291"><picture><source srcset="assets/badges/app-store-white-{l}.svg" media="(prefers-color-scheme: dark)"><img class="op-badge-apple" src="assets/badges/app-store-black-{l}.svg" alt="Download on the App Store"></picture></a>'
    f'<a href="https://play.google.com/store/apps/details?id=com.orientpro.vizmath"><img class="op-badge-google" src="assets/badges/google-play-{g}.png" alt="Get it on Google Play"></a>'
    f'</div></div>' for l, g, n in badge_langs)

current = [a for a in apps if a["group"] == "current"]
legacy = [a for a in apps if a["group"] == "legacy"]
n_watch = sum(1 for a in apps if a["platforms"].get("watch"))
issues = [(a, i) for a in apps for i in a["issues"] if "pages.dev" in i]

page = f'''<meta charset="utf-8">
<title>ORIENTPRO Paper</title>
<meta name="robots" content="noindex">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Comfortaa:wght@400;600;700&family=M+PLUS+Rounded+1c:wght@400;700&display=swap">
<link rel="stylesheet" href="site/src/styles/tokens.css">
<link rel="stylesheet" href="site/src/styles/app-accents.css">
<link rel="stylesheet" href="site/src/styles/components.css">
<style>
  /* Documentation-only layout; everything shown inside .ds-demo uses the real system classes */
  body {{ margin: 0; background: var(--paper); }}
  .ds-head {{ padding-block: var(--space-8) var(--space-6); border-bottom: 1px solid var(--rule); }}
  .ds-head h1 {{ font-size: clamp(2.25rem, 7vw, var(--text-4xl)); }}
  .ds-nav {{ position: sticky; top: env(safe-area-inset-top, 0px); z-index: 5; background: var(--paper); border-bottom: 1px solid var(--rule); }}
  body::before {{ content: ""; position: fixed; inset: 0 0 auto; height: env(safe-area-inset-top, 0px); z-index: 10; background: var(--paper); }}
  .ds-nav ul {{ display: flex; gap: var(--space-2) var(--space-5); flex-wrap: wrap; list-style: none; margin: 0; padding: var(--space-3) 0; font-size: var(--text-sm); }}
  .ds-nav a {{ color: var(--ink-soft); text-decoration: none; }}
  .ds-sec {{ padding-block: var(--space-8) 0; scroll-margin-top: 72px; }}
  .ds-sec > h2 {{ margin-bottom: var(--space-3); }}
  .ds-sec > p {{ color: var(--ink-soft); }}
  .ds-demo {{ margin-top: var(--space-5); padding: var(--space-5); border: 1px solid var(--rule); border-radius: var(--radius-lg); background: var(--paper-2); display: flex; flex-wrap: wrap; gap: var(--space-4); align-items: center; }}
  .ds-demo--col {{ flex-direction: column; align-items: stretch; }}
  .ds-grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 230px), 1fr)); gap: var(--space-3); margin-top: var(--space-5); }}
  .ds-sw {{ border: 1px solid var(--rule); border-radius: var(--radius-md); overflow: hidden; background: var(--paper); font-size: var(--text-xs); }}
  .ds-sw i {{ display: block; height: 52px; }}
  .ds-sw div {{ padding: var(--space-2) var(--space-3); }}
  .ds-sw b, .ds-acc b {{ display: block; font-size: var(--text-sm); }}
  .ds-sw code, .ds-acc code {{ font-family: var(--font-mono); font-size: 12px; color: var(--ink-soft); }}
  .ds-acc {{ display: flex; gap: var(--space-3); align-items: flex-start; padding: var(--space-3); border: 1px solid var(--rule); border-radius: var(--radius-md); background: var(--paper); min-width: 0; }}
  .ds-acc .op-icon {{ width: 40px; height: 40px; }}
  .ds-acc > div {{ min-width: 0; font-size: var(--text-xs); color: var(--ink-soft); }}
  .ds-dots {{ display: flex; align-items: center; gap: 6px; margin-top: 3px; }}
  .ds-dots i {{ width: 12px; height: 12px; border-radius: 50%; flex: none; box-shadow: 0 0 0 1px var(--rule); }}
  .ds-type {{ display: grid; gap: var(--space-4); margin-top: var(--space-5); }}
  .ds-type > div {{ display: grid; grid-template-columns: 150px minmax(0, 1fr); gap: var(--space-4); align-items: baseline; border-bottom: 1px dashed var(--rule); padding-bottom: var(--space-3); }}
  .ds-label {{ font: 600 12px/1.3 var(--font-mono); color: var(--ink-faint); }}
  .ds-badgerow {{ display: grid; grid-template-columns: 110px minmax(0, 1fr); gap: var(--space-3); align-items: center; }}
  .ds-space {{ display: flex; flex-wrap: wrap; gap: var(--space-4); align-items: flex-end; }}
  .ds-space div {{ background: var(--app-accent); border-radius: 3px; }}
  .ds-motion {{ display: flex; gap: var(--space-5); flex-wrap: wrap; }}
  .ds-motion figure {{ margin: 0; text-align: center; font-size: var(--text-xs); color: var(--ink-soft); }}
  .ds-motion span {{ display: block; width: 64px; height: 64px; margin: 0 auto var(--space-2); border-radius: var(--radius-md); background: var(--app-accent); }}
  @media (prefers-reduced-motion: no-preference) {{
    .ds-motion span {{ animation: ds-bounce 2.4s infinite; }}
    .ds-motion figure:nth-child(1) span {{ animation-timing-function: var(--ease-out); }}
    .ds-motion figure:nth-child(2) span {{ animation-timing-function: var(--ease-inout); }}
    .ds-motion figure:nth-child(3) span {{ animation-timing-function: var(--ease-spring); }}
    @keyframes ds-bounce {{ 0%, 15% {{ transform: translateY(0); }} 45%, 70% {{ transform: translateY(-16px); }} 100% {{ transform: translateY(0); }} }}
  }}
  .ds-devices {{ display: flex; flex-wrap: wrap; gap: var(--space-6); align-items: flex-end; justify-content: center; }}
  .ds-devices figure {{ margin: 0; text-align: center; font-size: var(--text-xs); color: var(--ink-soft); max-width: 100%; }}
  .ds-devices figcaption {{ margin-top: var(--space-3); }}
  .ds-rules {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr)); gap: var(--space-4); margin-top: var(--space-5); }}
  .ds-rules div {{ padding: var(--space-4) var(--space-5); border-radius: var(--radius-md); border: 1px solid var(--rule); background: var(--paper); font-size: var(--text-sm); }}
  .ds-rules h3 {{ font-size: var(--text-md); margin-bottom: var(--space-2); }}
  .ds-rules .do h3 {{ color: var(--ok); }} .ds-rules .dont h3 {{ color: var(--danger); }}
  .ds-rules ul {{ margin: 0; padding-left: 1.1em; color: var(--ink-soft); }}
  .ds-warn {{ margin-top: var(--space-4); padding: var(--space-4) var(--space-5); border-radius: var(--radius-md); background: var(--paper-2); border: 1px solid var(--rule-strong); font-size: var(--text-sm); }}
  @media (max-width: 560px) {{ .ds-type > div, .ds-badgerow {{ grid-template-columns: 1fr; gap: var(--space-1); }} }}
</style>

<div class="op-page">
<header class="ds-head"><div class="op-wrap">
  <p class="op-eyebrow">ORIENTPRO · UI System · v1</p>
  <h1>ORIENTPRO Paper</h1>
  <p class="op-lead">Một hệ giao diện cho toàn bộ {len(apps)} app của ORIENTPRO trên web: nền giấy, chữ mực, font tròn Comfortaa, và mỗi app một màu nhấn lấy từ chính icon của nó. Mọi thứ trên trang này được dựng bằng đúng các file CSS và dữ liệu mà site dùng.</p>
</div></header>

<nav class="ds-nav" aria-label="Mục lục"><div class="op-wrap"><ul>
  <li><a href="#nguyen-tac">Nguyên tắc</a></li><li><a href="#mau">Màu</a></li><li><a href="#chu">Chữ</a></li><li><a href="#khoang-cach">Khoảng cách</a></li><li><a href="#chuyen-dong">Chuyển động</a></li><li><a href="#badge">Badge store</a></li><li><a href="#nen-tang">Nền tảng</a></li><li><a href="#the-app">Thẻ app</a></li><li><a href="#thiet-bi">Khung thiết bị</a></li><li><a href="#trang-phap-ly">Trang pháp lý</a></li>
</ul></div></nav>

<main class="op-wrap">

<section class="ds-sec" id="nguyen-tac">
  <h2>Nguyên tắc</h2>
  <div class="ds-rules">
    <div><h3>Một nhà, nhiều app</h3><p>Lưới, chữ, thành phần giống hệt nhau giữa các app. Chỉ màu nhấn thay đổi, bằng một thuộc tính <code>data-app</code> trên thẻ <code>&lt;html&gt;</code>.</p></div>
    <div><h3>Dữ liệu là nguồn duy nhất</h3><p>Tên app, nền tảng, badge, màu đều đọc từ <code>site/src/data/apps</code>. Trang web không tự ghi tay "có Mac" hay "có CarPlay".</p></div>
    <div><h3>Đọc được trước, đẹp sau</h3><p>Tương phản chữ đạt 4.5:1 ở cả nền sáng và tối. Nội dung hiện đầy đủ khi trang vừa tải xong, không chờ hiệu ứng.</p></div>
    <div><h3>Đúng luật thương hiệu</h3><p>Badge App Store và Google Play là ảnh gốc từ Apple và Google, không vẽ lại, không đổi màu.</p></div>
  </div>
</section>

<section class="ds-sec" id="mau">
  <h2>Màu</h2>
  <p>Màu nền chung, giữ từ các trang VizMath và Origami. Giá trị thứ hai là chế độ tối.</p>
  <div class="ds-grid">
    <div class="ds-sw"><i style="background:var(--paper)"></i><div><b>--paper</b><code>#FDFBF7 · #17140F</code></div></div>
    <div class="ds-sw"><i style="background:var(--paper-2)"></i><div><b>--paper-2</b><code>#F6EFE4 · #1F1B15</code></div></div>
    <div class="ds-sw"><i style="background:var(--ink)"></i><div><b>--ink</b><code>#1B1814 · #F5EFE6</code></div></div>
    <div class="ds-sw"><i style="background:var(--ink-soft)"></i><div><b>--ink-soft</b><code>#57504A · #B6ADA2</code></div></div>
    <div class="ds-sw"><i style="background:var(--rule)"></i><div><b>--rule</b><code>#E7DFD3 · #2E2820</code></div></div>
    <div class="ds-sw"><i style="background:var(--app-accent)"></i><div><b>ORIENTPRO</b><code>#F77E04 · màu nhấn mặc định</code></div></div>
  </div>
  <h3 style="margin-top:var(--space-7)">Màu nhấn của {len(apps)} app</h3>
  <p>Tách tự động từ icon. Mỗi app có ba giá trị: màu gốc để tô nền nút, và hai màu chữ đã chỉnh độ sáng cho đủ tương phản trên nền sáng và nền tối.</p>
  <div class="ds-grid">{"".join(swatch(a) for a in apps)}</div>
</section>

<section class="ds-sec" id="chu">
  <h2>Chữ</h2>
  <p>Comfortaa cho mọi chỗ, độ đậm 400, 600, 700. Trang tiếng Nhật tự chuyển sang M PLUS Rounded 1c. Tiếng Hàn và tiếng Trung dùng font tròn của hệ điều hành.</p>
  <div class="ds-type">
    <div><span class="ds-label">display · 56 / 700</span><span style="font-size:clamp(2rem,7vw,var(--text-4xl));font-weight:700;line-height:1.05">See the math move.</span></div>
    <div><span class="ds-label">h1 · 44 / 700</span><span style="font-size:clamp(1.75rem,5vw,var(--text-3xl));font-weight:700;line-height:1.1">Xem toán chuyển động</span></div>
    <div><span class="ds-label">h2 · 32 / 700</span><span style="font-size:var(--text-2xl);font-weight:700;line-height:1.15">Runs on iPhone, iPad and Apple Watch</span></div>
    <div><span class="ds-label">h3 · 24 / 700</span><span style="font-size:var(--text-xl);font-weight:700">Dữ liệu ở lại trên máy của bạn</span></div>
    <div><span class="ds-label">lead · 20 / 400</span><span class="op-lead" style="margin:0">Graph equations, drag the curve and explore surfaces in 3D.</span></div>
    <div><span class="ds-label">body · 17 / 400</span><span>Ăn quả nhớ kẻ trồng cây. Ơn thầy, nghĩa bạn, đường xa dặm dài. Đủ dấu tiếng Việt: ă â đ ê ô ơ ư, ả ã ạ ẩ ẫ ậ.</span></div>
    <div><span class="ds-label">small · 15 / 600</span><span style="font-size:var(--text-sm);font-weight:600">Updated 10 November 2026 · Version 1.0</span></div>
    <div><span class="ds-label">ja · M PLUS Rounded</span><span lang="ja" style="font-family:var(--font-ja);font-size:var(--text-lg)">数学が動き出す。iPhone、iPad、Apple Watch に対応。</span></div>
    <div><span class="ds-label">eyebrow · 13 / 700</span><span class="op-eyebrow">Privacy Policy</span></div>
  </div>
</section>

<section class="ds-sec" id="khoang-cach">
  <h2>Khoảng cách và bo góc</h2>
  <p>Lưới 4px. Bo góc icon app theo đúng tỉ lệ 22,37% của iOS.</p>
  <div class="ds-demo ds-space">
    {"".join(f'<figure style="margin:0;text-align:center;font-size:12px;color:var(--ink-soft)"><div style="width:{v}px;height:{v}px;margin:0 auto 6px"></div>{n}<br>{v}px</figure>' for n, v in [("1",4),("2",8),("3",12),("4",16),("5",24),("6",32),("7",48),("8",64),("9",96)])}
  </div>
  <div class="ds-demo">
    {"".join(f'<figure style="margin:0;text-align:center;font-size:12px;color:var(--ink-soft)"><div style="width:72px;height:72px;margin:0 auto 6px;background:var(--paper);border:1px solid var(--rule-strong);border-radius:var({t})"></div>{t}</figure>' for t in ["--radius-sm","--radius-md","--radius-lg","--radius-xl","--radius-icon"])}
  </div>
</section>

<section class="ds-sec" id="chuyen-dong">
  <h2>Chuyển động</h2>
  <p>Ba thời lượng (120, 240, 480ms) và ba đường cong. Tất cả về 0 khi người dùng bật "Giảm chuyển động". Cùng bộ token này dùng cho video App Preview ở Giai đoạn 4.</p>
  <div class="ds-demo ds-motion">
    <figure><span></span>--ease-out<br>vào màn hình</figure>
    <figure><span></span>--ease-inout<br>chuyển cảnh</figure>
    <figure><span></span>--ease-spring<br>nhấn, thả</figure>
  </div>
</section>

<section class="ds-sec" id="badge">
  <h2>Badge store</h2>
  <p>Ảnh gốc tải từ Apple Marketing Tools và Google Play Badges, lưu trong <code>assets/badges</code>. Hai badge luôn cùng chiều cao 44px. Badge theo ngôn ngữ của trang.</p>
  <div class="ds-demo ds-demo--col">{badges}
    <p class="op-badges-legal" style="margin:0">Apple, the Apple logo, iPhone, iPad, Apple Watch, Mac and Apple Vision Pro are trademarks of Apple Inc., registered in the U.S. and other countries. App Store is a service mark of Apple Inc. Google Play and the Google Play logo are trademarks of Google LLC.</p>
  </div>
  <div class="ds-rules">
    <div class="do"><h3>Nên</h3><ul><li>Dùng đúng file trong <code>assets/badges</code>, theo ngôn ngữ trang.</li><li>Bản đen trên nền sáng, bản trắng trên nền tối (dùng <code>&lt;picture&gt;</code> theo chế độ sáng/tối).</li><li>Link thẳng tới trang app trên store, không tới trang developer.</li><li>Đặt dòng ghi chú nhãn hiệu ở footer trang có badge.</li></ul></div>
    <div class="dont"><h3>Không</h3><ul><li>Vẽ lại, đổi màu, bóp méo, thêm bóng cho badge.</li><li>Tự làm badge "Watch", "Widget", "CarPlay": Apple không phát hành các badge này.</li><li>Dùng logo Apple hay robot Android đứng một mình.</li><li>Hiện badge Google Play cho app chưa có trên Play.</li></ul></div>
  </div>
</section>

<section class="ds-sec" id="nen-tang">
  <h2>Nền tảng và tính năng hệ thống</h2>
  <p>Chip chỉ hiện những gì có trong dữ liệu store của app. Mac và Apple Vision Pro chỉ hiện khi app có bản gốc. App iPad chạy trên Mac không được ghi là "Mac app". Hiện không app nào hỗ trợ CarPlay, nên không có chip CarPlay. {n_watch} app có Apple Watch.</p>
  <div class="ds-demo ds-demo--col" data-app="vizmath"><span class="ds-label">VizMath</span>{chips(by["vizmath"])}</div>
  <div class="ds-demo ds-demo--col" data-app="turbulenceforecast"><span class="ds-label">Turbulence Forecast</span>{chips(by["turbulenceforecast"])}</div>
  <div class="ds-demo ds-demo--col" data-app="raykin"><span class="ds-label">Raykin (iOS đang chờ duyệt)</span>{chips(by["raykin"])}</div>
</section>

<section class="ds-sec" id="the-app">
  <h2>Thẻ app</h2>
  <p>Dùng ở trang chủ, footer và mục "app khác". Màu viền khi rê chuột lấy theo màu nhấn của từng app.</p>
  <h3 style="margin-top:var(--space-5)">{len(current)} app hiện tại</h3>
  <div class="op-appgrid" style="margin-top:var(--space-4)">{"".join(appcard(a) for a in current)}</div>
  <h3 style="margin-top:var(--space-7)">{len(legacy)} app đời trước</h3>
  <div class="op-appgrid" style="margin-top:var(--space-4)">{"".join(appcard(a) for a in legacy)}</div>
</section>

<section class="ds-sec" id="nut">
  <h2>Nút</h2>
  <p>Nút chính tô màu nhấn của app, chữ trắng hoặc đen tuỳ màu nền. Mỗi trang chỉ có một nút chính.</p>
  {"".join(f'<div class="ds-demo" data-app="{s}"><span class="ds-label" style="min-width:110px">{E(by[s]["name"].split(":")[0])}</span><a class="op-button op-button--primary" href="#nut">Get the app</a><a class="op-button op-button--secondary" href="#nut">Support</a></div>' for s in ["vizmath","babi","paddlepilot","speedgunner","chemistry3d"])}
</section>

<section class="ds-sec" id="thiet-bi">
  <h2>Khung thiết bị</h2>
  <p>Một khung cho mỗi loại máy, đúng tỉ lệ màn hình thật. Cùng khung dùng cho trang web, ảnh store và video. Apple Watch có khung vuông bo góc; Wear OS dùng khung tròn.</p>
  <div class="ds-demo ds-devices" data-app="vizmath">
    <figure><div class="op-device op-device--iphone" style="width:200px"><img src="assets/images/vizmath/iphone-03-3d-wave-surface.jpg" alt="VizMath on iPhone showing a 3D wave surface" loading="lazy"></div><figcaption>op-device--iphone</figcaption></figure>
    <figure><div class="op-device op-device--ipad is-landscape" style="width:380px"><img src="assets/images/vizmath/ipad-04-3d-ripple-style.jpg" alt="VizMath on iPad showing a 3D ripple" loading="lazy"></div><figcaption>op-device--ipad is-landscape</figcaption></figure>
    <figure><div class="op-device op-device--mac" style="width:440px"><img src="assets/images/vizmath/mac-04-3d-ripple-style.jpg" alt="VizMath on Mac" loading="lazy"></div><figcaption>op-device--mac</figcaption></figure>
    <figure><div class="op-device op-device--watch" style="width:150px"><img src="assets/images/vizmath/watch-01-home.jpg" alt="VizMath on Apple Watch" loading="lazy"></div><figcaption>op-device--watch</figcaption></figure>
    <figure><div class="op-device op-device--android" style="width:190px"><img src="assets/images/vizmath/android/phone-04-3d-wave-surface.jpg" alt="VizMath on an Android phone" loading="lazy"></div><figcaption>op-device--android</figcaption></figure>
    <figure><div class="op-device op-device--wear" style="width:150px"><img src="assets/images/vizmath/android/wear-01-home.png" alt="VizMath on a round Wear OS watch" loading="lazy"></div><figcaption>op-device--wear</figcaption></figure>
  </div>
</section>

<section class="ds-sec" id="trang-phap-ly">
  <h2>Trang pháp lý và hỗ trợ</h2>
  <p>Privacy, Terms và Support của mọi app dùng chung một khuôn: mục lục dính, ngày cập nhật, bảng dữ liệu theo nền tảng, câu hỏi thường gặp, và khối liên hệ hiện email bằng chữ thường để Google và người duyệt store đọc được.</p>
  <div class="ds-demo ds-demo--col" data-app="turbulenceforecast">
    <div class="op-legal" style="padding-block:0">
      <nav class="op-legal__toc" aria-label="On this page"><ol><li><a href="#trang-phap-ly">1. Data we collect</a></li><li><a href="#trang-phap-ly">2. Location</a></li><li><a href="#trang-phap-ly">3. Purchases</a></li><li><a href="#trang-phap-ly">4. Contact</a></li></ol></nav>
      <div>
        <p class="op-eyebrow">Privacy Policy</p>
        <h3 style="font-size:var(--text-2xl)">Turbulence Forecast: Bumpline</h3>
        <p class="op-legal__meta">Effective 14 October 2026 · iPhone, iPad and Apple Watch</p>
        <div class="op-tablewrap"><table><thead><tr><th>Data</th><th>Used for</th><th>Leaves your device</th></tr></thead><tbody><tr><td>Flight number</td><td>Finding your route</td><td>Sent to public flight data</td></tr><tr><td>Location</td><td>Not collected</td><td>No</td></tr></tbody></table></div>
        <div class="op-faq" style="margin-top:var(--space-5)">
          <details open><summary>How do I restore a purchase?</summary><div>Open Settings in the app and tap Restore Purchases. Use the same Apple Account you bought with.</div></details>
          <details><summary>Does the forecast work offline?</summary><div>The last forecast stays on your device. A new one needs a connection.</div></details>
        </div>
        <div class="op-contact" style="margin-top:var(--space-5)"><b>Contact</b><address>ORIENTPRO — Lam An Investment and Trade JSC<br>info@orlproducts.com</address></div>
      </div>
    </div>
  </div>
</section>

<section class="ds-sec" id="viec-can-sua">
  <h2>Dữ liệu cần sửa trên store</h2>
  <p>Tìm thấy khi đồng bộ dữ liệu App Store.</p>
  <div class="ds-warn"><ul style="margin:0;padding-left:1.1em">{"".join(f"<li><b>{E(a['name'])}</b>: {E(i)}</li>" for a, i in issues)}</ul></div>
</section>

</main>

<footer class="op-footer" style="margin-top:var(--space-9)"><div class="op-wrap">
  <div class="op-footer__grid">
    <div><h2>ORIENTPRO</h2><ul><li>Lam An Investment and Trade JSC</li><li>info@orlproducts.com</li></ul></div>
    <div><h2>Popular apps</h2><ul>{"".join(f'<li><a href="https://orlproducts.com{E(a["web"]["landing"])}">{E(a["name"].split(":")[0])}</a></li>' for a in current if a["web"]["landing"])}</ul></div>
    <div><h2>Legal</h2><ul><li><a href="https://orlproducts.com/privacy.html">Privacy Policy</a></li><li><a href="https://orlproducts.com/terms.html">Terms of Service</a></li><li><a href="https://orlproducts.com/contact.html">Contact</a></li></ul></div>
    <div><h2>Language</h2><ul class="op-lang"><li><a href="#" aria-current="page">English</a></li><li><a href="#">日本語</a></li><li><a href="#">Español</a></li><li><a href="#">Français</a></li><li><a href="#">Deutsch</a></li></ul></div>
  </div>
</div></footer>
</div>
'''

with open(os.path.join(ROOT, "ui-system.html"), "w") as f:
    f.write(page)
print(f"Wrote ui-system.html ({len(page)//1024} KB, {len(apps)} apps)")
