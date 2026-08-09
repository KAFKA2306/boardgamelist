# BoardGameList — 出典付きボードゲームルールガイド

**ボードゲームのルールを集めるほど、「同じゲームのルール」を一つにまとめてはいけなくなる。**

版、拡張、言語、出版社FAQ、翻訳、コミュニティ解釈では、同じ名前のゲームでも適用範囲が違います。BoardGameListは、その違いを消さずに出典と適用範囲を保持して公開するMkDocsベースのドキュメントシステムです。

**公開サイト:** https://kafka2306.github.io/boardgamelist/

公式ルール、出版社FAQ、翻訳、コミュニティ解釈、データベース観測を区別し、異なる版・拡張・言語の情報を無条件に混ぜません。

## 主な内容

### ルールガイド

| ゲーム | 人数 | 時間 | 状態 |
| --- | ---: | ---: | --- |
| [ボーナンザ](docs/games/bohnanza.md) | 2〜7人 | 約45分 | 公開済み |
| [ハッククラッド](docs/games/hackclad.md) | 2〜4人 | 約45分 | 公開済み |
| [イスタンブール選択と集中](docs/games/istanbul-choose-write.md) | 2〜5人 | 約60分 | 公開済み |
| [フォート](docs/games/fort.md) | 2〜4人 | 約40分 | 公開済み |
| [フィクサー](docs/games/fixer.md) | 3〜4人 | 約30分 | 公開済み |
| [ナショナルエコノミー・メセナ](docs/games/national-economy-mesena.md) | 1〜4人 | 約45分 | 公開済み |

人数、時間、複雑度なども、出版社、公式資料、BoardGameGeekなどの情報源と取得時点を保持して管理します。

### 深淵侵蝕 — オンライン試遊版

`docs/play/deep-abyss/`には、短時間のドラフト型領域支配ゲーム「深淵侵蝕」のブラウザ試遊版があります。

現在の主な機能:

- 4教団による領域支配ゲーム
- 1人＋CPU3人のローカル試遊
- 2〜3人のオンライン参加後、不足席をCPUで補充
- 4人オンライン対戦
- PeerJS / WebRTCによる部屋接続
- 6文字の参加コード
- 行動候補と操作手順の画面ガイド
- PCキーボードとモバイル操作
- 試遊時間、行動数、迷いクリックなどのブラウザ内記録
- 1人CPU戦、2人＋CPU戦、通常オンライン戦のE2E検証

2人デモでもルール、ドラフト、勝敗判定は通常の4教団戦と同じで、不足席のCPU処理はホスト側が担当します。

## 情報の流れ

```text
公式ルール・出版社FAQ・外部データ
  → ゲーム・版・拡張・言語を同定
  → ルール事実を正規化
  → 翻訳・要約・解説を分離
  → 競合・欠落・適用範囲を監査
  → MkDocs・試遊ページへ公開
```

次の情報種別を分離します。

- `OfficialRule` — 公式ルール本文
- `PublisherClarification` — 出版社FAQや訂正
- `TranslatedText` — 元文書に結び付いた翻訳
- `DatabaseObservation` — 人数・時間などの外部観測値
- `CommunityInterpretation` — 非公式の解説・解釈

公式性、版、言語、ページまたは節が不明な記述は`verification_required`として扱います。

機械可読な定義:

- [プロジェクト・オントロジー](ontology/project.yaml)
- [共通因果・証拠オントロジー](https://github.com/KAFKA2306/know/blob/main/ontology/causal-evidence-core.yaml)

## ローカル実行

```bash
git clone https://github.com/KAFKA2306/boardgamelist.git
cd boardgamelist
pip install -r requirements.txt
mkdocs serve
```

深淵侵蝕の実行・検証には、リポジトリ内のNode.jsテストとE2Eスクリプトを使用します。

## 主な構成

```text
boardgamelist/
├── docs/
│   ├── games/                  # 各ゲームのルールガイド
│   ├── play/deep-abyss/        # 深淵侵蝕のブラウザ試遊版
│   ├── categories/
│   ├── resources/
│   ├── javascripts/
│   └── stylesheets/
├── scripts/                    # ロジック・E2E検証
├── ontology/project.yaml
├── .github/workflows/
├── mkdocs.yml
└── requirements.txt
```

## 検証方針

- ゲーム版、拡張、言語の混同を検出する
- 公式ルールと非公式解説を区別する
- 翻訳を元文書と適用版へ結び付ける
- MkDocsビルド、リンク、ブラウザゲームを検証する
- 深淵侵蝕はゲーム完走、CPU戦、複数ブラウザ接続をE2Eで確認する
- 根拠のない完成度や正確性を自己宣言しない

## ライセンス・権利

コードのライセンスは`LICENSE`を参照してください。ゲーム名称、ルール、画像などの権利は各権利者に帰属します。

**README最終監査:** 2026-08-01