# Kiến trúc

Manifest V3. Content script `document_idle`, isolated world, `globalThis.CursorSkin`. Không dùng ES module trên trang (classic IIFE). `module.exports` chỉ khi có `module` (test Node).

## Cây file

```
extension/
  manifest.json
  background.js          # storage default, Alt+Shift+C, chrome.windows.create popup
  popup/popup.html + popup.js
  icons/icon16.png … icon128.png
  content/
    theme.css            # Dark+ #181818 / #252526 / #1e1e1e / #007acc
    highlight.js         # tokenizer local, không CDN
    probe.js             # tìm input, turn, chat, nút cuộc mới
    shell.js             # DOM khung Cursor
    layout.js            # dock composer, splitter, ẩn disclaimer
    editor.js            # file + comment Gemini + textarea trong suốt
    agent.js             # hội thoại phải
    explorer.js          # cây file + GẦN ĐÂY
    main.js              # boot, observer, pin, new chat, stream phase
    ntjc-mentions.css    # chỉ chat.ntjc.org: span[title="Mentions you"]
```

Content script thứ hai (không JS): `https://chat.ntjc.org/*` và `http://chat.ntjc.org/*` → `ntjc-mentions.css`. Không gắn `theme.css` / skin Gemini.

Nguồn tham chiếu (không phải runtime): `sources/gemini.html` (shell SSR ~788KB, **không** có turn đã hydrate), `images/vscode.png`, `images/gemini.png`.

## Luồng boot

1. `main.js` đọc `chrome.storage.local`, đợi `#app-root` tối đa 15s
2. `enable()`: `html.cursor-skin`, `shell.mount()`, mount editor/agent/explorer một lần
3. `MutationObserver` trên `#app-root` + poll `location.href` 500ms + `popstate`
4. `refreshFromDom()` ~50ms rAF: probe → pin input → turns → explorer

Tắt: gỡ class `cursor-skin`, `layout.unpin` composer về chỗ cũ, trả `document.title` / favicon.

## Pin ô nhập (quan trọng)

Không clone. Không `position:fixed` trên trang Gemini (transform/filter/contain tạo containing block, ô nằm dưới `#cursor-skin-root` z-index `2147483000`).

Cách đang dùng: `layout.dock` **append** `rich-textarea` / `.ql-container` vào `.cs-composer-slot`, CSS `position:absolute; inset:0`.

`isSkinned(el)`:

- descendant `#cursor-skin-root` → coi là skin (bỏ qua khi probe Gemini)
- **trừ** `.cursor-skin-composer` → vẫn là node Gemini, phải tìm được để pin

Không pin cả thanh input lớn (sẽ kéo theo disclaimer “Gemini là một AI…”). Chỉ pin editor + wrapper gần (`findWrapper`).

Disclaimer trong wrapper: `data-cs-hide` nếu khớp `/mắc sai sót|make mistakes|Gemini là một AI/i`, dài ≤160, không chứa editor.

Send: nút có label send/gửi/arrow_upward/submit → `data-cs-send`. Nút khác trong wrapper `data-cs-hide`.

## Turns

Selector user: `user-query`, `.user-query`, `[data-test-id=user-query]`, `[data-message-author-role=user]`

Selector model: `model-response` rồi fallback sibling / `response-element` / `message-content` vì Gemini thường **không** có `model-response`.

`spokenText` / `agent.speech` gỡ tiền tố `Bạn đã nói` / `Gemini đã nói` / `You said` / `Gemini said`, bỏ dòng trùng, bỏ placeholder `Hỏi Gemini`.

Stream phase (chỉ UI phải):

- gửi local → `thinking` (spinner + Thought briefly)
- 1.2s → `exploring` (Explored 3 files)
- text idle ~800ms → `done`
- 8s không token → `done`
- lần probe đầu `prime` không nháy spinner

## Editor

Mỗi file:

- `base` — skeleton gốc
- `body` — phần user gõ, persist `editorDrafts`
- `note` — comment bọc câu trả lời Gemini (`highlight.commentWrap`)
- `fileText` = `note + "\n\n" + body` (không có note thì chỉ body)

Highlight vẽ `.cs-lines` (pointer-events none). `textarea.cs-input` trong suốt đè lên phần code (left 58px = gutter), caret `#cccccc`. Khi Gemini đổi `note`, caret trong `body` được giữ.

`showTurn` hiện tại: **chỉ đổi `note` của file đang mở**, không overlay fence thành tab riêng (parseResponse vẫn còn trong file nhưng showTurn không dùng nhánh fences).

Wrap: `.cs-line-row` / `.cs-code` / `.tok` dùng `white-space: pre-wrap; overflow-wrap: anywhere`. `.cs-code-scroll` `overflow-x: hidden`.

## Chat list / cuộc mới

`probe.findChats`: clickable trong sidebar Gemini (cạnh nút “Cuộc trò chuyện mới”), bỏ chrome (Thư viện, Sinh viên, Gần đây, …), bỏ link trong `user-query`/`model-response`.

`probe.findNewChat`: **không** lấy nút trong composer (nút + đính kèm từng bị nhầm). Ưu tiên `aria-label` “Cuộc trò chuyện mới” / `a[href=/app]`.

`main.startNewChat`:

1. đánh dấu `awaitingFresh` + snapshot user cũ
2. xóa turns / pending / Thought / ô nhập
3. click nút Gemini
4. 80ms sau nếu URL vẫn `/app/<id>` cũ → `location.assign(/app)`
5. `refreshFromDom` bỏ qua turn cũ khi leftover (cùng conversation id hoặc cùng chuỗi user)

## Storage keys

| Key | Mặc định |
| --- | --- |
| `enabled` | `true` |
| `projectName` | `NAPOCHAN_BANHANG` |
| `folderName` | `templates` |
| `sidebarWidth` | `260` (160–480) |
| `agentWidth` | `420` (280–640) |
| `sidebarVisible` | `true` |
| `editorDrafts` | `{ [fileId]: { body } }` |

## Màu / font

Title/activity `#181818`, sidebar `#252526`, editor `#1e1e1e`, status `#007acc`. Keyword `#569cd6`, string `#ce9178`, comment `#6a9955`, number `#b5cea8`. Chrome Segoe UI, editor Consolas 13px. Activity 48px, sidebar 260, agent 420.

`document.title` dạng `printAll.php - napochan_banhang - Cursor`. Favicon = icon extension.
