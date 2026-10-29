-- 状態の手動変更・チェックポイントの達成/未達・実績の備考。
--
-- event.status: 状態を手動で決めた場合の値('planned'=予定 / 'progress'=進行中 / 'done'=完了)。
--   NULLのときは従来どおり、今日の日付と期間から自動で算出する。
-- event_checkpoint.achieved: チェックポイントの達成(1)/未達(0)。デフォルトは未達。
-- event_actual.note: 実績の備考(自由入力、最大200文字)。空文字なら備考なし。
--
-- db/init/ 配下のSQLは、MySQLコンテナのデータディレクトリが「まっさら」の状態で
-- 初回起動したときにしか自動実行されない(docker-entrypoint-initdb.dの仕様)。
-- 既存のコンテナ/ボリュームに追加で反映したい場合は、このファイルの中身を直接
-- 稼働中のMySQLに対して1回だけ実行すること(ADD COLUMNは複数回実行するとエラーになる)。
-- 例: docker compose exec -T mysql mysql -u appuser -p event-planner < db/init/10_add_status_achieved_note.sql
ALTER TABLE event ADD COLUMN status VARCHAR(10) NULL;
ALTER TABLE event_checkpoint ADD COLUMN achieved TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE event_actual ADD COLUMN note VARCHAR(200) NOT NULL DEFAULT '';
