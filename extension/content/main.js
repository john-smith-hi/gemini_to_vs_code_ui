(function (root) {
  const CS = root.CursorSkin || (root.CursorSkin = {});

  const DEFAULTS = {
    enabled: true,
    projectName: "NAPOCHAN_BANHANG",
    folderName: "templates",
    sidebarWidth: 260,
    agentWidth: 420,
    sidebarVisible: true,
  };

  const state = {
    settings: Object.assign({}, DEFAULTS),
    enabled: true,
    turns: [],
    sig: "",
    explorerSig: "",
    activeTurn: -1,
    followLatest: true,
    pendingUser: "",
    phase: "idle",
    activity: "explorer",
    filter: "",
    chats: [],
    wrapper: null,
    editorEl: null,
    booted: false,
    primed: false,
    origTitle: "",
    origFavicon: "",
    streamTimer: 0,
    idleTimer: 0,
    giveUpTimer: 0,
    lastResponse: "",
    boundWrappers: new WeakSet(),
    awaitingFresh: false,
    freshFrom: "",
    staleUsers: "",
    freshUntil: 0,
  };

  function hasStorage() {
    return !!(root.chrome && chrome.storage && chrome.storage.local);
  }

  function storageGet(defaults) {
    if (!hasStorage()) return Promise.resolve(Object.assign({}, defaults));
    return chrome.storage.local.get(defaults);
  }

  function storageSet(partial) {
    if (!hasStorage()) return Promise.resolve();
    return chrome.storage.local.set(partial);
  }

  function boot() {
    if (state.booted) return;
    state.booted = true;
    storageGet(DEFAULTS).then((settings) => {
      state.settings = Object.assign({}, DEFAULTS, settings);
      state.enabled = settings.enabled !== false;
      return waitFor("#app-root", 15000);
    }).then(() => {
      listen();
      if (state.enabled) enable();
    });
  }

  function listen() {
    if (!root.chrome || !chrome.storage || !chrome.storage.onChanged || state.listening) return;
    state.listening = true;
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;
      if (changes.enabled) {
        const next = changes.enabled.newValue !== false;
        if (next !== state.enabled) {
          state.enabled = next;
          if (next) enable();
          else disable();
        }
      }
      let chromeChanged = false;
      ["projectName", "folderName", "sidebarWidth", "agentWidth", "sidebarVisible"].forEach((key) => {
        if (changes[key]) {
          state.settings[key] = changes[key].newValue;
          chromeChanged = true;
        }
      });
      if (chromeChanged && state.enabled && CS.shell.refs) applyChrome();
    });
  }

  function enable() {
    state.enabled = true;
    document.documentElement.classList.add("cursor-skin");
    const refs = CS.shell.mount();
    if (!refs.editorHost.dataset.csMounted) {
      CS.editor.onDrafts = () => renderEditor();
      CS.editor.mount(refs.editorHost);
      CS.agent.mount(refs.transcript);
      CS.explorer.mount(refs.sidebarBody);
      refs.editorHost.dataset.csMounted = "1";
      wire(refs);
      CS.layout.bind(refs, state, persistWidths);
      observe();
    }
    refs.root.hidden = false;
    applyChrome();
    refreshFromDom();
  }

  function disable() {
    state.enabled = false;
    document.documentElement.classList.remove("cursor-skin");
    if (CS.shell.refs) CS.shell.refs.root.hidden = true;
    if (state.wrapper) CS.layout.unpin(state.wrapper);
    if (state.editorEl) CS.layout.clearPlaceholder(state.editorEl);
    state.wrapper = null;
    state.editorEl = null;
    if (state.origTitle) document.title = state.origTitle;
    restoreFavicon();
  }

  function wire(refs) {
    refs.activity.addEventListener("click", (event) => {
      const button = event.target.closest && event.target.closest("[data-activity]");
      if (!button) return;
      const id = button.dataset.activity;
      if (id !== "explorer" && id !== "search") return;
      if (id === "explorer") {
        if (state.activity === "explorer") state.settings.sidebarVisible = state.settings.sidebarVisible === false;
        else {
          state.activity = "explorer";
          state.settings.sidebarVisible = true;
        }
      } else {
        state.activity = "search";
        state.settings.sidebarVisible = true;
        window.setTimeout(() => refs.searchInput.focus(), 0);
      }
      state.explorerSig = "";
      storageSet({ sidebarVisible: state.settings.sidebarVisible !== false });
      applyChrome();
    });

    refs.searchInput.addEventListener("input", () => {
      state.filter = refs.searchInput.value;
      state.explorerSig = "";
      renderExplorer();
    });

    refs.composerSlot.addEventListener("mousedown", () => {
      if (state.editorEl && state.editorEl.focus) state.editorEl.focus();
    });

    CS.editor.onMeta = (meta) => {
      refs.pos.textContent = "Ln " + meta.ln + ", Col " + meta.col;
      refs.lang.textContent = meta.label;
      refs.crumb.textContent = meta.breadcrumb;
      applyTitle(meta.name);
    };
    CS.editor.onOpenChange = () => {
      state.explorerSig = "";
      renderExplorer();
    };
    CS.agent.onSelect = (index) => {
      state.activeTurn = index;
      state.followLatest = index === state.turns.length - 1;
      renderEditor();
      renderAgent();
    };
    CS.explorer.onOpen = (id) => CS.editor.showPreset(id);
    CS.explorer.onChat = (href) => openChat(href);
    const newChatButton = refs.root.querySelector("[data-action='new-chat']");
    if (newChatButton) {
      newChatButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openChat("new");
      });
    }
  }

  function conversationId() {
    const match = location.pathname.match(/\/app\/([^/?#]+)/);
    return match ? match[1] : "";
  }

  function stopStream() {
    window.clearTimeout(state.streamTimer);
    window.clearTimeout(state.idleTimer);
    window.clearTimeout(state.giveUpTimer);
    state.streamTimer = 0;
    state.idleTimer = 0;
    state.giveUpTimer = 0;
  }

  function resetLocalChat() {
    stopStream();
    state.turns = [];
    state.sig = "";
    state.pendingUser = "";
    state.phase = "idle";
    state.primed = false;
    state.lastResponse = "";
    state.activeTurn = -1;
    state.followLatest = true;
    if (CS.editor && CS.editor.showTurn) CS.editor.showTurn("", false);
    renderAgent();
  }

  function clearComposer() {
    const editor = state.editorEl;
    if (!editor) return;
    if (editor.tagName === "TEXTAREA" || editor.tagName === "INPUT") editor.value = "";
    else editor.textContent = "";
    try {
      editor.dispatchEvent(new InputEvent("input", { bubbles: true }));
    } catch (err) {
      editor.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  function openChat(href) {
    if (href === "new") {
      startNewChat();
      return;
    }
    state.awaitingFresh = false;
    const live = CS.probe.read().chats.find((chat) => chat.href === href);
    if (live && live.el && live.el.click) live.el.click();
    else if (/^https?:/i.test(href)) location.assign(href);
    resetLocalChat();
  }

  function startNewChat() {
    state.staleUsers = state.turns.map((turn) => turn.user).join("\n");
    state.freshFrom = conversationId();
    state.awaitingFresh = true;
    state.freshUntil = Date.now() + 4000;
    resetLocalChat();
    clearComposer();
    const button = CS.probe.findNewChat && CS.probe.findNewChat();
    if (button && button.click) {
      try {
        button.click();
      } catch (err) {}
    }
    const blank = location.origin + "/app";
    window.setTimeout(() => {
      if (!state.enabled || !state.awaitingFresh) return;
      if (conversationId() && conversationId() === state.freshFrom) location.assign(blank);
      else if (!button) location.assign(blank);
    }, 80);
  }

  function chatIsCurrent(href) {
    const match = location.pathname.match(/\/app\/([^/]+)/);
    if (!match || !href) return false;
    return href.indexOf("/app/" + match[1]) !== -1;
  }

  function applyChrome() {
    const refs = CS.shell.refs;
    if (!refs) return;
    const project = state.settings.projectName || DEFAULTS.projectName;
    refs.projectName.textContent = project;
    refs.avatar.textContent = (project.trim().charAt(0) || "N").toUpperCase();
    refs.searchBox.hidden = state.activity !== "search";
    CS.layout.applyWidths(refs, state.settings);
    CS.editor.setFolder(state.settings.folderName || "templates");
    CS.layout.reposition();
    state.explorerSig = "";
    renderExplorer();
    const active = CS.editor.activeFile();
    if (active) applyTitle(active.name);
    setFavicon(true);
  }

  function applyTitle(fileName) {
    if (!state.origTitle) state.origTitle = document.title;
    const slug = String(state.settings.projectName || "project")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");
    document.title = (fileName || "printAll.php") + " - " + slug + " - Cursor";
  }

  function setFavicon(on) {
    let link = document.querySelector("link[rel='icon']") || document.querySelector("link[rel='shortcut icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    if (!state.origFavicon) state.origFavicon = link.href || "";
    if (on && root.chrome && chrome.runtime && chrome.runtime.getURL) {
      link.href = chrome.runtime.getURL("icons/icon32.png");
    }
  }

  function restoreFavicon() {
    const link = document.querySelector("link[rel='icon']") || document.querySelector("link[rel='shortcut icon']");
    if (link && state.origFavicon) link.href = state.origFavicon;
  }

  function observe() {
    const app = document.getElementById("app-root") || document.body;
    const observer = new MutationObserver(() => scheduleRefresh());
    observer.observe(app, { childList: true, subtree: true, characterData: true });
    window.addEventListener("popstate", () => scheduleRefresh());
    let href = location.href;
    window.setInterval(() => {
      if (location.href !== href) {
        href = location.href;
        state.primed = false;
        scheduleRefresh();
      }
    }, 500);
  }

  let refreshTimer = 0;
  let lastRefresh = 0;
  function scheduleRefresh() {
    if (!state.enabled || refreshTimer) return;
    refreshTimer = requestAnimationFrame(() => {
      refreshTimer = 0;
      const now = performance.now();
      if (now - lastRefresh < 50) {
        scheduleRefresh();
        return;
      }
      lastRefresh = now;
      refreshFromDom();
    });
  }

  function refreshFromDom() {
    if (!state.enabled) return;
    let probed;
    try {
      probed = CS.probe.read();
    } catch (err) {
      console.info("[cursor-skin]", err);
      return;
    }
    pinInput(probed);
    state.chats = probed.chats || [];
    const nextTurns = probed.turns || [];
    if (state.awaitingFresh) {
      const users = nextTurns.map((turn) => turn.user).join("\n");
      const leftover = (conversationId() && conversationId() === state.freshFrom) ||
        (users && users === state.staleUsers);
      if (leftover) {
        renderExplorer();
        return;
      }
      state.awaitingFresh = false;
    }
    const sig = nextTurns.map((turn) => turn.user + "\0" + turn.response).join("\u0001");
    if (sig !== state.sig) {
      const prevUsers = state.turns.map((turn) => turn.user).join("\n");
      const nextUsers = nextTurns.map((turn) => turn.user).join("\n");
      state.turns = nextTurns;
      state.sig = sig;
      if (prevUsers !== nextUsers) {
        state.followLatest = true;
        state.activeTurn = state.turns.length - 1;
        state.primed = false;
      } else if (state.followLatest || state.activeTurn < 0 || state.activeTurn >= state.turns.length) {
        state.activeTurn = state.turns.length - 1;
      }
      const latest = state.turns[state.turns.length - 1];
      if (state.pendingUser && latest && sameText(latest.user, state.pendingUser)) state.pendingUser = "";
      noteResponse(latest ? latest.response : "");
      renderEditor();
      renderAgent();
    }
    renderExplorer();
  }

  function pinInput(probed) {
    const refs = CS.shell.refs;
    if (!probed.editor || !probed.wrapper || !refs) return;
    if (state.editorEl !== probed.editor) {
      if (state.editorEl) CS.layout.clearPlaceholder(state.editorEl);
      state.editorEl = probed.editor;
      CS.layout.applyPlaceholder(probed.editor);
      if (probed.editor.dataset.csBound !== "1") {
        probed.editor.dataset.csBound = "1";
        probed.editor.addEventListener("keydown", (event) => {
          if (event.key !== "Enter" || event.shiftKey || event.isComposing || event.keyCode === 229) return;
          const text = readEditor(probed.editor).trim();
          if (text) onLocalSend(text);
        });
      }
    }
    if (!state.boundWrappers.has(probed.wrapper)) {
      state.boundWrappers.add(probed.wrapper);
      probed.wrapper.addEventListener("click", (event) => {
        const button = event.target.closest && event.target.closest("button, [role='button']");
        if (!button || button.getAttribute("data-cs-send") !== "1") return;
        const text = readEditor(state.editorEl).trim();
        if (text) onLocalSend(text);
      });
    }
    if (state.wrapper && state.wrapper !== probed.wrapper) CS.layout.unpin(state.wrapper);
    state.wrapper = probed.wrapper;
    CS.layout.pin(probed.wrapper, refs.composerSlot);
  }

  function sameText(a, b) {
    const normalize = (value) => String(value || "").replace(/\s+/g, " ").trim();
    return normalize(a) === normalize(b);
  }

  function readEditor(editor) {
    if (!editor) return "";
    if (editor.tagName === "TEXTAREA" || editor.tagName === "INPUT") return editor.value || "";
    return editor.innerText || editor.textContent || "";
  }

  function onLocalSend(text) {
    state.awaitingFresh = false;
    state.pendingUser = text;
    state.phase = "thinking";
    state.primed = true;
    window.clearTimeout(state.streamTimer);
    state.streamTimer = window.setTimeout(() => {
      if (state.phase === "thinking") {
        state.phase = "exploring";
        renderAgent();
        CS.editor.setStreaming(true);
      }
    }, 1200);
    armGiveUp();
    renderAgent();
  }

  function armGiveUp() {
    window.clearTimeout(state.giveUpTimer);
    state.giveUpTimer = window.setTimeout(() => {
      if (state.phase !== "thinking" && state.phase !== "exploring") return;
      state.phase = "done";
      CS.editor.setStreaming(false);
      renderAgent();
    }, 8000);
  }

  function noteResponse(text) {
    if (!state.primed) {
      state.primed = true;
      state.lastResponse = text || "";
      state.phase = text ? "done" : "idle";
      return;
    }
    if (text === state.lastResponse) return;
    const grew = text.length > (state.lastResponse || "").length;
    state.lastResponse = text || "";
    if (!text || !grew) return;
    if (state.phase === "idle" || state.phase === "done") {
      state.phase = "thinking";
      window.clearTimeout(state.streamTimer);
      state.streamTimer = window.setTimeout(() => {
        if (state.phase === "thinking") {
          state.phase = "exploring";
          renderAgent();
        }
      }, 1200);
    }
    window.clearTimeout(state.idleTimer);
    armGiveUp();
    state.idleTimer = window.setTimeout(() => {
      state.phase = "done";
      window.clearTimeout(state.giveUpTimer);
      CS.editor.setStreaming(false);
      renderAgent();
    }, 800);
  }

  function renderEditor() {
    const turn = state.turns[state.activeTurn];
    const streaming = (state.phase === "thinking" || state.phase === "exploring") && state.followLatest;
    CS.editor.showTurn(turn ? turn.response : "", streaming);
  }

  function renderAgent() {
    CS.agent.render({
      turns: state.turns,
      activeIndex: state.activeTurn,
      pendingUser: state.pendingUser,
      phase: state.phase,
    });
  }

  function renderExplorer() {
    if (!CS.shell.refs) return;
    const snap = CS.editor.snapshot();
    const sig = JSON.stringify({
      activity: state.activity,
      filter: state.filter,
      folder: state.settings.folderName,
      visible: state.settings.sidebarVisible !== false,
      files: snap.files,
      openIds: snap.openIds,
      path: location.pathname,
      chats: state.chats.map((chat) => chat.href + "\0" + chat.title),
    });
    markActivity();
    if (sig === state.explorerSig) return;
    state.explorerSig = sig;
    CS.explorer.render({
      activity: state.activity,
      filter: state.filter,
      folderName: state.settings.folderName || "templates",
      files: snap.files,
      openEditors: snap.files.filter((file) => snap.openIds.indexOf(file.id) !== -1),
      chats: state.chats.map((chat) => ({
        title: chat.title,
        href: chat.href,
        active: chatIsCurrent(chat.href),
      })),
    });
  }

  function markActivity() {
    const refs = CS.shell.refs;
    refs.activity.querySelectorAll("[data-activity]").forEach((button) => {
      const relevant = button.dataset.activity === "explorer" || button.dataset.activity === "search";
      const visible = state.settings.sidebarVisible !== false;
      button.classList.toggle("active", relevant && visible && button.dataset.activity === state.activity);
    });
  }

  function persistWidths() {
    storageSet({
      sidebarWidth: state.settings.sidebarWidth,
      agentWidth: state.settings.agentWidth,
    });
  }

  function waitFor(selector, timeout) {
    return new Promise((resolve) => {
      const found = document.querySelector(selector);
      if (found) {
        resolve(found);
        return;
      }
      const obs = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
          obs.disconnect();
          resolve(el);
        }
      });
      obs.observe(document.documentElement, { childList: true, subtree: true });
      window.setTimeout(() => {
        obs.disconnect();
        resolve(document.querySelector(selector));
      }, timeout);
    });
  }

  CS.main = { boot: boot, state: state };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})(typeof globalThis !== "undefined" ? globalThis : this);
