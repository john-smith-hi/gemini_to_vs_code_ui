const defaults = {
  enabled: true,
  projectName: "NAPOCHAN_BANHANG",
  folderName: "templates",
};

const enabledEl = document.getElementById("enabled");
const projectEl = document.getElementById("project");
const folderEl = document.getElementById("folder");

chrome.storage.local.get(defaults, (data) => {
  enabledEl.checked = data.enabled !== false;
  projectEl.value = data.projectName || defaults.projectName;
  folderEl.value = data.folderName || defaults.folderName;
});

enabledEl.addEventListener("change", () => {
  chrome.storage.local.set({ enabled: enabledEl.checked });
});

function saveNames() {
  chrome.storage.local.set({
    projectName: projectEl.value.trim() || defaults.projectName,
    folderName: folderEl.value.trim() || defaults.folderName,
  });
}

projectEl.addEventListener("change", saveNames);
folderEl.addEventListener("change", saveNames);

document.getElementById("open").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "open-cursor-window" });
  window.close();
});
