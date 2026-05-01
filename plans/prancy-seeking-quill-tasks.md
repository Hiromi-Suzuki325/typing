# 実装工程表 — 仮名ベース＋打鍵変換器アーキテクチャ移行

設計プラン: [plans/prancy-seeking-quill.md](prancy-seeking-quill.md)

## マイルストーン概観

| # | マイルストーン | 終了条件 | 並行運用への影響 |
|---|---|---|---|
| M1 | engine 層完成 | `node` で fixture が全 pass | 影響なし（並走） |
| M2 | 移行ツール完成 | `data/v2/*.json` 生成、`needsReview = 0` | 影響なし（並走） |
| M3 | 検証ツール完成 | 旧 input 受理・variant 受理・不正拒否 全件 pass | 影響なし（並走） |
| M4 | script.js 改修 | ローカル起動で全レベル動作確認 | L1 のみ v2 切替 |
| M5 | 段階切替完了 | L2/L3/L4 順次切替、旧コード削除 | v2 のみ稼働 |

---

## M1: engine 層の実装

### T1.1: `engine/moraTable.js` — 基本テーブル
- [ ] 清音（あ〜ん）の全モーラと options を列挙
- [ ] 濁音・半濁音（が〜ぽ）を列挙
- [ ] 拗音（きゃ・しゃ・ちゃ・にゃ・ひゃ・みゃ・りゃ・ぎゃ・じゃ・びゃ・ぴゃ系）を列挙
- [ ] 外来音（ふぁ・うぃ・ヴぁ・てぃ・でぃ・とぅ・どぅ等）を列挙
- [ ] `PARTICLE_TABLE` を別 export: `は→["wa","ha"]`, `へ→["e","he"]`, `を→["wo","o"]`
- [ ] カタカナ→ひらがな正規化関数 `normalizeKana(s)` を export

**受け入れ条件**:
- `MORA_TABLE["しゃ"]` が `["sha","sya"]` を含む
- `PARTICLE_TABLE["は"]` が `["wa","ha"]` を含む
- `normalizeKana("シャ")` が `"しゃ"`

**確認**: `node -e "import('./engine/moraTable.js').then(m => console.log(m.MORA_TABLE['しゃ']))"`

### T1.2: `engine/mora.js` — かな列 → mora 配列
- [ ] 拗音の最長一致分割（`しょ` を1モーラとして検出）
- [ ] `ん` `っ` `ー` を独立 mora として返す
- [ ] カタカナ・ひらがな混在を許容（内部で normalize）
- [ ] 未知文字に出会ったら例外を投げる（Fail-Fast）

**受け入れ条件**:
- `moraSplit("しょうらい")` → `["しょ","う","ら","い"]`
- `moraSplit("にんいかにゅう")` → `["に","ん","い","か","にゅ","う"]`
- `moraSplit("キャッシュフロー")` → `["きゃ","っ","しゅ","ふ","ろ","ー"]`

**確認**: 上記3例を assert する `engine/__tests__/mora.test.mjs` を作成し `node --test` で pass

### T1.3: `engine/specialMora.js` — 文脈依存関数
- [ ] `resolveN(prevMora, nextMora)` — 後続が母音/y なら `["nn","xn"]`、それ以外なら `["n","nn","xn"]`
- [ ] `resolveSokuon(nextMora)` — 後続の先頭子音を取り `["xtu","ltu","子音重ね"]`、後続なしなら `["xtu","ltu"]`
- [ ] `resolveChouon(prevMora)` — 直前モーラの母音 + `["-"]`

**受け入れ条件**:
- `resolveN(null, "あ")` が `"n"` を含まない（曖昧回避）
- `resolveN(null, "か")` が `["n","nn","xn"]`
- `resolveSokuon("か")` が `"k"` を含む
- `resolveChouon("か")` が `["a","-"]`

**確認**: `engine/__tests__/specialMora.test.mjs` で assert

### T1.4: `engine/buildLattice.js` — tokens → lattice
- [ ] 句読点トークン（`yomi: ""`）は lattice 非参加
- [ ] raw トークン（`kind: "raw"`）は `options: [text.toLowerCase()]` で1エントリ
- [ ] 通常トークンは `moraSplit(yomi)` で展開、各 mora に `displayRange { tokenIndex, charStart, charEnd }` 付与
- [ ] particle metadata を各 mora エントリに伝搬（`PARTICLE_TABLE` 参照）
- [ ] ん/っ/ー は specialMora で options 確定（前後 mora を渡す）

**受け入れ条件**:
- `buildLatticeFromTokens([{text:"信用", yomi:"しんよう"}])` が4エントリ生成
- うち `ん` のエントリの options に `["nn","xn"]` を含み `n` 単独を含まない（後続「よ」が y 音のため）
- 句読点 `[{text:"。", yomi:""}]` は空 lattice
- raw `[{text:"NISA", kind:"raw"}]` は `options:["nisa"]` の1エントリ

