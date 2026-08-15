-- 外部公開に伴うブルートフォース対策: app_user に「連続パスワード誤り回数」と「ロック解除予定時刻」を追加する。
-- 同一ユーザーでパスワードを3回連続で間違えると、その時点から24時間ログインできなくなる
-- (正しいパスワードでも拒否。詳細はAuthController#loginを参照)。
--
-- db/init/ 配下のSQLは、MySQLコンテナのデータディレクトリが「まっさら」の状態で
-- 初回起動したときにしか自動実行されない(docker-entrypoint-initdb.dの仕様)。
-- 既にevent-planner用のMySQLコンテナ/ボリュームを作成済みの場合はこのファイルは自動実行されないため、
-- 以下のいずれかの方法で反映すること。
--
--   (a) 開発中でデータを消してよい場合: `docker compose down -v` でボリュームごと作り直してから起動し直す
--   (b) 既存データを残したい場合: このファイルの中身を直接、稼働中のMySQLに対して実行する
--       例: docker compose exec -T mysql mysql -u appuser -p event-planner < db/init/06_add_login_lockout.sql
--
-- 【重要】`ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...` はMariaDBの拡張構文であり、
-- 本家(Oracle)のMySQLではサポートされていない(バージョンを問わずERROR 1064になる)。
-- そのため、information_schemaで列の存在を確認したうえで動的SQLとして実行する形にして、
-- 複数回実行してもエラーにならないようにしている(実MySQL 8.0.46で動作確認済み)。
SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'app_user' AND COLUMN_NAME = 'failed_attempts') = 0,
    "ALTER TABLE app_user ADD COLUMN failed_attempts INT NOT NULL DEFAULT 0 AFTER password_hash",
    'SELECT 1'
));
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'app_user' AND COLUMN_NAME = 'locked_until') = 0,
    "ALTER TABLE app_user ADD COLUMN locked_until DATETIME NULL AFTER failed_attempts",
    'SELECT 1'
));
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
