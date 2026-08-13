# 年間イベント計画ツール (event-planner)

Java (Spring Boot) + React (TypeScript) + MySQL で構築した、1年間のイベント(期間・チェックポイント・ゴール)を
カレンダー上で管理するツールです。`elec-tool` と同じ技術構成・コーディング規約・見た目のトーンを踏襲した、
elec-toolとは独立した別プロジェクトです(elec-tool本体には変更を加えていません)。

## できること

- ユーザーごとにアカウントを作成してログイン(自己登録可能)。イベントデータはユーザーごとに分離される
- 年を指定すると、その年のカレンダー(1〜12月、日単位の目盛り付き)を表示
- イベントを何個でも追加でき、各イベントは紫の矢印で「期間」を表示
- 矢印をドラッグして期間を移動、両端をドラッグして開始日/終了日だけを変更
- チェックポイント(△)をイベントごとに何個でも追加・ドラッグで日付変更
- ゴール(★)をドラッグで日付変更
- 下の表からも日付を直接キーボード入力可能(矢印・表のどちらを操作しても両方に反映)
- データはMySQLに保存され、年ごとに独立して管理される(elec-toolと同じくバックエンドAPI経由の永続化)

## ログイン・アカウント作成について

householdのログイン画面(ユーザー名・パスワードのシンプルなフォーム)を踏襲しつつ、household自体には
無かった「アプリ内から新規アカウントを作成できる」機能を追加しています。

- 初回は「新規登録」からユーザー名(3文字以上)とパスワード(8文字以上)を入力してアカウントを作成
- 以後は同じユーザー名・パスワードでログイン
- 認証は `Authorization: Bearer <JWTトークン>` ヘッダー方式(household・elec-toolのモバイル向け方式と同じ)。
  トークンはブラウザの `localStorage` に保存し、30日間有効
- パスワードは平文では保存せず、BCryptでハッシュ化してDBに保存(householdは平文保存だったため、
  ここはセキュリティ面で改善しています)
- ログインしていない状態、またはトークンが失効した状態で `/api/events` 系のAPIにアクセスすると401が返り、
  フロントエンドは自動的にログイン画面へ戻ります
- 各ユーザーは自分が作成したイベントしか見えず、他人のイベントをid指定で更新・削除しようとしても404になります

## 構成

```
event-planner/
├── backend/                 Spring Boot (Java 17)
├── frontend/                React + TypeScript (Vite)
├── db/init/                 MySQL初期化SQL(スキーマ)
├── docker/dev/               開発用の作業机コンテナ(Dockerfile・ホットリロード起動スクリプト)
├── docker-compose.yml        ローカル開発用: mysql / backend / frontend を分離
├── docker-compose.prod.yml   本番用(GHCRのイメージをpull。TLS終端は含まない)
└── Makefile                  コマンド集
```

イベントAPIは `GET/POST/PUT/DELETE /api/events` で、CRUD一式を提供します(認証必須、ログイン中のユーザーの
イベントのみ操作可能)。認証APIは `POST /api/auth/register`(新規登録) / `POST /api/auth/login`(ログイン)で、
どちらも成功するとJWTトークンを返します。
チェックポイントは1イベントに複数持てるため、更新のたびに「送られてきたリストで全差し替え」する方針にしています
(行の追加・削除・並び替えをフロント側で自由に行えるようにするため)。

## elec-toolとの違い

- elec-toolは「ジャンル(強電/弱電)ごとに複数ツールを切り替える」構成ですが、このアプリは年間イベント計画専用の
  単一画面アプリなので、ジャンル選択画面は設けていません。
- ポート番号は、同じマシンでelec-toolと同時に動かせるよう意図的にずらしています(下記参照)。
- elec-toolと同様の`docker/dev/`(開発者用の作業机コンテナ)を用意しています。Java/Maven/MySQL/Node.jsが
  全て入ったコンテナの中でコードを編集・起動できるので、ホスト側に何もインストールせずに開発できます
  (ホストに直接インストールする軽量な代替手段も引き続き使えます。下記「使い方3」参照)。

