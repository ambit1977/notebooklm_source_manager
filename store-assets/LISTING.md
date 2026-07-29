# Chrome Web Store 掲載内容（v1.2.33）

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


■ 更新履歴（v1.2.33）

2026年7月の NotebookLM（Gemini Notebook）の UI 刷新に対応しました。

・ソース追加機能が動作しなくなっていた問題を修正
・ソース一覧が表示されない問題を修正
  （ソースパネルを閉じている場合／ラベルでグループ分けしている場合）
・ソース名が空欄になる問題を修正
・ソースの種類判定を修正
・削除確認ダイアログへの対応を改善
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


■ What's new in v1.2.33

Updated for the July 2026 NotebookLM (Gemini Notebook) interface redesign.

・Fixed adding sources, which had stopped working entirely
・Fixed the source list showing nothing
  (when the source panel is collapsed, or sources are grouped by label)
・Fixed source names appearing blank
・Fixed source type detection
・Improved handling of the delete confirmation dialog
```

---

## スクリーンショット（1280×800）

Chrome Web Store は 1280×800 または 640×400 のみ受け付けます。
`store-assets/` の5枚はすべて 1280×800 です。Retina 原寸は `store-assets-2x/` にあります。

| # | ファイル | 掲載順の推奨 | JA キャプション | EN キャプション |
|---|---|---|---|---|
| 1 | `01b-delete-button.png` | **1枚目** | 選んで1回押すだけ。まとめて削除できます | Tick the boxes, press once — sources deleted together |
| 2 | `01-delete-mode.png` | 2枚目 | ソースが一覧表示され、全選択にも対応 | All sources listed, with select-all support |
| 3 | `02-filter.png` | 3枚目 | キーワードや種類で絞り込んでから整理 | Narrow down by keyword or source type first |
| 4 | `03-batch-add.png` | 4枚目 | YouTube のリンクを貼るだけで一括追加 | Paste YouTube links to add them all at once |
| 5 | `04-rename.png` | 5枚目 | CSV 形式でまとめて名前を変更 | Rename many sources at once, CSV style |

1枚目に `01b` を推す理由は、**選択状態と「選択したソースを削除」ボタンが1画面に収まっており、
この拡張機能の価値が1枚で伝わる**ためです。`01-delete-mode.png` はリストの長さは伝わりますが、
削除ボタンが画面外になります。

---

## 掲載時のチェックリスト

- [ ] スクリーンショットを5枚アップロード（上の推奨順）
- [ ] 概要・詳細説明を日英それぞれのロケールページに設定
- [ ] `dist/` を ZIP 化してアップロード（**`dist/` 以外を含めないこと**）
- [ ] manifest の version がアップロードする ZIP と一致しているか確認
- [ ] プライバシーへの取り組み欄に、ローカル処理・外部送信なしを記載
- [ ] 単一用途の説明: 「NotebookLM のソース管理」
- [ ] `activeTab` / `tabs` 権限の使用理由を記載
      （開いている NotebookLM のタブを特定し、そのページ上で選択・削除を実行するため）