**確認**: `engine/__tests__/buildLattice.test.mjs`

### T1.5: `engine/typingMachine.js` — NFA + acceptsString
- [ ] `class TypingMachine` 実装（`Map<key, State>` で active states 管理）
- [ ] `step(c)` で next states を計算、key 化 dedupe
- [ ] `committedIndex` を step ごとに更新（prefix 空の最小 i）
- [ ] `isComplete()` / `getNextChars()` / `getProgress()` / `getDisplayCursor()` / `reset()`
- [ ] `acceptsString(lattice, input)` を別 export（検証ツール用）

**受け入れ条件**（最重要 fixture）:
- 「ん」+「よ」(`しんよう`) で `nnyou` も `nyou` も完成（`acceptsString` が `complete:true`）
- 「ん」連続 (`しんにゅう` → `n n n yu u`)で `shinnnyuu` 受理
- 促音（`しっぱい`）で `shippai` も `shixtupai` も受理
- 長音（`シート`）で `shi-to` も `shiito` も受理
- 助詞「は」で `wa` も `ha` も受理（`particle: true` 時）
- 表示単調性: `しんよう` で1文字目 `n` 入力時 `committedIndex === 0`、2文字目 `n` で `committedIndex === 1`

**確認**: `engine/__tests__/typingMachine.test.mjs` で全 fixture が pass

---

## M2: 移行ツール `scripts/migrate_to_tokens.mjs`

### T2.1: ローマ字→かな逆変換 parser
- [ ] `moraTable` 全 option の逆引きテーブル生成
- [ ] 最長一致でローマ字 → mora 列に変換
- [ ] 子音重ね（`kk`,`tt`,...）→ 「っ」 + 後続
- [ ] `nn`/`xn` → 「ん」、`xtu`/`ltu` → 「っ」、`-` → 「ー」
- [ ] `n` 単独で後続が母音/y → `needsReview: true` で旗立て
- [ ] 助詞 `wa`/`e`/`o` の display 側突合せルール

### T2.2: display のトークン分割
- [ ] 文字種境界（ひらがな/カタカナ/漢字/英数字/句読点）で分割
- [ ] 連続英数字を1 raw トークンに集約

### T2.3: yomi 割り当て
- [ ] ひらがな token: text 文字数を yomi から消費、不一致なら `needsReview`
- [ ] カタカナ token: ひらがな正規化して突合
- [ ] 漢字 token: 次のかな token の頭文字位置まで yomi を消費、曖昧なら `needsReview`
- [ ] 句読点・raw token は yomi 消費なし

### T2.4: particle 検出
- [ ] 1文字ひらがな（は/が/を/に/へ/と/で/も/や/ね）かつ前後がかな/漢字 → `particle: true`

### T2.5: 出力
- [ ] `data/v2/questions_levelN.json` を生成（4ファイル）
- [ ] サマリ出力: 総件数 / `needsReview` 件数 / カテゴリ内訳

**受け入れ条件**:
- 全852件を変換、`needsReview` 件数を表示
- 出力 JSON は `display` `tokens` `id` `level` `category` `tags` を持つ

**確認**: `node scripts/migrate_to_tokens.mjs && ls data/v2/`

---

## M3: 検証ツール `scripts/verify_tokens.mjs`

### T3.1: 構造チェック
- [ ] `tokens.text` 結合 == `display`
- [ ] `moraSplit(全 yomi)` が未知モーラなく成功
- [ ] `buildLatticeFromTokens` が例外なく lattice 生成
- [ ] `needsReview > 0` なら exit code 1

### T3.2: 後方互換チェック
- [ ] 旧 input を `acceptsString` に通して `complete:true` を確認
- [ ] 主要 variant パターン（ん/は/ー/っ）で置換した文字列も `complete:true`
- [ ] 1文字ずらした文字列は `failedAt` が返る

### T3.3: 埋め込み fixture
- [ ] `信用` `任意加入` `キャッシュフロー表` `バランスシート` で個別 assert
- [ ] L3/L4 から句読点入り文を最低3問選び assert
- [ ] 助詞 `は/へ/を` を `wa/e/wo` `ha/he/wo` 両方で受理

**受け入れ条件**:
- 全852件で 3-1 / 3-2 / 3-3 全 pass
- 失敗ファイル・件数・原因をサマリ出力

**確認**: `node scripts/verify_tokens.mjs` の exit code が 0

---

## M4: script.js の改修

### T4.1: ESM 化
- [ ] [index.html:144](../index.html) を `<script type="module" src="script.js?v=tokens-20260501">` に変更
- [ ] `style.css?v=` のキャッシュバスターも更新
- [ ] `script.js` 冒頭で `engine/*.js` から import 追加

**受け入れ条件**: ローカル起動で console エラーなく既存挙動が維持される

