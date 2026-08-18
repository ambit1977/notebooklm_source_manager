# Chrome Web Store 掲載内容（v1.2.43）

そのままコピー＆ペーストできる形式でまとめています。
文字数は Chrome Web Store の上限（概要 132 文字／詳細説明 16,000 文字）に収めています。

---

## 日本語

### 拡張機能名（45文字以内）

```
NotebookLM ソース一括削除・管理ツール
```

### 概要 / 短い説明（132文字以内）

```
NotebookLM のソースを一括削除。1件ずつ消す手間から解放されます。絞り込み・重複チェック・一括リネーム・YouTube の一括追加にも対応。
```

*63文字*

### 詳細な説明

```
■ NotebookLM のソース削除、1件ずつやっていませんか？

NotebookLM には、ソースをまとめて削除する機能がありません。
不要になったソースを整理しようとすると、1件ごとに「︙」→「ソースを削除」→「削除」を
繰り返すことになります。50件あれば150回のクリックです。

この拡張機能は、その作業を「チェックを入れて1回押すだけ」に変えます。


■ できること

【1. ソースの一括削除】
ソースが一覧表示され、チェックボックスで選んでまとめて削除できます。
全選択にも対応しているので、ノートブックを空にするのも一瞬です。
削除の進捗はリアルタイムで表示されます。

【2. 絞り込んでから消す】
・キーワードでタイトルを絞り込み（正規表現も使えます）
・ソースの種類（PDF / ウェブ / YouTube / ドキュメント / Markdown など）で絞り込み
・タイトル順の並べ替え
「PDFだけ消したい」「特定のキーワードを含むものだけ残したい」といった整理ができます。

【3. 重複チェック】
同じタイトルのソースを検出します。
何度も取り込んでしまったソースを見つけて整理できます。

【4. 一括リネーム】
「変更前のタイトル,変更後のタイトル」の形式で、CSV のようにまとめて名前を変更できます。

【5. YouTube URL の一括追加】
YouTube のリンクを1行ずつ貼り付けるだけで、まとめてソースに追加します。
短縮リンク（youtu.be）や再生リストのパラメータ付き URL も自動で正規化します。

【6. CSV ダウンロード】
表示中のソース一覧をタイトルと種類つきで書き出せます。

【7. 削除の中断】
実行中に「削除を中断」を押すと、進行中の1件を終えた時点で安全に停止します。
全選択して押し間違えたときの保険になります。


■ 使い方

1. NotebookLM でノートブックを開きます
2. ツールバーの拡張機能アイコンをクリックします
3. 開いたウィンドウでソースを選び、操作を実行します


■ プライバシーとデータの扱い

・処理はすべてお使いのブラウザ内で完結します
・ソースの内容やタイトルを外部に送信することは一切ありません
・アクセスするのは notebooklm.google.com のページのみです
・アカウント情報やパスワードにはアクセスしません

ソースコードは GitHub で公開しています。
https://github.com/ambit1977/notebooklm_source_manager


■ ご注意

・削除は取り消せません。実行前に選択内容をご確認ください。
・この拡張機能は NotebookLM の画面を操作して動作します。Google 側の仕様変更により
  一時的に動作しなくなる場合があります。その際は更新版で対応しますので、
  不具合を見つけたら GitHub の Issues までお知らせください。
・本拡張機能は Google LLC の提供物ではなく、公式のものでもありません。


■ 更新履歴（v1.2.43）

削除が大幅に速くなりました。1件あたり約3.5秒かかっていた処理を、
待ち時間をなくして表示中なら約0.15秒にしました。
他のタブで作業していると極端に遅くなる問題（ブラウザによるタイマー抑制）も
回避したので、裏で走らせても実用的な速さで進みます。

削除を途中で止められるようにしました。実行中に「削除を中断」ボタンが出ます。


■ 過去の更新履歴（v1.2.39）

2026年7月の NotebookLM（Gemini Notebook）の UI 刷新に対応しました。

・ソース追加機能が動作しなくなっていた問題を修正
・ソース一覧が表示されない問題を修正
  （ソースパネルを閉じている場合／ラベルでグループ分けしている場合）
・ソース名が空欄になる問題を修正
・ソースの種類判定を修正
・削除確認ダイアログへの対応を改善

使い勝手も改善しました。

・各モードに「使い方」の説明を常設（不要になったら畳めます）
・ソースを読み込めないとき、原因と対処法を画面上に表示するようにしました
・拡張機能をインストール／更新した直後でも、開いていたタブを
  自動で再接続して読み込めるようにしました
```

