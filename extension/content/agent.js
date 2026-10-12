(function (root) {
  const CS = root.CursorSkin || (root.CursorSkin = {});

  const agent = {
    host: null,
    onSelect: null,
  };

  function mount(host) {
    agent.host = host;
  }

  function render(model) {
    if (!agent.host) return;
    const host = agent.host;
    const stick = host.scrollHeight - host.scrollTop - host.clientHeight < 48;
    host.replaceChildren();
    const turns = model.turns || [];
    let visible = 0;
    turns.forEach((turn, index) => {
      const userText = speech(turn.user);
      const answer = speech(turn.response);
      if (!userText && !answer) return;
      visible += 1;
      if (userText) {
        const bubble = document.createElement("button");
        bubble.type = "button";
        bubble.className = "cs-user-bubble" + (index === model.activeIndex ? " active" : "");
        bubble.textContent = userText;
        bubble.addEventListener("click", () => {
          if (agent.onSelect) agent.onSelect(index);
        });
        host.appendChild(bubble);
      }
      if (answer) host.appendChild(reply(answer));
    });
    const pendingText = speech(model.pendingUser);
    const alreadyShown = pendingText && turns.some((turn) => speech(turn.user).toLowerCase() === pendingText.toLowerCase());
    if (pendingText && !alreadyShown) {
      const pending = document.createElement("div");
      pending.className = "cs-user-bubble pending";
      pending.textContent = pendingText;
      host.appendChild(pending);
      visible += 1;
    }
    if (!visible) {
      const hint = document.createElement("div");
      hint.className = "cs-empty";
      hint.textContent = "Gõ câu hỏi ở ô bên dưới. Câu trả lời hiện ở giữa màn hình.";
      host.appendChild(hint);
    }
    if (model.phase === "thinking" || model.phase === "exploring") host.appendChild(thought(model.phase));
    if (stick) host.scrollTop = host.scrollHeight;
  }

  function speech(text) {
    const speaker = /^(bạn đã nói|you said|user said|gemini đã nói|gemini said|model said|bard đã nói|bard said)\s*[:\-–]?\s*/i;
    const lines = [];
    String(text || "").replace(/\u00a0/g, " ").split("\n").forEach((line) => {
      let next = line.trim();
      let prior = "";
      while (next && next !== prior) {
        prior = next;
        next = next.replace(speaker, "").trim();
      }
      if (!next || isPlaceholder(next)) return;
      const prev = lines[lines.length - 1];
      if (prev && prev.toLowerCase() === next.toLowerCase()) return;
      lines.push(next);
    });
    return lines.join("\n").trim();
  }

  function isPlaceholder(text) {
    const value = String(text || "").replace(/\s+/g, " ").trim().toLowerCase();
    return value === "hỏi gemini" || value === "ask gemini" || value === "plan, @ for context, / for commands";
  }

  function reply(text) {
    const block = document.createElement("div");
    block.className = "cs-reply";
    block.textContent = text;
    return block;
  }

  function thought(phase) {
    const row = document.createElement("div");
    row.className = "cs-thought";
    if (phase === "exploring") {
      row.textContent = "Explored 3 files";
      return row;
    }
    if (phase === "thinking") {
      const spin = document.createElement("span");
      spin.className = "cs-spinner";
      row.appendChild(spin);
      row.appendChild(document.createTextNode("Thought briefly"));
      return row;
    }
    row.textContent = "Thought briefly";
    return row;
  }

  CS.agent = {
    mount: mount,
    render: render,
  };

  Object.defineProperty(CS.agent, "onSelect", {
    get: function () {
      return agent.onSelect;
    },
    set: function (fn) {
      agent.onSelect = fn;
    },
  });
})(typeof globalThis !== "undefined" ? globalThis : this);
