# Cách hẹn Reels Instagram @orientpro_26 từ trình duyệt tích hợp (không cần hộp chọn file)

Đã chạy thành công 17/11/2026. Trình duyệt tích hợp không mở được hộp chọn file → lấy video từ chính Reel Facebook đã hẹn (cùng video), rồi "bơm" vào ô tải file.

1. Lấy link video (tab www.facebook.com):
   https://www.facebook.com/professional_dashboard/content/content_library/?filter=SCHEDULED&post_type=ALL_CONTENT
   Mỗi dòng: "Actions for this post" > "Download" > đọc href của link "Download HD" (fbcdn .mp4, 720p). Lấy link mới nhất trong DOM mỗi lần (link cũ còn lại trong DOM).
   Nếu video chưa có trên Facebook: cần cách khác (Sangtn chọn file) — chưa giải được.

2. Mở Meta Business Suite > Create reel:
   https://business.facebook.com/latest/reels_composer/?asset_id=1511383312049255&business_id=1459407842216866
   - Post to: bỏ tick Page "Video Upscale - Restore Old Videos", chỉ giữ orientpro_26.
   - Chạy JS:
     const b = await (await fetch(HD_URL)).blob();
     window.__pendingFile = new File([b], 'Vx_App_YYYY-MM-DD.mp4', {type:'video/mp4'});
     const orig = HTMLInputElement.prototype.click;
     HTMLInputElement.prototype.click = function(){ if(this.type==='file' && window.__pendingFile){ const dt=new DataTransfer(); dt.items.add(window.__pendingFile); this.files=dt.files; window.__pendingFile=null; this.dispatchEvent(new Event('input',{bubbles:true})); this.dispatchEvent(new Event('change',{bubbles:true})); return; } return orig.call(this); };
   - Bấm "Add video" → video tự vào, 100%.
3. Caption: focus ô [contenteditable], gõ caption (file Caption_Instagram_TuanNN.md). Kiểm tra quy tắc: tên app đầu + 4–6 hashtag ngách + #TenApp.
4. Next → Scheduling options > Schedule → bấm ô ngày, chọn ngày trên lịch → bấm ô giờ, nhấn phím "0 0" → ô phút, nhấn "0 0" (gõ text không ăn). Múi giờ Asia/Jakarta = giờ VN.
5. Bấm Schedule → hộp "Reel scheduled" → Done. Kiểm tra lại ở Content > Scheduled.
