# Nutri

栄養管理モバイルアプリ（React Native、まず Android）。バーコード（Open Food Facts）、日本食品標準成分表（文部科学省）やチェーン店メニューの検索、商品ラベルの撮影で食べたものを記録し、1日の合計を目標と比べたり、週・月のグラフで振り返ったりできます。

English version: [README.md](README.md) · 設計書: [Docs/](Docs/)

## このリポジトリの構成

| ディレクトリ | 内容                                                                    |
| ------------ | ----------------------------------------------------------------------- |
| `App`        | React Native（Expo）アプリ                                              |
| `Server`     | Cloudflare Worker: チェーン店メニュー、該当なしリクエスト、OFF への中継 |
| `Shared`     | `App` と `Server` で共有する型・Zod スキーマ・テキスト正規化            |
| `Docs`       | 要件定義と設計書（英語が主、`*.ja.md` が日本語版）                      |

サーバーの運用費用は 0 円です（Cloudflare の無料枠）。写真の読み取りにはユーザー自身の OpenAI API キーを使い、キーは端末内にだけ保存されます。

## セットアップ（初回）

必要なもの: Node.js 22 以上、pnpm 10 以上。

```bash
git clone <このリポジトリ>
cd <リポジトリ>
pnpm install

# サーバー: ローカル DB を作って Worker を起動
cd Server
pnpm migrate:local
cp .dev.vars.example .dev.vars        # 任意: Open Food Facts 中継用の OFF_PASSWORD
pnpm dev                              # http://localhost:8787

# アプリ（別のターミナル）
cd App
cp .env.example .env                  # EXPO_PUBLIC_SERVER_URL を設定（実機では PC の LAN の IP アドレス）
pnpm start
```

Expo のターミナルで `a` を押すと Android エミュレーターが開きます。development build の端末では QR コードを読み取ります。`pnpm web` でブラウザ版も開けます（デバッグに便利です。expo-sqlite のためにブラウザには cross-origin isolation が必要ですが、Metro の開発サーバーだけではそのヘッダーが付かないため、`Cross-Origin-Opener-Policy: same-origin` と `Cross-Origin-Embedder-Policy: credentialless` を付けるプロキシを前に置いてください）。

## 2回目以降の起動

```bash
cd Server && pnpm dev     # Worker
cd App && pnpm start      # アプリ
```

## 主なコマンド

| コマンド                                  | 場所     | 内容                                                          |
| ----------------------------------------- | -------- | ------------------------------------------------------------- |
| `pnpm test`                               | ルート   | 全テスト（Shared、Server、App）を実行                         |
| `pnpm typecheck`                          | ルート   | 全パッケージの型チェック                                      |
| `pnpm format`                             | ルート   | Prettier で全体を整形                                         |
| `pnpm build:mext [file.xlsx]`             | `App`    | 文科省の公式 Excel から `assets/Mext/MextFoods.json` を再生成 |
| `pnpm requests:export out.csv [--remote]` | `Server` | 未対応の該当なしリクエストを、件数の多い順に書き出す          |
| `pnpm menus:import menus.csv [--remote]`  | `Server` | 調べたメニューを登録し、該当するリクエストを解決済みにする    |
| `pnpm migrate:remote`                     | `Server` | デプロイ済みの D1 データベースにマイグレーションを適用        |

## チェーン店メニューの開発者バッチ

1. `pnpm requests:export open.csv --remote` で、ユーザーが探して見つからなかったものを書き出す。
2. 栄養価（1食分あたり）を調べ、列 `chain, aliases, name, servingG, energyKcal, proteinG, fatG, carbohydrateG, fiberG, saltG, sourceUrl` の CSV にまとめる。
3. `pnpm menus:import menus.csv --remote` で登録する。アプリは次回の同期で新しいデータを取り込む。

## サーバーのデプロイ

```bash
cd Server
pnpm exec wrangler d1 create nutri-db      # 出力された database_id を wrangler.toml に書く
pnpm migrate:remote
pnpm exec wrangler secret put OFF_PASSWORD # アプリ共通の Open Food Facts アカウントのパスワード
# wrangler.toml の [vars] に OFF_USER_ID を設定
pnpm deploy
```

その後、`App/.env` の `EXPO_PUBLIC_SERVER_URL` をデプロイ先の URL にします。

## データの出典

- 日本食品標準成分表（八訂）増補2023年（文部科学省）
- Open Food Facts（ODbL）。提供はアプリ共通のアカウントで行う。
