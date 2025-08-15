
# BoardGameList - ボードゲーム完全ガイド

![BoardGameList Logo](https://img.shields.io/badge/BoardGameList-ボードゲーム完全ガイド-e91e63?style=for-the-badge)
![Build Status](https://img.shields.io/github/actions/workflow/status/KAFKA2306/boardgamelist/gh-pages.yml?branch=main&style=flat-square&color=e91e63)
![License](https://img.shields.io/github/license/KAFKA2306/boardgamelist?style=flat-square&color=e91e63)

スマートなボードゲームルールブックドキュメントシステム。日本語・英語対応の美しいアーキテクチャで構築された、包括的なボードゲーム攻略ガイドです。

## 🎯 プロジェクト概要

BoardGameListは、**美しいアーキテクチャ**と**マルチユーザーサポート**を重視したボードゲームドキュメントシステムです。MkDocsベースの静的サイトジェネレーターを使用し、スケーラブルで保守性の高い設計を実現しています。

### 主要特徴

- 📱 **モバイルファーストデザイン** - ゲームプレイ中の快適な閲覧体験
- 🌐 **日英バイリンガル対応** - 国際的なアクセシビリティ
- 🔗 **BGG統合機能** - BoardGameGeek自動データ取得
- 🎲 **6コアゲーム** - 完全ドキュメント化済み
- 🏗️ **美しいアーキテクチャ** - ジャンクファイル絶対禁止

## 🎮 対象ゲーム

### 必須コアコレクション

| ゲーム | 日本語名 | 人数 | 時間 | 複雑度 | 状態 |
|--------|----------|------|------|--------|------|
| [BOHNANZA](docs/games/bohnanza.md) | ボーナンザ | 2-7人 | 45分 | 1.6/5 | ✅ |
| [HackClad](docs/games/hackclad.md) | ハッククラッド | 2-4人 | 45分 | 2.3/5 | ✅ |
| [イスタンブール選択と集中](docs/games/istanbul-choose-write.md) | イスタンブール選択と集中 | 2-5人 | 60分 | 2.8/5 | ✅ |
| [FORT](docs/games/fort.md) | フォート | 2-4人 | 40分 | 2.1/5 | ✅ |
| [FIXER](docs/games/fixer.md) | フィクサー | 3-4人 | 30分 | 2.0/5 | ✅ |
| [National Economy Mesena](docs/games/national-economy-mesena.md) | ナショナルエコノミー・メセナ | 1-4人 | 45分 | 2.6/5 | ✅ |

## 🚀 クイックスタート

### 開発環境セットアップ

```bash
# リポジトリクローン
git clone https://github.com/KAFKA2306/boardgamelist.git
cd boardgamelist

# 依存関係インストール
pip install -r requirements.txt

# 開発サーバー起動
mkdocs serve
```

### ライブサイト

📖 **ドキュメント**: [https://kafka2306.github.io/boardgamelist](https://kafka2306.github.io/boardgamelist)

## 🏗️ アーキテクチャ

### 設計原則

- **美しいアーキテクチャ** - ジャンクファイル・テストファイル絶対禁止
- **スケーラブル構造** - 6ゲームから100+ゲームへの成長対応
- **マルチユーザーサポート** - 人間、AI、LLM、Serena-MCP、開発者、プレイヤー対応
- **エージェントベース開発** - 専門化されたエージェント連携システム

### ディレクトリ構造

```
boardgamelist/
├── docs/                    # ドキュメントソース
│   ├── games/              # ゲーム詳細ページ
│   ├── categories/         # カテゴリ分類ページ
│   ├── resources/          # 参考資料・用語集
│   ├── javascripts/        # カスタムJavaScript
│   └── stylesheets/        # カスタムCSS
├── .github/workflows/      # GitHub Actions
├── mkdocs.yml             # MkDocs設定
├── requirements.txt       # Python依存関係
└── README.md             # このファイル
```

### 技術スタック

- **静的サイトジェネレーター**: MkDocs + Material Theme
- **デプロイメント**: GitHub Pages + GitHub Actions
- **スタイリング**: Custom CSS (Pink Theme)
- **JavaScript**: バニラJS（BGG統合、進捗管理）
- **言語サポート**: 日本語・英語

## 🎨 デザインシステム

### カラーパレット

- **プライマリ**: `#e91e63` (Pink)
- **アクセント**: `#e91e63` (Pink)
- **BGG統合**: `#ff6600` (Orange)
- **難易度表示**:
  - 初級: `#4caf50` (Green)
  - 中級: `#ff9800` (Orange)
  - 上級: `#f44336` (Red)

### タイポグラフィ

- **本文**: Noto Sans JP
- **コード**: Roboto Mono
- **行間**: 1.8（日本語最適化）

## 🤝 コントリビューション

### エージェントシステム

このプロジェクトは専門化されたエージェント連携システムを採用しています：

- **Manager Agent** - 全体調整・タスク管理
- **Architect Agent** - アーキテクチャ設計・構造最適化  
- **Writer Agent** - コンテンツ作成・ゲームドキュメント
- **Cleaner Agent (片付けする人)** - ファイル整理・品質管理
- **Researcher Agent (探す人)** - BGG統合・データ収集

### 開発ガイドライン

1. **美しいアーキテクチャ維持**
   - ジャンクファイル作成禁止
   - 一時ファイル・テストファイルの即座削除
   - 命名規則厳守（kebab-case）

2. **エージェント連携**
   - 必要に応じて適切なエージェント呼び出し
   - 具体的なシステムプロンプト使用
   - 時限的な連携タイミング遵守

3. **品質基準**
   - BGG統合データ更新
   - モバイル対応確認
   - 日本語・英語両言語対応

## 📊 プロジェクトステータス

- **アーキテクチャ品質**: 🟢 美しい（ジャンクファイル0）
- **ビルドパフォーマンス**: 🟢 <2秒
- **コンテンツ完成度**: 🟢 6/6ゲーム完了
- **BGG統合**: 🟢 実装済み
- **多言語対応**: 🟢 日英対応済み

## 📝 ライセンス

このプロジェクトはMITライセンスの下で公開されています。詳細は[LICENSE](LICENSE)ファイルをご覧ください。

## 🔗 関連プロジェクト

- **[Marvelous Designer Guide](marvelousdesigner/)** - アーキテクチャ参考プロジェクト
- **[Rule Scribe Games](rule-scribe-games/)** - コンテンツ参考プロジェクト

---

**BoardGameList** - 美しく、スケーラブルで、ジャンクファイルゼロの完璧なアーキテクチャ

Copyright © 2024-2025 BoardGameList Contributors
