# 仮名ベース＋打鍵変換器アーキテクチャへの移行プラン

## レビュー反映履歴

### 2026-05-01 (1回目)

explorer レビューを統合し、以下を変更:

- **[blocking] ESM 化を Step 4-1 に明文化** — [index.html:144](index.html:144) を `type="module"` に変更、キャッシュバスター更新
- **[blocking] 候補全列挙を放棄** — `buildInputCandidates` の直積展開＋`slice(0,64)` は破綻リスクあり。`TypingMachine` ステートマシンに置換（lattice を1歩ずつ進む方式）
- **[major] 入力エンジン公開 API を確定** — `acceptsPrefix / acceptsComplete / getNextChars / getProgress / getDisplayCursor / step`
- **[major] ローマ字→かな逆変換を最長一致 parser に強化** — 既存 `ROMAJI_VARIANTS` 14対では不足。基本モーラ・促音・長音・「ん」を完全網羅
- **[major] 状態モデルを分離** — `currentIndex`（ローマ字位置）への依存を切り、`displayCursor = {tokenIndex, charInToken}` と TypingMachine 内部状態に二分
- **[major] 句読点トークンを `yomi: ""` で固定** — lattice/progress/score 全てでスキップ
- **[minor] 検証を強化** — 「旧 input 受理」「主要 variant 受理」「不正入力拒否」の3点全件チェック＋特殊 fixture（`信用` `任意加入` `キャッシュフロー表` `バランスシート` 等）

### 2026-05-01 (2回目)

追加レビューを統合:

- **[blocking] TypingMachine を NFA 化** — 単一 `{i, prefix}` 状態だと `["n","nn","xn"]` のように短い option が長い option の prefix の場合に `nn` を受理できない。active states 集合（複数 `{i, prefix}` の並行追跡）に変更
- **[major] API surface を stateful / stateless に分離** — UI は `step / isComplete / getNextChars / getProgress / getDisplayCursor` の stateful API のみ使用。検証ツールは別関数 `acceptsString(lattice, input) → {ok, complete, failedAt}` を使う。`acceptsPrefix(buffer)` は廃止
- **[major] 漢字トークンは token 単位ハイライト** — 漢字文字数と mora 数が不一致（例: `将来`(2字) vs `しょうらい`(4 mora)）のため、`displayCursor = { tokenIndex, status: "current"|"correct"|"pending" }` 中心に変更。漢字は文字単位 charInToken を持たない
- **[major] アルファベット・数字 token は raw segment** — lattice エントリに `kind: "raw"` を持たせ、`options: [text.toLowerCase()]` を直接入れる。mora パイプラインを通さない
- **[minor] particle metadata の lattice への伝搬を明示** — `buildLatticeFromTokens` が各 lattice エントリに `particle: token.particle` を引き継ぐ。`moraTable` 参照時に `particle` フラグで例外候補表へ切替

### 2026-05-01 (3回目・最終)

最終レビューを統合:

- **[major] committedIndex で表示・進捗の単調性を保証** — NFA 分岐中（例: `n` 入力直後に `{i+1,""}` と `{i,"n"}` が共存）、最大 i を採用すると2文字目で表示/進捗が「進んで戻る」現象が起きる。`committedIndex = min(activeStates.i where prefix === "")` を別管理し、`getProgress`/`getDisplayCursor` はこちらを参照する規則に変更
- **[major] active states の dedupe key 化を明示** — JS の `Set<{i, prefix}>` は参照比較で値重複排除にならない。実装は `Map<"${i}:${prefix}", State>` または `Set<"${i}:${prefix}">` を使う。擬似コードに key 化 dedupe を追記
- **[minor] 句読点 token の表示ルールを明記** — 句読点は lattice に含まれないが、`renderQuestion` は `tokenIndex < committedTokenIndex` なら `correct`、`= committedTokenIndex` なら `current`、それ以上は `pending` という統一規則で表示。句読点も同規則
- **[minor] raw token の進捗単位を明記** — raw は1 lattice entry = 1 segment。`NISA` 等は完成して初めて `moraDone` が1進む。スコアも +1。文字数ベースの細粒度進捗は採用しない（mora と raw は同じ「1 segment」単位で扱う）

