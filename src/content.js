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
      function inferSourceType(el, titleArg) {
        try {
          // prepare title/text hints
          let titleHint = '';
          if (titleArg) titleHint = ('' + titleArg).toLowerCase();
          else {
            const tEl = el.querySelector && el.querySelector('.source-title');
            titleHint = (tEl && (tEl.innerText || tEl.textContent) || el.getAttribute && (el.getAttribute('title') || '')) .toLowerCase();
          }

          // 1) リンクの href をチェックして、拡張子やサービス名からタイプ推定
          const links = Array.from(el.querySelectorAll('a')).map(a => (a.href || '').trim()).filter(Boolean);
          for (const href of links) {
            const lower = href.toLowerCase();
            // YouTube
            if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'video_youtube';
            // PDF
            if (lower.match(/\.pdf(\?|$)/)) return 'drive_pdf';
            // Markdown / raw github pages
            if (lower.endsWith('.md') || lower.match(/github\.com\/.+\/blob\//) || lower.includes('/raw/')) return 'markdown';
            // Text files
            if (lower.endsWith('.txt')) return 'text';
            // Office / Slides / Docs
            if (lower.includes('slides.google.com') || lower.includes('/presentation') || lower.match(/\.pptx?($|\?)/) || lower.includes('slideshare')) return 'presentation';
            if (lower.includes('docs.google.com') || lower.includes('/document') || lower.match(/\.docx?($|\?)/)) return 'document';
            // Audio files
            if (lower.match(/\.(mp3|wav|m4a|ogg)(\?|$)/) || lower.includes('audio') || lower.includes('/media/')) return 'audio';
            // Google Drive generic handling: try to guess by params or path
            if (lower.includes('drive.google.com')) {
              if (lower.match(/export=download/) && lower.match(/format=pdf/)) return 'drive_pdf';
              if (lower.includes('/presentation') || lower.includes('presentation')) return 'presentation';
              if (lower.includes('/document') || lower.includes('document')) return 'document';
              // fallback: drive item -> article-like
              return 'article';
            }
            // generic http(s) は web
            if (lower.startsWith('http')) return 'web';
          }

          // 2) 要素テキストやメタ情報からキーワードで判定（日本語含む）
          // include titleHint and scan of common attributes
          const rawText = (el.textContent || el.innerText || '') + ' ' + titleHint;
          const allText = (rawText || '').toLowerCase();

          // also scan attributes and child attributes for filenames/urls
          const attrParts = [];
          try {
            const nodes = el.querySelectorAll ? el.querySelectorAll('*') : [];
            nodes.forEach(n => {
              ['href','data-url','data-href','data-file','data-src','src','aria-label','title','alt','data-file-type','data-type','data-value','data-mime'].forEach(attr => {
                try { const v = n.getAttribute && n.getAttribute(attr); if (v) attrParts.push(v); } catch(e) {}
              });
            });
          } catch(e) {}
          const attrText = attrParts.join(' ').toLowerCase();
          const combinedText = (allText + ' ' + attrText).toLowerCase();
          // Loose file-extension checks (allow punctuation after extension)
          const extAudioRe = /(\b|\.)((mp3|wav|m4a|ogg|flac|aac))(?:[)\]\s,?:;]|$)/i;
          const extPptRe = /(\b|\.)((pptx?|ppt))(?:[)\]\s,?:;]|$)/i;
          const extDocRe = /(\b|\.)((docx?|doc))(?:[)\]\s,?:;]|$)/i;
          const extPdfRe = /(\b|\.)((pdf))(?:[)\]\s,?:;]|$)/i;

          // quick matches from visible text
          if (allText.match(extPdfRe) || attrText.match(extPdfRe)) return 'drive_pdf';
          if (allText.includes('youtube') || allText.includes('youtu.be') || attrText.includes('youtube') || attrText.includes('youtu.be')) return 'video_youtube';

          // audio detection: extension or keywords
          if (attrText.match(extAudioRe) || allText.match(extAudioRe) || combinedText.match(/\b(audio|voice|transcript|podcast)\b/)) return 'audio';

          // presentation detection: google slides/docs presentation paths or extensions or keywords
          if (attrText.includes('docs.google.com/presentation') || attrText.includes('slides.google.com') || allText.includes('slides.google.com')) return 'presentation';
          if (attrText.match(extPptRe) || allText.match(extPptRe) || combinedText.match(/\b(slide|slides|presentation|ppt|pptx)\b/)) return 'presentation';

          // document detection
          if (attrText.match(extDocRe) || allText.match(extDocRe) || combinedText.match(/\b(document|doc|google document)\b/)) return 'document';

          // markdown detection
          if (combinedText.includes('markdown') || combinedText.includes('\u30de\u30fc\u30af\u30c0\u30f3') || combinedText.includes('.md') || combinedText.match(/\b[\w-]+\.md\b/)) return 'markdown';

          // text detection (txt / plain text)
          if (combinedText.includes('txt') || combinedText.includes('plain text') || combinedText.includes('\u30c6\u30ad\u30b9\u30c8') || combinedText.match(/\.(txt)(?:[)\]\s,?:;]|$)/)) return 'text';

          // 3) アイコン要素の aria/title/alt/text を探す
          // scan all possible icon elements (the first mat-icon is often 'more_vert',
          // so check every icon/img/svg/i and prefer semantic names like drive_presentation or article)
          const iconEls = Array.from(el.querySelectorAll('mat-icon, i, img, svg'));
          for (const icon of iconEls) {
            try {
              const aria = icon.getAttribute && icon.getAttribute('aria-label');
              const title = icon.getAttribute && icon.getAttribute('title');
              const alt = icon.getAttribute && icon.getAttribute('alt');
              const txt = (icon.innerText || icon.textContent || '').trim();
              const src = icon.getAttribute && (icon.getAttribute('src') || icon.getAttribute('data-src') || '');
              const candidates = [aria, title, alt, txt, src].filter(Boolean).join(' ').toLowerCase();

              // explicit google-icon names like 'drive_presentation' or 'article'
              if (candidates.includes('drive_presentation') || candidates.includes('drive-presentation') || candidates.includes('presentation') || candidates.includes('slides') || candidates.includes('\u30b9\u30e9\u30a4\u30c9')) return 'presentation';
              if (candidates.includes('article') || candidates.includes('description')) return 'article';

              // website / web icon
              if (candidates.includes('web') || candidates.includes('website') || candidates.includes('homepage') || candidates.includes('homepage')) return 'web';

              if (candidates.includes('youtube') || candidates.includes('video')) return 'video_youtube';
              if (candidates.includes('pdf')) return 'drive_pdf';
              if (candidates.includes('doc') || candidates.includes('document') || candidates.includes('\u30c9\u30ad\u30e5\u30e1\u30f3\u30c8')) return 'document';
              if (candidates.includes('markdown') || candidates.includes('md')) return 'markdown';
              if (candidates.includes('audio') || candidates.includes('\u97f3\u58f0') || candidates.includes('transcript') || candidates.includes('voice') || candidates.includes('podcast') ) return 'audio';
              if (candidates.includes('text') || candidates.includes('txt') || candidates.includes('note')) return 'text';

              // img src heuristics
              if (src && (src.toLowerCase().includes('presentation') || src.toLowerCase().includes('slides') || src.toLowerCase().includes('ppt'))) return 'presentation';
              if (src && (src.toLowerCase().includes('audio') || src.toLowerCase().match(/\.(mp3|wav|m4a|ogg|flac|aac)$/i))) return 'audio';
            } catch (e) {
              debugLog('icon scan error', e);
            }
          }

          // 4) CSS クラス名や data- 属性から推定
          const classList = Array.from(el.classList || []).join(' ').toLowerCase();
          if (classList.includes('video') || classList.includes('youtube')) return 'video_youtube';
          if (classList.includes('pdf') || classList.includes('document') || classList.includes('doc')) return 'drive_pdf';
          if (classList.includes('web') || classList.includes('website') || classList.includes('homepage')) return 'web';
          if (classList.includes('slide') || classList.includes('slides') || classList.includes('presentation')) return 'presentation';
          if (classList.includes('markdown') || classList.includes('md')) return 'markdown';
          if (classList.includes('audio') || classList.includes('transcript')) return 'audio';
          if (classList.includes('text') || classList.includes('plain')) return 'text';

          const dataType = el.getAttribute && (el.getAttribute('data-type') || el.getAttribute('data-file-type') || el.getAttribute('data-icon') || el.getAttribute('data-value'));
          if (dataType) {
            const dt = dataType.toLowerCase();
            if (dt.includes('pdf')) return 'drive_pdf';
            if (dt.includes('slide') || dt.includes('presentation')) return 'presentation';
            if (dt.includes('doc') || dt.includes('document')) return 'document';
            if (dt.includes('audio')) return 'audio';
            if (dt.includes('web') || dt.includes('site') || dt.includes('homepage')) return 'web';
            if (dt.includes('md') || dt.includes('markdown')) return 'markdown';
            if (dt.includes('text') || dt.includes('txt')) return 'text';
          }

          // fallback: if title or combined text contains obvious URL or domain-like token, treat as web
          if (titleHint.match(/https?:\/\//) || combinedText.match(/\b([a-z0-9\-]+\.)+[a-z]{2,6}\b/)) return 'web';

        } catch (e) {
          debugLog('inferSourceType error', e);
        }
        return 'Unknown';
      }

      let type = inferSourceType(item, title);
      // infer origin: file upload/link vs manual input vs unknown
      function inferSourceOrigin(el) {
        try {
          // if there are links that point to files or drive, treat as file
          const links = Array.from(el.querySelectorAll('a')).map(a => (a.href || '').trim()).filter(Boolean);
          if (links.length > 0) {
            for (const href of links) {
              const lower = href.toLowerCase();
              if (lower.includes('drive.google.com') || lower.includes('/blob/') || lower.match(/\.(txt|md|pdf|docx?|pptx?|m4a|mp3)($|\?)/)) return 'file';
            }
            // generic http link may still be a file
            return 'file';
          }
          // data- attributes or src attributes for attachments
          const nodes = el.querySelectorAll ? el.querySelectorAll('*') : [];
          for (const n of nodes) {
            const attrs = ['data-file','data-src','data-url','src','href','data-file-type'];
            for (const a of attrs) {
              try {
                const v = n.getAttribute && n.getAttribute(a);
                if (v && v.toString().toLowerCase().match(/\.(txt|md|pdf|docx?|pptx?|m4a|mp3)$/)) return 'file';
              } catch(e){}
            }
          }
          // if no links/files but there is meaningful text content, consider manual
          const text = (el.textContent || '').trim();
          if (text && !text.match(/https?:\/\//)) return 'manual';
        } catch (e) {
          debugLog('inferSourceOrigin error', e);
        }
        return 'unknown';
      }

      const origin = inferSourceOrigin(item);
      sources.push({
        id: item.dataset.sourceId,
        title: title,
        deleteButton: deleteButton,
        element: item,
        selected: false,
        type: type,
        origin: origin
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

  // ---- ソース一覧の可視化（2026-07 UI 刷新対応） ---------------------------
  // 新 UI では以下の状態でソース要素が DOM から取り除かれ、getSources() が 0 件になる。
  //   1. ソースパネルを折りたたんでいる     → .source-panel に .panel-collapsed が付く
  //   2. ラベルでグループ化されている       → 各グループは mat-expansion-panel で、初期状態は全て閉じている
  // どちらも「一覧に何も表示されない」の原因になるため、収集前に開いておく。
  const SOURCE_ITEM_SELECTOR = '.single-source-container';

  function sourcePanelRoot() {
    return document.querySelector('source-picker') || document.querySelector('.source-panel');
  }

  function isSourcePanelCollapsed() {
    // aria-label は言語依存のため、クラスで判定する
    const panel = document.querySelector('.source-panel');
    return !!(panel && panel.classList.contains('panel-collapsed'));
  }

  async function openSourcePanel() {
    if (!isSourcePanelCollapsed()) return false;
    const btn = document.querySelector('.toggle-source-panel-button');
    if (!btn) return false;
    debugLog('Source panel is collapsed; opening it.');
    btn.click();
    for (let i = 0; i < 20; i++) {
      await delay(150);
      if (!isSourcePanelCollapsed()) return true;
    }
    return !isSourcePanelCollapsed();
  }

  async function expandSourceGroups() {
    let expanded = 0;
    // 展開によって新しいグループが描画される場合に備えて数回繰り返す
    for (let pass = 0; pass < 5; pass++) {
      const root = sourcePanelRoot();
      if (!root) break;
      const headers = Array.from(root.querySelectorAll('mat-expansion-panel-header'))
        .filter(h => h.getAttribute('aria-expanded') === 'false');
      if (!headers.length) break;
      headers.forEach(h => h.click());
      expanded += headers.length;
      await delay(400);
    }
    if (expanded) debugLog('Expanded', expanded, 'source group(s).');
    return expanded;
  }

  // パネル／グループを開いたうえで、描画件数が安定するまで待って件数を返す
  async function ensureSourcesVisible() {
    try {
      await openSourcePanel();
      await expandSourceGroups();
    } catch (e) {
      debugLog('ensureSourcesVisible error', e);
    }
    let last = -1;
    for (let i = 0; i < 12; i++) {
      const n = document.querySelectorAll(SOURCE_ITEM_SELECTOR).length;
      if (n > 0 && n === last) return n;
      last = n;
      await delay(200);
    }
    return document.querySelectorAll(SOURCE_ITEM_SELECTOR).length;
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
function isVisibleAndEnabled(el) {
  if (!el) return false;
  const style = window.getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    rect.width > 0 &&
    rect.height > 0 &&
    !el.disabled
  );
}

function findDeleteConfirmButton() {
  const selectorCandidates = [
    // 2026-07 の UI 刷新以降、確認ダイアログの実行ボタンは .primary-button
    "mat-dialog-container button.primary-button",
    ".mat-mdc-dialog-container button.primary-button",
    ".cdk-overlay-container button.primary-button",
    // 旧 UI 互換
    "mat-dialog-container button.submit",
    "mat-dialog-container button.submit-button",
    "mat-dialog-container button[color='warn']",
    ".mat-mdc-dialog-container button.submit",
    ".mat-mdc-dialog-container button.submit-button",
    ".cdk-overlay-container mat-dialog-container button.submit",
    ".cdk-overlay-container mat-dialog-container button.submit-button",
    ".cdk-overlay-container button.submit",
    ".cdk-overlay-container button.submit-button",
    "button.submit",
    "button.submit-button"
  ];

  for (const sel of selectorCandidates) {
    const btn = document.querySelector(sel);
    if (isVisibleAndEnabled(btn)) {
      return btn;
    }
  }

  const dialogRoot =
    document.querySelector("mat-dialog-container") ||
    document.querySelector(".mat-mdc-dialog-container") ||
    document.querySelector(".cdk-overlay-container") ||
    document;

  const textPositiveHints = ["delete", "confirm", "ok", "削除", "確認"];
  const textNegativeHints = ["cancel", "close", "戻る", "キャンセル", "閉じる"];
  const buttons = Array.from(dialogRoot.querySelectorAll("button, [role='button']"));

  return buttons.find((btn) => {
    if (!isVisibleAndEnabled(btn)) return false;
    const text = (btn.innerText || btn.textContent || "").trim().toLowerCase();
    if (!text) return false;
    const hasPositive = textPositiveHints.some((hint) => text.includes(hint));
    const hasNegative = textNegativeHints.some((hint) => text.includes(hint));
    return hasPositive && !hasNegative;
  }) || null;
}

async function clickDeleteConfirmButton() {
  // Wait-and-retry to handle async dialog rendering.
  const maxRetries = 8;
  for (let i = 0; i < maxRetries; i++) {
    const btn = findDeleteConfirmButton();
    if (btn) {
      btn.click();
      return true;
    }
    await delay(250);
  }
  return false;
}

async function deleteSelectedSources(selectedIds) {
  let processed = 0;
  // 削除中にパネルが閉じられていると対象要素を見失うため、開いた状態を保証する
  await ensureSourcesVisible();
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
      const confirmClicked = await clickDeleteConfirmButton();
      if (!confirmClicked) throw new Error("Confirm button not found");
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
    await ensureSourcesVisible();
    const containers = document.querySelectorAll(SOURCE_ITEM_SELECTOR);
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
      // パネル／グループの展開を待つため非同期で応答する
      ensureSourcesVisible()
        .catch(e => debugLog('getSources ensure failed', e))
        .then(() => sendResponse({ sources: getSources() }));
      return true;
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
