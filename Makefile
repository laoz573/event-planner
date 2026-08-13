# 開発用コンテナ(docker/dev/Dockerfile)向けのショートカット集。
# elec-toolのMakefileと同じ思想: このコンテナの中(または docker exec 先)で実行する想定。
# Docker未使用でローカルに直接Java/Node.jsを入れて開発したい場合は、末尾の
# 「ローカル開発(Docker未使用)」セクションのターゲットを直接使うこともできる。

.PHONY: dev-build dev-shell backend-build backend-run backend-dev frontend-install frontend-dev db-start db-delete \
	docker-build up down \
	docker-build-backend docker-build-frontend docker-build-prod login push-backend push-frontend push \
	pull-prod up-prod down-prod \
	local-backend-dev

# --- 開発用コンテナ自体の準備 ---

# 開発用イメージをビルド
dev-build:
	docker build -f docker/dev/Dockerfile -t event-planner-dev .

# 開発用コンテナを起動し、シェルで中に入る(初回)
# ホストのDockerソケットをマウントすることで、コンテナの中から本番相当のイメージもビルドできる。
# ポートは docker-compose.yml と同じ 8001/5174/3307 を使う(elec-toolの開発用コンテナと同時起動しても衝突しない)。
dev-shell:
	docker run -it --name event-planner-dev \
		-v $(shell pwd):/workspace \
		-v /var/run/docker.sock:/var/run/docker.sock \
		-p 8001:8000 -p 5174:5174 -p 3307:3306 \
		event-planner-dev bash

# --- 開発用コンテナの中で実行するコマンド ---

# バックエンドのビルド(jar作成)
backend-build:
	cd backend && mvn clean package -DskipTests

# ローカルMySQLを起動してバックエンドを起動(コンテナ内での動作確認用、ホットリロードなし)
backend-run: db-start backend-build
	java -jar backend/target/*.jar

# バックエンドをホットリロード付きで起動(コード変更を検知して自動再コンパイル→DevToolsが自動再起動)
backend-dev: db-start
	bash docker/dev/backend-watch.sh

# フロントエンドの依存インストール
frontend-install:
	cd frontend && npm install

# フロントエンドの開発サーバー起動(ホットリロード)
frontend-dev:
	cd frontend && npm run dev -- --host

# コンテナ内蔵のMySQLを起動し、event-plannerを作り直してから初期化SQLを流す
# root のパスワードは docker/dev/Dockerfile のビルド時に devroot12345 に設定済み
# event-plannerを毎回作り直すことで、INSERT文が重複実行されてシードデータが二重に入るのを防ぐ
db-start:
	service mysql start
	mysql -uroot -pdevroot12345 -e "DROP DATABASE IF EXISTS \`event-planner\`; CREATE DATABASE \`event-planner\`;"
	@for f in db/init/*.sql; do \
		echo "Running $$f"; \
		mysql -uroot -pdevroot12345 event-planner < $$f || true; \
	done

# データベースの初期化のみ(SQL再投入はしない)
db-delete:
	mysql -uroot -pdevroot12345 -e "DROP DATABASE IF EXISTS \`event-planner\`; CREATE DATABASE \`event-planner\`;"

# --- 本番相当の確認(ホストのDockerを使ってdocker-composeを動かす) ---

docker-build:
	docker compose build

up:
	docker compose up -d

down:
	docker compose down

# --- 本番用イメージのビルド・push(elec-tool/householdのMakefileと同じ思想) ---
# 使い方の例:
#   GH_TOKEN=xxxxx make push
#   REGISTRY=ghcr.io/別のユーザー名 TAG=v1.0.0 make push
REGISTRY ?= ghcr.io/laoz573
TAG      ?= latest
GH_USER  ?= laoz573

docker-build-backend:
	docker build -t $(REGISTRY)/event-planner-backend:$(TAG) ./backend

docker-build-frontend:
	docker build -t $(REGISTRY)/event-planner-frontend:$(TAG) ./frontend

docker-build-prod: docker-build-backend docker-build-frontend

# GitHub Container Registryにログイン(事前に環境変数 GH_TOKEN にトークンをセットしておくこと)
login:
	echo $$GH_TOKEN | docker login ghcr.io -u $(GH_USER) --password-stdin

push-backend: login
	docker build -t $(REGISTRY)/event-planner-backend:$(TAG) ./backend
	docker push $(REGISTRY)/event-planner-backend:$(TAG)

push-frontend: login
	docker build -t $(REGISTRY)/event-planner-frontend:$(TAG) ./frontend
	docker push $(REGISTRY)/event-planner-frontend:$(TAG)

push: push-backend push-frontend

# --- GHCRのイメージから起動(ローカルでビルドせず、pushしたイメージをそのまま使う) ---
# 使い方の例:
#   make up-prod
#   REGISTRY=ghcr.io/別のユーザー名 TAG=v1.0.0 make up-prod
# ※イメージがprivateの場合は、事前に GH_TOKEN をセットして `make login` しておくこと

pull-prod:
	docker compose -f docker-compose.prod.yml pull

up-prod: pull-prod
	docker compose -f docker-compose.prod.yml up -d

down-prod:
	docker compose -f docker-compose.prod.yml down

# --- ローカル開発(Docker未使用、Java/Node直接インストール派向け) ---
# 開発用コンテナを使わず、ホストに直接 Java17+Maven+Node.js が入っている前提の軽量な代替手段。
# MySQLだけ事前に `docker compose up mysql` 等で立ち上げておくこと。

local-backend-dev:
	cd backend && mvn spring-boot:run