## Context

現状のデータ (`data/questions_level{1-4}.json`, 全852件) は `display`(漢字混じり日本語) と `input`(ローマ字) のペア構造で、ローマ字を人手で書いている。これにより:

- 助詞「は/wa」事件のような表記揺れバグが発生し、240件まとめて修正する羽目になった
- 「ん」を `n`/`nn` 両方許可する等の改善が、データ全件 vs エンジン側パッチの板挟みになる
- 新しいお題集（簿記・英単語・推し台詞 etc.）を追加するたびにローマ字を全件書き直すコストがかかる

**真の単一情報源**を「漢字＋読み仮名」に移し、打鍵候補はモーラ→ローマ字変換器で動的生成する構造に変える。これによりデータ作成は読みを書くだけで済み、表記揺れはエンジン1箇所で集中管理できる。UI ではトークン単位のふりがな表示が可能になり、学習体験も向上する。

ユーザー方針確認済み:
- データ粒度 = **トークン分割** (`tokens: [{text, yomi}]`)
- yomi 生成 = **既存 input から自動生成**
- 移行戦略 = **並行運用で段階移行**

## 完成後のデータ形

```json
{
  "id": "fp3_l3_0001",
  "level": 3,
  "category": "life_planning",
  "display": "ライフプランは将来の収支を整理する項目です",
  "tokens": [
    { "text": "ライフプラン", "yomi": "ライフプラン" },
    { "text": "は",          "yomi": "は", "particle": true },
    { "text": "将来",        "yomi": "しょうらい" },
    { "text": "の",          "yomi": "の" },
    { "text": "収支",        "yomi": "しゅうし" },
    { "text": "を",          "yomi": "を", "particle": true },
    { "text": "整理",        "yomi": "せいり" },
    { "text": "する",        "yomi": "する" },
    { "text": "項目",        "yomi": "こうもく" },
    { "text": "です",        "yomi": "です" }
  ],
  "tags": ["life_planning", "short_sentence"]
}
```

`input` フィールドは廃止。

## アーキテクチャ

```
tokens (data)
  ↓ tokens.flatMap(t => moraSplit(t.yomi))（raw token は素通り）
mora 列 + raw 列
  ↓ buildLatticeFromTokens (specialMora で options 確定)
lattice = [{ kind:"mora"|"raw", mora?, displayRange, options:[...], particle? }, ...]
  ↓ TypingMachine (NFA: active states 集合)
入力 API: step / isComplete / getNextChars / getProgress / getDisplayCursor
```

**設計の根幹（レビュー反映）**: 既存の `buildInputCandidates` は再利用しない。直積展開→`slice(0,64)` は「ん/っ/ー＋複数 variant」連続で正解候補を落とす危険があるため、候補列挙でなく lattice 上を **active states 集合で並行追跡する NFA** に置き換える。

### NFA 設計（blocking 修正）

単一 `{i, prefix}` 状態は不適。理由: `options = ["n","nn","xn"]` の場合、`n` 入力で option `"n"` が完成扱いされ次 mora に遷移してしまうため、続く `n` を「ん→nn の2文字目」として受理できない。

**active states**: `Map<key, { i, prefix }>` を内部状態として保持。`key = \`${i}:${prefix}\`` で値重複排除する（JS の `Set<object>` は参照比較で重複排除にならないため、必ず文字列 key 化する）。

