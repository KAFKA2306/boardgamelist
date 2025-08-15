# BoardGameList - ボードゲーム完全ガイド

ボードゲームのルールブック・攻略法の完全ドキュメントシステムへようこそ。このプロジェクトは、美しいアーキテクチャとマルチユーザーサポートを重視した、詳細でアクセシブルなボードゲームドキュメントを提供します。

## 対象ゲーム

### コアコレクション（必須6ゲーム）

<div class="game-info-container">
<div class="game-title-header">🎲 選定ゲーム一覧</div>
完全なルールブック、セットアップ手順、ゲームプレイガイドを含む6つのコアボードゲームのドキュメントを構築中です。
</div>

| ゲーム名 | 日本語名 | プレイ人数 | 時間 | 複雑度 | ステータス |
|----------|----------|------------|------|--------|-----------|
| [BOHNANZA](games/bohnanza.md) | ボーナンザ | 2-7人 | <span class="playtime-estimate">45分</span> | <span class="difficulty-beginner">1.6/5</span> | ✅ 完了 |
| [HackClad](games/hackclad.md) | ハッククラッド | 2-4人 | <span class="playtime-estimate">45分</span> | <span class="difficulty-intermediate">2.3/5</span> | ✅ 完了 |
| [イスタンブール選択と集中](games/istanbul-choose-write.md) | イスタンブール選択と集中 | 2-5人 | <span class="playtime-estimate">60分</span> | <span class="difficulty-intermediate">2.8/5</span> | ✅ 完了 |
| [FORT](games/fort.md) | フォート | 2-4人 | <span class="playtime-estimate">40分</span> | <span class="difficulty-intermediate">2.1/5</span> | ✅ 完了 |
| [FIXER](games/fixer.md) | フィクサー | 3-4人 | <span class="playtime-estimate">30分</span> | <span class="difficulty-intermediate">2.0/5</span> | ✅ 完了 |
| [National Economy Mesena](games/national-economy-mesena.md) | ナショナルエコノミー・メセナ | 1-4人 | <span class="playtime-estimate">45分</span> | <span class="difficulty-intermediate">2.6/5</span> | ✅ 完了 |

## 機能

### 📱 モバイルファーストデザイン
ゲームプレイ中の読みやすさを重視したレスポンシブデザインと明瞭なタイポグラフィ。

### 🌐 日英バイリンガル対応
国際的なアクセシビリティのための完全な日本語・英語言語サポート。

### 🔗 BGG統合機能
評価、プレイ人数、ゲームメタデータのBoardGameGeek自動データ統合。

### 🔍 高度な検索機能
複数フィルターを備えた全ゲームドキュメント横断の強力な検索機能。

## ゲーム分類

カテゴリ別ゲーム探索：

- **[カードゲーム](categories/card-games.md)** - トレーディング、トリックテイキング、カード駆動ゲーム
- **[デッキビルディング](categories/deck-building.md)** - デッキ構築メカニクスを特徴とするゲーム
- **[戦略ゲーム](categories/strategy.md)** - 深い戦略・戦術的ゲームプレイ
- **[ファミリーゲーム](categories/family.md)** - 全年齢アクセシブルゲーム

<div class="progress-checklist">
<h4>🎯 学習進捗チェックリスト</h4>

- [ ] 基本的なゲーム用語を理解した
- [ ] カードゲームのメカニクスを把握した
- [ ] デッキビルディングの概念を学んだ
- [ ] 戦略ゲームの考え方を身につけた
- [ ] BGG評価システムを理解した
- [ ] モバイルでのアクセス方法を確認した
</div>

## 参考資料・リソース

### クイックアクセス

- **[ゲーム用語集](resources/glossary.md)** - 一般的な用語とメカニクスの説明
- **[BGG統合機能](resources/bgg-integration.md)** - BoardGameGeekデータと評価
- **[クイックリファレンス](resources/quick-reference.md)** - 一目でわかるゲーム要約

### 開発について

このプロジェクトは美しいアーキテクチャ原則に従っています：

- ジャンクファイル絶対禁止
- エージェントベース開発システム
- 6ゲームから100+ゲームへの成長をサポートするスケーラブル構造
- マルチユーザーサポート（人間、AI、LLM、Serena-MCP、開発者、プレイヤー）

## はじめに

!!! tip "推奨学習パス"
    1. **ゲーム閲覧**: [コアコレクション](#コアコレクション必須6ゲーム)から開始
    2. **検索**: 検索バーで特定のルールやメカニクスを検索
    3. **カテゴリ**: [カテゴリ](categories/card-games.md)やプレイスタイル別に探索
    4. **モバイル**: 任意のデバイスでゲームプレイ中にドキュメントアクセス

---

**プロジェクトステータス**: エージェントシステム確立済みの基盤フェーズ  
**ビルドパフォーマンス**: 目標 <2秒ロード時間  
**品質スコア**: 目標 90%+コンテンツ基準達成  
**アーキテクチャ**: 美しく、スケーラブル、ジャンクファイルゼロ