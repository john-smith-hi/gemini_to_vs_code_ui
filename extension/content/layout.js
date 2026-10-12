(function (root) {
  const CS = root.CursorSkin || (root.CursorSkin = {});
  const fixedRestore = new WeakMap();

  function setStyle(el, prop, value) {
    if (!el) return;
    if (el.style[prop] !== value) el.style[prop] = value;
  }

function isDisclaimer(el, editor) {
    if (!el || el === editor) return false;
    if (editor && (el.contains(editor) || editor.contains(el))) return false;
    const text = (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
    if (!text || text.length > 160) return false;
    return /mắc sai sót|make mistakes|Gemini là một AI|Gemini is an AI/i.test(text);
  }

  function hideDisclaimers(wrapper) {
    const editor = wrapper && wrapper.querySelector
      ? wrapper.querySelector(".ql-editor, textarea, [contenteditable='true']")
      : null;
    const scopes = [wrapper].filter(Boolean);
    scopes.forEach((scope) => {
      scope.querySelectorAll("a, span, p, div, footer, small").forEach((el) => {
        if (!isDisclaimer(el, editor)) return;
        if (el.getAttribute("data-cs-hide") !== "1") el.setAttribute("data-cs-hide", "1");
      });
    });
  }

  function markControls(wrapper) {
    if (!wrapper || !wrapper.querySelectorAll) return;
    const editor = wrapper.querySelector(".ql-editor, textarea, [contenteditable='true']");
    hideDisclaimers(wrapper);
    wrapper.querySelectorAll("button, [role='button']").forEach((button) => {
      if (editor && (button === editor || button.contains(editor))) return;
      const send = /send|gửi|arrow_upward|submit/.test(CS.probe.labelOf(button));
      const name = send ? "data-cs-send" : "data-cs-hide";
      if (button.getAttribute(name) !== "1") button.setAttribute(name, "1");
      if (send && button.hasAttribute("data-cs-hide")) button.removeAttribute("data-cs-hide");
    });
    wrapper.querySelectorAll("mat-icon, .upload-icon, .speech-icon, .send-icon").forEach((icon) => {
      if (editor && editor.contains(icon)) return;
      if (icon.closest("[data-cs-send='1']")) return;
      if (icon.getAttribute("data-cs-hide") !== "1") icon.setAttribute("data-cs-hide", "1");
    });
    if (wrapper.dataset.csFocus === "1") return;
    wrapper.dataset.csFocus = "1";
    wrapper.addEventListener("mousedown", (event) => {
      const field = wrapper.querySelector(".ql-editor, textarea, [contenteditable='true']");
      if (!field || event.target === field || (field.contains && field.contains(event.target))) return;
      if (event.target.closest && event.target.closest("[data-cs-send='1']")) return;
      field.focus();
    });
  }

  function clearMarks(wrapper) {
    if (!wrapper || !wrapper.querySelectorAll) return;
    wrapper.querySelectorAll("[data-cs-send], [data-cs-hide]").forEach((node) => {
      node.removeAttribute("data-cs-send");
      node.removeAttribute("data-cs-hide");
    });
  }

const STACK_PROPS = [
  ["transform", "transform", (cs) => cs.transform && cs.transform !== "none", "none"],
  ["filter", "filter", (cs) => cs.filter && cs.filter !== "none", "none"],
  ["perspective", "perspective", (cs) => cs.perspective && cs.perspective !== "none", "none"],
  ["opacity", "opacity", (cs) => cs.opacity !== "1", "1"],
  ["mixBlendMode", "mix-blend-mode", (cs) => cs.mixBlendMode && cs.mixBlendMode !== "normal", "normal"],
  ["isolation", "isolation", (cs) => cs.isolation === "isolate", "auto"],
  ["willChange", "will-change", (cs) => cs.willChange && cs.willChange !== "auto", "auto"],
  ["backdropFilter", "backdrop-filter", (cs) => cs.backdropFilter && cs.backdropFilter !== "none", "none"],
  ["contain", "contain", (cs) => /paint|layout|strict|content/.test(cs.contain || ""), "none"],
  ["zIndex", "z-index", (cs) => cs.position !== "static" && cs.zIndex !== "auto", "auto"],
];

function neutralize(node) {
  if (!node || fixedRestore.has(node)) return;
  const touched = [];
  let parent = CS.probe.parentEl(node);
  while (parent && parent !== document.documentElement) {
    const computed = getComputedStyle(parent);
    const fixes = [];
    STACK_PROPS.forEach((spec) => {
      if (spec[2](computed)) fixes.push(spec);
    });
    if (fixes.length) {
      touched.push({
        el: parent,
        prev: fixes.map((spec) => [spec[1], parent.style[spec[0]] || ""]),
      });
      fixes.forEach((spec) => parent.style.setProperty(spec[1], spec[3], "important"));
    }
    parent = parent.parentElement;
  }
  fixedRestore.set(node, touched);
}

function restoreFixed(node) {
  const touched = fixedRestore.get(node);
  if (!touched) return;
  touched.forEach((item) => {
    item.prev.forEach(([prop, value]) => {
      if (value) item.el.style.setProperty(prop, value);
      else item.el.style.removeProperty(prop);
    });
  });
  fixedRestore.delete(node);
}

const homes = new WeakMap();

function dock(wrapper, slot) {
  if (!slot || !wrapper || wrapper.parentNode === slot) return;
  if (slot.contains && slot.contains(wrapper) && wrapper.parentNode === slot) return;
  if (!homes.has(wrapper)) homes.set(wrapper, { parent: wrapper.parentNode, next: wrapper.nextSibling });
  slot.appendChild(wrapper);
}

function undock(wrapper) {
  const home = homes.get(wrapper);
  if (!home || !home.parent) return;
  if (home.next && home.next.parentNode === home.parent) home.parent.insertBefore(wrapper, home.next);
  else home.parent.appendChild(wrapper);
  homes.delete(wrapper);
}

function pin(wrapper, slot) {
  if (!wrapper || !slot) return;
  dock(wrapper, slot);
  if (!wrapper.classList.contains("cursor-skin-composer")) wrapper.classList.add("cursor-skin-composer");
  markControls(wrapper);
  slot.classList.add("cs-composer-live");
  ["position", "top", "left", "right", "bottom", "width", "height", "zIndex"].forEach((prop) => {
    if (wrapper.style[prop]) wrapper.style[prop] = "";
  });
}

function unpin(wrapper) {
  if (!wrapper) return;
  wrapper.classList.remove("cursor-skin-composer");
  ["position", "top", "left", "width", "height", "zIndex"].forEach((prop) => {
    wrapper.style[prop] = "";
  });
  clearMarks(wrapper);
  restoreFixed(wrapper);
  undock(wrapper);
  const slot = document.querySelector(".cs-composer-slot");
  if (slot) slot.classList.remove("cs-composer-live");
}

  function applyPlaceholder(editor) {
    if (!editor || editor.dataset.csPlaceholder === "1") return;
    if (editor.tagName === "TEXTAREA") {
      editor.dataset.csOldPlaceholder = editor.placeholder || "";
      editor.placeholder = "Plan, @ for context, / for commands";
    }
    editor.dataset.csPlaceholder = "1";
  }

  function clearPlaceholder(editor) {
    if (!editor || editor.dataset.csPlaceholder !== "1") return;
    if (editor.tagName === "TEXTAREA") editor.placeholder = editor.dataset.csOldPlaceholder || "";
    delete editor.dataset.csPlaceholder;
    delete editor.dataset.csOldPlaceholder;
  }

  function bind(refs, state, persist) {
    const drag = (splitter, onMove) => {
      splitter.addEventListener("mousedown", (event) => {
        event.preventDefault();
        const move = (ev) => onMove(ev.clientX);
        const up = () => {
          window.removeEventListener("mousemove", move);
          window.removeEventListener("mouseup", up);
          document.body.classList.remove("cs-dragging");
          persist();
        };
        document.body.classList.add("cs-dragging");
        window.addEventListener("mousemove", move);
        window.addEventListener("mouseup", up);
      });
    };

    drag(refs.leftSplitter, (clientX) => {
      const left = refs.root.getBoundingClientRect().left;
      const width = Math.min(480, Math.max(160, clientX - left - 48));
      state.settings.sidebarWidth = width;
      refs.sidebar.style.width = width + "px";
    });

    drag(refs.rightSplitter, (clientX) => {
      const right = refs.root.getBoundingClientRect().right;
      const width = Math.min(640, Math.max(280, right - clientX));
      state.settings.agentWidth = width;
      refs.agent.style.width = width + "px";
    });

    const reposition = () => {
      if (state.wrapper) pin(state.wrapper, refs.composerSlot);
    };
    window.addEventListener("resize", reposition);
    if (window.ResizeObserver) {
      const observer = new ResizeObserver(reposition);
      observer.observe(refs.composerSlot);
      observer.observe(refs.agent);
    }
    CS.layout.reposition = reposition;
  }

  function applyWidths(refs, settings) {
    const sidebar = settings.sidebarVisible === false ? 0 : settings.sidebarWidth || 260;
    refs.sidebar.style.width = sidebar + "px";
    refs.sidebar.style.display = settings.sidebarVisible === false ? "none" : "";
    refs.leftSplitter.style.display = settings.sidebarVisible === false ? "none" : "";
    refs.agent.style.width = (settings.agentWidth || 420) + "px";
  }

  CS.layout = {
    bind: bind,
    pin: pin,
    unpin: unpin,
    applyPlaceholder: applyPlaceholder,
    clearPlaceholder: clearPlaceholder,
    applyWidths: applyWidths,
    reposition: function () {},
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
