# Gotchas / lỗi đã gặp

## 1. Content script không inject trên Gemini headless

`--headless --load-extension=... https://gemini.google.com` từng **không** có `#cursor-skin-root`. Trang vẫn có `#app-root` và CSS `.ql-editor`. Đừng kết luận “pin/IME ổn trên site thật” từ lần dump đó.

## 2. `position:fixed` ô nhập bị kẹt dưới skin

Ancestor Gemini có `transform` / `filter` / `contain` / opacity → fixed tính theo ancestor, z-index thua `#cursor-skin-root`. Đã chuyển sang **dock node vào `.cs-composer-slot`**.

Đừng quay lại neutralize `contain:none; z-index:auto` trên mọi ancestor — dễ gãy layout Gemini.

## 3. `isSkinned` nuốt mất composer đã pin

Nếu mọi descendant `#cursor-skin-root` bị coi là skin, probe không thấy editor lần sau → mất pin. Composer phải **loại trừ** (`.cursor-skin-composer` → `isSkinned` false).

Hệ quả: nút `+` đính kèm trong composer cũng “thấy được”. `findNewChat` phải `inComposer()` để không click nhầm. Bug user: bấm `+` Agents Window ra `chào` + `Explored 3 files`.

## 4. Pin cả thanh input thì disclaimer chiếm slot

`findWrapper` không được leo ancestor cao. Chỉ `rich-textarea` / `.ql-container`. `hideDisclaimers` chỉ quét **trong wrapper**, không `querySelectorAll('div')` cả document.

Không `remove()` disclaimer; `data-cs-hide` / `visibility`.

## 5. Không có `model-response`

DOM live thường user-query + sibling. `findResponseAfter`: selector trong parent, rồi next sibling không phải user-query, rồi sibling của parent. Prose → comment **đầu file**, không nhét sau 40 dòng PHP (user tưởng editor không đổi).

## 6. `innerText` mang “Bạn đã nói”

Gemini gắn nhãn SR. Phải `spokenText` từng dòng + bỏ `aria-hidden` / `.sr-only` khi walk. Agent lọc lần nữa. Pending “chào” không nhân đôi khi DOM đã có cùng câu.

## 7. `white-space: pre` → scroll ngang

Comment tiếng Việt một dòng dài. Dùng `pre-wrap` + `overflow-wrap: anywhere` trên row, `.cs-code`, `.tok`. Gutter `align-items: flex-start` để số dòng dính đầu dòng logic.

## 8. Search Explorer luôn “No matching files”

Nhãn section bị đếm như child duy nhất. Đừng lấy section label làm tín hiệu “có kết quả”.

## 9. Collapse chats phá click vì re-render

Đừng custom event chết sau `replaceChildren`. `folderRow` gọi `render(model)` trực tiếp. `renderExplorer` skip nếu signature không đổi (tránh cướp focus ô Search).

## 10. Toggle sidebar

`sidebarVisible = sidebarVisible === false` là toggle thật (`undefined` → hiện). Persist `!== false`.

## 11. `node --check` từ cwd sai

Chạy bằng đường dẫn tuyệt đối tới từng file `extension/content/*.js`. Root workspace không phải package Node.

## 12. Không copy screenshot .tpl/.php thật

Preset chỉ skeleton ngắn. Icon tự vẽ. Menu/window controls không đóng browser.

## 13. Dialog Gemini

`.cdk-overlay-container`, `[role=dialog]` z-index `2147483646` (trên skin `2147483000`). Click được.

## 14. Enter gửi

Bubble phase, không `preventDefault` Enter. Bỏ qua `isComposing` và `keyCode === 229`.

## 15. SPA không reload content script

Đổi `/app/<id>` không inject lại. Observer + poll href. `startNewChat` không chỉ `.click()` nút ẩn (Angular có thể bỏ click không trusted) — fallback `location.assign(/app)`.

## 16. `editorDrafts` vs overlay cũ

Trước đây `overlay = comment + base` ghi đè cả file mỗi turn. Giờ chỉ `note`. Đừng gán lại `body = base` trong `showTurn`. `clearGenerated` không được `overlay = null` kiểu cũ nếu làm mất body.

## 17. chrome-devtools MCP

Namespace từng `error` / `needsAuth`. Đừng dựa MCP browser nếu chưa `mcp_auth`. Verify bằng Chrome headless harness hoặc nhờ user reload.
