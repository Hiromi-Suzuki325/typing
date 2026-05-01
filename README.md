# FP3級タイピング道場

FP3級の用語・文章で練習する、ブラウザ完結のタイピング練習アプリです。HTML / CSS / Vanilla JavaScript / ES Modules で構成されており、ビルド工程はありません。

## 主な仕様

- 4段階の難易度を選択できます。
  - 初級: 60秒
  - 中級: 70秒
  - 上級: 80秒
  - 達人: 90秒
- Spaceキーで開始し、3秒カウントダウン後にタイピング画面へ移ります。
- 問題はFP3級の6分野に分類され、画面上部にカテゴリ名を表示します。
- 上段に表示文、下段に入力ガイドを表示します。
- 入力ガイドは `tokens[].yomi` から生成したモーラ単位で進捗表示します。
- `NISA` などの英字は raw token として表示し、そのまま英字入力します。
- 次に押せるキーを `Next` と仮想キーボードのハイライトで表示します。
- Backspaceで現在問題の入力を1文字戻せます。
- Escapeでゲームを終了できます。
- 結果画面ではスコア、入力文字数、速度、ミスタイプ率を表示します。

## ファイル構成

```text
index.html      画面構造と仮想キーボード
style.css       画面全体のスタイル
script.js       画面遷移、問題読み込み、タイマー、スコア、入力イベント、描画
engine/         かな・モーラ・ローマ字候補・入力判定の中核ロジック
data/v2/        実アプリが読み込むトークン化済み問題データ
data/source/    v2データ生成元
scripts/        データ生成・検証スクリプト
```

## データ仕様

実アプリは `data/v2/questions_level{level}.json` を読み込みます。旧形式の `data/questions_level*.json` を変更しても画面には反映されません。

各問題は主に次の形式です。

```json
{
  "id": "fp3_l3_fa_01",
  "level": 3,
  "category": "financial_assets",
  "display": "新NISAのつみたて投資枠は年間120万円までである",
  "input": "shinNISAnotsumitatetoushiwakuhanennkannhyakunijuumannenmadedearu",
  "tokens": [
    { "text": "新", "yomi": "しん" },
    { "text": "NISA", "kind": "raw" },
    { "text": "のつみたて", "yomi": "のつみたて" }
  ],
  "tags": ["financial_assets"]
}
```

- `display`: 画面上段に表示する問題文です。
- `tokens[].text`: 連結すると `display` と一致する必要があります。
- `tokens[].yomi`: 入力ガイドとローマ字入力候補の元になります。
- `kind: "raw"`: 英字など、読みへ変換せずそのまま入力するトークンです。
- `particle: true`: 助詞 `は/へ/を` などで、複数のローマ字入力を受け付けるために使います。

## 開発サーバー

ローカルサーバーで配信して確認します。

```bash
python3 -m http.server 8000
```

```text
http://127.0.0.1:8000/
```

Codexの in-app browser や VS Code Live Server などで別ポートを使っても動作します。

## 検証

ユニットテストを実行します。

```bash
npm test
```

問題データとローマ字入力バリエーションを検証します。

```bash
npm run verify
```

`npm run verify` は次の検証をまとめて実行します。

- `scripts/verify_fp3_questions.mjs`
- `scripts/verify_tokens.mjs`
- `scripts/check_romaji_variants.mjs`

## データ生成

`data/source/level{level}.json` から `data/v2/questions_level{level}.json` を生成します。

```bash
node scripts/build_v2_from_yomi.mjs
```

生成後は必ず検証してください。

```bash
npm run verify
```

## 実装上の注意

- 入力判定は旧 `input` 文字列ではなく、`tokens[].yomi` から作る lattice を使います。
- `ん`、促音、長音、助詞、raw token は壊れやすい中核仕様です。
- Backspaceは `machine.reset()` 後に `pastInput` を再投入する方式です。
- `script.js` はUI、タイマー、fetch、入力、描画が同居しているため、状態遷移や `finishGame()` の多重呼び出しに注意してください。
- `debugLog()` は現在 `console.log` を常時出します。ブラウザ確認時はログ量に注意してください。
