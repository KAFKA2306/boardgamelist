https://kafka2306.github.io/boardgamelist/

# BoardGameList — 出典付きボードゲームルールガイド

[![Deploy MkDocs to GitHub Pages](https://github.com/KAFKA2306/boardgamelist/actions/workflows/gh-pages.yml/badge.svg)](https://github.com/KAFKA2306/boardgamelist/actions/workflows/gh-pages.yml)
[![Game metadata audit](https://github.com/KAFKA2306/boardgamelist/actions/workflows/game-metadata-audit.yml/badge.svg)](https://github.com/KAFKA2306/boardgamelist/actions/workflows/game-metadata-audit.yml)

**ルールを集めるほど、「同じゲームだから一つにまとめる」が危険になる。**

版、拡張、言語、出版社FAQ、翻訳、コミュニティ解釈では、同じ名前のゲームでも適用範囲が違います。BoardGameList は、その差を消さずに **「いま確認したい版のルールへ、出典付きで短く到達する」** ための非公式ルールガイドです。

## Vision

プレイ前・プレイ中のルール確認を、**検索結果を何ページも読み比べる作業から、「この版ではどうするか」を根拠付きで判断できる体験**へ変えます。

利用者が知りたいのは情報量ではありません。

- 今遊んでいる版・拡張に適用できるか
- 公式ruleか出版社clarificationか
- 翻訳・community解釈なら、元資料は何か
- 人数・時間等の数値をどこで確認したか
- online trialなら、実装ruleと文書ruleが一致しているか

## Design philosophy

- **Version before convenience.** 同名gameでも版・拡張・言語を無条件に統合しない。
- **Official and interpretation stay separate.** 公式rule、publisher FAQ、translation、community explanationを別情報種別として保持する。
- **Every useful shortcut keeps a path back.** 要約や索引から元source・page/sectionへ戻れるようにする。
- **Unknown is not filled with confidence.** 公式性・適用版・出典が不明なら`verification_required`として残す。
- **Playable demos need their own evidence.** 文書が正しいこととbrowser gameが最後まで動くことを別gateで検証する。
- **Collection is not the KPI.** game数を増やすために出典境界を弱めない。

## Why / 差別化

一般的なruleまとめでは、読みやすさのために複数sourceを一つの説明へ溶かしがちです。BoardGameList は逆に、**読みやすいガイドを提供しながら「どの種類の情報を、どの版に対して使っているか」を失わないこと**を中心にします。

MkDocs、ontology、browser gameは価値そのものではありません。これらは、速く調べても古い版や非公式解釈を現行裁定へ誤昇格させないための手段です。

## Rule discovery journey

```text
ゲームを選ぶ
  → 版 / 拡張 / 言語を確認
  → ルールガイドを読む
  → official / clarification / translation / community を識別
  → 必要ならsourceへ戻る
  → プレイ再開
```

## ルールガイド

| ゲーム | 人数 | 時間 | 状態 |
| --- | ---: | ---: | --- |
| [ボーナンザ](docs/games/bohnanza.md) | 2〜7人 | 約45分 | 公開済み |
| [ハッククラッド](docs/games/hackclad.md) | 2〜4人 | 約45分 | 公開済み |
| [イスタンブール選択と集中](docs/games/istanbul-choose-write.md) | 2〜5人 | 約60分 | 公開済み |
| [フォート](docs/games/fort.md) | 2〜4人 | 約40分 | 公開済み |
| [フィクサー](docs/games/fixer.md) | 3〜4人 | 約30分 | 公開済み |
| [ナショナルエコノミー・メセナ](docs/games/national-economy-mesena.md) | 1〜4人 | 約45分 | 公開済み |

人数・時間・複雑度等も、sourceと取得時点を保持して扱います。

## Evidence model

```text
OfficialRule
PublisherClarification
TranslatedText
DatabaseObservation
CommunityInterpretation
```

これらを一つの「rule text」へ潰しません。

機械可読な定義:

- [ontology/project.yaml](ontology/project.yaml)
- [causal evidence core](https://github.com/KAFKA2306/know/blob/main/ontology/causal-evidence-core.yaml)

## 深淵侵蝕 — オンライン試遊版

`docs/play/deep-abyss/` には短時間のドラフト型領域支配ゲーム「深淵侵蝕」のbrowser trialがあります。

現在の主なsurface:

- 4教団の領域支配
- 1人 + CPU3人
- 2〜3人online + 不足席CPU
- 4人online
- PeerJS / WebRTC room connection
- 6文字参加code
- action guide
- PC / mobile input
- browser-local play metrics

browser trialは「文書ruleが存在する」こととは別に、完走・CPU・multi-browser接続をE2Eで検証します。

## Information flow

```text
official rules / publisher FAQ / external observations
  → game / edition / expansion / language identity
  → normalized rule facts
  → translation / summary / explanation as separate layers
  → conflict / scope audit
  → MkDocs / playable surface
```

## Local run

```bash
git clone https://github.com/KAFKA2306/boardgamelist.git
cd boardgamelist
pip install -r requirements.txt
mkdocs serve
```

深淵侵蝕はrepository内のNode.js test / E2E scriptも使用します。

## Repository map

```text
docs/
  games/                  rule guides
  play/deep-abyss/        browser trial
  categories/
  resources/
  javascripts/
  stylesheets/
scripts/                  logic / E2E validation
ontology/project.yaml     evidence semantics
.github/workflows/        CI / Pages
mkdocs.yml
requirements.txt
```

## Quality gate

- edition / expansion / language混同を検出
- official ruleとunofficial explanationを分離
- translationをsource documentと適用版へ結びつける
- MkDocs build / linkを検証
- browser gameはgame completion / CPU / multi-browser pathをE2E検証
- 根拠のない正確性・完成度を自己宣言しない

## Done

成功指標は収録game数ではありません。

**プレイ中の利用者が、今の版に使えるruleへ短く到達し、その説明が公式・clarification・translation・community interpretationのどれで、どのsourceへ戻ればよいか判断できること**をDoneとします。

## License / rights

code licenseは`LICENSE`を参照してください。game名称、rule、画像等の権利は各権利者に帰属します。