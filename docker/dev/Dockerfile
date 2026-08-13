# ローカル開発用の「作業机」コンテナ(elec-tool/docker/dev/Dockerfile と同じ思想)。
#   - Maven / JDK / MySQL / Node.js をこのコンテナに直接インストールし、
#     コンテナの中でコードを編集・ビルド・起動して動作確認する。
#   - 本番/デプロイ用のイメージ(backend/Dockerfile, frontend/Dockerfile)とは別物。
#     こちらは外部に公開したり本番稼働させたりしない、開発者専用の環境。
#   - Docker CLI も同梱し、ホストのDockerソケットをマウントして使うことで、
#     このコンテナの中から本番相当のイメージをビルド・起動できるようにする
#     (docker-in-dockerではなく、ホストのDockerデーモンをそのまま共有する方式)。

FROM ubuntu:22.04

WORKDIR /workspace

ENV DEBIAN_FRONTEND=noninteractive
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8

# Java / Maven / MySQL / 各種CLIツール(Docker CLIは下のブロックで別途導入)
# inotify-tools: バックエンドのホットリロード(ソース変更検知)に使用
RUN apt-get update && apt-get install -y --no-install-recommends \
    openjdk-17-jdk \
    maven \
    mysql-server \
    make \
    curl \
    rsync \
    git \
    ca-certificates \
    gnupg \
    inotify-tools \
    && rm -rf /var/lib/apt/lists/*

# Docker CLI + Composeプラグイン(`docker compose`サブコマンド用)。
# Ubuntu標準リポジトリの docker.io には compose プラグインが含まれないため、Docker公式リポジトリから導入する。
RUN install -m 0755 -d /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc \
    && chmod a+r /etc/apt/keyrings/docker.asc \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu jammy stable" > /etc/apt/sources.list.d/docker.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends docker-ce-cli docker-compose-plugin \
    && rm -rf /var/lib/apt/lists/*

# Node.js 20(フロントエンドのビルド/開発サーバー起動用)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# MySQLの初期設定(root/開発用DBの作成)。開発専用なのでパスワードは固定値で簡略化。
# apt版mysql-serverはrootアカウントが素の`mysql -u root`では入れない状態になっていることがあるため、
# パッケージが自動生成するメンテナンス用アカウント(debian-sys-maint、/etc/mysql/debian.cnfに認証情報あり)を使って設定する。
RUN service mysql start \
    && mysql --defaults-file=/etc/mysql/debian.cnf -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'devroot12345'; FLUSH PRIVILEGES;" \
    && mysql --defaults-file=/etc/mysql/debian.cnf -e "CREATE DATABASE IF NOT EXISTS \`event-planner\`;" \
    && mysql --defaults-file=/etc/mysql/debian.cnf -e "CREATE USER IF NOT EXISTS 'appuser'@'%' IDENTIFIED WITH mysql_native_password BY 'apppassword'; GRANT ALL PRIVILEGES ON \`event-planner\`.* TO 'appuser'@'%'; FLUSH PRIVILEGES;" \
    && service mysql stop

# elec-toolの開発用コンテナ(8000/5173/3306)と同時に起動しても衝突しないよう、
# ホスト側のポートマッピングは docker-compose.yml と同じ 8001/5174/3307 を使う想定
# (コンテナ内部のポート自体はアプリのデフォルト値のまま: backend=8000, frontend=5174, mysql=3306)。
EXPOSE 8000 5174 3306

# コンテナを起動させ続け、docker exec で中に入って作業する
CMD ["sleep", "infinity"]
