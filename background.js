async function enableSidePanelFromAction() {
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
}

chrome.runtime.onInstalled.addListener(() => {
  enableSidePanelFromAction().catch(console.error);
});

chrome.runtime.onStartup.addListener(() => {
  enableSidePanelFromAction().catch(console.error);
});
