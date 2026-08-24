# NotebookLM（Gemini Notebook）内部 RPC 調査メモ

2026-08-19 実測。Chrome 151 / `boq_labs-tailwind-frontend_20260820.13_p1`。
**未コミット。実装するかどうかの判断材料。**

## 結論

ソースの URL・YouTube 動画ID・Google Drive ファイルIDは、
サーバーからフロントに**そのまま降ってきている**。拡張機能の content script
から取得できることを実機で確認済み（追加権限なし）。

## エンドポイント

```
POST https://notebook.google.com/_/LabsTailwindUi/data/batchexecute
  ?rpcids=<RPCID>&source-path=/notebook/<id>&bl=<build>&f.sid=<sid>&hl=ja&_reqid=<n>&rt=c
Content-Type: application/x-www-form-urlencoded;charset=UTF-8
X-Same-Domain: 1
body: f.req=<JSON>&at=<token>&
```

| rpcid | 内容 |
|---|---|
| `rLM1Ne` | 指定ノートブックのソース一覧（今回の用途はこれ） |
| `wXbhsf` | 全ノートブック＋全ソース一覧（45件／262ソースで 86KB） |

トークン類はページHTMLの `WIZ_global_data` から正規表現で取れる
（`innerHTML` 経由なので isolated world でも読める）。

- `at`   ← `"SNlM0e":"..."`
- `bl`   ← `"cfb2h":"..."`
- `f.sid`← `"FdrFJe":"..."`

`f.req` の中身（rLM1Ne）:

```js
[[["rLM1Ne", JSON.stringify([
  notebookId, null,
  [2,null,[1],[1,null,null,null,null,null,null,null,null,null,[1,3]]],
  null, 1, [[null,null,[]]]
]), null, "generic"]]]
```

## レスポンス構造

`)]}'\n\n<len>\n[["wrb.fr","rLM1Ne","<JSON文字列>",...]]` のチャンク形式。
デコード後：

```
payload[0] = [ ノートブック名, [ source, source, ... ] ]

source = [ [sourceId], title, meta, [null, 2] ]

meta[0] = [driveFileId]           Google Drive 由来のとき
meta[1] = 語数
meta[2] = 作成タイムスタンプ [sec, nsec]
meta[3] = [contentId, [sec, nsec]]
meta[4] = 種別コード
meta[5] = [youtubeUrl, videoId, チャンネル名]   YouTube のとき
meta[7] = [url]                                 ウェブ由来のとき
meta[8] = バイト数
```

## 種別コード（実測 262 ソース）

| code | 種別 | 件数 | 付随情報 |
|---|---|---|---|
| 1 | Google ドキュメント | 25 | `meta[0]` に Drive ファイルID |
| 2 | Google スライド | 3 | `meta[0]` に Drive ファイルID＋副ID |
| 3 | PDF | 135 | URLから取り込んだ 73 件は `meta[7]` にURL |
| 4 | テキスト（.txt／貼り付け） | 3 | — |
| 5 | ウェブページ | 47 | 全件 `meta[7]` にURL |
| 8 | **Markdown（.md）** | 4 | — |
| 9 | YouTube | 21 | 全件 `meta[5]` にURL・動画ID・チャンネル名 |
| null | PDF（アップロード） | 24 | — |

## meta 配列の全フィールド（262ソースを走査した実測）

| index | 内容 | 非null | 備考 |
|---|---|---|---|
| `meta[0]` | **Google Drive ファイルID** | 28/262 | `[id]` / `[id, 副id]` / `[id, 副id, 数値]` |
| `meta[1]` | **語数** | 259/262 | |
| `meta[2]` | **追加日時** `[秒, ナノ秒]` | 262/262 | |
| `meta[3]` | `[コンテンツID, 処理完了日時]` | 262/262 | 追加より数十秒後 |
| `meta[4]` | **種別コード** | 238/262 | null はアップロードPDF |
| `meta[5]` | **YouTube** `[URL, 動画ID, チャンネル名]` | 21/262 | |
| `meta[6]` | 内部フラグ（1 / 2） | 247/262 | 意味不明。URL有のとき2が出やすい程度 |
| `meta[7]` | **URL** `[url]` | 120/262 | ウェブページ・URL取り込みPDF |
| `meta[8]` | **YouTube は再生時間(秒)／他はバイト数** | 178/262 | 実測で確認（27分00秒 等） |
| `meta[9,10,12,13]` | 常に null | 0/262 | |
| `meta[11]` | 表示名 | 1/262 | タイトルの複製 |
| `meta[14]` | **取り込み完了日時** | 45/262 | 新しいソースのみ |
| `meta[15]〜[18]` | 常に null | 0/262 | |
| `meta[19]` | **MIMEタイプ** | 2/262 | `application/pdf` |

`payload[0][0]` にノートブック名も入っている。

## DOM とサーバーデータの突き合わせ

ソース項目の「その他」ボタンに **ソースIDがそのまま入っている**。

```html
<button id="source-item-more-button-356ee999-873e-4f83-9703-c671fd19a610">
```

これは RPC の `source[0][0]` と同一。25件のノートブックで
**DOM 側 25件・RPC 側 25件が過不足なく完全一致**することを実機で確認済み。
タイトル照合は不要で、重複タイトルがあっても取り違えない。

## ソース以外の RPC（今回の用途では不要）

| rpcid | 内容 |
|---|---|
| `VfAZjd` | ノートブックの要約テキスト |
| `cFji9` | チャット履歴 |
| `gArtLc` | メモ（Studio 生成物）とソースIDの紐付け |
| `ub2Bae` | 注目のノートブック（他人の公開ノートブック）一覧 |

ソース単位の要約（ソースガイド）は一覧RPCには含まれない。
取得するならソースごとに別リクエストが要るため、CSV出力には不向き。

## 検証済みの事実

- 拡張機能の content script コンテキスト（`chrome.runtime.id` で確認）から
  `fetch` して **HTTP 200 / 正しいデータ**を取得できた。
  MAIN world への注入は不要。`host_permissions` は現行のままで足りる。
- `__ngContext__` は本番ビルドでは数値のみで、Angular 内部からは取れない。
- DOM 側にはURL・Drive ID を示す属性が一切ない（favicon の `img[src]` のみ）。

## 実装した場合に直る／できること

- **Google Drive の Markdown が Markdown と判定されない問題**（type=8 が明示される）
- 種別判定をアイコン推定から脱却（`inferSourceType` のヒューリスティックが不要に）
- CSVに URL・YouTube ID・Drive ID・語数を出力
- タイトルではなく **URL による重複判定**

## リスク

- **非公開の内部API**。rpcid・`bl` のビルド番号・フィールド位置は予告なく変わる。
  現行のDOM推定をフォールバックとして必ず残すこと。
- `at` トークンはセッション資格情報。**外部に一切送らないこと**（現状も送っていない）。
- 取得しているのは「ユーザー自身のセッションで、ユーザー自身のデータを、同一オリジンから」。
  ただし非公開APIの利用がストア審査でどう見られるかは別途判断が要る。
