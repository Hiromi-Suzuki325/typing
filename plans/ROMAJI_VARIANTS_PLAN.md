# ローマ字表記揺れ対応 実装プラン

作成日: 2026-04-30

## 結論

`shi/si`, `tsu/tu`, `ji/zi` のようなローマ字表記揺れは対応可能。  
ただし現在の `currentInput[currentIndex]` による1文字比較では、文字数が違う候補を自然に扱えない。

実装方針は、標準ローマ字を表示用に残しつつ、内部判定を **入力バッファ + 許容候補のprefix判定** に置き換える。

## 目的

- 表示は読みやすい標準表記のままにする
- 入力は複数のローマ字表記を許容する
- スペースは引き続き任意入力にする
- 問題データの `input` は変更しない

例:

| 表示 input | 許容入力 |
| --- | --- |
| `shisan` | `shisan`, `sisan` |
| `tsuusan` | `tsuusan`, `tuusan` |
| `jigyou` | `jigyou`, `zigyou` |
| `shougai` | `shougai`, `syougai` |
| `chouki` | `chouki`, `tyouki` |

## 対応する表記揺れ

初回実装では以下に絞る。

```js
const ROMAJI_VARIANTS = [
  ["shi", "si"],
  ["chi", "ti"],
  ["tsu", "tu"],
  ["fu", "hu"],
  ["ji", "zi"],
  ["sha", "sya"],
  ["shu", "syu"],
  ["sho", "syo"],
  ["cha", "tya"],
  ["chu", "tyu"],
  ["cho", "tyo"],
  ["ja", "zya"],
  ["ju", "zyu"],
  ["jo", "zyo"]
];
```

後回し:

- `ou/oo`
- `ei/ee`
- `n/nn`
- ヘボン式/訓令式の完全変換

理由: FP用語タイピングでは、まず `shi/si` 系の差が一番ストレスになりやすい。母音長音や `n` は曖昧さが増えるため、初回では扱わない。

## 現状の課題

現在の主な状態:

- `currentInput`: 標準ローマ字
- `currentIndex`: 標準ローマ字上の現在位置
- `renderQuestion()`: `currentInput` を1文字ずつ `span` 化
- `keydown`: `inputChar === currentInput[currentIndex]` で判定
- スペースは `skipOptionalSpaces()` で任意扱い

問題:

- `shi` に対して `si` を許可すると、標準文字列上の進み幅が一致しない
- `currentIndex` だけでは「ユーザー入力が候補の途中か」を表せない
- `Next` 表示も `h` なのか `i` なのか曖昧になる

## 新しい状態モデル

追加する状態:

```js
let currentDisplayInput = "";
let acceptedInput = "";
let typedBuffer = "";
let acceptedDisplayIndex = 0;
let inputCandidates = [];
```

役割:

- `currentDisplayInput`: 表示用の標準ローマ字。現在の `currentInput` 相当
- `acceptedInput`: ユーザーが実際に確定入力した文字列。スペースなし
- `typedBuffer`: 判定中の入力全体。基本は `acceptedInput` と同じでもよい
- `acceptedDisplayIndex`: 表示用ローマ字のどこまで正解扱いにするか
- `inputCandidates`: 許容される完成文字列候補。スペースなし

例:

```js
currentDisplayInput = "shisan";
inputCandidates = ["shisan", "sisan"];
typedBuffer = "si";
acceptedDisplayIndex = 3; // 表示上は "shi" まで正解扱い
```

## 候補生成

### 入力正規化

問題データの `input` からスペースを除去して判定用の標準文字列を作る。

```js
function normalizeTypingInput(input) {
  return input.toLowerCase().replaceAll(" ", "");
}
```

### 候補展開

標準文字列に含まれる揺れ対象を展開する。

実装はKISSでよい。

```js
function buildInputCandidates(input) {
  let candidates = [normalizeTypingInput(input)];

  for (const [a, b] of ROMAJI_VARIANTS) {
    candidates = expandVariant(candidates, a, b);
    candidates = expandVariant(candidates, b, a);
  }

  return [...new Set(candidates)];
}
```

注意:

- 候補数が増えすぎないよう上限を設ける
- 上限案: 64候補
- 上限を超える場合は標準表記のみ、または先頭64件に制限

## 判定ロジック

`keydown` で1文字入力されたら:

1. スペースなら無視する
2. `nextBuffer = typedBuffer + inputChar`
3. `inputCandidates` のどれかが `nextBuffer` で始まるか確認
4. prefix一致があれば入力を受け入れる
5. 完全一致があれば問題クリア
6. 一致しなければ何もしない

疑似コード:

```js
function handleTypingChar(inputChar) {
  if (inputChar === " ") return;

  const nextBuffer = typedBuffer + inputChar;
  const hasPrefix = inputCandidates.some((candidate) =>
    candidate.startsWith(nextBuffer)
  );

  if (!hasPrefix) return;

  typedBuffer = nextBuffer;
  acceptedDisplayIndex = getDisplayIndexForTypedBuffer(typedBuffer);
  renderQuestion();

  if (inputCandidates.some((candidate) => candidate === typedBuffer)) {
    completeQuestion();
  }
}
```

## 表示進捗

標準ローマ字表示はそのまま残す。

`typedBuffer` から、表示用 `currentDisplayInput` のどこまでを正解扱いにするか計算する。

方針:

- 候補のうち `typedBuffer` をprefixに持つものを探す
- その候補と標準表示文字列の対応を簡易的に推定する
- 初回実装では、揺れ対象の置換単位を使って `acceptedDisplayIndex` を計算する

KISSな代替案:

