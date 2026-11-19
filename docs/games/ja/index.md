---
okf_version: "0.3"
title: "ゲーム一覧"
japanese_title: "ボードゲーム一覧"
description: "人数と時間からゲームを比較し、出版社の資料を確認できる日本語ルールガイドを探せます。"
layout: "games-index"
tags: ["index", "games-list", "navigation"]
---

# ゲーム一覧

人数と最大プレイ時間を指定すると、正準カタログでその条件が確認できるゲームだけを最大5件まで比較できます。

人数・時間が確認できないゲームは推測して候補へ入れません。各ゲームの詳細ページでは、確認できた出典と版を分けて掲載します。

一覧のゲーム件数、人数、時間、複雑度はこのページへ手入力せず、`api/v1/games.json` から取得します。

ゲームを所持しているかは利用者ごとの状態であり、共通カタログには含めません。BGAで現在遊べるかも、確認日時のない記録から推測せず「不明」として扱い、絞り込み条件には使用しません。

<!-- Static machine-readable marker for post-deploy Game Chooser verification. -->
<span id="game-chooser-contract" data-contract="canonical-catalog-v1" hidden></span>

## 出版社の資料を確認できるルールガイド

* [フォート](fort.md) - フォートのセットアップと手番を調べる日本語ガイド。
* [Sky Team](sky-team.md) - Sky Teamのセットアップと着陸手順を調べる日本語ガイド。
* [ウイングスパン](wingspan.md) - ウイングスパンのセットアップと各アクションを調べる日本語ガイド。
