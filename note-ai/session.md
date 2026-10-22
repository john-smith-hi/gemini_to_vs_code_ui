# Trạng thái phiên (2026-10-22)

## 2026-10-22

- Editor Gemini: phản hồi không còn `//`; sau dòng cuối là `================================` rồi mới tới code.
- Thêm CSS `chat.ntjc.org`: `span[title="Mentions you"]` { color white, background red, padding 1px, border 1px solid red, border-radius 3px } tất cả `!important`. File `extension/content/ntjc-mentions.css`. Không đụng skin Gemini.

## Đã xong so với plan và feedback user

- Overlay Cursor trên `https://gemini.google.com/*`, input Gemini thật, IME không clone
- Editor: comment Gemini phía trên, code dưới gõ + lưu được
- Agent: hội thoại không nhãn “đã nói”; dòng dài editor wrap
- Explorer: GẦN ĐÂY + Cuộc trò chuyện mới + click cuộc cũ
- Disclaimer không che ô nhập
- `+` cuộc mới: không lấy nút đính kèm composer; bỏ turn cũ; gán `/app` nếu click không đổi URL

Plan todos (scaffold / shell / pin-input / editor-mirror / agent-explorer / verify) đã completed. **Không tạo lại todo plan.**

## Việc nên kiểm trên máy user (chưa verify logged-in đầy đủ)

Headless `--load-extension` **không** inject content script lên gemini.google.com thật (không có `#cursor-skin-root`). chrome-devtools MCP từng `needsAuth`. IME Telex trên máy user **chưa** được assistant xác nhận.

Checklist sau Reload:

1. Gõ tiếng Việt trong ô phải, Enter gửi, Shift+Enter xuống dòng
2. Câu trả lời hiện comment giữa + bubble phải, không có “Bạn đã nói”
3. Sửa `$code` trong printAll.php, hỏi Gemini câu khác → comment đổi, `$code` giữ
4. `+` → khung phải trống, không “chào” / “Explored 3 files” của cuộc cũ
5. Bấm một cuộc GẦN ĐÂY → đổi hội thoại Gemini thật
6. `Alt+Shift+C` tắt/bật, ô nhập về chỗ cũ khi tắt
7. Dialog Gemini (nếu có) bấm được trên skin

## Việc còn yếu / nên làm phiên sau nếu user kêu

- Selector chat Gemini đổi DOM → GẦN ĐÂY lại “Chưa thấy cuộc trò chuyện cũ”
- `showTurn` không còn mở tab từ fence \`\`\`php\`\`\` (chỉ comment lên file đang mở). Nếu cần lại tab theo language: nối `parseResponse` fences với `body`/`note`, **không** ghi đè `body` user
- Cửa sổ popup maximized: trên Windows đôi khi không ẩn hết chrome Chrome
- Thought/Explored là giả, có thể vẫn “không giống chat thường” với một số user
- Composer placeholder CSS đang “Hỏi Gemini”; plan cũ là “Plan, @ for context, / for commands”
- `layout.applyPlaceholder` still ghi chuỗi plan cũ vào textarea `placeholder` attribute — Quill thì không dùng attribute này
- Realism chrome (menu, activity icon) còn đơn giản so với Cursor thật; **không** copy asset thương hiệu
- `sources/gemini.html` là snapshot SSR cũ, đừng tin là DOM chat live

## Quy ước khi sửa phiên sau

- Trả lời user bằng tiếng Việt
- Không commit git trừ khi user yêu cầu
- Không sửa file plan
- Không clone contenteditable; không `remove()` node Gemini
- Không neutralize mọi ancestor `contain/z-index` (đã bỏ vì gãy Gemini)
- Test: `node --check` từng JS; harness `file://` + Chrome headless `--dump-dom` cho logic thuần. Không khẳng định đã chạy trên Gemini logged-in nếu chỉ headless
- Temp harness đặt `extension/content/_*.html` thì **xóa trước khi kết thúc**
- User phải Reload unpacked + F5 Gemini sau mỗi lần sửa

## Điểm vào code theo bug

| Triệu chứng | File |
| --- | --- |
| Không gõ được / ô trống | `layout.js` dock, `theme.css` composer, `probe.js` findInput/findWrapper |
| Disclaimer che ô | `probe.findWrapper` quá rộng; `layout.hideDisclaimers` |
| Trung tâm không phải câu trả lời | `probe.findTurns` / `findResponseAfter`; `editor.showTurn` |
| “Bạn đã nói” | `probe.spokenText`, `agent.speech` |
| Không wrap / scroll ngang | `theme.css` `.cs-line-row` `.cs-code` |
| Sửa code bị Gemini xóa | `editor.js` `body` vs `note`, `rememberBody` |
| GẦN ĐÂY trống | `probe.findChats`, sidebar Gemini chưa render |
| `+` vẫn cuộc cũ | `main.startNewChat`, `probe.findNewChat`, đừng match composer `+` |