### ポート番号(elec-toolとの同時起動を想定)

| サービス | elec-tool | event-planner |
|---|---|---|
| フロントエンド(docker) | 80 | **8081** |
| バックエンドAPI(docker) | 8000 | **8001** |
| MySQL(docker) | 3306 | **3307** |
| フロントエンド開発サーバー(vite) | 5173 | **5174** |
| バックエンド開発サーバー(spring-boot:run、開発用コンテナ内) | 8000→ホスト8000 | 8000→ホスト**8001** |
| MySQL(開発用コンテナ内) | 3306→ホスト3306 | 3306→ホスト**3307** |
| バックエンド開発サーバー(コンテナを使わずホスト直起動) | 8000 | 8000 (※local devでelec-toolと同時起動は不可) |

## 使い方1: 本番同様の構成(docker-compose)

```bash
cp .env.example .env
# .env を編集してパスワードとJWT_SECRETを設定(JWT_SECRETは未設定だと起動時にエラーになります)

docker compose up --build
```

- フロントエンド: http://localhost:8081
- バックエンドAPI: http://localhost:8001/api/events?year=2026 (フロントエンド経由なら http://localhost:8081/api/events?year=2026)
- MySQL: localhost:3307

`db/init/` 配下のSQLはMySQLコンテナの初回起動時に自動実行されます。

## 使い方2: 開発用コンテナ(docker/dev)を使う

elec-toolと同じ「作業机コンテナ」方式です。Java 17 / Maven / MySQL / Node.js / Docker CLIが全て入った
コンテナの中でコードを編集・ビルド・起動します。ホストに何もインストールしたくない場合はこちらが手軽です。

```bash
# 開発用イメージのビルド(初回・Dockerfile変更時のみ)
make dev-build

# コンテナを起動してシェルに入る(プロジェクト一式を /workspace にマウント)
make dev-shell
```

コンテナの中(プロンプトが変わったら成功)で、以下を実行します。

```bash
# バックエンド(初回起動時にコンテナ内蔵MySQLへdb/init/のSQLを流し込みます)
make backend-dev

# 別のターミナルから同じコンテナに入ってフロントエンドを起動
docker exec -it event-planner-dev bash
make frontend-install   # 初回のみ
make frontend-dev
```

- フロントエンド: http://localhost:5174 (ホスト側からアクセス)
- バックエンドAPI: コンテナ内部からは http://localhost:8000 、ホスト側からは http://localhost:8001
- MySQL: コンテナ内部からは localhost:3306 、ホスト側からは localhost:3307 (root/devroot12345)

`docker/dev/backend-watch.sh` がソース変更を検知して自動で再コンパイルし、Spring Boot DevToolsが
アプリを自動再起動してくれます(ホットリロード)。`JWT_SECRET`環境変数を設定していない場合は開発用の
ランダムな鍵が自動生成され、コンテナ(=アプリ)を再起動するたびにログイントークンが失効します。
再起動をまたいでログイン状態を保ちたい場合は、コンテナに入る前に `export JWT_SECRET=適当な長い文字列`
してから `make dev-shell` するか、`docker run` に `-e JWT_SECRET=...` を追加してください。

## 使い方3: ローカルに直接インストールして開発する

開発用コンテナを使わず、ホストに直接 Java 17 + Maven + Node.js が入っている前提の軽量な代替手段です。

```bash
# バックエンド(別ターミナルでMySQLだけ先に起動しておく: docker compose up mysql)
make local-backend-dev

# フロントエンド
make frontend-install   # 初回のみ
make frontend-dev
```