---

## English

### Name (45 chars max)

```
NotebookLM Source Manager
```

### Summary / Short description (132 chars max)

```
Bulk-delete NotebookLM sources instead of removing them one by one. Filter, find duplicates, batch rename, and add YouTube URLs.
```

*127 characters*

### Detailed description

```
■ Still deleting NotebookLM sources one at a time?

NotebookLM has no way to delete sources in bulk. Cleaning up means repeating
"⋮" → "Delete source" → "Delete" for every single item. With 50 sources,
that is 150 clicks.

This extension turns that into: tick the boxes, press once.


■ What it does

1. BULK DELETE
Your sources are listed with checkboxes. Select any number of them and delete
them together. Select-all is supported, so emptying a notebook takes seconds.
Progress is shown as the deletion runs.

2. NARROW DOWN FIRST
・Filter titles by keyword (regular expressions supported)
・Filter by source type (PDF / web / YouTube / document / Markdown and more)
・Sort by title
Useful for "remove only the PDFs" or "keep just the ones matching this term".

3. DUPLICATE CHECK
Finds sources that share the same title, so you can clean up material that was
imported more than once.

4. BATCH RENAME
Rename many sources at once using "old title,new title" lines, CSV style.

5. BATCH ADD YOUTUBE URLS
Paste YouTube links one per line and add them all as sources. Short links
(youtu.be) and URLs carrying extra parameters are normalized automatically.

6. CSV EXPORT
Export the currently listed sources with their titles and types.

7. STOP A RUNNING DELETION
Press "Stop deleting" while a bulk delete is running. It finishes the item in
progress and stops safely — useful if you selected everything by mistake.


■ How to use

1. Open a notebook in NotebookLM
2. Click the extension icon in your toolbar
3. Select sources in the window that opens and run the action


■ Privacy

・Everything runs locally in your browser
・Source titles and contents are never sent anywhere
・The extension only touches pages on notebooklm.google.com
・It does not access your account credentials or passwords

The source code is public on GitHub:
https://github.com/ambit1977/notebooklm_source_manager


■ Please note

・Deletion cannot be undone. Review your selection before running it.
・This extension works by operating the NotebookLM interface, so changes on
  Google's side can temporarily break it. Updates follow when that happens —
  please report problems via GitHub Issues.
・This extension is not provided by, or affiliated with, Google LLC.


■ What's new in v1.2.43

Deleting is now much faster. Each source used to take about 3.5 seconds;
with the waiting removed it now takes roughly 0.15 seconds while the tab is
visible. The extension no longer relies on timers, which browsers throttle in
background tabs, so deletion keeps a usable pace even while you work in
another tab.

You can also stop a running deletion now — a "Stop deleting" button appears
while the bulk delete is in progress.


■ Previous release (v1.2.39)

Updated for the July 2026 NotebookLM (Gemini Notebook) interface redesign.

・Fixed adding sources, which had stopped working entirely
・Fixed the source list showing nothing
  (when the source panel is collapsed, or sources are grouped by label)
・Fixed source names appearing blank
・Fixed source type detection
・Improved handling of the delete confirmation dialog

Usability improvements:

・Every mode now includes a built-in "How to use" panel (collapsible)
・When sources cannot be loaded, the reason and what to do are shown on screen
・Tabs that were already open are reconnected automatically right after the
  extension is installed or updated
```

---

## スクリーンショット（1280×800）

Chrome Web Store は 1280×800 または 640×400 のみ受け付けます。
`store-assets/` の5枚はすべて 1280×800 で、**画像内に見出しと説明を焼き込んであります**
（ストアのキャプション欄は表示が小さく読み飛ばされやすいため）。
説明を焼き込む前の素の画面は `store-assets-raw/` にあります。

掲載はファイル名の順（01〜05）でそのまま並べてください。

