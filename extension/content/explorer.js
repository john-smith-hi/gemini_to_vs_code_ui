(function (root) {
  const CS = root.CursorSkin || (root.CursorSkin = {});
  const collapsed = new Set();

  const view = {
    host: null,
    onOpen: null,
    onChat: null,
    onFilter: null,
  };

  function mount(host) {
    view.host = host;
  }

  function render(model) {
    if (!view.host) return;
    const host = view.host;
    host.replaceChildren();
    if (model.activity === "search") {
      host.appendChild(sectionLabel("SEARCH RESULTS"));
      const query = (model.filter || "").trim().toLowerCase();
      const files = model.files.filter((file) => !query || file.name.toLowerCase().includes(query));
      const chats = model.chats.filter((chat) => !query || chat.title.toLowerCase().includes(query));
      if (!query || "cuộc trò chuyện mới".includes(query) || "new chat".includes(query)) {
        host.appendChild(newChatRow());
      }
      files.forEach((file) => host.appendChild(fileRow(file, 8)));
      chats.forEach((chat) => host.appendChild(chatRow(chat, 8)));
      if (!files.length && !chats.length) host.appendChild(empty("No matching files"));
      return;
    }

    host.appendChild(chatSection(model.chats || [], ""));
    host.appendChild(sectionLabel("OPEN EDITORS"));
    (model.openEditors || []).forEach((file) => host.appendChild(fileRow(file, 8)));

    const tree = buildTree(model.files, model.folderName || "templates");
    host.appendChild(folderBlock(model.folderName || "templates", tree, 0, model));
  }

  function sectionLabel(text) {
    const row = document.createElement("div");
    row.className = "cs-section";
    row.textContent = text;
    return row;
  }

  function empty(text) {
    const row = document.createElement("div");
    row.className = "cs-empty";
    row.textContent = text;
    return row;
  }

  function buildTree(files, folderName) {
    const rootNode = { folders: new Map(), files: [] };
    files.forEach((file) => {
      const parts = (file.path || [folderName, "tpl", "print-chungtu", file.name]).slice(1);
      let cursor = rootNode;
      parts.slice(0, -1).forEach((part) => {
        if (!cursor.folders.has(part)) cursor.folders.set(part, { folders: new Map(), files: [] });
        cursor = cursor.folders.get(part);
      });
      cursor.files.push(file);
    });
    return rootNode;
  }

  function folderBlock(name, node, depth, model) {
    const wrap = document.createElement("div");
    const key = depth + ":" + name;
    const open = !collapsed.has(key);
    wrap.appendChild(folderRow(name, depth, open, () => {
      if (collapsed.has(key)) collapsed.delete(key);
      else collapsed.add(key);
      render(model);
    }));
    if (!open) return wrap;
    node.folders.forEach((child, childName) => {
      wrap.appendChild(folderBlock(childName, child, depth + 1, model));
    });
    node.files.forEach((file) => wrap.appendChild(fileRow(file, (depth + 1) * 12)));
    return wrap;
  }

  function folderRow(name, depth, open, onClick) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "cs-tree-row cs-folder";
    row.style.paddingLeft = 8 + depth * 12 + "px";
    const twist = document.createElement("span");
    twist.className = "cs-twist" + (open ? " open" : "");
    twist.textContent = "▸";
    const icon = document.createElement("span");
    icon.className = "cs-folder-icon";
    row.appendChild(twist);
    row.appendChild(icon);
    row.appendChild(document.createTextNode(name));
    row.addEventListener("click", onClick);
    return row;
  }

  function fileRow(file, pad) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "cs-tree-row" + (file.active ? " active" : "");
    row.style.paddingLeft = (pad || 8) + "px";
    const icon = document.createElement("span");
    icon.className = "cs-ficon " + extClass(file.name);
    row.appendChild(icon);
    row.appendChild(document.createTextNode(file.name));
    if (file.dirty) {
      const dot = document.createElement("span");
      dot.className = "cs-dirty";
      row.appendChild(dot);
    }
    row.addEventListener("click", () => {
      if (view.onOpen) view.onOpen(file.id);
    });
    return row;
  }

  function chatSection(chats, filter) {
    const wrap = document.createElement("div");
    const query = String(filter || "").trim().toLowerCase();
    const shown = chats.filter((chat) => !query || chat.title.toLowerCase().includes(query));
    wrap.appendChild(sectionLabel("GẦN ĐÂY"));
    wrap.appendChild(newChatRow());
    if (!shown.length) wrap.appendChild(empty("Chưa thấy cuộc trò chuyện cũ"));
    shown.forEach((chat) => wrap.appendChild(chatRow(chat, 8)));
    return wrap;
  }

  function newChatRow() {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "cs-tree-row cs-new-chat";
    row.style.paddingLeft = "8px";
    row.title = "Cuộc trò chuyện mới";
    const mark = document.createElement("span");
    mark.className = "cs-new-mark";
    mark.textContent = "+";
    const title = document.createElement("span");
    title.className = "cs-chat-title";
    title.textContent = "Cuộc trò chuyện mới";
    row.appendChild(mark);
    row.appendChild(title);
    row.addEventListener("click", () => {
      if (view.onChat) view.onChat("new");
    });
    return row;
  }

  function chatRow(chat, pad) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "cs-tree-row cs-chat" + (chat.active ? " active" : "");
    row.style.paddingLeft = (pad || 8) + "px";
    row.title = chat.title;
    const icon = document.createElement("span");
    icon.className = "cs-chat-icon";
    const title = document.createElement("span");
    title.className = "cs-chat-title";
    title.textContent = chat.title;
    row.appendChild(icon);
    row.appendChild(title);
    row.addEventListener("click", () => {
      if (view.onChat) view.onChat(chat.href);
    });
    return row;
  }

  function extClass(name) {
    if (name.endsWith(".php")) return "php";
    if (name.endsWith(".css")) return "css";
    if (name.endsWith(".js") || name.endsWith(".ts")) return "js";
    if (name.endsWith(".tpl") || name.endsWith(".html") || name.endsWith(".xml")) return "html";
    return "txt";
  }

  CS.explorer = {
    mount: mount,
    render: render,
  };

  Object.defineProperty(CS.explorer, "onOpen", {
    set: function (fn) {
      view.onOpen = fn;
    },
  });
  Object.defineProperty(CS.explorer, "onChat", {
    set: function (fn) {
      view.onChat = fn;
    },
  });
  Object.defineProperty(CS.explorer, "onFilter", {
    set: function (fn) {
      view.onFilter = fn;
    },
  });
})(typeof globalThis !== "undefined" ? globalThis : this);