```js
// 内部状態:
//   activeStates: Map<string, { i, prefix }>   // key = `${i}:${prefix}`
//   committedIndex: number                      // 単調増加する確定 lattice 位置
//
// step(c):
//   nextStates = new Map()
//   for (const { i, prefix } of activeStates.values()) {
//     if (i >= lattice.length) continue
//     const newPrefix = prefix + c
//     for (const opt of lattice[i].options) {
//       if (opt === newPrefix) {
//         // option 完成 → 次 segment へ。他 option を選ぶ枝も並行で残る
//         const s = { i: i + 1, prefix: "" }
//         nextStates.set(`${s.i}:`, s)
//       } else if (opt.startsWith(newPrefix)) {
//         const s = { i, prefix: newPrefix }
//         nextStates.set(`${s.i}:${s.prefix}`, s)
//       }
//     }
//   }
//   if (nextStates.size === 0) return false
//   activeStates = nextStates
//   committedIndex = min(s.i for s in activeStates if s.prefix === "")
//                    or fallback to min(s.i for s in activeStates)
//                    // 「prefix が空＝確定済み」の最小 i を採用。
//                    // 該当無しなら全状態の最小 i（途中分岐は確定とみなさない）。
//   return true
//
// isComplete(): activeStates に { i: lattice.length, prefix: "" } を含む
// getNextChars(): activeStates 全体から、各 option の prefix.length 文字目を集めて Set 化
// getDisplayCursor(): committedIndex を使う → lattice[committedIndex]?.displayRange.tokenIndex
//                     committedIndex >= lattice.length なら「全完成」状態
// getProgress(): { moraDone: committedIndex, moraTotal: lattice.length }
```

**committedIndex の単調性保証**: `committedIndex` は step ごとに「prefix が空の状態のうち最小 i」を採用するため、分岐中に表示が「進んで戻る」現象が起きない。例: `n` 入力時 → activeStates = `{(i+1,""), (i,"n")}` → committedIndex = i（途中分岐は確定扱いしない）。続く `n` 入力時 → activeStates = `{(i+1,"")}` → committedIndex = i+1（mora `ん` 確定）。続く `a` 入力（次 mora が `あ`）→ activeStates = `{(i+2,"")}` → committedIndex = i+2。

active states の最大数は lattice 各点の option 数で抑えられる（option ≤ 6、1 segment あたり最大 ~6 状態、key 化 dedupe 後）。

### 入力エンジン公開 API（Step 1 で先行設計）

UI 用と検証用で API を分離する（混在させない）:

#### Stateful API — UI 専用 (`engine/typingMachine.js`)

```js
class TypingMachine {
  constructor(lattice)       // active states を初期化
  step(char): boolean        // 1文字進める。受理不可なら false で状態据え置き
  isComplete(): boolean      // lattice 全体を完成したか
  getNextChars(): Set<string>// 現在受理可能な次の1文字
  getProgress(): { moraDone, moraTotal }
  getDisplayCursor(): { tokenIndex, status }
  reset()
}
```

#### Stateless API — 検証ツール専用 (`engine/typingMachine.js` 同居)

```js
function acceptsString(lattice, input):
  { ok: boolean, complete: boolean, failedAt?: number }
// 内部で TypingMachine を作り step を順番にかけて結果だけ返す。
// verify_tokens.mjs はこちらを使う。
```

UI（script.js）は `acceptsPrefix(buffer)` / `acceptsComplete(buffer)` といった buffer 渡し API を**使わない**。`typedBuffer` を持たず、TypingMachine の内部状態のみが正解。

### displayCursor の粒度（major 修正）

漢字文字数と mora 数は対応しない（`将来`(2字) ≠ `しょうらい`(4 mora)）。よって `charInToken` は持たず、token 単位の状態のみを扱う:

```js
// getDisplayCursor() は { tokenIndex } を返す（committedIndex から導出）
//
// renderQuestion 側のトークン状態判定ルール（句読点・raw・mora 全て同規則）:
//   committedTokenIndex = lattice[committedIndex]?.displayRange.tokenIndex ?? tokens.length
//   for each token (index t):
//     if (t < committedTokenIndex)  → status = "correct"
//     else if (t === committedTokenIndex) → status = "current"
//     else                          → status = "pending"
//
// 句読点トークンは lattice に含まれないが、上記ルールで自動的に正しく着色される
// （前 mora が確定 → committedTokenIndex が句読点 token を超える → correct 化）
```

