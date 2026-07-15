# 技術情報

## リポジトリ

- GitHub: https://github.com/ambit1977/notebooklm_source_manager
- ブランチ: `main`

## 主要バージョン

- `manifest.json`: `1.2.27`
- `package.json`: `1.3.0`

## 主要ファイル

- `src/content.js` — NotebookLM ページに注入されるコンテンツスクリプト
- `src/filter.js` — フィルタ画面の UI ロジック
- `src/filter.html` — 拡張機能の設定画面
- `manifest.json` — Chrome 拡張の設定
- `build.js` — `src/` から `dist/` へ出力し、バージョンを更新するビルドスクリプト

## ビルドコマンド

- `npm install`
- `npm run build`

## GitHub Actions

- `.github/workflows/ci-build.yml` — `main` へ push / PR 時にビルドを実行し、`dist` をアーティファクトとして保存
- `.github/workflows/release.yml` — `v*.*.*` のタグ push で GitHub Release を作成し、`dist.zip` をアップロード

## Pages公開設定

1. GitHubリポジトリの `Settings > Pages` を開く
2. Source を `main` ブランチの `/docs` フォルダに設定
3. 保存後、数分で公開されます

## 既存の公開資料

- `README.md` — リポジトリ全体の概要とセットアップ
- `PUBLISH_GUIDE.md` — Chrome Web Store への公開手順
- `RELEASE_NOTES.md` — リリース情報
- `TOOLS_SCREENSHOT_README.md` — スクリーンショットツール説明
- `TOOLS_SCREENSHOT_CONNECT_README.md` — 既存Chrome接続モード説明

## 直近の修正

- `fix/notebooklm-delete-confirm-dialog` ブランチで `src/content.js` の削除確認ダイアログ対応を実装
- `main` にマージ済み
- `origin/main` へ push 済み

## 公開用ZIP

- `dist/releases/notebooklm-source-manager-1.2.27.zip`
- `manifest.json` がZIPルートにあることを確認済み

## ローカル実行環境

- Node.js: `18` を想定
- Chrome: 開発時に `Google Chrome Dev` / `Google Chrome` を使用

---

必要なら、このまま `docs/` 用の `README` スタイルを整えたり、サイトのトップに `Quick start` カードを追加できます。