(function() {
  const debugEnabled = window.location.href.includes("#debug");

  function debugLog(...args) {
    if (debugEnabled) {
      console.log("[DEBUG]", ...args);
    }
  }

  function i18nMessage(key) {
    return chrome.i18n.getMessage(key) || key;
  }

  // 安定版に準じた getSources(): 各ソースのIDは index を使用
  function getSources() {
    let sources = [];
    const containers = document.querySelectorAll('.single-source-container');
    debugLog("Found", containers.length, "source containers.");
    containers.forEach((item, index) => {
      if (!item.dataset.sourceId) {
        item.dataset.sourceId = index; // 安定版では index を ID として利用
      }
      let titleElement = item.querySelector('.source-title');
      let title = titleElement ? titleElement.innerText.trim() : "No Title";
      let deleteButton = item.querySelector('.source-item-more-button');
      // ソース種別は複数ヒューリスティックで推定（リンク、テキスト、アイコン属性、クラス名等）
      function inferSourceType(el) {
        try {
          // 1) リンクの href をチェック
          const links = Array.from(el.querySelectorAll('a')).map(a => (a.href || '').trim()).filter(Boolean);
          for (const href of links) {
            const lower = href.toLowerCase();
            if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'video_youtube';
            if (lower.match(/\.pdf(\?|$)/)) return 'drive_pdf';
            if (lower.includes('drive.google.com')) {
              // Drive の場合は拡張子や export パラメータからタイプを推定
              if (lower.match(/export=download|open\?/)) return 'drive_pdf';
              return 'article';
            }
            if (lower.startsWith('http')) return 'web';
          }

          // 2) 要素テキストから拡張子やキーワードを検出
          const allText = (el.innerText || '').toLowerCase();
          if (allText.includes('.pdf')) return 'drive_pdf';
          if (allText.includes('youtube') || allText.includes('youtu.be')) return 'video_youtube';

          // 3) アイコン要素の aria-title-alt-text を探す
          const iconEl = el.querySelector('mat-icon, i, img, svg');
          if (iconEl) {
            const aria = iconEl.getAttribute && iconEl.getAttribute('aria-label');
            const title = iconEl.getAttribute && iconEl.getAttribute('title');
            const alt = iconEl.getAttribute && iconEl.getAttribute('alt');
            const txt = (iconEl.innerText || iconEl.textContent || '').trim();
            const candidates = [aria, title, alt, txt].filter(Boolean).join(' ').toLowerCase();
            if (candidates.includes('youtube') || candidates.includes('video')) return 'video_youtube';
            if (candidates.includes('pdf')) return 'drive_pdf';
            if (candidates.includes('doc') || candidates.includes('article')) return 'article';
            if (candidates.includes('web') || candidates.includes('link')) return 'web';
          }

          // 4) CSS クラス名から推定
          const classList = Array.from(el.classList || []).join(' ').toLowerCase();
          if (classList.includes('video') || classList.includes('youtube')) return 'video_youtube';
          if (classList.includes('pdf') || classList.includes('document')) return 'drive_pdf';

        } catch (e) {
          debugLog('inferSourceType error', e);
        }
        return 'Unknown';
      }

      let type = inferSourceType(item);
      sources.push({
        id: item.dataset.sourceId,
        title: title,
        deleteButton: deleteButton,
        element: item,
        selected: false,
        type: type
      });
      debugLog("Source added: ID =", item.dataset.sourceId, "Title =", title, "Type =", type);
    });
    return sources;
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch(e) {
      return false;
    }
  }

  function findChipByIcon(iconText) {
    // 多様な DOM 構成に対応するため複数の方法で chip を検索
    const chips = Array.from(document.querySelectorAll('mat-chip, .mat-chip, .chip, button.chip'));
    const want = (iconText || '').toLowerCase();
    for (const chip of chips) {
      const icon = chip.querySelector('mat-icon, i, img, svg');
      if (icon) {
        const aria = icon.getAttribute && icon.getAttribute('aria-label');
        const title = icon.getAttribute && icon.getAttribute('title');
        const alt = icon.getAttribute && icon.getAttribute('alt');
        const txt = (icon.innerText || icon.textContent || '').trim();
        const combined = [aria, title, alt, txt].filter(Boolean).join(' ').toLowerCase();
        if (combined.includes(want) || combined.includes(want.replace('_', ' '))) return chip;
      }
      const dataIcon = chip.getAttribute && (chip.getAttribute('data-icon') || chip.getAttribute('data-value'));
      if (dataIcon && dataIcon.toLowerCase().includes(want)) return chip;
      const chipText = (chip.innerText || '').toLowerCase();
      if (chipText.includes(want) || chipText.includes(want.replace('_', ' '))) return chip;
    }
    return null;
  }

  function findModalCloseButton() {
    const buttons = document.querySelectorAll('button.mat-mdc-icon-button');

    for (const btn of buttons) {
      const icon = btn.querySelector('mat-icon');
      if (icon?.textContent?.trim() === 'close') {
        return btn;
      }
    }
    return null;
  }
    
  async function addSource(url) {
    if (!isValidUrl(url)) {
      throw i18nMessage("invalidUrlMessage") + ": " + url;
    }
    const isYt = url.includes("youtube") || url.includes("youtu.be");
    let iconText = isYt ? "video_youtube" : "web";

    let addBtn = document.querySelector("button.add-source-button");
    if (!addBtn) throw i18nMessage("errorClickAddSourceButton");
    addBtn.click();
    await delay(100);

    let chip = findChipByIcon(iconText);
    if (!chip) throw "Chip for icon '" + iconText + "' not found.";
    chip.click();
    await delay(300);

    let inputEl = document.querySelector('input[formcontrolname="newUrl"]');
    if (!inputEl) throw i18nMessage("errorUrlInputFieldNotFound");
    inputEl.value = url;
    inputEl.dispatchEvent(new Event("input", { bubbles: true }));
    await delay(100);
    inputEl.blur();
    document.body.focus();

    const insertBtnSelector = 'button[type="submit"].mat-mdc-unelevated-button.mat-primary';
    let insertBtn = document.querySelector(insertBtnSelector);

    if (!insertBtn || insertBtn.disabled) {
      const closeButton = findModalCloseButton();
      if (closeButton) {
        closeButton.click();
        debugLog("Close button clicked.");
        await delay(300);
      } else {
        debugLog("Close button not found.");
      }
      throw i18nMessage("errorNoInsertButton");
    }
    insertBtn.click();
    await delay(2000);

    return "Added: " + url;
  }

// 個別削除処理（deleteSelectedSources を上書き）
async function deleteSelectedSources(selectedIds) {
  let processed = 0;
  for (let i = 0; i < selectedIds.length; i++) {
    let id = selectedIds[i];
    // 最新のソース状態を取得（削除対象が DOM 上からなくなっている可能性も考慮）
    let src = getSources().find(s => s.id === id);
    if (!src) {
      processed++;
      // ソースが見つからなければエラーとして通知
      chrome.runtime.sendMessage({
        action: "deletionProgress",
        id: id,
        status: "error",
        error: "Source not found",
        processed: processed,
        total: selectedIds.length
      });
      continue;
    }
    try {
      // 各ソースに対する削除操作（イベントシミュレーション）
      src.element.dispatchEvent(new Event("mouseenter", { bubbles: true }));
      await delay(500);
      let moreBtn = src.element.querySelector(".source-item-more-button");
      if (moreBtn) moreBtn.click();
      else throw new Error("More button not found");
      await delay(500);
      let delBtn = document.querySelector(".more-menu-delete-source-button");
      if (delBtn) delBtn.click();
      else throw new Error("Delete button not found");
      await delay(500);
      let confirmBtn = document.querySelector(".submit");
      if (confirmBtn) confirmBtn.click();
      else throw new Error("Confirm button not found");
      await delay(500);
      src.element.dispatchEvent(new Event("mouseleave", { bubbles: true }));
      processed++;
      chrome.runtime.sendMessage({
        action: "deletionProgress",
        id: id,
        status: "success",
        processed: processed,
        total: selectedIds.length
      });
    } catch(e) {
      processed++;
      chrome.runtime.sendMessage({
        action: "deletionProgress",
        id: id,
        status: "error",
        error: e.message,
        processed: processed,
        total: selectedIds.length
      });
    }
    await delay(1500);
  }
}

  async function renameSources(renamePairs) {
    const containers = document.querySelectorAll(".single-source-container");
    const results = [];

    for (const pair of renamePairs) {
      const { title: oldTitle, newTitle } = pair;
      let target = Array.from(containers).find(elem => {
        let tEl = elem.querySelector(".source-title");
        return tEl && tEl.innerText.trim() === oldTitle;
      });
      if (!target) {
        results.push({ oldTitle, newTitle, status: "not found" });
        continue;
      }
      try {
        target.dispatchEvent(new Event("mouseenter", { bubbles: true }));
        await delay(500);

        let moreBtn = target.querySelector(".source-item-more-button");
        if (moreBtn) moreBtn.click();
        await delay(500);

        let renameOpt = document.querySelector(".more-menu-edit-source-button");
        if (renameOpt) renameOpt.click();
        await delay(500);

        let inputEl = document.querySelector("mat-dialog-container input.title-input");
        if (!inputEl) throw "リネーム用入力欄が見つかりません";
        inputEl.value = newTitle;
        inputEl.dispatchEvent(new Event("input", { bubbles: true }));
        await delay(300);

        let saveBtn = document.querySelector("mat-dialog-container button.submit-button");
        if (!saveBtn) throw "保存ボタンが見つかりません";
        saveBtn.click();
        await delay(2000);

        target.dispatchEvent(new Event("mouseleave", { bubbles: true }));
        results.push({ oldTitle, newTitle, status: "renamed" });
      } catch (err) {
        results.push({ oldTitle, newTitle, status: "error", error: err });
      }
      await delay(500);
    }
    return results;
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    debugLog("Content script received:", message);
    if (message.action === "getSources") {
      sendResponse({ sources: getSources() });
    }
    else if (message.action === "deleteSelected") {
      deleteSelectedSources(message.ids);
      sendResponse({ result: "deleteSelected initiated" });
    }
    else if (message.action === "addSource") {
      addSource(message.url)
        .then(result => sendResponse({ result }))
        .catch(error => sendResponse({ error }));
      return true;
    }
    else if (message.action === "renameSources") {
      renameSources(message.renamePairs)
        .then(result => sendResponse({ result }))
        .catch(error => sendResponse({ error }));
      return true;
    }
  });
})();