`lattice[i].displayRange` は `{ tokenIndex, charStart?, charEnd? }`（charStart/charEnd はひらがな/カタカナ token の文字単位ハイライト用、Step 6 オプション）。

raw token も displayRange に `tokenIndex` のみ持たせ、上記ルールで着色する（charStart/charEnd は不要）。

## 新ファイル構成

```
typing/
├── engine/
│   ├── mora.js           # かな列 → mora 配列の分割器
│   ├── moraTable.js      # mora → ローマ字候補のテーブル（拗音含む）
│   ├── specialMora.js    # ん / っ / ー の文脈依存関数
│   └── buildLattice.js   # tokens → 打鍵格子 → 候補
├── scripts/
│   ├── migrate_to_tokens.mjs   # 新規: input → tokens 自動変換
│   ├── verify_tokens.mjs       # 新規: tokens 整合性チェック
│   ├── generate_fp3_questions.mjs  # 既存
│   ├── verify_fp3_questions.mjs    # 既存
│   └── check_romaji_variants.mjs   # 既存
├── data/
│   ├── questions_level1.json (既存形式のまま)
│   ├── questions_level2.json (既存形式のまま)
│   ├── questions_level3.json (既存形式のまま)
│   ├── questions_level4.json (既存形式のまま)
│   └── v2/
│       ├── questions_level1.json (tokens 形式)
│       ├── questions_level2.json
│       ├── questions_level3.json
│       └── questions_level4.json
├── script.js  # エンジン呼び出しに改修
└── ...
```

## 実装ステップ

### Step 1: エンジン層の実装（並走、データ非依存）

**`engine/moraTable.js`** — かなモーラ → ローマ字候補

```js
export const MORA_TABLE = {
  // 清音
  "あ": ["a"], "い": ["i"], "う": ["u"], "え": ["e"], "お": ["o"],
  "か": ["ka"], "き": ["ki"], ... "の": ["no"],
  "は": ["ha"], "ひ": ["hi"], "ふ": ["fu","hu"], ...
  // 濁音・半濁音
  "が": ["ga"], ... "ぱ": ["pa"], ...
  // 拗音（2文字で1モーラ）
  "きゃ": ["kya"], "しゃ": ["sha","sya"], "ちゃ": ["cha","tya","cya"], ...
  // 外来音
  "ふぁ": ["fa","fwa"], "うぃ": ["wi","whi"], "ヴぁ": ["va","vwa"], ...
  // カタカナは平仮名と同じテーブルを参照（normalize で統一）
};
```

**`engine/mora.js`** — かな列 → mora 配列

```js
// 入力: "らいふぷらんはしょうらい"
// 出力: ["ら","い","ふ","ぷ","ら","ん","は","しょ","う","ら","い"]
//       ※「しょ」は1モーラ（拗音検出）、「ん」「っ」「ー」もそれぞれ独立
```

カタカナはひらがなに正規化してからテーブル参照。

**`engine/specialMora.js`** — 文脈依存

```js
// 「ん」: 後続モーラを見て options を返す
//   後続なし or 子音モーラ → ["n","nn","xn"]
//   後続が母音/や行モーラ  → ["nn","xn"]  ※"n"単独は禁止（曖昧回避）
// 「っ」: 後続モーラの先頭子音を取り、["xtu","ltu", 子音重ね] を返す
// 「ー」: 直前モーラの母音を取り、[母音, "-"] を返す
```

**`engine/buildLattice.js`** — トークン配列 → lattice

