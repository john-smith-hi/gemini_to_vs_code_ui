(function (root) {
  const CS = root.CursorSkin || (root.CursorSkin = {});

  const MENUS = [
    ["File", ["New Text File", "New Window", "Open File...", "Save", "Exit"]],
    ["Edit", ["Undo", "Redo", "Cut", "Copy", "Paste", "Find"]],
    ["Selection", ["Select All", "Expand Selection", "Copy Line Up"]],
    ["View", ["Command Palette...", "Appearance", "Explorer", "Search"]],
    ["Run", ["Start Debugging", "Run Without Debugging"]],
    ["Terminal", ["New Terminal", "Split Terminal"]],
    ["Help", ["Welcome", "About"]],
  ];

  const ACTIVITIES = [
    { id: "explorer", label: "Explorer", icon: explorerIcon },
    { id: "search", label: "Search", icon: searchIcon },
    { id: "scm", label: "Source Control", icon: branchIcon },
    { id: "run", label: "Run and Debug", icon: playIcon },
    { id: "extensions", label: "Extensions", icon: gridIcon },
  ];

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function svg() {
    const node = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    node.setAttribute("viewBox", "0 0 24 24");
    node.setAttribute("aria-hidden", "true");
    return node;
  }

  function stroke(path, extras) {
    const icon = svg();
    const shape = document.createElementNS("http://www.w3.org/2000/svg", "path");
    shape.setAttribute("d", path);
    shape.setAttribute("fill", "none");
    shape.setAttribute("stroke", "currentColor");
    shape.setAttribute("stroke-width", "1.6");
    shape.setAttribute("stroke-linecap", "round");
    shape.setAttribute("stroke-linejoin", "round");
    icon.appendChild(shape);
    (extras || []).forEach((extra) => icon.appendChild(extra));
    return icon;
  }

  function explorerIcon() {
    return stroke("M4 7h6l2 2h8v9H4z");
  }

  function searchIcon() {
    const icon = svg();
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", "11");
    circle.setAttribute("cy", "11");
    circle.setAttribute("r", "5.5");
    circle.setAttribute("fill", "none");
    circle.setAttribute("stroke", "currentColor");
    circle.setAttribute("stroke-width", "1.6");
    const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
    line.setAttribute("d", "M15.5 15.5L20 20");
    line.setAttribute("stroke", "currentColor");
    line.setAttribute("stroke-width", "1.6");
    line.setAttribute("stroke-linecap", "round");
    icon.appendChild(circle);
    icon.appendChild(line);
    return icon;
  }

  function branchIcon() {
    return stroke("M7 5v6a3 3 0 0 0 3 3h4M7 5a2 2 0 1 0 0.01 0M17 14a2 2 0 1 0 0.01 0M7 19a2 2 0 1 0 0.01 0M7 11v8");
  }

  function playIcon() {
    return stroke("M8 6l10 6-10 6z");
  }

  function gridIcon() {
    return stroke("M5 5h5v5H5zM14 5h5v5h-5zM5 14h5v5H5zM14 14h5v5h-5z");
  }

  function layoutIcon() {
    return stroke("M4 5h16v14H4zM10 5v14M4 10h6");
  }

  function noopButton(label) {
    const button = el("button", "cs-icon-button", label);
    button.type = "button";
    button.tabIndex = -1;
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    return button;
  }

  function closeMenus(scope) {
    scope.querySelectorAll(".cs-menu.open").forEach((menu) => menu.classList.remove("open"));
  }

  function mount() {
    let rootEl = document.getElementById("cursor-skin-root");
    if (rootEl && CS.shell.refs) return CS.shell.refs;

    rootEl = el("div");
    rootEl.id = "cursor-skin-root";

    const title = el("header", "cs-titlebar");
    const menus = el("nav", "cs-menus");
    MENUS.forEach(([name, items]) => {
      const menu = el("div", "cs-menu");
      const button = el("button", "cs-menu-button", name);
      button.type = "button";
      const list = el("div", "cs-menu-list");
      items.forEach((item) => {
        const row = el("button", "cs-menu-item", item);
        row.type = "button";
        row.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          menu.classList.remove("open");
        });
        list.appendChild(row);
      });
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const willOpen = !menu.classList.contains("open");
        closeMenus(rootEl);
        menu.classList.toggle("open", willOpen);
      });
      menu.appendChild(button);
      menu.appendChild(list);
      menus.appendChild(menu);
    });

    const crumb = el("div", "cs-title-crumb");
    const windowControls = el("div", "cs-window-controls");
    ["—", "□", "×"].forEach((glyph, index) => {
      const button = el("button", "cs-window-button" + (index === 2 ? " cs-window-close" : ""), glyph);
      button.type = "button";
      button.tabIndex = -1;
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
      windowControls.appendChild(button);
    });
    const layout = el("div", "cs-title-layout");
    layout.appendChild(layoutIcon());
    title.appendChild(menus);
    title.appendChild(crumb);
    title.appendChild(layout);
    title.appendChild(windowControls);

    const body = el("div", "cs-body");
    const activity = el("aside", "cs-activity");
    const activityTop = el("div", "cs-activity-top");
    ACTIVITIES.forEach((item) => {
      const button = el("button", "cs-activity-button");
      button.type = "button";
      button.dataset.activity = item.id;
      button.title = item.label;
      button.setAttribute("aria-label", item.label);
      button.appendChild(item.icon());
      activityTop.appendChild(button);
    });
    const avatar = el("div", "cs-avatar", "N");
    activity.appendChild(activityTop);
    activity.appendChild(avatar);

    const sidebar = el("aside", "cs-sidebar");
    const project = el("div", "cs-project");
    const projectName = el("span", "cs-project-name", "NAPOCHAN_BANHANG");
    const tools = el("div", "cs-project-tools");
    [["New File", "+"], ["New Folder", "▣"], ["Refresh", "↻"], ["Collapse", "⌄"]].forEach((item) => {
      const button = el("button", "cs-tool", item[1]);
      button.type = "button";
      button.title = item[0];
      button.setAttribute("aria-label", item[0]);
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
      tools.appendChild(button);
    });
    project.appendChild(projectName);
    project.appendChild(tools);
    const searchBox = el("div", "cs-search");
    const searchInput = el("input", "cs-search-input");
    searchInput.type = "text";
    searchInput.placeholder = "Search";
    searchInput.spellcheck = false;
    searchBox.appendChild(searchInput);
    const sidebarBody = el("div", "cs-sidebar-body cs-scroll");
    sidebar.appendChild(project);
    sidebar.appendChild(searchBox);
    sidebar.appendChild(sidebarBody);

    const leftSplitter = el("div", "cs-splitter cs-splitter-left");
    leftSplitter.title = "Drag to resize";
    const editorHost = el("main", "cs-editor");
    const rightSplitter = el("div", "cs-splitter cs-splitter-right");
    rightSplitter.title = "Drag to resize";

    const agent = el("aside", "cs-agent");
    const agentHeader = el("div", "cs-agent-header");
    agentHeader.appendChild(el("span", "cs-agent-title", "Agents Window"));
    const agentActions = el("div", "cs-agent-actions");
    const newChat = el("button", "cs-icon-button", "+");
    newChat.type = "button";
    newChat.title = "Cuộc trò chuyện mới";
    newChat.setAttribute("aria-label", "Cuộc trò chuyện mới");
    newChat.dataset.action = "new-chat";
    agentActions.appendChild(newChat);
    agentActions.appendChild(noopButton("…"));
    agentHeader.appendChild(agentActions);
    const transcript = el("div", "cs-agent-transcript cs-scroll");
    const modeRow = el("div", "cs-mode-row");
    modeRow.appendChild(el("span", "cs-pill cs-pill-agent", "Agent"));
    modeRow.appendChild(el("span", "cs-pill", "Composer 2.5 Fast"));
    const composerSlot = el("div", "cs-composer-slot");
    agent.appendChild(agentHeader);
    agent.appendChild(transcript);
    agent.appendChild(modeRow);
    agent.appendChild(composerSlot);

    body.appendChild(activity);
    body.appendChild(sidebar);
    body.appendChild(leftSplitter);
    body.appendChild(editorHost);
    body.appendChild(rightSplitter);
    body.appendChild(agent);

    const status = el("footer", "cs-status");
    const statusLeft = el("div", "cs-status-left");
    ["Cursor Tab", "main*", "0 errors", "0 warnings"].forEach((text) => {
      statusLeft.appendChild(el("span", "cs-status-item", text));
    });
    const statusRight = el("div", "cs-status-right");
    const pos = el("span", "cs-status-item", "Ln 1, Col 1");
    pos.dataset.field = "pos";
    const lang = el("span", "cs-status-item", "PHP");
    lang.dataset.field = "lang";
    statusRight.appendChild(pos);
    statusRight.appendChild(el("span", "cs-status-item", "Spaces: 4"));
    statusRight.appendChild(el("span", "cs-status-item", "UTF-8"));
    statusRight.appendChild(lang);
    statusRight.appendChild(el("span", "cs-status-item", "Prettier"));
    status.appendChild(statusLeft);
    status.appendChild(statusRight);

    rootEl.appendChild(title);
    rootEl.appendChild(body);
    rootEl.appendChild(status);
    document.body.appendChild(rootEl);

    document.addEventListener("click", () => closeMenus(rootEl));

    CS.shell.refs = {
      root: rootEl,
      crumb: crumb,
      activity: activity,
      avatar: avatar,
      sidebar: sidebar,
      searchBox: searchBox,
      searchInput: searchInput,
      sidebarBody: sidebarBody,
      leftSplitter: leftSplitter,
      editorHost: editorHost,
      rightSplitter: rightSplitter,
      agent: agent,
      transcript: transcript,
      composerSlot: composerSlot,
      projectName: projectName,
      pos: pos,
      lang: lang,
    };
    return CS.shell.refs;
  }

  CS.shell = {
    refs: null,
    mount: mount,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