| # | ファイル | 画像内の見出し | 補足文（画像内） |
|---|---|---|---|
| 1 | `01-bulk-delete.png` | チェックを入れて、1回押すだけ | NotebookLM は1件ずつしか削除できません。この拡張機能なら、まとめて選んで一度に消せます。 |
| 2 | `02-select-all.png` | ノートブックを空にするのも一瞬 | ソースが一覧表示され、「全選択／全解除」でまとめて選べます。削除の進捗もその場で確認できます。 |
| 3 | `03-filter.png` | 必要なものだけ残して整理 | キーワード（正規表現も可）や、PDF・ウェブ・YouTube などの種類で絞り込んでから操作できます。 |
| 4 | `04-batch-add.png` | リンクを貼り付けるだけ | 複数の YouTube URL をまとめて追加します。短縮リンクや余分なパラメータは自動で正規化されます。 |
| 5 | `05-rename.png` | CSV 形式でまとめて名前を変更 | 「変更前のタイトル,変更後のタイトル」を並べて書くだけ。長いファイル名の整理に便利です。 |

1枚目に一括削除を置いているのは、**選択状態と「選択したソースを削除」ボタンが1画面に収まり、
この拡張機能の価値が1枚で伝わる**ためです。既存レビューの動機もここにありました。

なお各画像には拡張機能内の「使い方」枠も写り込んでいるため、
インストール前に操作手順まで把握できます。

### 画像の作り直し方

素の画面を撮り直したうえで、見出しを焼き込む合成まで自動化してあります。

```bash
cd ~/Documents/個人開発/Chrome拡張/_screenshot-env
node capture2.mjs ./raw-shots && node fix01b.mjs ./raw-shots
node compose.mjs ./raw-shots ../Notebookソースマネージャー/store-assets
```

見出しや補足文は `compose.mjs` の `SLIDES` 配列にまとまっています。

## スクリーンショットが更新されないときの落とし穴

Chrome ウェブストアのスクリーンショットは **ロケールごとに別管理** で、
「ローカライズ版スクリーンショット」があれば「全言語向けスクリーンショット」より
**優先されます**。

実際に二度、公開しても日本語ページのキャプチャが古いままになった。原因は、
英語ロケールの画面で旧画像を削除したことで英語側だけが新しくなり、
**日本語ロケールに残っていた旧画像1枚**が全言語向けの新5枚を上書きしていたため。

管理画面の「編集中の言語」は既定で英語になっている。画像を差し替えるときは
**必ず全ロケールを切り替えて確認する**こと。

確認は公開ページで直接見るのが確実（キャッシュを無効化して開く）。

```
https://chromewebstore.google.com/detail/chnggbbijedpjecbpkadjfdgiapgdadp?hl=ja
https://chromewebstore.google.com/detail/chnggbbijedpjecbpkadjfdgiapgdadp?hl=en
```

なお削除ボタンはサムネイルにマウスを乗せたときだけ現れ、DOM 検索では掴めない。
アクセシビリティツリーから位置を取って実マウスでクリックする必要がある。
その際 **「画像を削除 ショップ アイコン」** が候補の先頭に来るので、
対象サムネイルの矩形内にあるボタンかどうかを必ず照合すること
（照合せずに先頭を押すとショップアイコンを消しかける）。

## 掲載時のチェックリスト

- [ ] スクリーンショットを5枚アップロード（ファイル名の 01〜05 の順）
- [ ] **全ロケール（英語・日本語）でキャプチャを確認**（ロケール専用画像が残っていないか）
- [ ] 概要・詳細説明を日英それぞれのロケールページに設定
- [ ] `dist/` を ZIP 化してアップロード（**`dist/` 以外を含めないこと**）
- [ ] manifest の version がアップロードする ZIP と一致しているか確認
- [ ] プライバシーへの取り組み欄に、ローカル処理・外部送信なしを記載
- [ ] 単一用途の説明: 「NotebookLM のソース管理」
- [ ] 権限の使用理由を記載
      - `tabs` / `activeTab`: 操作対象の NotebookLM タブを特定するため
      - `scripting` + `host_permissions: https://notebooklm.google.com/*`:
        拡張機能の更新直後など、既に開いていたタブへスクリプトが入っていない場合に
        再接続して一覧を読み込むため（自動復旧）
      - いずれも notebooklm.google.com 以外のサイトにはアクセスしません