フロントエンド開発サーバー(http://localhost:5174)は `/api` へのリクエストを
`http://localhost:8000` (バックエンドのデフォルトポート)にプロキシします。

`JWT_SECRET` を設定せずに `local-backend-dev` を起動した場合、開発用のランダムな鍵が自動生成されます
(バックエンドを再起動するたびに、それまで発行したログイントークンは無効になります)。
再起動をまたいでログイン状態を保ちたい場合は `export JWT_SECRET=適当な長い文字列` してから起動してください。

## 使い方4: 社内サーバーへの本番デプロイ

elec-toolと同じ思想(EC2 1台 + docker-compose + shared-proxyでのTLS終端)を想定しています。
`docker-compose.prod.yml`内のドメイン(`event-planner.mkssj-app.jp`)はプレースホルダーなので、
実際に使うドメインに書き換えてください。手順はelec-toolのREADMEの「使い方2」を参照してください
(共有ネットワーク`shared-proxy-net`はelec-tool側ですでに作成済みなら再作成不要です)。

## 検証について(重要)

このプロジェクトはサンドボックス環境で以下を確認済みです。

- フロントエンド: `npm install && npm run build` (TypeScriptのコンパイル + Viteビルド)が成功
- フロントエンド: モックAPIサーバー(認証エンドポイント込み)に対してPlaywrightでE2Eテストを実施し、
  新規登録→ログイン確定・リロード後のセッション保持・ログアウト・パスワード誤り時のエラー表示・
  トークン失効時の自動ログイン画面遷移が正しく動作することを確認。あわせて curl で
  「Aさんが作ったイベントはBさんの一覧には出てこない」「トークンなしは401」も個別に確認済み
- 以前のフェーズで、イベント追加・矢印のドラッグ移動・両端リサイズ・チェックポイント/ゴールの追加とドラッグ・
  削除・年の切り替え・リロード後のデータ保持もPlaywrightで確認済み
- バックエンド: **このサンドボックス環境はMaven Central(repo.maven.apache.org)への外部アクセスが
  ブロックされているため、`mvn compile`/`mvn test`を実行できませんでした。** コード自体はelec-toolや
  householdの既存の動作実績あるコード(entity/dto/repository/controllerの構成、JWT発行・検証の書き方、
  Lombok/JPA/Spring MVCの書き方)をそのまま踏襲する形で書いていますが、実機での最終確認はできていません。

**そのため、初回は必ず以下を実行してビルド・テストが通ることを確認してから使ってください。**

```bash
cd backend
mvn test
```

以下のテストが含まれています。

- `EventControllerTest` — 新規登録→ログインしてからのイベントCRUD一式、未認証アクセスの拒否(401)、
  他ユーザーのイベントが見えない・操作できないこと(404)の確認
- `AuthControllerTest` — 新規登録→ログイン成功、ユーザー名重複時の拒否(409)、パスワード誤り時の拒否(401)、
  パスワードが短すぎる場合の拒否(400)の確認

もしコンパイルエラーが出た場合は、そのエラーメッセージを教えてもらえれば修正します。

## セキュリティ関連のメモ(elec-toolと同様)

- SQLインジェクション対策: Spring Data JPA経由でパラメータバインディングを徹底
- CORS: `APP_CORS_ALLOWED_ORIGINS` で許可オリジンを明示的に制限
- 実行ユーザー: backendコンテナは非rootユーザーで実行
- 秘密情報: パスワード・JWT_SECRET等は `.env` で管理し、`.gitignore` でコミット対象外に
- 認証: `POST /api/auth/*` 以外の `/api/events/**` は全て `JwtAuthFilter` でBearerトークン必須にしている
  (householdは各サーブレットメソッドで個別に認証チェックしていたが、ここではFilterに集約して重複を排除)
- パスワードはBCryptでハッシュ化して保存(平文保存はしない)
- 今後の拡張候補: パスワードリセット機能、ユーザー名の大文字小文字正規化、ログイン試行回数制限(ブルートフォース対策)