```js
// tokens を左から走査:
//   - 句読点 token（yomi: ""）→ lattice エントリ追加せず、次エントリに「直前 token は句読点」情報だけ伝える
//   - raw token（kind: "raw" — アルファベット/数字）→
//       lattice.push({ kind: "raw", text: token.text.toLowerCase(),
//                      displayRange: { tokenIndex }, options: [token.text.toLowerCase()] })
//       mora パイプラインを通さない
//   - 通常 token → moraSplit(token.yomi) で mora 配列を取り、各 mora を:
//       lattice.push({ kind: "mora", mora, particle: token.particle ?? false,
//                      displayRange: { tokenIndex, charStart, charEnd },
//                      options: resolveOptions(mora, prevMora, nextMora, particle) })
// resolveOptions:
//   - particle=true かつ mora ∈ {は,へ,を} → particle 専用候補表
//   - mora が ん/っ/ー → specialMora.js
//   - それ以外 → moraTable.js
// particle metadata は token から各 mora エントリに必ず引き継ぐ（実装ミス防止）。
```

**`engine/typingMachine.js`** — NFA 実装は上記「NFA 設計」参照

### トークンの仕様（曖昧さを排除）

- `text`: 表示文字列（漢字/かな/カタカナ/句読点/英数字）
- `yomi`: 読み仮名（ひらがなまたはカタカナ）。**句読点トークンは `yomi: ""` とし、lattice/progress/score のいずれにもカウントしない**。`renderQuestion` では表示のみ
- `kind?: "raw"`: アルファベット・数字トークン（`NISA`、`401k` 等）。lattice では mora パイプラインを通さず `options: [text.toLowerCase()]` の単一 raw segment として扱う。`yomi` はあってもなくても良い（あっても無視）。**進捗単位は1 segment**: `NISA` は4文字打って初めて `moraDone` が1進み、スコアも +1。文字数ベースの細粒度進捗にはしない（mora と raw を同じ segment 単位で揃えるため）
- `particle?: true`: 助詞（は/が/を/に/へ/と/で/も/や/ね）。`buildLatticeFromTokens` で各 mora エントリに引き継ぐ。`は`→`["wa","ha"]`、`へ`→`["e","he"]`、`を`→`["wo","o"]` の例外候補を `moraTable` 側に `PARTICLE_TABLE` として別表で用意し、`particle: true` の時のみ参照

### Step 2: 移行ツール `scripts/migrate_to_tokens.mjs`

入力: `data/questions_levelN.json`（既存形式）
出力: `data/v2/questions_levelN.json`（tokens 形式）

#### 2-1. ローマ字→かな逆変換 (romaji parser)

既存 `ROMAJI_VARIANTS` は variant 14対のみで基本モーラ・促音・長音・「ん」を扱えないため、**完全な最長一致 parser** を新規実装する：

- `engine/moraTable.js` の全 mora（清音・濁音・半濁音・拗音・外来音）の全 option を逆引きテーブル化
- スペース除去後、左から最長一致でローマ字を mora に変換
- 子音重ね（`kk`,`tt`,`pp`,...）は「っ」+ 後続 mora、`nn`/`xn` は「ん」、`xtu`/`ltu` は「っ」、`-` は「ー」に変換
- `n` 単独は曖昧（後続が母音/y なら `na/nya` の途中の可能性 vs 「ん」の可能性）：規則化:
  - 末尾 or 子音前 → 「ん」
  - 母音/y 前 → 「ん」と確定できないので `needsReview: true` で人手判断
- 助詞 `wa`/`e`/`o` は、display 側に対応する単独 ひらがな「は」「へ」「を」がある場合のみ「は/へ/を」に逆変換（それ以外は `wa→わ`, `e→え`, `o→お`）

#### 2-2. display のトークン分割

- 文字種境界（ひらがな連続 / カタカナ連続 / 漢字連続）で切る
- 句読点「、」「。」「・」は独立トークン（`yomi: ""`）
- 連続するアルファベット・数字は1トークン（`yomi: ""` ではなく直接打鍵対象）

#### 2-3. yomi の各トークンへの割り当て

