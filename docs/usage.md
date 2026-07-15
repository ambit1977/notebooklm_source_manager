# 利用方法

## 1. 何ができるか

NotebookLM Source Manager は、NotebookLM のソース管理を支援する Chrome 拡張です。

主な機能:

- NotebookLM のソース一覧を取得
- 複数ソースの一括削除
- ソース名のリネーム
- YouTube ソースの一括追加
- フィルタリングと絞り込み

## 2. 拡張機能の主要な操作

### ソース一覧の取得

拡張機能が NotebookLM と連携し、現在のソースを取得します。

### 削除

1. 削除したいソースを選択
2. 削除ボタンを押下
3. NotebookLM の確認ダイアログが出た場合にも対応します

今回の修正で、削除確認ダイアログは以下の方法で検出します:

- `button.submit` / `button.submit-button`
- `mat-dialog-container` 内の `submit` 系ボタン
- ボタンの文言による判定 (`delete`, `confirm`, `ok`, `削除`, `確認` など)

### リネーム

1. 既存ソースタイトルを指定
2. 新しいタイトルを入力
3. 保存をクリック

### バッチ追加

- YouTube URL のリストを指定してまとめて追加できます。
- `filter.js` のバッチ追加 UI から URL を投入します。

## 3. スクリーンショットツール

このリポジトリにはスクリーンショット取得用のツールも含まれます。

### ツール 1: `npm run screenshot`

- Puppeteer を使って新しい Chrome を起動し、拡張機能を読み込みます。
- 手動ログインが必要です。

### ツール 2: `npm run screenshot:connect`

- 既存の起動済み Chrome に接続して、実行中のブラウザ上でスクリーンショットを取得します。
- `--browserURL=http://localhost:9222` などで接続先を指定します。

## 4. 画面キャプチャの取得フロー

1. Chrome をリモートデバッグモードで起動
2. NotebookLM にログイン
3. `npm run screenshot:connect -- --browserURL=http://localhost:9222` を実行
4. 画面が開いたら必要な操作を行い、スクリーンショットを保存

---

## 5. GitHub Pages での公開

`docs/` 以下をサイトとして公開すると、次のような構成で表示されます:

- `/` → `docs/index.md`
- `/installation` → `docs/installation.md`
- `/usage` → `docs/usage.md`
- `/troubleshooting` → `docs/faq.md`
- `/technical-info` → `docs/technical-info.md`
