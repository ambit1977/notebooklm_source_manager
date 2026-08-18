(function() {
  // 二重注入ガード。
  // 拡張機能の更新・リロード後は、既に開いているタブの content script が
  // 切断される（メッセージが届かなくなる）。background 側はそれを検出して
  // chrome.scripting.executeScript で再注入するが、宣言的注入と重なると
  // onMessage リスナーが二重登録され、削除が2回走るなどの誤動作につながる。
  if (window.__nlmSourceManagerLoaded) {
    return;
  }
  window.__nlmSourceManagerLoaded = true;

  const debugEnabled = window.location.href.includes("#debug");

  function debugLog(...args) {
    if (debugEnabled) {
      console.log("[DEBUG]", ...args);
    }
  }

  function i18nMessage(key) {
    return chrome.i18n.getMessage(key) || key;
  }

  // ソース名の取得（2026-07 UI 刷新対応）
  // 新 UI のソース一覧は表示領域外の項目をレンダリングしないため、
  // .source-title の innerText が空文字を返すことがある（レイアウト依存）。
  // textContent と aria-label は常に値を持つので、そちらを優先して使う。
  function extractSourceTitle(item) {
    const titleElement = item.querySelector('.source-title');
    if (titleElement) {
      const candidates = [
        titleElement.getAttribute('aria-label'),
        titleElement.textContent,
        titleElement.innerText
      ];
      for (const c of candidates) {
        const t = (c || '').trim();
        if (t) return t;
      }
    }
    // .source-title 自体が無い場合はコンテナ側の aria-label を見る
    const containerAria = (item.getAttribute('aria-label') || '').trim();
    if (containerAria) return containerAria;
    return "No Title";
  }

  // ファイル名の拡張子から種別を推定する。
  // 判別できないときは null を返し、呼び出し側の判定を上書きしない。
  function typeFromFileName(name) {
    const m = ('' + (name || '')).toLowerCase().trim().match(/\.([a-z0-9]{1,8})$/);
    if (!m) return null;
    switch (m[1]) {
      case 'md':
      case 'markdown': return 'markdown';
      case 'txt':      return 'text';
      case 'pdf':      return 'drive_pdf';
      case 'doc':
      case 'docx':     return 'document';
      case 'ppt':
      case 'pptx':     return 'presentation';
      case 'mp3':
      case 'wav':
      case 'm4a':
      case 'ogg':
      case 'flac':
      case 'aac':      return 'audio';
      default:         return null;
    }
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
      let title = extractSourceTitle(item);
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

          // 0) 種別アイコンから判定（2026-07 UI 刷新対応・最優先）
          // 新 UI はソース項目から <a> を廃止した代わりに、種別を表す専用アイコンを持つ:
          //   - ファイル/テキスト系: <mat-icon class="source-item-source-icon"> に
          //     Google シンボル名（markdown / article / video_youtube ...）がテキストで入る
          //   - ウェブ URL: mat-icon ではなく favicon の <img src="...s2/favicons?domain=...">
          // これが最も信頼できるシグナルなので、他のヒューリスティックより先に見る。
          const typeIcon = el.querySelector && el.querySelector('.source-item-source-icon');
          const iconName = typeIcon ? (typeIcon.textContent || '').trim().toLowerCase() : '';
          if (iconName) {
            if (iconName.includes('markdown')) return 'markdown';
            if (iconName.includes('youtube') || iconName.includes('video') || iconName.includes('smart_display')) return 'video_youtube';
            if (iconName.includes('pdf')) return 'drive_pdf';
            if (iconName.includes('presentation') || iconName.includes('slide')) return 'presentation';
            if (iconName.includes('audio') || iconName.includes('mic') || iconName.includes('music') || iconName.includes('headphones')) return 'audio';
            // article / description / docs / document は「汎用の書類」アイコンで、
            // 中身の種類までは表していない。実際、Google ドライブから取り込んだ
            // Markdown は NotebookLM 側が article アイコンで表示するため、
            // そのままでは MD ではなく Docs 扱いになってしまう
            //（ローカルから添付した .md は markdown アイコンになるので食い違う）。
            // 汎用アイコンのときだけ、ファイル名の拡張子で補正する。
            if (iconName.includes('article') || iconName.includes('description')
                || iconName.includes('docs') || iconName.includes('document')) {
              const byName = typeFromFileName(titleArg || titleHint);
              if (byName) return byName;
              return (iconName.includes('docs') || iconName.includes('document')) ? 'document' : 'article';
            }
            if (iconName.includes('text') || iconName.includes('note') || iconName.includes('sticky')) return 'text';
            if (iconName.includes('web') || iconName.includes('language') || iconName.includes('public') || iconName.includes('link')) return 'web';
            debugLog('Unmapped source icon name:', iconName);
          }
          // favicon が付いている＝ウェブ URL のソース
          const faviconEl = el.querySelector && el.querySelector('img[src*="s2/favicons"], .source-item-icon-container img');
          if (faviconEl) return 'web';

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
          // 2026-07 UI 刷新対応: ソース項目から <a> が廃止されたため、
          // まず favicon（外部 URL 由来）と種別アイコン（アップロード由来）で判定する
          if (el.querySelector && el.querySelector('img[src*="s2/favicons"], .source-item-icon-container img')) return 'file';
          const typeIcon = el.querySelector && el.querySelector('.source-item-source-icon');
          const iconName = typeIcon ? (typeIcon.textContent || '').trim().toLowerCase() : '';
          if (iconName) {
            // 貼り付けテキスト／メモ系は manual、それ以外の種別アイコンはファイル由来とみなす
            if (iconName.includes('note') || iconName.includes('sticky') || iconName.includes('edit')) return 'manual';
            return 'file';
          }

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

  // パネル／グループを開いたうえで、ソースが描画されるのを待って件数を返す。
  //
  // 以前は「件数が2回続けて同じになるまで」を最大12回×200ms のループで
  // 待っていた。この待機は setTimeout で、NotebookLM のタブは
  // フィルターウィンドウを見ている間ずっと非表示になるため、
  // 1回あたり1秒に引き伸ばされて最大12秒かかっていた。
  // とくにソースが0件のときは必ず全12回を回しきるため、
  // 削除して空になった直後の一覧更新が毎回12秒待ちになっていた。
  //
  // 既に描画済みならそのまま返し、0件のときだけ DOM の変化を待つ。
  // 本当に空のノートブックでは待っても増えないので短めで切り上げる。
  async function ensureSourcesVisible() {
    try {
      await openSourcePanel();
      await expandSourceGroups();
    } catch (e) {
      debugLog('ensureSourcesVisible error', e);
    }
    const count = () => document.querySelectorAll(SOURCE_ITEM_SELECTOR).length;
    // まだ何も描画されていなければ、最初の1件が現れるのを待つ。
    // 本当に空のノートブックでは増えないので短めで切り上げる。
    if (count() === 0) await waitForDom(() => count() > 0, 2500);
    // 数える前に描画が落ち着くのを待つ。これを省くと、削除直後に
    // 消えたはずの要素を拾って一覧が古いまま固定される。
    await settleDom(250, 3000);
    return count();
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
    
  // ---- ソース追加（2026-07 UI 刷新対応） ---------------------------------
  // 旧 UI: 「ソースを追加」→ mat-chip で種別選択 → input[formcontrolname="newUrl"]
  //        に1件ずつ入力 → button[type="submit"].mat-primary
  // 新 UI: 「ソースを追加」→「ウェブサイト」ボタン（ウェブと YouTube が統合され
  //        種別選択は不要）→ textarea[formcontrolname="urls"] に改行区切りで
  //        複数 URL をまとめて投入 →「挿入」ボタン
  // 旧 UI のセレクタもフォールバックとして残している。

  function overlayScope() {
    return document.querySelector('.cdk-overlay-container') || document;
  }

  // 条件が成立するまで待つ。成立したら true、タイムアウトしたら false。
  async function waitFor(predicate, timeoutMs, intervalMs) {
    const step = intervalMs || 200;
    const limit = Math.max(1, Math.ceil(timeoutMs / step));
    for (let i = 0; i < limit; i++) {
      try {
        if (predicate()) return true;
      } catch (e) {
        debugLog('waitFor predicate error', e);
      }
      await delay(step);
    }
    try {
      return !!predicate();
    } catch (e) {
      return false;
    }
  }

  // DOM の変化を待つ。タイマーではなく MutationObserver を使うのが要点。
  //
  // Chrome は非表示タブの setTimeout を最低 1 秒に引き伸ばす（さらに数分後には
  // より強い抑制がかかる）。そのためポーリングで待つ実装だと、他のタブで
  // 作業している間だけ削除が極端に遅くなる。実際に「別タブで作業していると
  // カタツムリのように遅い。NotebookLM のタブを表示していると多少速い」という
  // 報告を受けている。
  //
  // MutationObserver のコールバックはタイマー抑制の対象外で、DOM が変化した
  // 時点で呼ばれる。これによりタブが見えていても隠れていても同じ速度で進む。
  // タイムアウト用の setTimeout だけは残すが、これは失敗時の保険なので
  // 抑制されても実害はない。
  function waitForDom(predicate, timeoutMs) {
    return new Promise(resolve => {
      let settled = false;
      const finish = (v) => {
        if (settled) return;
        settled = true;
        observer.disconnect();
        clearTimeout(timer);
        resolve(v);
      };
      const check = () => {
        let ok = false;
        try { ok = !!predicate(); } catch (e) { ok = false; }
        if (ok) finish(true);
        return ok;
      };
      const observer = new MutationObserver(check);
      const timer = setTimeout(() => finish(false), timeoutMs || 8000);
      // 監視を始める前に一度確認する（既に条件を満たしている場合）
      if (check()) return;
      observer.observe(document.documentElement, {
        childList: true, subtree: true, attributes: true
      });
    });
  }

  // DOM の変化が収まるまで待つ。
  //
  // 削除直後は、消したはずの要素が一瞬だけ残っていることがある。
  // その瞬間に数えると実際より多い件数を拾ってしまい、一覧が
  // 古いまま固定されてしまう（削除完了後に消えたはずの項目が残る）。
  // 変化が quietMs のあいだ途切れたら「落ち着いた」とみなす。
  //
  // ここだけは setTimeout を使う。非表示タブでは 1 秒程度に伸びるが、
  // 1 回きりなので影響は小さい。maxMs で頭打ちにしておく。
  function settleDom(quietMs, maxMs) {
    return new Promise(resolve => {
      let quiet, done = false;
      const finish = () => {
        if (done) return;
        done = true;
        observer.disconnect();
        clearTimeout(quiet);
        clearTimeout(hard);
        resolve();
      };
      const observer = new MutationObserver(() => {
        clearTimeout(quiet);
        quiet = setTimeout(finish, quietMs);
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
      quiet = setTimeout(finish, quietMs);
      const hard = setTimeout(finish, maxMs || 3000);
    });
  }

  // Angular のリアクティブフォームに値を認識させるため、
  // ネイティブの value セッター経由で設定してから input/change を発火する
  function setInputValue(el, value) {
    const proto = (typeof HTMLTextAreaElement !== 'undefined' && el instanceof HTMLTextAreaElement)
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc && desc.set) desc.set.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function findAddSourceButton() {
    return document.querySelector('button.add-source-button')
        || document.querySelector('.add-source-button');
  }

  // ダイアログ内の「ウェブサイト」ボタン。表示文言は言語依存なので
  // アイコン名（link / video_youtube）を主、文言を従にして探す。
  function findUrlSourceButton() {
    const scope = overlayScope();
    const buttons = Array.from(scope.querySelectorAll('button.drop-zone-icon-button, button'));
    for (const b of buttons) {
      const icons = Array.from(b.querySelectorAll('mat-icon'))
        .map(i => (i.textContent || '').trim().toLowerCase());
      if (icons.includes('link') || icons.includes('video_youtube')) return b;
    }
    const hints = ['ウェブサイト', 'website', 'url', 'link'];
    return buttons.find(b => {
      const t = (b.textContent || '').toLowerCase();
      return hints.some(h => t.includes(h));
    }) || null;
  }

  function findUrlInputField() {
    const scope = overlayScope();
    // 汎用の textarea にフォールバックしてはいけない。
    // 追加ダイアログの1画面目（種別選択）には「ウェブで新しいソースを検索」の
    // textarea が存在するため、URL 入力欄が描画される前にそれを掴んでしまい、
    // URL が検索欄に入力されて「挿入」ボタンが有効にならない。
    return scope.querySelector('textarea[formcontrolname="urls"]')
        || scope.querySelector('input[formcontrolname="newUrl"]');  // 旧 UI 互換
  }

  function findInsertButton() {
    const scope = overlayScope();
    const candidates = [
      'button.mat-mdc-unelevated-button.mat-primary',
      'button[type="submit"].mat-mdc-unelevated-button.mat-primary',
      'button.primary-button'
    ];
    for (const sel of candidates) {
      const btns = Array.from(scope.querySelectorAll(sel)).filter(isVisibleAndEnabled);
      // 「挿入」は末尾に配置されるため最後の候補を採用する
      if (btns.length) return btns[btns.length - 1];
    }
    return null;
  }

  function isAddSourceDialogOpen() {
    return !!document.querySelector('mat-dialog-container, .mat-mdc-dialog-container');
  }

  async function closeAddSourceDialog() {
    const btn = overlayScope().querySelector('button.close-button') || findModalCloseButton();
    if (btn) {
      btn.click();
      await delay(400);
    }
  }

  // 複数 URL をまとめて追加する（新 UI は改行区切りで一括投入できる）
  async function addSources(urls) {
    const list = (Array.isArray(urls) ? urls : [urls])
      .map(u => ('' + u).trim())
      .filter(Boolean);
    if (!list.length) return "Added: 0";

    const invalid = list.filter(u => !isValidUrl(u));
    if (invalid.length) {
      throw i18nMessage("invalidUrlMessage") + ": " + invalid.join(', ');
    }

    const addBtn = findAddSourceButton();
    if (!addBtn) throw i18nMessage("errorClickAddSourceButton");
    addBtn.click();

    if (!await waitFor(() => !!findUrlSourceButton(), 8000)) {
      await closeAddSourceDialog();
      throw i18nMessage("errorUrlSourceButtonNotFound");
    }
    findUrlSourceButton().click();

    if (!await waitFor(() => !!findUrlInputField(), 8000)) {
      await closeAddSourceDialog();
      throw i18nMessage("errorUrlInputFieldNotFound");
    }
    const inputEl = findUrlInputField();
    setInputValue(inputEl, list.join('\n'));

    // 入力が検証され「挿入」ボタンが有効になるのを待つ
    if (!await waitFor(() => !!findInsertButton(), 8000)) {
      await closeAddSourceDialog();
      throw i18nMessage("errorNoInsertButton");
    }
    findInsertButton().click();

    // 取り込みには時間がかかるため、ダイアログが閉じるまで待つ
    const done = await waitFor(() => !isAddSourceDialogOpen(), 60000, 500);
    if (!done) {
      debugLog('Add source dialog did not close within timeout.');
      await closeAddSourceDialog();
      throw i18nMessage("errorAddSourceTimeout");
    }
    await delay(1000);

    return "Added: " + list.length;
  }

  async function addSource(url) {
    await addSources([url]);
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
  // 確認ダイアログの描画を待つ。タイマーではなく DOM の変化で待つため、
  // タブが非表示でも表示中と同じ速さで進む。
  let btn = null;
  await waitForDom(() => (btn = findDeleteConfirmButton()), 8000);
  if (!btn) return false;
  btn.click();
  return true;
}

// 削除の中断要求。フィルターウィンドウの「中断」ボタンから立てられる。
let deleteAbortRequested = false;

async function deleteSelectedSources(selectedIds) {
  let processed = 0;
  deleteAbortRequested = false;
  // 削除中にパネルが閉じられていると対象要素を見失うため、開いた状態を保証する
  await ensureSourcesVisible();

  const notify = (payload) => {
    chrome.runtime.sendMessage(Object.assign({
      action: "deletionProgress",
      processed: processed,
      total: selectedIds.length
    }, payload)).catch(() => {});
  };

  for (let i = 0; i < selectedIds.length; i++) {
    // 1件の削除は途中で止めると中途半端な状態になりうるので、
    // 区切りの良いここでだけ中断を受け付ける。
    if (deleteAbortRequested) {
      notify({ id: null, status: "aborted", remaining: selectedIds.length - processed });
      return;
    }

    let id = selectedIds[i];
    // 最新のソース状態を取得（削除対象が DOM 上からなくなっている可能性も考慮）
    let src = getSources().find(s => s.id === id);
    if (!src) {
      processed++;
      notify({ id: id, status: "error", error: "Source not found" });
      continue;
    }
    try {
      // 各手順は「次に必要な要素が現れたら即進む」方式にしている。
      // 以前は各段階で固定 500ms、さらに1件ごとに 1500ms 待っており、
      // 1件あたり最低 3.5 秒かかっていた（200件で約12分）。
      // 待機はすべて waitForDom（MutationObserver）で行うため、
      // タブが非表示でもタイマー抑制の影響を受けない。
      src.element.dispatchEvent(new Event("mouseenter", { bubbles: true }));

      let moreBtn = null;
      await waitForDom(() => (moreBtn = src.element.querySelector(".source-item-more-button")) && isVisibleAndEnabled(moreBtn), 8000);
      if (!moreBtn) throw new Error("More button not found");
      moreBtn.click();

      let delBtn = null;
      await waitForDom(() => (delBtn = document.querySelector(".more-menu-delete-source-button")) && isVisibleAndEnabled(delBtn), 8000);
      if (!delBtn) throw new Error("Delete button not found");
      delBtn.click();

      const confirmClicked = await clickDeleteConfirmButton();
      if (!confirmClicked) throw new Error("Confirm button not found");

      // 確認ボタンを押しただけでは削除の完了は保証されない。
      // 対象の要素が DOM から取り除かれるのを、この処理の完了合図として待つ。
      const removed = await waitForDom(() => !src.element.isConnected, 20000);
      if (!removed) throw new Error("Deletion did not complete");

      // 次の項目へ進む前にダイアログが閉じきるのを待つ。
      // ここで固定待ちを入れると非表示タブで 1 件ごとに 1 秒失うため、
      // オーバーレイが消えたことを条件にする。
      await waitForDom(() => !document.querySelector('mat-dialog-container, .mat-mdc-dialog-container'), 8000);

      src.element.dispatchEvent(new Event("mouseleave", { bubbles: true }));
      processed++;
      notify({ id: id, status: "success" });
    } catch(e) {
      processed++;
      notify({ id: id, status: "error", error: e.message });
    }
    // ここでの固定待ちは入れない。非表示タブでは setTimeout が
    // 1 秒以上に伸びるため、1 件ごとにその分だけ余計に時間がかかる。
    // 描画の追いつきは上の waitForDom（要素の消滅・ダイアログの閉じ）で
    // 確認済みなので、そのまま次の項目へ進んでよい。
  }
}

  async function renameSources(renamePairs) {
    await ensureSourcesVisible();
    const containers = document.querySelectorAll(SOURCE_ITEM_SELECTOR);
    const results = [];

    for (const pair of renamePairs) {
      const { title: oldTitle, newTitle } = pair;
      // 一覧表示と同じ抽出ロジックで突き合わせる（innerText は空を返すことがある）
      let target = Array.from(containers).find(elem => extractSourceTitle(elem) === oldTitle);
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
    if (message.action === "ping") {
      // background からの疎通確認。応答があれば content script は生きている。
      sendResponse({
        ok: true,
        isNotebookPage: /\/notebook\//.test(location.pathname),
        sourceCount: document.querySelectorAll(SOURCE_ITEM_SELECTOR).length
      });
      return;
    }
    else if (message.action === "getSources") {
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
    else if (message.action === "abortDelete") {
      // 進行中の1件は最後まで実行し、その区切りで停止する
      deleteAbortRequested = true;
      sendResponse({ result: "abort requested" });
    }
    else if (message.action === "addSource") {
      addSource(message.url)
        .then(result => sendResponse({ result }))
        .catch(error => sendResponse({ error }));
      return true;
    }
    else if (message.action === "addSources") {
      addSources(message.urls)
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
