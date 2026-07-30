# BoardGameList — ボードゲームルールガイド

ボードゲームのルール、版、セットアップ、手番、得点、外部メタデータを、出典と適用範囲を保持して公開するMkDocsベースのドキュメントシステムです。

- 公開サイト: https://kafka2306.github.io/boardgamelist/

## 因果・証拠オントロジー

上位システムは `VersionedBoardGameKnowledgeBase` です。

```text
公式ルール・出版社FAQ・データベース情報
→ ゲーム／版／拡張／言語の同定
→ ルール事実の正規化
→ 翻訳・要約・解説
→ 競合と欠落の監査
→ MkDocs公開
```

`OfficialRule`、`PublisherClarification`、`TranslatedText`、`DatabaseObservation`、`CommunityInterpretation`を別の意味クラスとして扱います。異なる版や拡張のルールを無条件に統合せず、公式性、版、言語、ページまたは節が不明な記述は `verification_required` とします。

- [プロジェクト・オントロジー](ontology/project.yaml)
- [共通因果・証拠オントロジー](https://github.com/KAFKA2306/know/blob/main/ontology/causal-evidence-core.yaml)

## 対象ゲーム

| ゲーム | 日本語名 | 人数 | 時間 | 状態 |
|---|---|---:|---:|---|
| [BOHNANZA](docs/games/bohnanza.md) | ボーナンザ | 2–7人 | 約45分 | 公開済み |
| [HackClad](docs/games/hackclad.md) | ハッククラッド | 2–4人 | 約45分 | 公開済み |
| [イスタンブール選択と集中](docs/games/istanbul-choose-write.md) | イスタンブール選択と集中 | 2–5人 | 約60分 | 公開済み |
| [FORT](docs/games/fort.md) | フォート | 2–4人 | 約40分 | 公開済み |
| [FIXER](docs/games/fixer.md) | フィクサー | 3–4人 | 約30分 | 公開済み |
| [National Economy Mesena](docs/games/national-economy-mesena.md) | ナショナルエコノミー・メセナ | 1–4人 | 約45分 | 公開済み |

人数、時間、複雑度などの値も、出版社、公式資料、BoardGameGeekなどの出典クラスと取得時刻を明示して管理することを原則とします。

## ローカル実行

```bash
git clone https://github.com/KAFKA2306/boardgamelist.git
cd boardgamelist
pip install -r requirements.txt
mkdocs serve
```

## 構成

```text
boardgamelist/
├── docs/
│   ├── games/
│   ├── categories/
│   ├── resources/
│   ├── javascripts/
│   └── stylesheets/
├── ontology/project.yaml
├── .github/workflows/
├── mkdocs.yml
├── requirements.txt
└── README.md
```

## 検証方針

- ゲーム版・拡張・言語の混同を検出する
- 公式ルールと非公式解説を区別する
- 翻訳には元文書と適用版を結び付ける
- リンク、MkDocsビルド、公開ページを検証する
- 根拠がない完成度や正確性を自己宣言しない

## ライセンス

コードのライセンスは `LICENSE` を参照してください。ゲーム名称、ルール、画像その他の権利は各権利者に帰属します。