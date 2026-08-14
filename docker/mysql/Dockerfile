# 自宅サーバーなど「pullしたイメージだけで完結させたい」環境向けに、
# db/init配下のスキーマ初期化SQLをあらかじめ焼き込んだMySQLイメージ。
#
# これがない場合、mysql:8.0の素イメージ + ホスト側db/initのbind mount という構成になり、
# backend/frontendはイメージだけで動くのにmysqlだけはリポジトリのdb/initフォルダが
# ホストに必要、という中途半端な状態になってしまう。このDockerfileで焼き込むことで、
# docker-compose.home.yml / docker-compose.prod.yml はcompose定義ファイルと.envだけで
# 完結するようになる(pull & up のみでよい)。
#
# ビルドはリポジトリルートを起点に行うこと(db/initを参照するため)。
#   docker build -f docker/mysql/Dockerfile -t event-planner-mysql:latest .
# (Makefileの docker-build-mysql / push-mysql が上記を実行する)
#
# スキーマを変更した場合は db/init/*.sql を追加したうえで、このイメージも作り直してpushすること
# (`make push` で backend/frontend と一緒にpushされる)。
FROM mysql:8.0
COPY db/init/ /docker-entrypoint-initdb.d/
