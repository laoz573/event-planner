-- チェックポイントに「内容メモ」(label列)を追加する。
-- 例: チェックポイントの日付だけでなく「50%の問題集完了」のような自由入力の内容を残せるようにする。
--
-- db/init/ 配下のSQLは、MySQLコンテナのデータディレクトリが「まっさら」の状態で
-- 初回起動したときにしか自動実行されない(docker-entrypoint-initdb.dの仕様)。
-- 既にevent-planner用のMySQLコンテナ/ボリュームを作成済みの場合はこのファイルは自動実行されないため、
-- 以下のいずれかの方法で反映すること。
--
--   (a) 開発中でデータを消してよい場合: `docker compose down -v` でボリュームごと作り直してから起動し直す
--   (b) 既存データを残したい場合: このファイルの中身を直接、稼働中のMySQLに対して実行する
--       例: docker compose exec -T mysql mysql -u appuser -p event-planner < db/init/03_add_checkpoint_label.sql
--
-- 【重要】`ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...` はMariaDBの拡張構文であり、
-- 本家(Oracle)のMySQLではサポートされていない(バージョンを問わずERROR 1064になる)。
-- そのため、information_schemaで列の存在を確認したうえで動的SQLとして実行する形にして、
-- 複数回実行してもエラーにならないようにしている(実MySQL 8.0.46で動作確認済み)。
SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'event_checkpoint' AND COLUMN_NAME = 'label') = 0,
    "ALTER TABLE event_checkpoint ADD COLUMN label VARCHAR(200) NOT NULL DEFAULT '' AFTER checkpoint_date",
    'SELECT 1'
));
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
