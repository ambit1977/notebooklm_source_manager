# インストール

## 1. リポジトリを取得

```bash
git clone https://github.com/ambit1977/notebooklm_source_manager.git
cd notebooklm_source_manager
```

## 2. 依存関係をインストール

```bash
npm install
```

## 3. ビルド

```bash
npm run build
```

このコマンドは:

- `src/` のコードを `dist/` に出力
- `dist/manifest.json` のバージョンをインクリメント
- `dist/filter.html` に最新版のバージョン文字列を注入

現在のビルド結果例:

- `dist/manifest.json`: `1.2.27`
- `dist/releases/notebooklm-source-manager-1.2.27.zip` を作成可能

## 4. Chrome へ読み込む

1. Chrome を開き、`chrome://extensions/` へ移動
2. 右上の「デベロッパーモード」を有効化
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. `dist/` フォルダを指定

## 5. アップデート手順

コード修正後は再度 `npm run build` を実行し、Chrome の `chrome://extensions/` で対象拡張機能を更新してください。

---

## 補足: Chrome Web Store への公開準備

公開用ZIPを作成する場合:

```bash
cd dist
zip -r releases/notebooklm-source-manager-1.2.27.zip \
  manifest.json background.js content.js filter.html filter.js icon.svg \
  _locales/en/messages.json _locales/ja/messages.json \
  icons/48.png icons/128.png icons/16.png icons/32.png icons/38.png
```

または、`dist/releases/` の中身を整理してそのZIPを使います。