flat yomi を順に各トークンに食わせる：
- ひらがなトークン: text と同じ文字数を yomi から消費（不一致なら `needsReview`）
- カタカナトークン: text のカタカナを ひらがな正規化 → yomi の先頭と一致するか確認
- 漢字トークン: 次のひらがな/カタカナトークンの先頭文字が yomi に現れる位置までを消費（曖昧なら `needsReview`）
- 句読点トークン: yomi 消費なし

#### 2-4. 助詞検出

1文字ひらがな（は/が/を/に/へ/と/で/も/や/ね）かつ前後がひらがな/カタカナ/漢字で囲まれている → `particle: true`。

#### 2-5. レビュー必須運用

`needsReview: true` を含む全エントリは verify ツールで一覧化する。**`needsReview > 0` の状態では Step 5 の切替には進まない**（blocking）。手動で yomi/tokens を修正してから再 verify。

### Step 3: 検証ツール `scripts/verify_tokens.mjs`

#### 3-1. 構造チェック（全エントリ）
- tokens.text を結合 → display と一致
- tokens.yomi を結合 → moraSplit が未知モーラなく成功
- buildLattice が lattice を生成、TypingMachine がエラーなく初期化
- `needsReview` フラグ件数を集計し、0 でなければ exit code 1

#### 3-2. 後方互換チェック（強化）
旧 input が存在する全エントリで、新 lattice に対し `acceptsString(lattice, input)` を呼ぶ:
1. **旧 input は受理**: `acceptsString(lattice, input.replace(/[ -]/g,''))` が `{ ok:true, complete:true }` を返す
2. **期待 variant も受理**: 「ん→nn」「は(粒子)→wa」「ー→母音」「っ→子音重ね」など主要 variant パターンを置換した文字列も `complete:true`
3. **不正入力は拒否**: 1文字ランダムにずらした文字列で `failedAt` が返る（途中失敗を確認）

3点とも pass しないエントリは `needsReview: true` として旗を立て直し、件数 0 まで再修正。

#### 3-3. fixture（埋め込みテスト）

以下の特殊ケースは `verify_tokens.mjs` 内で直接アサーション：
- `信用` (`しんよう` → 「ん」+「よ」: `n` 曖昧解消)
- `任意加入` (`にんいかにゅう` → 連続「ん」と「にゅ」拗音)
- `キャッシュフロー表` (拗音「キャ」+ 促音「ッ」+ 拗音「シュ」+ 長音「ー」+ 漢字)
- `バランスシート` (長音 + 「ン」)
- 句読点入り文（L3/L4 から最低3問）
- 助詞 `は/へ/を` を `wa/e/wo` でも `ha/he/wo` でも打てる

実行コマンド: `node scripts/verify_tokens.mjs`

### Step 4: script.js の改修

#### 4-1. ESM 化（前提作業）

[index.html:144](index.html:144) は通常 script タグなので、エンジン層の `import/export` が動かない。先に以下を行う:

- [index.html:144](index.html:144) を `<script type="module" src="script.js?v=tokens-20260501"></script>` に変更
- `script.js` を ESM 化し、`engine/*.js` から必要シンボル（`buildLatticeFromTokens`, `TypingMachine`, `moraSplit`）を import
- キャッシュバスター `?v=` を更新（既存 `final-stats-20260430` → `tokens-20260501`）。`style.css` も同タイミングで更新
- `index.html:144` の DOM 利用は `DOMContentLoaded` 前提だったが、`type="module"` は defer 相当なので問題なし

#### 4-2. データ正規化（並行運用）

```js
// script.js
function normalizeQuestion(q) {
  if (Array.isArray(q.tokens)) return q;     // 新形式
  return convertLegacyToTokens(q);           // 旧 input → 暫定 tokens（移行ツールと同ロジックの軽量版）
}
```

#### 4-3. 状態モデルの再設計

