const DEFAULTS = {
  enabled: true,
  projectName: "NAPOCHAN_BANHANG",
  folderName: "templates",
  sidebarWidth: 260,
  agentWidth: 420,
  sidebarVisible: true,
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(DEFAULTS, (current) => {
    chrome.storage.local.set(current);
  });
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "toggle-skin") return;
  const current = await chrome.storage.local.get(DEFAULTS);
  await chrome.storage.local.set({ enabled: current.enabled === false });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "open-cursor-window") {
    chrome.windows.create({
      url: "https://gemini.google.com/app",
      type: "popup",
      state: "maximized",
    });
    sendResponse({ ok: true });
    return true;
  }
  return false;
});
