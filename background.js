let notebooklmTabId = null;
let filterWindowId = null;
const EXTENSION_VERSION = '1.1.0';

// 失敗の種類。filter.js 側でこのコードを見て、文言と復旧手段を出し分ける。
const ERR = {
  NO_TAB: 'NO_TAB',                          // 対象タブを見失った
  NOT_NOTEBOOKLM: 'NOT_NOTEBOOKLM',          // NotebookLM 以外のページ
  NOT_NOTEBOOK_PAGE: 'NOT_NOTEBOOK_PAGE',    // NotebookLM だがノートブックを開いていない
  SCRIPT_UNAVAILABLE: 'SCRIPT_UNAVAILABLE'   // content script に届かず、再注入も失敗
};

// i18n ラッパ関数
function i18nMessage(key) {
  return chrome.i18n.getMessage(key) || key;
}

// インストール時処理
chrome.runtime.onInstalled.addListener(() => {
  console.log(`NotebookLM Source Manager installed - Version: ${EXTENSION_VERSION}`);
});

// NotebookLM（Gemini Notebook）は配信されるドメインが2種類ある。
// アカウントによって notebooklm.google.com のまま提供される場合と、
// notebook.google.com で提供される場合があり、リダイレクトされるとは限らない。
// 片方しか見ていないと「ノートブックを開いているのにタブが見つかりません」になる。
const NOTEBOOK_URL_PATTERNS = [
  'https://notebooklm.google.com/*',
  'https://notebook.google.com/*'
];
const NOTEBOOK_SITE_RE = /^https:\/\/(notebooklm|notebook)\.google\.com\//;
const NOTEBOOK_PAGE_RE = /^https:\/\/(notebooklm|notebook)\.google\.com\/notebook\//;

function isNotebookLmUrl(url) {
  return NOTEBOOK_SITE_RE.test(url || '');
}
function isNotebookPageUrl(url) {
  return NOTEBOOK_PAGE_RE.test(url || '');
}

// 対象タブの状態を調べる。
async function resolveNotebookTab() {
  let tab = null;
  if (notebooklmTabId !== null) {
    try {
      tab = await chrome.tabs.get(notebooklmTabId);
    } catch (e) {
      tab = null;  // タブが閉じられている
    }
  }

  // 記録済みのタブがまだ NotebookLM 上にあるなら、それを尊重する。
  // ここで「他に開いているノートブック」へ勝手に切り替えると、
  // ユーザーが見ているのとは別のノートブックから削除してしまう危険がある。
  // ノートブック未表示なら、切り替えずにその旨を返す。
  if (tab && isNotebookLmUrl(tab.url)) {
    return isNotebookPageUrl(tab.url) ? { tab } : { error: ERR.NOT_NOTEBOOK_PAGE, tab };
  }

  // 記録を失っている場合（タブを閉じた／別サイトへ移動した）に限り、
  // 開いているノートブックを探し直す
  const found = (await chrome.tabs.query({ url: NOTEBOOK_URL_PATTERNS }))
    .filter(t => isNotebookPageUrl(t.url));
  if (found.length) {
    notebooklmTabId = found[0].id;
    return { tab: found[0] };
  }
  return { error: tab ? ERR.NOT_NOTEBOOKLM : ERR.NO_TAB };
}

function pingContentScript(tabId) {
  return new Promise(resolve => {
    chrome.tabs.sendMessage(tabId, { action: 'ping' }, resp => {
      if (chrome.runtime.lastError || !resp) resolve(false);
      else resolve(true);
    });
  });
}

// content script が応答しなければ再注入する（フェイルセーフ）。
// 拡張機能を後から入れた／更新した直後は、既に開いているタブに
// content script が入っていないため、この経路で自動復旧する。
async function ensureContentScript(tabId) {
  if (await pingContentScript(tabId)) return true;
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
  } catch (e) {
    console.warn('content script の再注入に失敗:', e && e.message);
    return false;
  }
  // 注入直後はリスナー登録前の可能性があるため、少し待って再確認する
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 150));
    if (await pingContentScript(tabId)) return true;
  }
  return false;
}

// 拡張機能アイコンクリック時処理
chrome.action.onClicked.addListener((tab) => {
  if (!tab.url || !isNotebookLmUrl(tab.url)) {
    // NotebookLM 以外のタブで押された場合。ウィンドウは開いて案内を出す。
    notebooklmTabId = null;
  } else {
    notebooklmTabId = tab.id;
  }

  // 既存のフィルターウィンドウがあれば前面に出す。
  // filterWindowId はメモリ上の変数のため Service Worker が再起動すると失われる。
  // その状態でアイコンを押すとウィンドウが増えてしまうので、
  // 実際に開いている filter.html を探して見つかればそれを使う。
  (async () => {
    try {
      const url = chrome.runtime.getURL('filter.html');
      const tabs = await chrome.tabs.query({ url });
      if (tabs.length) {
        filterWindowId = tabs[0].windowId;
        await chrome.windows.update(filterWindowId, { focused: true });
        return;
      }
    } catch (e) {
      console.warn('既存のフィルターウィンドウ検索に失敗:', e && e.message);
    }
    createFilterWindow();
  })();
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
      console.error(i18nMessage("errorCreateFilterWindow"));
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
  if (tabId === notebooklmTabId && changeInfo.url && !isNotebookLmUrl(changeInfo.url)) {
    notebooklmTabId = null;
  }
});

// メッセージハンドリング処理
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // deletionProgress は content script からの進捗通知。
  // chrome.runtime.sendMessage は拡張機能内の全コンテキストへ配信されるため、
  // フィルターウィンドウには既に直接届いている。ここで中継すると二重配信になり、
  // エラー件数が実際の倍に表示されていた。中継せず何もしない。
  if (message.action === "deletionProgress") {
    return;
  }

  // 対象タブの再読み込み（ユーザーが案内に従って復旧する導線）
  if (message.action === "reloadNotebookTab") {
    (async () => {
      const state = await resolveNotebookTab();
      if (state.error) {
        sendResponse({ error: i18nMessage('errorGuide_' + state.error), errorCode: state.error });
        return;
      }
      await chrome.tabs.reload(state.tab.id);
      // 読み込みと content script の起動を待つ
      const ok = await ensureContentScript(state.tab.id);
      sendResponse(ok
        ? { result: 'reloaded' }
        : { error: i18nMessage('errorGuide_' + ERR.SCRIPT_UNAVAILABLE), errorCode: ERR.SCRIPT_UNAVAILABLE });
    })();
    return true;
  }

  // NotebookLM タブへメッセージを転送
  (async () => {
    const state = await resolveNotebookTab();
    if (state.error) {
      const msg = i18nMessage('errorGuide_' + state.error);
      sendResponse({ error: msg, errorCode: state.error });
      return;
    }

    // 届かなければ再注入を試みる
    const alive = await ensureContentScript(state.tab.id);
    if (!alive) {
      const msg = i18nMessage('errorGuide_' + ERR.SCRIPT_UNAVAILABLE);
      sendResponse({ error: msg, errorCode: ERR.SCRIPT_UNAVAILABLE });
      return;
    }

    chrome.tabs.sendMessage(state.tab.id, message, (response) => {
      if (chrome.runtime.lastError) {
        // 再注入後にも失敗した場合は、生のエラーではなく案内文を返す
        const msg = i18nMessage('errorGuide_' + ERR.SCRIPT_UNAVAILABLE);
        sendResponse({ error: msg, errorCode: ERR.SCRIPT_UNAVAILABLE });
      } else {
        sendResponse(response);
      }
    });
  })();
  return true;
});
