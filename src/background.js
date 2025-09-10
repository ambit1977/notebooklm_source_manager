let notebooklmTabId = null;
let filterWindowId = null;
const EXTENSION_VERSION = '1.1.0';

// i18n ラッパ関数
function i18nMessage(key) {
  return chrome.i18n.getMessage(key) || key;
}

// filterウィンドウへエラーメッセージを送信する関数
function sendErrorToFilterWindow(errMsg) {
  chrome.runtime.sendMessage({ action: "displayError", message: errMsg });
}

// インストール時処理
chrome.runtime.onInstalled.addListener(() => {
  console.log(`NotebookLM Source Manager installed - Version: ${EXTENSION_VERSION}`);
});

// 拡張機能アイコンクリック時処理
chrome.action.onClicked.addListener((tab) => {
  console.log("Extension icon clicked:", tab);

  // NotebookLMタブのURLかどうかを確認
  if (!tab.url || !tab.url.includes("notebooklm.google.com")) {
    const msg = i18nMessage("errorActiveTab");
    sendErrorToFilterWindow(msg);
    return;
  }

  notebooklmTabId = tab.id;

  if (filterWindowId !== null) {
    chrome.windows.get(filterWindowId, (win) => {
      if (chrome.runtime.lastError || !win) {
        createFilterWindow();
      } else {
        chrome.windows.update(filterWindowId, { focused: true });
      }
    });
  } else {
    createFilterWindow();
  }
});

// フィルターウィンドウ作成関数
function createFilterWindow() {
  chrome.windows.create({
    url: chrome.runtime.getURL("filter.html"),
    type: "popup",
    width: 600,
    height: 600
  }, (win) => {
    if (win) {
      filterWindowId = win.id;
    } else {
      const msg = i18nMessage("errorCreateFilterWindow");
      sendErrorToFilterWindow(msg);
    }
  });
}

// ウィンドウが閉じられた際にIDをリセット
chrome.windows.onRemoved.addListener((winId) => {
  if (winId === filterWindowId) {
    filterWindowId = null;
  }
});

// タブが閉じられた場合やURLが変更された場合の処理
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === notebooklmTabId) notebooklmTabId = null;
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tabId === notebooklmTabId && changeInfo.url && !changeInfo.url.includes("notebooklm.google.com")) {
    notebooklmTabId = null;
  }
});

// メッセージハンドリング処理
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (notebooklmTabId === null) {
    const errMsg = i18nMessage("errorNoNotebookLMTab");
    sendErrorToFilterWindow(errMsg);
    sendResponse({ error: errMsg });
    return;
  }
    
  // deletionProgress メッセージが来たら、フィルターウィンドウに転送
  if (message.action === "deletionProgress") {
    // ここでは単純に全体に再送信する例です。
    chrome.runtime.sendMessage(message);
  }
    
  // NotebookLMタブへメッセージを転送
  chrome.tabs.sendMessage(notebooklmTabId, message, (response) => {
    if (chrome.runtime.lastError) {
      const errMsg = chrome.runtime.lastError.message;
      sendErrorToFilterWindow(errMsg);
      sendResponse({ error: errMsg });
    } else {
      sendResponse(response);
    }
  });
  return true;
});
