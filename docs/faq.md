# トラブルシューティング（Q&A）

## Q1: `npm run build` で失敗する

A: `npm install` が未実行、または依存関係が壊れている可能性があります。

```bash
npm install
npm run build
```

それでも失敗する場合は、`package-lock.json` を削除して再インストールしてください。

## Q2: 拡張機能が Chrome の `chrome://extensions/` で読み込めない

A: `dist/` フォルダを直接指定してください。

- 「パッケージ化されていない拡張機能を読み込む」
- `dist/` フォルダを選択

注意: `dist/` の中に `manifest.json` が存在している必要があります。

## Q3: 削除操作で確認ダイアログが出るようになった

A: 本ツールは複数種類の確認ボタンに対応しています。最新修正内容では、`
mat-dialog-container` 内の `submit` 系ボタン、または文言ベースで `delete` / `confirm` / `ok` / `削除` / `確認` を検出します。

## Q4: ZIP を作ると中身が空になる

A: 正しい場所からZIPを作成していない可能性があります。公開用ZIPは `dist/` の中身をルートに含める必要があります。

正しい例:

```bash
cd dist
zip -r releases/notebooklm-source-manager-1.2.27.zip \
  manifest.json background.js content.js filter.html filter.js icon.svg \
  _locales/en/messages.json _locales/ja/messages.json \
  icons/48.png icons/128.png icons/16.png icons/32.png icons/38.png
```

## Q5: GitHub Pages に公開するにはどうする？

A: リポジトリの設定で Pages のソースを `main` ブランチの `docs/` に指定します。サイト公開後は以下のURLが使えます:

`https://ambit1977.github.io/notebooklm_source_manager/`

## Q6: Chrome Web Store への公開で `Permission denied` が出る

A: GitHub ではなく Chrome Web Store のアカウント権限です。公開時は正しい Google デベロッパーアカウントでログインしてください。