[script.js:4](script.js:4) の `currentIndex`（ローマ字インデックス）と [script.js:5](script.js:5) `typedBuffer` への依存を切り離す。新しい状態:

| 旧 | 新 | 用途 |
|---|---|---|
| `currentInput` (ローマ字文字列) | `currentLattice` (TypingMachine 用) | エンジン入力 |
| `currentIndex` (ローマ字位置) | `displayCursor = { tokenIndex, status }` | UI ハイライト（token 単位） |
| `typedBuffer` | **保持しない**。TypingMachine の active states が唯一の真実 | 打鍵進捗 |
| `inputCandidates` / `inputSegments` | 削除 | — |

`acceptsPrefix(buffer)` のような buffer 渡し API は使わない。打鍵キー受信時は machine.step(c) を呼び、戻り値で受理判定する。Backspace は `machine.reset()` 後に「直前まで打った文字列を再 step」または「reverse step（active states を1ステップ巻き戻す）」のいずれかを実装で選択（実装簡便性から **reset+replay** を推奨）。そのため UI 層では `pastInput: string[]` を補助変数として保持する（typedBuffer ではなく Backspace 用の履歴）。

#### 4-4. 関数の置換

| 旧関数 | 行番号 | 処置 |
|---|---|---|
| `buildInputSegments` | [script.js:277](script.js:277) | 削除。`buildLatticeFromTokens` に置換 |
| `findVariantAt` | [script.js:311](script.js:311) | 削除。`engine/moraTable` + `engine/specialMora` に統合 |
| `buildInputCandidates` | [script.js:347](script.js:347) | **削除**（再利用しない。`TypingMachine` に置換） |
| `dedupeCandidates` | [script.js:377](script.js:377) | 削除 |
| `getDisplayIndexForTypedBuffer` | [script.js:386](script.js:386) | 削除。`TypingMachine.getDisplayCursor()` に置換 |
| `skipDisplaySpaces` | [script.js:409](script.js:409) | 削除（句読点トークンは lattice に含めないため不要） |
| `getNextChars` | [script.js:416](script.js:416) | `TypingMachine.getNextChars()` に置換 |
| `hasCandidatePrefix` | [script.js:425](script.js:425) | 削除。`machine.step(c)` の戻り値で判定 |
| `isCandidateComplete` | [script.js:429](script.js:429) | `machine.isComplete()` に置換 |
| `handleTypingChar` | [script.js:433](script.js:433) | `if (machine.step(c)) { totalChars++; if (machine.isComplete()) prepareQuestion() else renderQuestion() }` |
| `handleBackspace` | [script.js:452](script.js:452) | `pastInput.pop()` → `machine.reset()` → `pastInput を順に step` で再現 |
| `getScoreValue` | [script.js:269](script.js:269) | `machine.getProgress().moraTotal` に置換 |
| `normalizeTypingInput` | [script.js:273](script.js:273) | 削除（mora 数は machine 経由で取得） |
| `renderQuestion` | [script.js:100](script.js:100) | トークン単位 span 化、漢字トークンは `<ruby>` でルビ。`displayCursor` で current/correct クラス付与 |
| `updateProgress` | [script.js:219](script.js:219) | `machine.getProgress()` の `moraDone / moraTotal` ベース |
| `updateNextKey` | [script.js:234](script.js:234) | `machine.getNextChars()` を直接使用 |
| `ROMAJI_VARIANTS` | [script.js:24](script.js:24) | 削除（`engine/moraTable` に統合） |
| `MAX_INPUT_CANDIDATES` | [script.js:40](script.js:40) | 削除（候補列挙しないため不要） |

### Step 5: 段階切替

1. **Step 1-3 完了時点**: 旧コード変更なし、新形式データと engine/ が並存
2. **L1 切替**: `loadQuestions(1)` のみ v2 を読むように変更、動作確認
3. **L2-L4 順次切替**: 同様に1ファイルずつ
4. **全レベル安定後**: 旧 `input` フィールドと旧変換ロジック (`buildInputSegments`, `findVariantAt`, `ROMAJI_VARIANTS`) を削除、`data/v2/` を `data/` に昇格

