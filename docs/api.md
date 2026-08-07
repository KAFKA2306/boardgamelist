# データAPI

BoardGameListのゲームメタデータは、MkDocsの公開ページと同じGitHub Pagesから静的APIとして配布します。

## エンドポイント

- `/api/v1/manifest.json` — 件数、各配布物のbyte数、SHA-256、キャッシュ方針
- `/api/v1/games.json` — 正準ゲーム単位のJSONカタログ
- `/api/v1/games.csv` — 表計算・BI向けCSV
- `/api/v1/facets.json` — タグ、メカニクス、テーマ等の集計

公開URLの例:

```text
https://kafka2306.github.io/boardgamelist/api/v1/manifest.json
https://kafka2306.github.io/boardgamelist/api/v1/games.json
```

## 主キーと多言語

`id`は`game:<slug>`形式の安定IDです。`docs/games/<slug>.md`を正準ゲームとし、`docs/games/ja/<slug>.md`は同じゲームの日本語ロケールとして扱います。同一BGG IDを持つ翻訳ページを別ゲームとして重複計上しません。

## 主なフィールド

| フィールド | 意味 |
| --- | --- |
| `id` | 安定主キー |
| `slug` | URL・Markdownファイルと対応するslug |
| `title`, `japanese_title` | 表示名 |
| `players.min/max` | 対応人数。2人専用のような単値も同じ構造へ正規化 |
| `playtime_minutes.min/max` | プレイ時間（分） |
| `complexity` | リポジトリfront matterに保存された複雑度 |
| `bgg.id` | BoardGameGeek ID |
| `bgg.rating` | リポジトリに保存されたBGG評価値 |
| `bgg.rating_observed_at` | 現行資料に観測日時がないため`null` |
| `quality_flags` | 鮮度・識別子などの品質フラグ |
| `tags`, `mechanics`, `themes` | 検索・集計用分類 |
| `locales` | 利用可能なロケール |
| `provenance.source_sha256` | 元MarkdownのSHA-256 |

## 鮮度と外部データ

BoardGameGeekのXML APIは利用登録・認証を要求します。そのため、認証情報なしのCIが外部APIへ無断アクセスして評価値を更新する設計にはしていません。既存front matterのBGG評価値には観測日時が保存されていないため、APIでは`rating_observed_at: null`と`bgg-rating-observation-date-missing`を返し、最新値のようには扱いません。

将来、認証済みの更新ジョブを追加する場合は、BoardGameGeekの公式XML API2の利用条件とレート制限に従い、取得日時・レスポンス由来・差分を保存してください。

公式仕様: https://boardgamegeek.com/wiki/page/BGG_XML_API2

利用・認証要件: https://boardgamegeek.com/using_the_xml_api

## 差分取得

最初に`manifest.json`だけを取得し、前回保存したSHA-256と比較してください。`games.json`等のハッシュが変わっていなければ再取得は不要です。

```python
import hashlib
import json
import urllib.request

base = "https://kafka2306.github.io/boardgamelist/api/v1"
manifest = json.load(urllib.request.urlopen(f"{base}/manifest.json"))
expected = manifest["files"]["games.json"]["sha256"]
data = urllib.request.urlopen(f"{base}/games.json").read()
assert hashlib.sha256(data).hexdigest() == expected
catalog = json.loads(data)
print(catalog["count"])
```

## 互換性

`/api/v1/`では既存フィールドの意味を破壊的に変更しません。破壊的変更が必要な場合は新しいAPIバージョンへ分離します。
