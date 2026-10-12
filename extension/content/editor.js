(function (root) {
  const CS = root.CursorSkin || (root.CursorSkin = {});
  const H = () => CS.highlight;

  const PHP_BASE = [
    "<?php",
    "declare(strict_types=1);",
    "",
    "function sheet_title(string $code): string {",
    "    return 'Chung tu ' . $code;",
    "}",
    "",
    "function sheet_row(string $sku, int $qty): void {",
    "    $safe = htmlspecialchars($sku, ENT_QUOTES, 'UTF-8');",
    "    echo '<tr>';",
    "    echo '<td class=\"sku\">' . $safe . '</td>';",
    "    echo '<td class=\"qty\">' . $qty . '</td>';",
    "    echo '</tr>';",
    "}",
    "",
    "$code = 'CTNTJ-2G-000055';",
    "$rows = [",
    "    ['sku' => 'A-100', 'qty' => 2],",
    "    ['sku' => 'B-240', 'qty' => 5],",
    "    ['sku' => 'C-018', 'qty' => 1],",
    "];",
    "?>",
    "<!doctype html>",
    "<html lang=\"vi\">",
    "<head>",
    "  <meta charset=\"utf-8\">",
    "  <title><?php echo htmlspecialchars(sheet_title($code), ENT_QUOTES, 'UTF-8'); ?></title>",
    "  <link rel=\"stylesheet\" href=\"styles.css\">",
    "</head>",
    "<body>",
    "  <table class=\"sheet\">",
    "    <thead>",
    "      <tr><th>Ma hang</th><th>So luong</th></tr>",
    "    </thead>",
    "    <tbody>",
    "      <?php foreach ($rows as $row) { sheet_row($row['sku'], $row['qty']); } ?>",
    "    </tbody>",
    "  </table>",
    "</body>",
    "</html>",
  ].join("\n");

  const TPL_BASE = [
    "<div class=\"sheet\">",
    "  <h1>{$title}</h1>",
    "  <table class=\"lines\">",
    "    <tr>",
    "      <td class=\"sku\">{$row.sku}</td>",
    "      <td class=\"qty\">{$row.qty}</td>",
    "    </tr>",
    "  </table>",
    "</div>",
  ].join("\n");

  const CSS_BASE = [
    "body {",
    "  margin: 24px;",
    "  color: #1a1a1a;",
    "  font: 13px Consolas, monospace;",
    "}",
    "",
    ".sheet {",
    "  width: 720px;",
    "  border-collapse: collapse;",
    "}",
    "",
    ".sheet td,",
    ".sheet th {",
    "  border: 1px solid #222;",
    "  padding: 6px 8px;",
    "}",
    "",
    ".qty {",
    "  text-align: right;",
    "}",
  ].join("\n");

  const JS_BASE = [
    "function sumQty(rows) {",
    "  return rows.reduce((total, row) => total + row.qty, 0);",
    "}",
    "",
    "const rows = [",
    "  { sku: 'A-100', qty: 2 },",
    "  { sku: 'B-240', qty: 5 },",
    "];",
    "",
    "console.log(sumQty(rows));",
  ].join("\n");

  const PRESETS = [
    preset("CTNTJ-2G-000051-1.tpl", "html", TPL_BASE),
    preset("CTNTJ-2G-000052-1.tpl", "html", TPL_BASE),
    preset("CTNTJ-2G-000055-1.tpl", "html", TPL_BASE),
    preset("printAll.php", "php", PHP_BASE),
    preset("styles.css", "css", CSS_BASE),
    preset("app.js", "javascript", JS_BASE),
  ];

  function preset(name, lang, base) {
    return {
      id: "preset:" + name,
      name: name,
      lang: lang,
      base: base,
      body: base,
      note: "",
      overlay: null,
      generated: false,
      dirty: false,
    };
  }

  const FILE_NAMES = {
    php: "printAll.php",
    css: "styles.css",
    javascript: "app.js",
    typescript: "app.ts",
    html: "index.html",
    xml: "template.xml",
    python: "main.py",
    json: "data.json",
    markdown: "notes.md",
    bash: "script.sh",
    yaml: "config.yaml",
    ruby: "app.rb",
    plaintext: "snippet.txt",
  };

  function fileNameFor(lang, used) {
    const normalized = H().normalizeLang(lang);
    const base = FILE_NAMES[normalized] || "snippet.txt";
    if (!used.has(base)) return base;
    const dot = base.lastIndexOf(".");
    const stem = dot === -1 ? base : base.slice(0, dot);
    const ext = dot === -1 ? "" : base.slice(dot);
    let n = 2;
    while (used.has(stem + "-" + n + ext)) n += 1;
    return stem + "-" + n + ext;
  }

  function parseResponse(text, activeLang) {
    const source = String(text || "").replace(/\r/g, "");
    const re = /```([^\n`]*)\n([\s\S]*?)```/g;
    const parts = [];
    let last = 0;
    let match;
    while ((match = re.exec(source))) {
      if (match.index > last) parts.push({ type: "prose", text: source.slice(last, match.index) });
      parts.push({ type: "code", lang: H().normalizeLang(match[1]), text: match[2].replace(/\n$/, "") });
      last = match.index + match[0].length;
    }
    if (last < source.length) parts.push({ type: "prose", text: source.slice(last) });
    const codes = parts.filter((part) => part.type === "code");
    if (!codes.length) {
      return {
        mode: "prose",
        text: H().commentWrap(source, activeLang || "php"),
        files: [],
      };
    }
    const used = new Set();
    const files = [];
    const pending = [];
    parts.forEach((part) => {
      if (part.type === "prose") {
        pending.push(part.text);
        return;
      }
      const name = fileNameFor(part.lang, used);
      used.add(name);
      const prose = pending.join("\n").trim();
      pending.length = 0;
      const body = (prose ? H().commentWrap(prose, part.lang) + "\n" : "") + part.text;
      files.push({ name: name, lang: part.lang, text: body });
    });
    if (pending.length && files.length) {
      const extra = pending.join("\n").trim();
      if (extra) {
        const lastFile = files[files.length - 1];
        lastFile.text += "\n" + H().commentWrap(extra, lastFile.lang);
      }
    }
    return { mode: "fences", text: "", files: files };
  }

  const editor = {
    host: null,
    files: [],
    openIds: [],
    activeId: "preset:printAll.php",
    folderName: "templates",
    renderedKey: "",
    charWidth: 0,
    draftsReady: false,
    saveTimer: 0,
    onMeta: null,
    onOpenChange: null,
  };

  function resetFiles() {
    editor.files = PRESETS.map((file) => Object.assign({}, file));
    editor.openIds = ["preset:printAll.php"];
    editor.activeId = "preset:printAll.php";
    editor.renderedKey = "";
  }

  function activeFile() {
    return editor.files.find((file) => file.id === editor.activeId) || editor.files[0];
  }

  function fileText(file) {
    if (!file) return "";
    const body = file.body != null ? file.body : file.base;
    if (!file.note) return body;
    return file.note + "\n\n" + body;
  }

  function pathOf(file) {
    return [editor.folderName || "templates", "tpl", "print-chungtu", file.name];
  }

  function clearGenerated() {
    editor.files = editor.files.filter((file) => !file.generated);
    editor.openIds = editor.openIds.filter((id) => editor.files.some((file) => file.id === id));
    if (!editor.openIds.length) editor.openIds = ["preset:printAll.php"];
    if (!editor.files.some((file) => file.id === editor.activeId)) editor.activeId = "preset:printAll.php";
  }

  function showTurn(text, streaming) {
    const current = activeFile();
    const presetId = current && !current.generated ? current.id : "preset:printAll.php";
    clearGenerated();
    const file = editor.files.find((item) => item.id === presetId) || editor.files.find((item) => item.name === "printAll.php");
    file.note = text ? H().commentWrap(text, file.lang) : "";
    file.dirty = !!streaming || file.body !== file.base;
    editor.activeId = file.id;
    if (!editor.openIds.includes(file.id)) editor.openIds.push(file.id);
    render();
    scheduleSave(file);
  }

  function showPreset(id) {
    const file = editor.files.find((item) => item.id === id);
    if (!file) return;
    if (!editor.openIds.includes(id)) editor.openIds.push(id);
    editor.activeId = id;
    render();
  }

  function closeFile(id) {
    const file = editor.files.find((item) => item.id === id);
    if (!file || !file.generated) return;
    editor.files = editor.files.filter((item) => item.id !== id);
    editor.openIds = editor.openIds.filter((item) => item !== id);
    if (!editor.openIds.length) editor.openIds = ["preset:printAll.php"];
    if (editor.activeId === id) editor.activeId = editor.openIds[editor.openIds.length - 1];
    render();
  }

  function setStreaming(streaming) {
    const file = activeFile();
    if (!file) return;
    file.dirty = !!streaming || file.body !== file.base;
    render();
  }

  function mount(host) {
    resetFiles();
    editor.host = host;
    host.innerHTML = "";
    host.appendChild(node("div", "cs-tabs"));
    host.appendChild(node("div", "cs-breadcrumb"));
    const body = node("div", "cs-editor-body");
    const scroll = node("div", "cs-code-scroll cs-scroll");
    const lines = node("div", "cs-lines");
    const input = node("textarea", "cs-input");
    input.spellcheck = false;
    input.wrap = "soft";
    input.setAttribute("aria-label", "Editor");
    const canvas = node("canvas", "cs-minimap");
    scroll.appendChild(lines);
    scroll.appendChild(input);
    input.addEventListener("input", onType);
    input.addEventListener("keydown", onTypeKey);
    input.addEventListener("blur", onTypeBlur);
    scroll.addEventListener("mousedown", (event) => {
      if (event.target === input) return;
      input.focus();
    });
    body.appendChild(scroll);
    body.appendChild(canvas);
    host.appendChild(body);
    scroll.addEventListener("scroll", drawMinimap);
    scroll.addEventListener("mousemove", onMouse);
    canvas.addEventListener("click", (event) => {
      const ratio = event.offsetY / Math.max(1, canvas.clientHeight);
      scroll.scrollTop = ratio * scroll.scrollHeight;
    });
    render();
    loadDrafts(() => {
      editor.draftsReady = true;
      editor.renderedKey = "";
      render();
      if (CS.editor.onDrafts) CS.editor.onDrafts();
    });
  }

  function storageArea() {
    if (typeof chrome === "undefined" || !chrome.storage || !chrome.storage.local) return null;
    return chrome.storage.local;
  }

  function loadDrafts(done) {
    const area = storageArea();
    if (!area) {
      editor.draftsReady = true;
      if (done) done();
      return;
    }
    area.get("editorDrafts", (data) => {
      const drafts = (data && data.editorDrafts) || {};
      editor.files.forEach((file) => {
        const draft = drafts[file.id];
        if (!draft || typeof draft.body !== "string") return;
        file.body = draft.body;
        file.dirty = file.body !== file.base;
      });
      if (done) done();
    });
  }

  function scheduleSave(file) {
    if (!editor.draftsReady || !file) return;
    window.clearTimeout(editor.saveTimer);
    editor.saveTimer = window.setTimeout(() => saveDraft(file), 200);
  }

  function saveDraft(file) {
    const area = storageArea();
    if (!area || !editor.draftsReady || !file) return;
    area.get("editorDrafts", (data) => {
      const drafts = (data && data.editorDrafts) || {};
      drafts[file.id] = { body: file.body };
      area.set({ editorDrafts: drafts });
    });
  }

  function rememberBody(file, full) {
    const note = file.note || "";
    const text = String(full || "").replace(/\r/g, "");
    if (!note) {
      file.body = text;
      return;
    }
    const sep = note + "\n\n";
    if (text.startsWith(sep)) file.body = text.slice(sep.length);
    else if (text.startsWith(note)) file.body = text.slice(note.length).replace(/^\n+/, "");
  }

  function onType() {
    const input = editor.host.querySelector(".cs-input");
    const file = activeFile();
    if (!input || !file) return;
    rememberBody(file, input.value);
    file.dirty = file.body !== file.base;
    editor.renderedKey = "";
    paintLines(input.value, file.lang);
    sizeInput();
    drawMinimap();
    const tab = editor.host.querySelector(".cs-tab.active");
    if (tab) {
      const dot = tab.querySelector(".cs-dirty");
      if (file.dirty && !dot) tab.appendChild(node("span", "cs-dirty"));
      if (!file.dirty && dot) dot.remove();
    }
    scheduleSave(file);
  }

  function onTypeKey(event) {
    event.stopPropagation();
    if (event.key !== "Tab" || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    const input = event.currentTarget;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    input.value = input.value.slice(0, start) + "    " + input.value.slice(end);
    input.selectionStart = input.selectionEnd = start + 4;
    onType();
  }

  function onTypeBlur() {
    const input = editor.host.querySelector(".cs-input");
    const file = activeFile();
    if (!input || !file) return;
    const next = fileText(file);
    if (input.value !== next) {
      input.value = next;
      editor.renderedKey = "";
      paintLines(next, file.lang);
      sizeInput();
    }
    scheduleSave(file);
  }

  function sizeInput() {
    const input = editor.host.querySelector(".cs-input");
    const lines = editor.host.querySelector(".cs-lines");
    if (!input || !lines) return;
    input.style.height = Math.max(lines.offsetHeight, 19) + "px";
  }

  function syncInput(text) {
    const input = editor.host.querySelector(".cs-input");
    if (!input) return;
    const focused = document.activeElement === input;
    const start = input.selectionStart;
    const old = input.value;
    if (old !== text) {
      const file = activeFile();
      const body = file && file.body != null ? file.body : "";
      input.value = text;
      if (focused) {
        const oldBodyAt = body && old.endsWith(body) ? old.length - body.length : -1;
        const newBodyAt = body && text.endsWith(body) ? text.length - body.length : text.length;
        let pos = text.length;
        if (oldBodyAt >= 0 && start >= oldBodyAt) pos = newBodyAt + (start - oldBodyAt);
        else pos = Math.min(start, text.length);
        pos = Math.max(0, Math.min(pos, text.length));
        input.selectionStart = input.selectionEnd = pos;
      }
    }
    sizeInput();
  }

  function node(tag, className) {
    const el = document.createElement(tag);
    el.className = className;
    return el;
  }

  function render() {
    if (!editor.host) return;
    const file = activeFile();
    const text = fileText(file);
    const key = [file && file.id, text, file && file.dirty, editor.openIds.join("|")].join("\u0000");
    const tabs = editor.host.querySelector(".cs-tabs");
    const crumb = editor.host.querySelector(".cs-breadcrumb");
    tabs.replaceChildren();
    editor.openIds.forEach((id) => {
      const item = editor.files.find((entry) => entry.id === id);
      if (!item) return;
      const tab = node("button", "cs-tab" + (item.id === editor.activeId ? " active" : ""));
      tab.type = "button";
      tab.appendChild(fileIcon(item.name));
      tab.appendChild(document.createTextNode(item.name));
      if (item.dirty) tab.appendChild(node("span", "cs-dirty"));
      else if (item.generated) {
        const close = node("span", "cs-tab-close");
        close.textContent = "×";
        close.addEventListener("click", (event) => {
          event.stopPropagation();
          closeFile(item.id);
        });
        tab.appendChild(close);
      }
      tab.addEventListener("click", () => showPreset(item.id));
      tabs.appendChild(tab);
    });
    const parts = pathOf(file);
    crumb.textContent = parts.join("  >  ");
    if (key !== editor.renderedKey) {
      editor.renderedKey = key;
      paintLines(text, file.lang);
    }
    syncInput(text);
    drawMinimap();
    emitMeta(1, 1);
    if (editor.onOpenChange) editor.onOpenChange();
  }

  function paintLines(text, lang) {
    const linesHost = editor.host.querySelector(".cs-lines");
    const highlighted = H().highlightLines(text, lang);
    const fragment = document.createDocumentFragment();
    highlighted.forEach((tokens, index) => {
      const row = node("div", "cs-line-row");
      row.dataset.ln = String(index + 1);
      const gutter = node("span", "cs-ln");
      gutter.textContent = String(index + 1);
      const code = node("span", "cs-code");
      if (!tokens.length) code.appendChild(document.createTextNode(""));
      tokens.forEach((tok) => {
        if (tok.type === "text") {
          code.appendChild(document.createTextNode(tok.text));
          return;
        }
        const span = node("span", "tok tok-" + tok.type);
        span.textContent = tok.text;
        code.appendChild(span);
      });
      row.appendChild(gutter);
      row.appendChild(code);
      fragment.appendChild(row);
    });
    linesHost.replaceChildren(fragment);
  }

  function fileIcon(name) {
    const span = node("span", "cs-ficon " + extClass(name));
    return span;
  }

  function extClass(name) {
    if (name.endsWith(".php")) return "php";
    if (name.endsWith(".css")) return "css";
    if (name.endsWith(".js") || name.endsWith(".ts")) return "js";
    if (name.endsWith(".tpl") || name.endsWith(".html") || name.endsWith(".xml")) return "html";
    return "txt";
  }

  function measureChar() {
    if (editor.charWidth) return editor.charWidth;
    const probe = document.createElement("span");
    probe.textContent = "0000000000";
    probe.style.cssText = "position:absolute;visibility:hidden;font:13px Consolas,monospace;";
    document.body.appendChild(probe);
    editor.charWidth = probe.getBoundingClientRect().width / 10 || 7.8;
    probe.remove();
    return editor.charWidth;
  }

  function onMouse(event) {
    const row = event.target.closest && event.target.closest(".cs-line-row");
    if (!row) return;
    const code = row.querySelector(".cs-code");
    const rect = code.getBoundingClientRect();
    const col = Math.max(1, Math.round((event.clientX - rect.left) / measureChar()) + 1);
    emitMeta(Number(row.dataset.ln) || 1, col);
  }

  function emitMeta(ln, col) {
    const file = activeFile();
    if (!file || !editor.onMeta) return;
    editor.onMeta({
      name: file.name,
      lang: file.lang,
      label: H().languageLabel(file.lang),
      ln: ln,
      col: col,
      breadcrumb: pathOf(file).join(" > "),
    });
  }

  function drawMinimap() {
    const canvas = editor.host && editor.host.querySelector(".cs-minimap");
    const scroll = editor.host && editor.host.querySelector(".cs-code-scroll");
    if (!canvas || !scroll) return;
    const dpr = window.devicePixelRatio || 1;
    const width = 64;
    const height = Math.max(1, canvas.clientHeight || scroll.clientHeight || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#1e1e1e";
    ctx.fillRect(0, 0, width, height);
    const rows = scroll.querySelectorAll(".cs-line-row");
    const lineH = height / Math.max(rows.length, 1);
    rows.forEach((row, index) => {
      const len = (row.querySelector(".cs-code").textContent || "").length;
      ctx.fillStyle = "#3a3a3a";
      ctx.fillRect(6, index * lineH, Math.min(52, Math.max(2, len * 0.42)), Math.max(1, lineH - 0.3));
    });
    const scale = height / Math.max(scroll.scrollHeight, 1);
    const viewTop = scroll.scrollTop * scale;
    const viewH = Math.max(8, scroll.clientHeight * scale);
    ctx.strokeStyle = "rgba(0, 122, 204, 0.9)";
    ctx.strokeRect(1, viewTop, width - 2, viewH);
  }

  function snapshot() {
    return {
      files: editor.files.map((file) => ({
        id: file.id,
        name: file.name,
        generated: file.generated,
        dirty: file.dirty,
        active: file.id === editor.activeId,
        path: pathOf(file),
      })),
      openIds: editor.openIds.slice(),
      activeId: editor.activeId,
    };
  }

  resetFiles();

  CS.editor = {
    mount: mount,
    showTurn: showTurn,
    showPreset: showPreset,
    closeFile: closeFile,
    setStreaming: setStreaming,
    setFolder: function (name) {
      editor.folderName = name || "templates";
      render();
    },
    snapshot: snapshot,
    activeFile: activeFile,
    fileText: fileText,
    parseResponse: parseResponse,
    fileNameFor: fileNameFor,
  };

  Object.defineProperty(CS.editor, "onMeta", {
    get: function () {
      return editor.onMeta;
    },
    set: function (fn) {
      editor.onMeta = fn;
    },
  });
  Object.defineProperty(CS.editor, "onOpenChange", {
    get: function () {
      return editor.onOpenChange;
    },
    set: function (fn) {
      editor.onOpenChange = fn;
    },
  });

  if (typeof module !== "undefined" && module.exports) module.exports = CS;
})(typeof globalThis !== "undefined" ? globalThis : this);