ロールバックは `loadQuestions` の参照先を1行戻すだけ。

### Step 6: UI 拡張（オプション・後回し可）

- ふりがな表示モードのトグル（漢字トークンに `<ruby>` でルビ）
- トークン単位ハイライト（いま打っているトークンを強調表示）
- 助詞トークン (`particle: true`) を別色表示
- ミス分析: モーラ単位のミス回数集計

## 重要ファイル

| ファイル | 役割 | 変更種別 |
|---|---|---|
| [index.html:144](index.html:144) | script タグ | `type="module"` 化＋キャッシュバスター更新 |
| [script.js:277](script.js:277) `buildInputSegments` | 入力ローマ字→セグメント | 削除し `buildLatticeFromTokens` に置換 |
| [script.js:311](script.js:311) `findVariantAt` | ローマ字 variant 判定 | 削除（engine 側に移動） |
| [script.js:347](script.js:347) `buildInputCandidates` | セグメント→候補展開 | **削除**（TypingMachine ステートマシンに置換） |
| [script.js:386](script.js:386) `getDisplayIndexForTypedBuffer` | 表示位置算出 | 削除。`machine.getDisplayCursor()` |
| [script.js:269](script.js:269) `getScoreValue` | スコア計算 | mora 数ベースに変更 |
| [script.js:100](script.js:100) `renderQuestion` | 表示生成 | トークン+ルビ対応、`displayCursor` 参照 |
| [script.js:24](script.js:24) `ROMAJI_VARIANTS` | variant 表 | engine/moraTable に統合 |
| [script.js:40](script.js:40) `MAX_INPUT_CANDIDATES` | 候補上限 | 削除 |
| `data/questions_level*.json` | 問題データ | v2/ に新形式で再生成 |
| `scripts/check_romaji_variants.mjs:6` `romajiVariants` | テスト用 variant 表 | 同様に engine 参照に変更 |

## 検証手順

### 単体検証（各 Step 後）

```bash
# Step 1 (engine)
node -e 'import("./engine/buildLattice.js").then(m => console.log(m.buildLatticeFromTokens([{text:"ライフプラン",yomi:"ライフプラン"},{text:"は",yomi:"は"}])))'

# Step 2 (migration)
node scripts/migrate_to_tokens.mjs

# Step 3 (verify)
node scripts/verify_tokens.mjs
# → 全エントリ pass / needsReview 件数表示
```

### 結合検証（手動）

1. `python3 -m http.server` でローカル起動
2. ブラウザで初級〜達人を1問ずつ実プレイし、以下を確認:
   - 表示テキストが正しい（漢字混じりで OK）
   - キー入力で進捗が進む
   - 「ん」を `n`/`nn` 両方で打てる
   - 「っ」を子音重ね/`xtu` 両方で打てる
   - 「ー」を母音/`-` 両方で打てる
   - 助詞「は/へ/を」が `ha/he/wo` で打てる
   - スコアが mora 数で計算される
   - 結果画面の文字数・速度が正しく出る

### 後方互換チェック

- 旧 `data/questions_level*.json` を読ませても動く（並行期間中）
- 旧データと新データを切り替えてプレイ感が変わらない（または改善している）

### 回帰検証

```bash
node scripts/verify_fp3_questions.mjs   # 既存問題ファイルの整合性
node scripts/check_romaji_variants.mjs  # variant 動作のスポットチェック
```

## スコープ外（今回やらない）

- kuromoji 等の形態素解析導入（不確実なエントリは手動レビュー）
- 編集者向け Web UI
- かな入力モード対応
- 学習履歴・アダプティブ出題
- 別お題集（簿記・英単語等）の追加データ作成

これらは本リファクタが完了して初めて低コストで実装可能になる。