- `typedBuffer` の長さをもとに、おおよそ同じ位置まで進める
- ただし `shi` -> `si` のような短縮では、表示上の `shi` 全体を正解扱いにしたい

推奨:

候補生成時に「候補文字列」と「表示文字列の区間対応」を持つ。

```js
{
  value: "sisan",
  displayInput: "shisan",
  segments: [
    { typed: "si", display: "shi" },
    { typed: "sa", display: "sa" },
    { typed: "n", display: "n" }
  ]
}
```

ただし初回は複雑にしすぎず、以下で十分:

- 入力が許容されたら、標準表記の先頭から「候補prefixが対応する位置」まで正解扱いにする
- `getDisplayIndexForTypedBuffer()` を小さな純粋関数として切り出す
- この関数にテストケースを厚めに置く

## Next表示

`Next` は候補によって分岐する。

例:

- 表示: `shisan`
- 入力済み: `s`
- 次候補: `h` または `i`

表示案:

- 候補が1つ: `Next: h`
- 候補が複数: `Next: h / i`
- 3つ以上なら `Next: ...`

初回実装:

```js
function getNextChars() {
  return [...new Set(
    inputCandidates
      .filter((candidate) => candidate.startsWith(typedBuffer))
      .map((candidate) => candidate[typedBuffer.length])
      .filter(Boolean)
  )];
}
```

`Next` 表示:

- `["h"]` -> `H`
- `["h", "i"]` -> `H/I`
- 空配列 -> `-`

仮想キーボード:

- 候補が1つなら従来通り1キーをハイライト
- 候補が複数なら複数キーを `.next` にする

## Backspace

現在は標準表示上の `currentIndex` を1文字戻している。

新方式では:

```js
typedBuffer = typedBuffer.slice(0, -1);
acceptedDisplayIndex = getDisplayIndexForTypedBuffer(typedBuffer);
renderQuestion();
```

スペースは入力バッファに入れないため、Backspaceは実入力1文字分だけ戻る。

## スコア

現在はスペースを除いた `currentInput` の文字数で加算している。

新方式でも同じ:

```js
score += normalizeTypingInput(currentDisplayInput).length;
```

許容表記で短く入力できても、スコアは標準表記のスペース除外文字数にする。

## 実装ステップ

1. `script.js` に入力判定用の状態を追加
   - `currentDisplayInput`
   - `typedBuffer`
   - `inputCandidates`
   - `acceptedDisplayIndex`

2. `currentInput/currentIndex` 依存を段階的に置き換える
   - `currentInput` は表示用として残してもよい
   - `currentIndex` は `acceptedDisplayIndex` に役割変更する

3. 候補生成関数を追加
   - `normalizeTypingInput()`
   - `buildInputCandidates()`
   - `expandVariant()`

4. 判定関数を追加
   - `handleTypingChar()`
   - `hasCandidatePrefix()`
   - `isCandidateComplete()`

5. 表示進捗関数を追加
   - `getDisplayIndexForTypedBuffer()`
   - `renderQuestion()` は `acceptedDisplayIndex` を参照する

6. `Next` 表示を複数候補対応に変更
   - `getNextChars()`
   - `updateNextKey()` で複数キーをハイライト

7. Backspaceを `typedBuffer` ベースに変更

8. IME関連処理は最小限にする
   - ローマ字タイピングでは通常 `keydown` 中心
   - `compositionend` 側は同じ `handleTypingChar()` を1文字ずつ呼ぶ形に寄せる

9. 手動検証

## テストケース

ブラウザで確認するケース:

| display input | 入力 | 期待 |
| --- | --- | --- |
| `shisan` | `shisan` | OK |
| `shisan` | `sisan` | OK |
| `tsuusan` | `tuusan` | OK |
| `jigyou` | `zigyou` | OK |
| `shouhi zei` | `syouhizei` | OK |
| `chouki` | `tyouki` | OK |
| `fudousan` | `hudousan` | OK |
| `shisan` | `x` | 進まない |
| `shisan` | `s` → Backspace | 先頭に戻る |

自動テスト相当として、ブラウザなしで純粋関数を確認したい場合:

- `buildInputCandidates("shisan")` に `shisan`, `sisan` が含まれる
- `buildInputCandidates("tsuusan")` に `tsuusan`, `tuusan` が含まれる
- `getNextChars("shisan", "s")` が `["h", "i"]` 相当になる
- `getDisplayIndexForTypedBuffer("shisan", "si")` が `3` 相当になる

## リスク

- 候補展開が増えすぎると判定が重くなる
- `Next` 表示が複数候補で少し複雑になる
- 表示上の正解ハイライトと実入力の長さが一致しないケースがある
- 既存のスペース任意入力と衝突しないよう、スペースは入力バッファに入れない

## 採用しない案

### 問題データに別表記を全部持たせる

```json
{
  "input": "shisan",
  "aliases": ["sisan"]
}
```

採用しない理由:

- 852問すべてに別表記を人手で持たせるのは保守が重い
- ルールで生成できるものはコードで扱うほうがDRY

### 入力文字を標準表記へ逐次変換する

例: `si` と打ったら内部的に `shi` に変換する。

採用しない理由:

- `s` の時点では `shi` か `si` か確定しない
- 変換タイミングが曖昧になりやすい

## 完了条件

- 標準表記でも訓令式寄り表記でもクリアできる
- スペースなし入力は引き続き可能
- `Next` が複数候補を表示できる
- Backspaceで入力バッファが1文字戻る
- Level 1〜4で既存問題が壊れない
- `node --check script.js` が通る
- `node scripts/verify_fp3_questions.mjs` が通る
- ブラウザで代表ケースを確認済み
