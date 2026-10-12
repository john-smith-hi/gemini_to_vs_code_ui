(function (root) {
  const CS = root.CursorSkin || (root.CursorSkin = {});
  const warned = new Set();

  const INPUT_SELECTORS = [
    "rich-textarea .ql-editor",
    "rich-textarea [contenteditable='true']",
    "[contenteditable='true'][role='textbox']",
    "textarea[placeholder*='Gemini']",
    "textarea[placeholder*='gemini']",
  ];
  const USER_SELECTORS = [
    "user-query",
    ".user-query",
    "[data-test-id='user-query']",
    "[data-message-author-role='user']",
  ];
  const MODEL_SELECTORS = [
    "model-response",
    ".model-response",
    "[data-message-author-role='model']",
  ];
  const MODEL_FALLBACK_SELECTORS = ["response-element", ".response-container", "message-content"];

  function warnOnce(key, message) {
    if (warned.has(key)) return;
    warned.add(key);
    console.info("[cursor-skin]", message);
  }

  function parentEl(node) {
    if (!node) return null;
    if (node.parentElement) return node.parentElement;
    const rootNode = node.getRootNode && node.getRootNode();
    if (rootNode && rootNode.host) return rootNode.host;
    return null;
  }

  function queryAllDeep(selector, start) {
    const out = [];
    const stack = [start];
    let seen = 0;
    while (stack.length) {
      const node = stack.pop();
      if (!node || !node.querySelectorAll) continue;
      let matched;
      try {
        matched = node.querySelectorAll(selector);
      } catch (err) {
        continue;
      }
      for (const el of matched) out.push(el);
      let all;
      try {
        all = node.querySelectorAll("*");
      } catch (err) {
        continue;
      }
      for (const el of all) {
        seen += 1;
        if (seen > 8000) return out;
        if (el.shadowRoot) stack.push(el.shadowRoot);
      }
    }
    return out;
  }

  function querySmart(selector) {
    let light = [];
    try {
      light = [...document.querySelectorAll(selector)];
    } catch (err) {
      light = [];
    }
    if (light.length) return light;
    const app = document.getElementById("app-root");
    if (!app) return [];
    return queryAllDeep(selector, app);
  }

  function queryFirstMatch(selectors) {
    for (const selector of selectors) {
      const found = querySmart(selector);
      if (found.length) return found;
    }
    return [];
  }

function isSkinned(el) {
  if (!el || !el.closest) return false;
  if (el.closest(".cursor-skin-composer")) return false;
  return !!el.closest("#cursor-skin-root");
}

  function isUsableBox(el) {
    if (!el || isSkinned(el)) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 20 && rect.height > 8;
  }

  function labelOf(el) {
    return [
      el.getAttribute && el.getAttribute("aria-label"),
      el.getAttribute && el.getAttribute("data-test-id"),
      typeof el.className === "string" ? el.className : "",
      el.innerText || "",
    ]
      .join(" ")
      .toLowerCase();
  }

  function findSend(rootEl) {
    const buttons = rootEl.querySelectorAll ? rootEl.querySelectorAll("button, [role='button']") : [];
    for (const button of buttons) {
      if (/send|gửi|arrow_upward|submit/.test(labelOf(button))) return button;
    }
    return null;
  }

function inHistory(el) {
  return !!(el && el.closest && el.closest("user-query, model-response, response-element, .user-query, .model-response"));
}

function scoreInput(el) {
  let score = 0;
  const hint = [
    el.getAttribute && el.getAttribute("data-placeholder"),
    el.getAttribute && el.getAttribute("aria-label"),
    el.getAttribute && el.getAttribute("placeholder"),
  ].join(" ").toLowerCase();
  if (/gemini|hỏi|ask|message/.test(hint)) score += 80;
  if (el.closest && el.closest("rich-textarea")) score += 50;
  if (el.classList && el.classList.contains("ql-editor")) score += 20;
  const rect = el.getBoundingClientRect();
  if (rect.width > 40 && rect.height > 16) score += 15;
  score += Math.max(0, rect.bottom) / 80;
  if (inHistory(el)) score -= 100;
  return score;
}

function findInput() {
  const quillAlive = querySmart("rich-textarea .ql-editor, .ql-editor").some((el) => !isSkinned(el) && !inHistory(el));
  const pools = [];
  INPUT_SELECTORS.forEach((selector) => {
    if (quillAlive && selector.indexOf("textarea") === 0) return;
    querySmart(selector).forEach((el) => {
      if (el && !isSkinned(el) && !inHistory(el)) pools.push(el);
    });
  });
  if (!pools.length) {
    querySmart("rich-textarea").forEach((el) => {
      if (el && !isSkinned(el) && !inHistory(el)) pools.push(el);
    });
  }
  if (!pools.length) {
    warnOnce("input", "Khong thay o nhap Gemini. Se thu lai khi DOM doi.");
    return null;
  }
  pools.sort((a, b) => scoreInput(a) - scoreInput(b));
  return pools[pools.length - 1];
}

  function containsMessageList(node, editor) {
    if (!node.querySelector) return false;
    const hit = node.querySelector("user-query, model-response, response-element, .user-query, .model-response");
    return !!(hit && hit !== editor && !editor.contains(hit));
  }

function findWrapper(editor) {
  if (!editor) return null;
  const pinned = editor.closest && editor.closest(".cursor-skin-composer");
  if (pinned) return pinned;
  const rich = editor.closest && (editor.closest("rich-textarea") || editor.closest(".ql-container"));
  if (rich) return rich;
  return editor;
}

function isUserEl(el) {
  if (!el || el.nodeType !== 1) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === "user-query") return true;
  if (el.classList && el.classList.contains("user-query")) return true;
  if ((el.getAttribute("data-message-author-role") || "") === "user") return true;
  return false;
}

const RESPONSE_SELECTOR = [
  "model-response",
  ".model-response",
  "response-element",
  ".response-container",
  "message-content",
  "[data-message-author-role='model']",
  "[class*='model-response']",
  "[class*='response-content']",
].join(",");

function findResponseAfter(userEl) {
  const parent = userEl.parentElement;
  if (parent) {
    const inside = [...parent.querySelectorAll(RESPONSE_SELECTOR)].filter((el) => {
      return el !== userEl && !userEl.contains(el) && !el.contains(userEl);
    });
    if (inside.length) return inside[0];
  }
  let sib = userEl.nextElementSibling;
  while (sib) {
    if (isUserEl(sib) || (sib.querySelector && sib.querySelector("user-query, .user-query"))) break;
    const nested = sib.querySelector && sib.querySelector(RESPONSE_SELECTOR);
    if (nested && !userEl.contains(nested)) return nested;
    const text = cleanText(sib.innerText || sib.textContent || "");
    if (text.length > 1 && text !== cleanText(userEl.innerText || "")) return sib;
    sib = sib.nextElementSibling;
  }
  if (parent && parent.nextElementSibling && !isUserEl(parent.nextElementSibling)) {
    const next = parent.nextElementSibling;
    if (next.querySelector && next.querySelector("user-query, .user-query")) return null;
    const nested = next.querySelector && next.querySelector(RESPONSE_SELECTOR);
    return nested || next;
  }
  return null;
}

  function topLevel(nodes) {
    return nodes.filter((node) => !nodes.some((other) => other !== node && other.contains(node)));
  }

  function cleanText(text) {
    return String(text || "")
      .replace(/\u00a0/g, " ")
      .replace(/\r/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function spokenText(text) {
    const speaker = /^(bạn đã nói|you said|user said|gemini đã nói|gemini said|model said|bard đã nói|bard said)\s*[:\-–]?\s*/i;
    const lines = [];
    cleanText(text).split("\n").forEach((line) => {
      let next = line.trim();
      let prior = "";
      while (next && next !== prior) {
        prior = next;
        next = next.replace(speaker, "").trim();
      }
      if (!next) return;
      const prev = lines[lines.length - 1];
      if (prev && prev.toLowerCase() === next.toLowerCase()) return;
      lines.push(next);
    });
    return lines.join("\n").trim();
  }

  function isCodeBlock(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.tagName === "PRE") return true;
    const cls = typeof el.className === "string" ? el.className : "";
    return /code-block|codeblock/i.test(cls);
  }

  function detectLang(el) {
    const code = (el.querySelector && el.querySelector("code")) || el;
    const cls = typeof code.className === "string" ? code.className : "";
    const match = cls.match(/language-([a-z0-9#+.-]+)/i) || cls.match(/lang-([a-z0-9#+.-]+)/i);
    if (match) return match[1];
    const header = el.querySelector && el.querySelector("[class*='lang'], [class*='language']");
    if (header && header !== code) {
      const token = header.textContent.trim().split(/\s+/)[0];
      if (token && token.length < 20) return token;
    }
    return "";
  }

  function walk(node, parts) {
    if (!node) return;
    if (node.nodeType === 3) {
      parts.push(node.textContent || "");
      return;
    }
    if (node.nodeType !== 1) return;
    const tag = node.tagName;
    if (node.getAttribute("aria-hidden") === "true") return;
    const hiddenCls = typeof node.className === "string" ? node.className : "";
    if (/sr-only|visually-hidden|screen-reader|cdk-visually-hidden/i.test(hiddenCls)) return;
    if (tag === "BUTTON" || node.getAttribute("role") === "button" || tag === "SVG" || tag === "SCRIPT" || tag === "STYLE") {
      return;
    }
    if (tag === "IMG" || /IMAGE/i.test(tag)) {
      parts.push("\n[image]\n");
      return;
    }
    const cls = typeof node.className === "string" ? node.className : "";
    if (/toolbar|action-bar|copy-button/i.test(cls) && !isCodeBlock(node)) return;
    if (isCodeBlock(node)) {
      const codeEl = node.querySelector("code") || node;
      const code = (codeEl.innerText || codeEl.textContent || "").replace(/\n$/, "");
      parts.push("\n```" + detectLang(node) + "\n" + code + "\n```\n");
      return;
    }
    if (tag === "BR") {
      parts.push("\n");
      return;
    }
    const block = /^(DIV|P|LI|H1|H2|H3|H4|TR|SECTION|UL|OL|BLOCKQUOTE)$/.test(tag);
    if (block) parts.push("\n");
    for (const child of node.childNodes) walk(child, parts);
    if (block) parts.push("\n");
  }

  function extractResponse(el) {
    if (!el) return "";
    const parts = [];
    walk(el, parts);
    const walked = spokenText(parts.join(""));
    if (walked) return walked;
    return spokenText(el.innerText || el.textContent || "");
  }

function findTurns() {
  const users = topLevel(queryFirstMatch(USER_SELECTORS)).filter((el) => !isSkinned(el));
  if (users.length) {
    return users
      .map((userEl) => {
        const responseEl = findResponseAfter(userEl);
        return {
          user: spokenText(userEl.innerText || userEl.textContent || ""),
          response: responseEl ? extractResponse(responseEl) : "",
          responseEl: responseEl,
        };
      })
      .filter((turn) => turn.user || turn.response);
  }
  let models = topLevel(queryFirstMatch(MODEL_SELECTORS)).filter((el) => !isSkinned(el));
    if (!models.length) {
      models = topLevel(queryFirstMatch(MODEL_FALLBACK_SELECTORS)).filter((el) => {
        return !isSkinned(el) && !el.closest("user-query, .user-query");
      });
    }
    if (!users.length && !models.length) {
      warnOnce("turns", "Chua thay user-query hoac model-response. Hoi thoai se hien khi Gemini render xong.");
      return [];
    }
    const items = [
      ...users.map((el) => ({ kind: "user", el: el })),
      ...models.map((el) => ({ kind: "model", el: el })),
    ].sort((a, b) => {
      if (a.el === b.el) return 0;
      const pos = a.el.compareDocumentPosition(b.el);
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      return 0;
    });
    const turns = [];
    items.forEach((item) => {
      if (item.kind === "user") {
        turns.push({
          user: spokenText(item.el.innerText || item.el.textContent || ""),
          response: "",
          responseEl: null,
        });
        return;
      }
      const response = extractResponse(item.el);
      const last = turns[turns.length - 1];
      if (last && !last.responseEl) {
        last.response = response;
        last.responseEl = item.el;
      } else {
        turns.push({ user: "", response: response, responseEl: item.el });
      }
    });
    return turns.filter((turn) => turn.user || turn.response);
  }

  const CHROME_LABELS = {
    "cuộc trò chuyện mới": 1,
    "new chat": 1,
    "tìm kiếm trong các cuộc trò chuyện": 1,
    "search chats": 1,
    "sinh viên": 1,
    "thư viện": 1,
    "library": 1,
    "số ghi chú": 1,
    "số ghi chú mới": 1,
    "gần đây": 1,
    "recent": 1,
    "nâng cấp": 1,
    "upgrade": 1,
    "gemini": 1,
  };

  function rowTitle(el) {
    const aria = el.getAttribute ? (el.getAttribute("aria-label") || "") : "";
    const raw = cleanText(el.innerText || el.textContent || aria).split("\n")[0];
    return raw.replace(/\s+/g, " ").trim().slice(0, 160);
  }

  function isChromeLabel(title) {
    const key = String(title || "").toLowerCase().replace(/\s+/g, " ").trim();
    if (!key) return true;
    if (CHROME_LABELS[key]) return true;
    return /^(tìm kiếm|search chats|search)\b/.test(key);
  }

  function isNewChatLabel(el) {
    const aria = el.getAttribute ? (el.getAttribute("aria-label") || "") : "";
    const blob = (rowTitle(el) + " " + aria).toLowerCase();
    return /cuộc trò chuyện mới|new chat|start a new chat|bắt đầu cuộc trò chuyện/.test(blob);
  }

  function inTranscript(el) {
    return !!(el && el.closest && el.closest("user-query, model-response, response-element, .user-query, .model-response, message-content"));
  }

  function inComposer(el) {
    return !!(el && el.closest && el.closest(".cursor-skin-composer, rich-textarea, .ql-container, .cs-composer-slot"));
  }

  function clickableOf(el) {
    if (!el) return null;
    if (el.closest) {
      const hit = el.closest("a, button, [role='link'], [role='button']");
      if (hit && !isSkinned(hit)) return hit;
    }
    return el;
  }

  function conversationHref(el) {
    const href = (el && (el.href || (el.getAttribute && el.getAttribute("href")))) || "";
    if (!/\/app\/[^/?#]+/.test(href)) return "";
    if (/\/app\/?$/.test(href.split("?")[0].split("#")[0])) return "";
    try {
      const url = new URL(href, location.href);
      return url.origin + url.pathname;
    } catch (err) {
      return href.split("?")[0].split("#")[0];
    }
  }

  function collectClickables() {
    const selector = "a, button, [role='link'], [role='button']";
    const out = [];
    const seen = new Set();
    function take(root) {
      if (!root || !root.querySelectorAll) return;
      let nodes = [];
      try {
        nodes = root.querySelectorAll(selector);
      } catch (err) {
        return;
      }
      nodes.forEach((el) => {
        if (seen.has(el) || isSkinned(el) || inTranscript(el)) return;
        seen.add(el);
        out.push(el);
      });
    }
    take(document);
    const app = document.getElementById("app-root");
    if (app) {
      const stack = [app];
      let seenNodes = 0;
      while (stack.length && seenNodes < 4000) {
        const node = stack.pop();
        if (!node || !node.querySelectorAll) continue;
        take(node);
        let all = [];
        try {
          all = node.querySelectorAll("*");
        } catch (err) {
          all = [];
        }
        for (let i = all.length - 1; i >= 0; i--) {
          seenNodes += 1;
          if (all[i].shadowRoot) stack.push(all[i].shadowRoot);
          if (seenNodes > 4000) break;
        }
      }
    }
    return out;
  }

  function sidebarRoot(newChatEl) {
    if (!newChatEl || !newChatEl.parentElement) return null;
    const marked = newChatEl.closest && newChatEl.closest("nav, aside, [role='navigation']");
    if (marked && marked !== document.body) return marked;
    let node = newChatEl.parentElement;
    let best = node;
    while (node && node !== document.body && node !== document.documentElement) {
      const rect = node.getBoundingClientRect ? node.getBoundingClientRect() : { width: 0 };
      if (rect.width > 480) break;
      best = node;
      node = node.parentElement;
    }
    return best;
  }

  function findNewChat() {
    const labeled = queryFirstMatch([
      "a[aria-label*='Cuộc trò chuyện mới' i]",
      "button[aria-label*='Cuộc trò chuyện mới' i]",
      "a[aria-label*='New chat' i]",
      "button[aria-label*='New chat' i]",
      "[aria-label*='Start a new chat' i]",
      "a[href='https://gemini.google.com/app']",
      "a[href='/app']",
      "a[href$='/app']",
      "a[href$='/app/']",
    ]).filter((el) => !isSkinned(el) && !inComposer(el) && !inTranscript(el));
    if (labeled.length) return clickableOf(labeled[0]);
    const clickables = collectClickables().filter((el) => !inComposer(el));
    const byText = clickables.find((el) => isNewChatLabel(el));
    if (byText) return clickableOf(byText);
    const home = clickables.find((el) => {
      const href = (el.href || "").split("?")[0].split("#")[0];
      return /\/app\/?$/.test(href);
    });
    return home ? clickableOf(home) : null;
  }

  function findChats() {
    const clickables = collectClickables();
    const newChat = clickables.find((el) => isNewChatLabel(el)) || null;
    const root = sidebarRoot(newChat, clickables);
    const seen = new Set();
    const chats = [];
    function push(el, allowOutside) {
      const target = clickableOf(el);
      if (!target || isSkinned(target) || inTranscript(target) || isNewChatLabel(target)) return;
      const nested = target.querySelector ? target.querySelector("a[href*='/app/']") : null;
      const href = conversationHref(target) || conversationHref(nested);
      const title = rowTitle(target) || (nested ? rowTitle(nested) : "");
      if (!title || title.length < 2 || isChromeLabel(title)) return;
      const key = href || "text:" + title.toLowerCase();
      if (seen.has(key)) return;
      if (!href && !(root && root.contains && root.contains(target))) return;
      if (!allowOutside && root && href && root.contains && !root.contains(target)) return;
      seen.add(key);
      chats.push({ title: title, href: href || key, el: target });
    }
    const pool = root && root.querySelectorAll
      ? [...root.querySelectorAll("a, button, [role='link'], [role='button']")]
      : clickables;
    pool.forEach((el) => push(el, false));
    if (!chats.length) clickables.forEach((el) => {
      if (conversationHref(el)) push(el, true);
    });
    return chats.slice(0, 40);
  }

  function read() {
    const editor = findInput();
    return {
      editor: editor,
      wrapper: findWrapper(editor),
      turns: findTurns(),
      chats: findChats(),
    };
  }

  CS.probe = {
    read: read,
    parentEl: parentEl,
    extractResponse: extractResponse,
    findSend: findSend,
    findNewChat: findNewChat,
    labelOf: labelOf,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
