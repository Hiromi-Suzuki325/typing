# 仮名ベース入力移行 — 現在状態メモ

作成日: 2026-05-01

## 現在の到達点

- 旧 `input` 文字列を直接なぞる方式から、`tokens[].yomi` を元にした仮名ベース入力へ移行中。
- `engine/` 配下に、かなモーラ分割、ローマ字候補表、特殊モーラ処理、lattice 生成、NFA ベースの `TypingMachine` を追加済み。
- `data/v2/questions_level{1-4}.json` を生成済み。全 852 件で `needsReview 0`。
- `script.js` は ESM 化済みで、`buildLatticeFromTokens` と `TypingMachine` を使って入力判定する。
- 上段の問題文は漢字混じり表示、下段のタイピングガイドはひらがな表示。
- 進捗バーは廃止済み。下段ガイド上で、入力済み・現在入力中・未入力をモーラ単位で表示する。

## 読み生成の扱い

- v2 データは `scripts/migrate_to_tokens.mjs` で旧 `data/questions_level*.json` から再生成する。
- 旧 input には `nini` のように `にに` とも `にんい` とも解釈できる曖昧表記がある。
- 現時点では、見つかった読みミスを補正表に追加し、再生成と回帰テストで固定する運用。
- 追加済み補正例:
  - `ににかにゅう` → `にんいかにゅう`
  - `きにゅう` → `きんゆう`
  - `うにょう` → `うんよう`
  - `しにょう` → `しんよう`
- 頻発するようなら、次の段階で FP 用語読み辞書を導入するのがよい。

## 既知の設計判断

- 「かな単位ハイライト」は厳密には lattice のモーラ単位。
  - `しょ` などの拗音は 1 まとまりで current 表示する。
  - raw token は 1 segment として扱う。
- 旧 input 互換を優先し、`ん` は母音前でも `n / nn / xn` を許可している。
- スコア計算と Next key 表示は現状維持。
- 句読点は lattice に含めず、表示だけ行う。

## 検証コマンド

```bash
node --check script.js
node --test engine/__tests__/*.test.mjs
node scripts/migrate_to_tokens.mjs
node scripts/verify_tokens.mjs
npm run verify
```

直近では以下を確認済み:

- `node --test engine/__tests__/*.test.mjs` pass
- `node scripts/migrate_to_tokens.mjs && node scripts/verify_tokens.mjs` pass
- `npm run verify` pass

## 直近で見つけて直した問題

- `所有権移転登記` が `しょゆうけにてんとうき` になっていた。
  - 原因: 旧 input のスペースを消してから逆変換し、語境界の `n i` が `ni` 扱いになった。
  - 対応: input をスペース区切り chunk ごとに逆変換。
- `任意加入` が `ににかにゅう` になっていた。
  - 原因: 旧 input `nini kanyuu` が曖昧で、ローマ字だけでは `にんい` と確定できない。
  - 対応: 読み補正表と回帰テストを追加。

## 次にやるなら

- しばらく実プレイし、読みミスが頻発するか確認する。
- 頻発する場合は `scripts/migrate_to_tokens.mjs` に小さな FP 用語読み辞書を追加する。
- UI 面では、下段ひらがなガイドのサイズ・行間・current 表示の見やすさを実機で微調整する。
