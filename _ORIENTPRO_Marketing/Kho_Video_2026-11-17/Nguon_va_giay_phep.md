# Nguồn hình ảnh, âm thanh và giấy phép — Kho video 17/11/2026

## Kết quả thử tải stock miễn phí (17/11/2026)
Thử bằng curl trên máy Sangtn (device shell) và trong container cloud. Không dùng mirror, cache hay CDN thay thế.

| Tên miền | Máy Sangtn | Container | Ghi chú |
|---|---|---|---|
| pexels.com / www.pexels.com | pexels.com 301, **www.pexels.com bị chặn (blocked-by-allowlist)** | bị chặn | Không tìm được clip/ảnh vì trang tìm kiếm bị chặn |
| api.pexels.com | — | bị chặn | (API cần key) |
| images.pexels.com, videos.pexels.com | mở | mở | Chỉ là CDN, không có trang để xem tác giả + giấy phép → không dùng |
| pixabay.com | mở nhưng site trả 403 (chống bot) | 403 | |
| cdn.pixabay.com | **bị chặn** | bị chặn | |
| mixkit.co | mở (trang) | mở | |
| assets.mixkit.co | **bị chặn** | bị chặn | File video/nhạc Mixkit nằm ở đây |
| unsplash.com, images.unsplash.com | **bị chặn** | bị chặn | |

→ **Không có clip/ảnh stock nào được tải.** Kho dùng phương án dự phòng 1b (mockup dựng bằng code).

Để lần sau dùng được b-roll thật, Sangtn thêm vào claude.ai Settings > Capabilities (danh sách tên miền được phép):
`www.pexels.com, pexels.com, images.pexels.com, videos.pexels.com, api.pexels.com, pixabay.com, cdn.pixabay.com, mixkit.co, assets.mixkit.co, unsplash.com, images.unsplash.com`
(Pixabay còn chặn bot bằng 403; nếu vẫn lỗi, dùng Pexels/Mixkit là đủ.)

## Những gì đã dùng trong 48 video
| Thành phần | Nguồn | Giấy phép / quyền |
|---|---|---|
| Ảnh màn hình app | `assets/apps/<app>/iphone-NN.webp` (ảnh App Store của ORIENTPRO); VizMath: `assets/images/vizmath/iphone-*.jpg`; Origami Learn: `assets/images/origamilearn/shot-*.jpg` | Tài sản của ORIENTPRO |
| Icon app | `assets/icons/<app>.png` | Tài sản của ORIENTPRO |
| Khung iPhone (viền bo góc, Dynamic Island), nền gradient, hạt chuyển động, dải cực quang, nhiễu hạt, cảnh xoay 3D giả, chữ động | Vẽ bằng code (PIL + numpy + ffmpeg) trong `_work/build_kho.py` | Tự tạo, không cần ghi công |
| Font | `_work/GTW-Bold.ttf`, `GTW-Medium.ttf` (đã dùng trong các video trước) | Như các tuần trước |
| Nhạc | `_work/music_1–7.m4a` | **Chỉ nhạc tạm.** Khi đăng TikTok tắt âm gốc, chọn nhạc thư viện TikTok (gợi ý trong file lịch). YouTube/FB/IG: dùng thư viện âm thanh của nền tảng. |

Không có người nổi tiếng, logo thương hiệu bên thứ ba hay nhạc có bản quyền được thêm vào. (Ảnh màn hình SpeedGunner/Bumpline có hình xe/bản đồ Apple Maps vốn nằm sẵn trong ảnh App Store của app.)
