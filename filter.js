document.addEventListener("DOMContentLoaded", function() {
  /////////////////////////////////////////////////////////////
  // 0. i18n属性によるテキストの置換処理
  /////////////////////////////////////////////////////////////
  // data-i18n または data-i18n-placeholder 属性を持つ要素のテキストを更新する
  document.querySelectorAll('[data-i18n], [data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n') || el.getAttribute('data-i18n-placeholder');
    const message = chrome.i18n.getMessage(key);
    if (message) {
      // placeholder 属性がある場合はそれを更新、なければ innerText を更新
      if (el.hasAttribute("data-i18n-placeholder")) {
        el.setAttribute("placeholder", message);
      } else {
        el.innerText = message;
      }
    }
  });
  
  /////////////////////////////////////////////////////////////
  // 1. i18n (JS内で利用する場合)
  /////////////////////////////////////////////////////////////
  function i18nMessage(key) {
    return chrome.i18n.getMessage(key) || key;
  }

  // タイトルなどの設定（すでにHTML側で更新済みの場合は補完）
  const titleEl = document.getElementById("title");
  if (titleEl && !titleEl.innerText.trim()) {
    titleEl.innerText = i18nMessage("filterTitle") || "フィルターウィンドウ";
  }
  const versionLabelEl = document.getElementById("versionLabel");
  if (versionLabelEl && !versionLabelEl.innerText.trim()) {
    versionLabelEl.innerText = i18nMessage("versionLabel") || "バージョン";
  }

  // タブ切替処理
  const tabs = document.querySelectorAll(".tab");
  const tabContents = document.querySelectorAll(".tab-content");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tabContents.forEach(tc => tc.classList.remove("active"));
      tab.classList.add("active");
      let activeTab = tab.getAttribute("data-tab");
      let content = document.getElementById(activeTab);
      if (content) content.classList.add("active");
    });
  });

  /////////////////////////////////////////////////////////////
  // 2. ソース一覧表示とフィルタ処理
  /////////////////////////////////////////////////////////////
  let sources = [];
  let filteredSources = [];

  function initSourceSelection(list) {
    return list.map(s => {
      s.selected = false;
      if (!s.type) s.type = "Unknown";
      return s;
    });
  }

  // ソース種別のアイコンおよびツールチップ定義
  function getTypeMapping(type) {
    const typeMap = {
      "article":            { icon: "📰", tooltip: "Docs" },
      "description":        { icon: "📃", tooltip: "TXT" },
      "drive_pdf":          { icon: "📄", tooltip: "PDF" },
      "drive_presentation": { icon: "📊", tooltip: "PPT" },
      "markdown":           { icon: "📝", tooltip: "MD" },
      "video_audio_call":   { icon: "📞", tooltip: "VOICE" },
      "video_youtube":      { icon: "📺", tooltip: "YouTube" },
      "web":                { icon: "🌐", tooltip: "WEB" },
      "Unknown":            { icon: "❓", tooltip: "Unknown" }
    };
    return typeMap[type] || typeMap["Unknown"];
  }

  // ソース種別アイコン要素生成
  function getTypeIconElement(type) {
    let mapping = getTypeMapping(type);
    let span = document.createElement("span");
    span.innerText = mapping.icon;
    span.title = mapping.tooltip;
    span.style.marginRight = "5px";
    span.style.fontSize = "1.2em";
    return span;
  }

  // ソース一覧の描画
  function renderSources() {
    let list = document.getElementById("sourceList");
    if (!list) return;
    list.innerHTML = "";

    // 全選択／全解除チェックボックスと重複チェックボタン
    let selectAllLi = document.createElement("li");
    let selectAllCb = document.createElement("input");
    selectAllCb.type = "checkbox";
    selectAllCb.id = "selectAll";
    let allChecked = (filteredSources.length > 0) && filteredSources.every(x => x.selected);
    selectAllCb.checked = allChecked;
    selectAllCb.addEventListener("change", function() {
      let check = this.checked;
      filteredSources.forEach(s => {
        let found = sources.find(x => x.id === s.id);
        if (found) {
          found.selected = check;
          s.selected = check;
        }
      });
      renderSources();
    });
    selectAllLi.appendChild(selectAllCb);

    let selAllLabel = document.createElement("strong");
    selAllLabel.innerText = i18nMessage("selectAll") || "全選択／全解除";
    selectAllLi.appendChild(selAllLabel);

    // 重複チェックボタン（対象は表示されているソースのみ）
    let dupBtn = document.createElement("button");
    dupBtn.id = "checkDuplicatesButton";
    dupBtn.innerText = i18nMessage("duplicateCheckButton") || "重複チェック";
    dupBtn.style.marginLeft = "10px";
    dupBtn.addEventListener("click", checkDuplicates);
    selectAllLi.appendChild(dupBtn);

    list.appendChild(selectAllLi);

    // 各ソース行の生成（アイコン付き）
    filteredSources.forEach(s => {
      let li = document.createElement("li");
      let cbox = document.createElement("input");
      cbox.type = "checkbox";
      cbox.dataset.id = s.id;
      cbox.checked = s.selected;
      cbox.addEventListener("change", function() {
        let found = sources.find(x => x.id === s.id);
        if (found) {
          found.selected = this.checked;
          s.selected = this.checked;
        }
      });
      li.appendChild(cbox);

      let iconEl = getTypeIconElement(s.type);
      li.appendChild(iconEl);

      li.appendChild(document.createTextNode(s.title));
      list.appendChild(li);
    });
  }

  // フィルタ処理（フィルタテキスト、並べ替え、ソース種別フィルタを適用）
  function updateFilteredSources() {
    let filterVal = (document.getElementById("filterInput") || {}).value || "";
    let sortVal = (document.getElementById("sortOrder") || {}).value || "default";
    let useRegex = (document.getElementById("regexFilter") || {}).checked;

    let tmp;
    if (useRegex) {
      try {
        let re = new RegExp(filterVal, "i");
        tmp = sources.filter(s => {
          let text = (s.title + " " + s.type).toLowerCase();
          return re.test(text);
        });
      } catch (e) {
        console.warn("Invalid regex:", e);
        tmp = [];
      }
    } else {
      let lower = filterVal.trim().toLowerCase();
      tmp = sources.filter(s => {
        let text = (s.title + " " + s.type).toLowerCase();
        return text.includes(lower);
      });
    }

    // ソース種別フィルタの適用（表示されているソースのみ）
    let typeCbs = document.querySelectorAll("#sourceTypeFilters input[type=checkbox]");
    let selectedTypes = [];
    typeCbs.forEach(cb => {
      if (cb.checked) selectedTypes.push(cb.value);
    });
    if (selectedTypes.length > 0) {
      tmp = tmp.filter(x => selectedTypes.includes(x.type));
    }

    // ソート処理
    if (sortVal === "asc") {
      tmp.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortVal === "desc") {
      tmp.sort((a, b) => b.title.localeCompare(a.title));
    }

    filteredSources = tmp;
    renderSources();
  }

  // ソース種別フィルタ用チェックボックス群の生成
  function renderSourceTypeFilters() {
    let container = document.getElementById("sourceTypeFilters");
    if (!container) return;
    container.innerHTML = "";
    let types = Array.from(new Set(sources.map(s => s.type))).sort();
    types.forEach(t => {
      let cb = document.createElement("input");
      cb.type = "checkbox";
      cb.value = t;
      cb.id = "type_" + t;
      cb.addEventListener("change", updateFilteredSources);

      let lab = document.createElement("label");
      lab.htmlFor = "type_" + t;
      let iconEl = getTypeIconElement(t);
      lab.appendChild(iconEl);
      lab.appendChild(document.createTextNode(getTypeMapping(t).tooltip));
      container.appendChild(cb);
      container.appendChild(lab);
    });
  }

  // エラーメッセージ表示用
  function displayError(msg) {
    let err = document.getElementById("errorMessage");
    if (err) err.innerText = msg;
  }
  function clearError() {
    let err = document.getElementById("errorMessage");
    if (err) err.innerText = "";
  }

  // ソース再読み込み
  function reloadSources() {
    chrome.runtime.sendMessage({ action: "getSources" }, (resp) => {
      if (chrome.runtime.lastError) {
        displayError(chrome.runtime.lastError.message);
        return;
      }
      if (resp && resp.error) {
        displayError(resp.error);
        return;
      }
      if (resp && resp.sources) {
        clearError();
        sources = initSourceSelection(resp.sources);
        filteredSources = [...sources];
        updateFilteredSources();
        renderSourceTypeFilters();
      } else {
        displayError(i18nMessage("errorNoSources"));
      }
    });
  }

  // 重複チェック（表示されている filteredSources のみ対象）
  function checkDuplicates() {
    let seen = new Map();
    filteredSources.forEach(s => {
      if (seen.has(s.title)) {
        s.selected = true;
      } else {
        seen.set(s.title, true);
        s.selected = false;
      }
    });
    // 同じ内容を sources にも反映
    filteredSources.forEach(s => {
      let orig = sources.find(x => x.id === s.id);
      if (orig) {
        orig.selected = s.selected;
      }
    });
    renderSources();
  }

  /////////////////////////////////////////////////////////////
  // 3. CSVダウンロード (削除モード)
  let csvBtn = document.createElement("button");
  csvBtn.id = "downloadCsvBtn";
  csvBtn.innerText = i18nMessage("downloadCsvButton") || "Download CSV";
  csvBtn.style.marginLeft = "10px";
  csvBtn.addEventListener("click", () => downloadCsv());
  let delSelBtn = document.getElementById("deleteSelected");
  if (delSelBtn) {
    delSelBtn.insertAdjacentElement("afterend", csvBtn);
  }
  function downloadCsv() {
    let lines = [];
    lines.push(["Title", "Type"].join(","));
    for (let s of filteredSources) {
      let row = [`"${s.title.replace(/"/g, '""')}"`, `"${s.type.replace(/"/g, '""')}"`];
      lines.push(row.join(","));
    }
    let csvContent = lines.join("\n");
    let blob = new Blob([csvContent], { type: "text/csv" });
    let url = URL.createObjectURL(blob);

    let a = document.createElement("a");
    a.href = url;
    a.download = "filtered_sources.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /////////////////////////////////////////////////////////////
  // 4. URL一括追加モード
  let progressBar = document.getElementById("urlProgress");
  if (!progressBar) {
    progressBar = document.createElement("progress");
    progressBar.id = "urlProgress";
    progressBar.max = 100;
    progressBar.value = 0;
    (document.getElementById("urlAdditionMode") || document.body).appendChild(progressBar);
  }
  let progressStatus = document.getElementById("progressStatus");
  if (!progressStatus) {
    progressStatus = document.createElement("div");
    progressStatus.id = "progressStatus";
    (document.getElementById("urlAdditionMode") || document.body).appendChild(progressStatus);
  }
  let addUrlsButton = document.getElementById("addUrlsButton");
  if (addUrlsButton) {
    addUrlsButton.addEventListener("click", async () => {
      let textarea = document.getElementById("urlTextarea");
      let errorDiv = document.getElementById("urlError");
      if (!textarea || !errorDiv) return;

      let lines = textarea.value.split(/\r?\n/).map(x => x.trim()).filter(x => x);
      if (!lines.length) return;

      progressBar.max = lines.length;
      progressBar.value = 0;
      let processed = 0, errorCount = 0;
      let errorMsgs = [];
      errorDiv.innerText = "";

      progressStatus.innerText = `Start: ${lines.length}, ERR: ${errorCount}`;

      let remain = [];
      for (let url of lines) {
        console.log("Adding URL:", url);
        try {
          let resp = await addSourceUrl(url);
          if (resp.error) throw resp.error;
        } catch (e) {
          console.log("URL addition error:", e);
          errorMsgs.push(`URL add error: ${url} => ${e}`);
          errorCount++;
          remain.push(url);
        }
        processed++;
        progressBar.value = processed;
        progressStatus.innerText = `Progress: ${processed}/${lines.length}, ERR: ${errorCount}`;
        await new Promise(r => setTimeout(r, 100));
      }

      if (errorMsgs.length > 0) {
        errorDiv.innerText = errorMsgs.join("\n");
        textarea.value = remain.join("\n");
      } else {
        errorDiv.innerText = "";
        textarea.value = "";
      }
      progressStatus.innerText += "\nDone.";
      reloadSources();
    });
  }
  function addSourceUrl(url) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: "addSource", url }, resp => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError.message);
        } else {
          resolve(resp);
        }
      });
    });
  }

  /////////////////////////////////////////////////////////////
  // 5. リネームモード
  function parseCSVLine(line) {
    let re = /(?:\s*"([^"]*)"\s*|\s*([^",]+)\s*)(?:,|$)/g;
    let result = [];
    let m;
    while ((m = re.exec(line)) !== null) {
      result.push(m[1] !== undefined ? m[1] : m[2]);
    }
    return result.length === 2 ? result : null;
  }
  let renameBtn = document.getElementById("renameButton");
  if (renameBtn) {
    renameBtn.addEventListener("click", () => {
      let textarea = document.getElementById("renameTextarea");
      let errorDiv = document.getElementById("renameError");
      let renameProg = document.getElementById("renameProgress");
      let renameStat = document.getElementById("renameStatus");
      if (!textarea || !errorDiv || !renameProg || !renameStat) return;

      let lines = textarea.value.split(/\r?\n/).map(x => x.trim()).filter(x => x);
      let pairs = lines.map(parseCSVLine).filter(x => x !== null).map(([o, n]) => ({ title: o, newTitle: n }));
      if (!pairs.length) {
        errorDiv.innerText = i18nMessage("renameEmptyCsv");
        return;
      }

      errorDiv.innerText = "";
      renameProg.max = pairs.length;
      renameProg.value = 0;
      renameStat.innerText = i18nMessage("renameProgressRunning") + " (" + pairs.length + ")";

      chrome.runtime.sendMessage({ action: "renameSources", renamePairs: pairs }, resp => {
        if (resp.error) {
          errorDiv.innerText = i18nMessage("renameErrorMessage") + ": " + resp.error;
          return;
        }
        let results = resp.result || [];
        let failed = results.filter(x => x.status !== "renamed");
        if (failed.length > 0) {
          errorDiv.innerText = failed.map(f => `${f.oldTitle} => ${f.newTitle}: ${f.status}${f.error ? "(" + f.error + ")" : ""}`).join("\n");
        } else {
          errorDiv.innerText = "";
        }
        renameProg.value = pairs.length;
        renameStat.innerText = i18nMessage("renameComplete");
      });
    });
  }

  /////////////////////////////////////////////////////////////
  // 6. マスターウィンドウ制御
  const MASTER_KEY = "filterWindowMaster";
  const MASTER_EXPIRATION = 5000; // 5秒
  const myId = Date.now() + "-" + Math.random();
  const now = Date.now();
  let stored = localStorage.getItem(MASTER_KEY);

  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (now - parsed.timestamp < MASTER_EXPIRATION) {
        console.warn("別のフィルターウィンドウが既に動作中のため、このウィンドウを閉じます。");
        window.close();
      } else {
        localStorage.setItem(MASTER_KEY, JSON.stringify({ id: myId, timestamp: now }));
        window.isMaster = true;
        console.log("前のマスターは期限切れ。現在のウィンドウがマスターに設定されました。");
      }
    } catch (e) {
      localStorage.setItem(MASTER_KEY, JSON.stringify({ id: myId, timestamp: now }));
      window.isMaster = true;
      console.log("有効なマスターが見つからなかったため、このウィンドウがマスターに設定されました。");
    }
  } else {
    localStorage.setItem(MASTER_KEY, JSON.stringify({ id: myId, timestamp: now }));
    window.isMaster = true;
    console.log("このフィルターウィンドウがマスターに設定されました。");
  }

  window.addEventListener("unload", function() {
    if (window.isMaster) {
      localStorage.removeItem(MASTER_KEY);
      console.log("マスターフィルターウィンドウが閉じられたため、キーを削除しました。");
    }
  });

  /////////////////////////////////////////////////////////////
  // 7. ボタンイベント設定と初期ロード
  // フィルタ入力欄の自動更新
  if (document.getElementById("filterInput")) {
    document.getElementById("filterInput").addEventListener("input", updateFilteredSources);
  }
    
  // 表示順プルダウンの自動更新
  if (document.getElementById("sortOrder")) {
    document.getElementById("sortOrder").addEventListener("change", updateFilteredSources);
  }

  // Clear ボタンの設定
  if (document.getElementById("clearFilter")) {
    document.getElementById("clearFilter").addEventListener("click", function() {
      let input = document.getElementById("filterInput");
      if (input) {
        input.value = "";
        updateFilteredSources();
      }
    });
  }
  
  // Delete Selected Sources ボタンの設定（対象はフィルタ済みのソース）
  if (document.getElementById("deleteSelected")) {
    document.getElementById("deleteSelected").addEventListener("click", function () {
      let selectedIds = filteredSources.filter(s => s.selected).map(s => s.id);
      console.log("削除対象のID:", selectedIds);
      if (selectedIds.length === 0) {
        alert(i18nMessage("noDeleteTargetAlert") || "削除対象が選択されていません");
        return;
      }
      if (!confirm(i18nMessage("deleteConfirmMessage") + selectedIds.length)) {
        return;
      }
      
      // 削除進捗表示用コンテナの生成
      let reloadBtn = document.getElementById("reloadSources");
      let delContainer = document.getElementById("deletionContainer");
      if (!delContainer) {
        delContainer = document.createElement("div");
        delContainer.id = "deletionContainer";
        if (reloadBtn) {
          reloadBtn.insertAdjacentElement("afterend", delContainer);
        } else {
          this.insertAdjacentElement("afterend", delContainer);
        }
      }
      
      // 進捗バーの生成
      let delProg = document.getElementById("deletionProgressBar");
      if (!delProg) {
        delProg = document.createElement("progress");
        delProg.id = "deletionProgressBar";
        delProg.max = selectedIds.length;
        delContainer.appendChild(delProg);
      }
      
      // 進捗ステータスの生成
      let delStatus = document.getElementById("deletionStatus");
      if (!delStatus) {
        delStatus = document.createElement("div");
        delStatus.id = "deletionStatus";
        delContainer.appendChild(delStatus);
      }
      delStatus.innerText = i18nMessage("deletionInProgress") || "削除中...";
      
      chrome.runtime.sendMessage({ action: "deleteSelected", ids: selectedIds }, function(response) {
        console.log("deleteSelected 応答:", response);
      });
    });
  }

