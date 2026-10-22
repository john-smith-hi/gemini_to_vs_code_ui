# Hướng dẫn sử dụng

Mục đích: Gemini vẫn là Gemini (gõ, IME tiếng Việt, Enter gửi), nhưng người đứng cạnh nhìn như đang code trên Cursor / VS Code tối.

## 1. Cài lần đầu

1. Mở Chrome → `chrome://extensions`
2. Bật **Developer mode** (góc trên phải)
3. **Load unpacked** → chọn thư mục `gemini_to_vs_code_ui/extension` (đúng thư mục có `manifest.json`, không chọn cả repo)
4. Vào `https://gemini.google.com/app` và đăng nhập Google
5. Skin mặc định **bật**. Nếu chưa thấy giao diện Cursor: F5 trang Gemini

Mỗi lần sửa code extension: vào `chrome://extensions` → **Reload** extension này → F5 Gemini. Chỉ F5 trang thì Chrome vẫn chạy bản JS cũ.

Cùng extension còn tô mention trên `https://chat.ntjc.org`: `span[title="Mentions you"]` nền đỏ, chữ trắng. Reload xong F5 trang chat. Không phủ skin Cursor lên NTJC.

## 2. Popup (icon extension trên thanh Chrome)

- **Bật giao diện** — bật/tắt skin
- **Tên project** — hiện trên sidebar trái (mặc định `NAPOCHAN_BANHANG`)
- **Folder gốc** — breadcrumb editor (mặc định `templates`)
- **Mở cửa sổ Cursor** — cửa sổ popup Chrome **không thanh địa chỉ**, maximized, mở `https://gemini.google.com/app`. Tab thường vẫn còn thanh URL của Chrome (không gỡ được)

## 3. Phím tắt

- `Alt+Shift+C` — bật/tắt skin
- Tắt skin thì Gemini hiện lại bình thường (ô nhập trả về chỗ cũ)
- Enter gửi tin Gemini, Shift+Enter xuống dòng. Không chặn IME Telex/VNI (`isComposing` / keyCode 229)

## 4. Bố cục khi skin bật

| Vùng | Việc thật | Việc giả (chỉ nhìn) |
| --- | --- | --- |
| Trái — Explorer | Danh sách cuộc trò chuyện Gemini, nút cuộc mới, cây file preset | Nút New File / Folder / Refresh / Collapse không làm gì |
| Giữa — editor | Gõ được phần code dưới comment; comment trên = câu trả lời Gemini | Tab, số dòng, minimap, highlight Dark+ |
| Phải — Agents Window | Hội thoại + **ô nhập Gemini thật** | Menu Agent / Composer 2.5 Fast, Thought/Explored khi đang stream |
| Thanh activity | Explorer (ẩn/hiện sidebar), Search (lọc file/chat) | SCM / Run / Extensions không làm gì |
| Title File/Edit/... | Mở menu | Mục menu không làm gì |
| Nút cửa sổ — □ × | Không đóng Chrome, không tắt skin | Chỉ trang trí |

## 5. Chat Gemini trong skin

- **Cuộc trò chuyện mới**: dòng `+ Cuộc trò chuyện mới` đầu sidebar trái, hoặc nút `+` trên Agents Window. Phải ra khung trống, không gửi lại câu vừa gõ.
- **Cuộc cũ**: mục **GẦN ĐÂY** — bấm tên cuộc là click link thật của Gemini.
- Nếu danh sách cũ trống: sidebar Gemini có thể chưa kịp vẽ. Tắt skin (`Alt+Shift+C`), mở sidebar Gemini một lần, bật lại rồi F5.
- Ô dưới Agents Window là ô Gemini thật. Placeholder: `Hỏi Gemini`.
- Khung phải là hội thoại thường: câu hỏi bên phải, câu trả lời bên dưới. **Không** hiện “Bạn đã nói” / “Gemini đã nói”.
- Khi Gemini đang viết: có thể thấy `Thought briefly` rồi `Explored 3 files`. Xong thì ẩn.

## 6. Editor giữa màn hình

- Phần **comment xanh** (`// ...`) phía trên = phản hồi Gemini. Đổi mỗi lần Gemini trả lời xong / đang stream.
- Phần **code dưới comment** gõ được. Sửa được lưu (`chrome.storage.local` → `editorDrafts`). Gemini trả lời mới **không xóa** phần bạn đã gõ.
- Dòng dài tự xuống dòng, không kéo ngang.
- File preset: `printAll.php` (mặc định), `CTNTJ-2G-000051/052/055-1.tpl`, `styles.css`, `app.js`. Skeleton ngắn, **không** copy file thật trong screenshot gốc.
- Bấm tab / file trong Explorer để đổi file đang xem. Comment Gemini gắn vào file đang mở (không phải file sinh từ fence).

## 7. Việc không làm khi demo

- Đừng `remove()` node Gemini; chỉ ẩn bằng CSS / `data-cs-hide`
- Đừng clone `contenteditable` (gãy IME tiếng Việt)
- Đừng đụng request mạng Gemini
- Dialog Gemini (`.cdk-overlay-container`, `[role=dialog]`) phải nằm trên skin và bấm được
- Không copy icon/asset có bản quyền Cursor/Microsoft. Icon hiện tại: ô tối + vạch xanh + ngoặc vuông, tự vẽ
