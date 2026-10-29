-- 実績を、同じイベント・同じ日付でも小分けに何件でも入力できるようにする(午前1時間・午後15分、のように)。
--
-- 以前は「イベント+日付で1件だけ」(uk_event_actual_event_date)で、同じ日に入力し直すと上書きされていた。
-- そのユニークキーを外す。外部キー(event_id)が使うインデックスを先に用意してから外す。
--
-- db/init/ 配下のSQLは、MySQLコンテナのデータディレクトリが「まっさら」の状態で
-- 初回起動したときにしか自動実行されない。既存のコンテナ/ボリュームに反映したい場合は、
-- このファイルの中身を稼働中のMySQLに対して1回だけ実行すること(2回目はエラーになる)。
-- 例: docker compose exec -T mysql mysql -u appuser -p event-planner < db/init/11_allow_multiple_actuals_per_day.sql
ALTER TABLE event_actual ADD INDEX idx_event_actual_event (event_id);
ALTER TABLE event_actual DROP INDEX uk_event_actual_event_date;