let deletionState = {
  total: 0,
  processed: 0,
  errorCount: 0
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "deletionProgress") {
    const delProg = document.getElementById("deletionProgressBar");
    const delStatus = document.getElementById("deletionStatus");
    const delContainer = document.getElementById("deletionContainer");

    // 初期化済みか確認
    if (!delProg || !delStatus || !delContainer) return;

    // 初回に合計件数を保存
    if (deletionState.total === 0 && message.total) {
      deletionState.total = message.total;
    }

    // 処理済み件数・エラー件数を更新
    deletionState.processed = message.processed;
    if (message.status === "error") {
      deletionState.errorCount = message.errorCount || (deletionState.errorCount + 1);
    }

    // プログレスバー更新
    delProg.max = deletionState.total;
    delProg.value = deletionState.processed;

    // ステータス更新
    delStatus.innerText = `進捗: ${deletionState.processed}/${deletionState.total} 件, エラー: ${deletionState.errorCount}`;

    // 完了処理
    if (deletionState.processed === deletionState.total) {
      delStatus.innerText = i18nMessage("deleteFinishedMessage") || "削除完了";
      setTimeout(() => {
        reloadSources();
        delContainer.remove();
        // 状態初期化
        deletionState = { total: 0, processed: 0, errorCount: 0 };
      }, 1000);
    }
  }
});
    
  // Reload ボタンの追加（Delete Selected の隣に配置）
  if (document.getElementById("deleteSelected") && !document.getElementById("reloadSources")) {
    let reloadBtn = document.createElement("button");
    reloadBtn.id = "reloadSources";
    reloadBtn.innerText = i18nMessage("reloadButton") || "再読み込み";
    reloadBtn.addEventListener("click", reloadSources);
    document.getElementById("deleteSelected").insertAdjacentElement("afterend", reloadBtn);
  }

  // 初期ソース取得
  reloadSources();
});