### T4.2: 旧ロジック削除
- [ ] `ROMAJI_VARIANTS` 削除
- [ ] `MAX_INPUT_CANDIDATES` 削除
- [ ] `buildInputSegments` / `findVariantAt` / `buildInputCandidates` / `dedupeCandidates` 削除
- [ ] `getDisplayIndexForTypedBuffer` / `skipDisplaySpaces` 削除
- [ ] `hasCandidatePrefix` / `isCandidateComplete` 削除
- [ ] `normalizeTypingInput` 削除

### T4.3: 状態モデル再設計
- [ ] `currentInput` / `currentIndex` / `typedBuffer` / `inputCandidates` / `inputSegments` 削除
- [ ] `currentLattice` / `machine: TypingMachine` / `pastInput: string[]` を追加
- [ ] `prepareQuestion` で `buildLatticeFromTokens` → `new TypingMachine(lattice)` に変更
- [ ] `normalizeQuestion` で旧 input 形式を tokens に暫定変換するフォールバック追加（並行運用用）

### T4.4: 入力ハンドラ
- [ ] `handleTypingChar(c)`: `machine.step(c)` の戻り値で受理判定 → `pastInput.push(c)` → totalChars 加算 → `isComplete()` で次問
- [ ] `handleBackspace`: `pastInput.pop()` → `machine.reset()` → `pastInput` を順 step で再現

### T4.5: 表示・進捗
- [ ] `renderQuestion`: トークン単位で `<span>`/`<ruby>` 出力、`getDisplayCursor().tokenIndex` で `correct`/`current`/`pending` クラス付与
- [ ] `updateProgress`: `machine.getProgress()` の `moraDone / moraTotal` で％計算
- [ ] `updateNextKey`: `machine.getNextChars()` の Set を直接利用
- [ ] `getScoreValue`: `machine.getProgress().moraTotal` を返す

**受け入れ条件**: T4.6 のチェックリストで全項目 pass

### T4.6: 結合動作確認
- [ ] `python3 -m http.server` で起動、初級〜達人を1問ずつ実プレイ
- [ ] 「ん」を `n`/`nn` 両方で打てる
- [ ] 「っ」を子音重ね/`xtu` 両方で打てる
- [ ] 「ー」を母音/`-` 両方で打てる
- [ ] 助詞「は/へ/を」が `ha/he/wo` でも `wa/e/wo` でも打てる
- [ ] スコアが segment 数で計算される
- [ ] 結果画面の入力文字数・速度が正しく出る
- [ ] Backspace で進捗が正しく戻る
- [ ] 漢字トークンに ruby が表示される（読み仮名）

---

## M5: 段階切替

### T5.1: L1 切替
- [ ] `loadQuestions(1)` を `data/v2/questions_level1.json` に変更
- [ ] 1日プレイして致命的な不具合がないか確認

### T5.2: L2 切替
- [ ] `loadQuestions(2)` を v2 に変更
- [ ] スポット動作確認

### T5.3: L3 切替
- [ ] `loadQuestions(3)` を v2 に変更
- [ ] 句読点入り問題を重点確認

### T5.4: L4 切替
- [ ] `loadQuestions(4)` を v2 に変更
- [ ] 長文・複雑な助詞・促音連続を重点確認

### T5.5: 旧コード削除
- [ ] `data/questions_level{1-4}.json` を削除
- [ ] `data/v2/` を `data/` に昇格（mv）
- [ ] `script.js` の `convertLegacyToTokens` フォールバックを削除
- [ ] `scripts/check_romaji_variants.mjs` を engine 参照に書き換え or 削除
- [ ] `ROMAJI_VARIANTS_PLAN.md` を削除

**受け入れ条件**:
- 全レベル安定動作
- リポジトリから旧 input 形式のコードが消える
- `node scripts/verify_tokens.mjs` が exit 0

---

## 進捗サマリー（チェック用）

| マイルストーン | タスク数 | 状態 |
|---|---|---|
| M1 engine 層 | 5 | ⬜ |
| M2 移行ツール | 5 | ⬜ |
| M3 検証ツール | 3 | ⬜ |
| M4 script.js 改修 | 6 | ⬜ |
| M5 段階切替 | 5 | ⬜ |

---

## 工程の依存関係

```
T1.1 moraTable
  ↓
T1.2 mora ─────┐
  ↓            │
T1.3 special   │
  ↓            ↓
T1.4 buildLattice
  ↓
T1.5 typingMachine ──┬──→ T2.1 (逆引き parser)
                     │       ↓
                     │     T2.2-2.5 移行
                     │       ↓
                     └──→ T3.1-3.3 検証
                              ↓
                          (M1/M2/M3 完了)
                              ↓
                          T4.1 ESM 化
                              ↓
                          T4.2-4.6 改修
                              ↓
                          T5.1 L1 切替
                              ↓ (1日確認)
                          T5.2-5.4 L2-L4
                              ↓
                          T5.5 旧コード削除
```

クリティカルパス: `T1.1 → T1.5 → T3.3 → T4.6 → T5.5`
