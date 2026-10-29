-- ジャンル・実績機能: イベントに「ジャンル」を付け、ジャンルを選んだイベントに作業時間(実績)を入力できるようにする。
--
-- event_genre: ユーザーごとのジャンル(設定タブで追加・名前変更・削除)。名前はユーザー内で重複不可。
-- event.genre_id: イベントが属するジャンル(未選択はNULL)。ジャンルを削除すると、そのジャンルを選んでいた
--   イベントは自動的にNULL(未選択)へ戻る(ON DELETE SET NULL)。
-- event_actual: イベントごと・日付ごとの作業時間。minutesは「分」で保存し、画面側で時間・分に換算する。
--   同じイベント・同じ日付は1行だけ(uk_event_actual_event_date)で、保存は上書き。
--   イベントを削除すると実績も一緒に消える(ON DELETE CASCADE)。
--
-- db/init/ 配下のSQLは、MySQLコンテナのデータディレクトリが「まっさら」の状態で
-- 初回起動したときにしか自動実行されない(docker-entrypoint-initdb.dの仕様)。
-- 既存のコンテナ/ボリュームに追加で反映したい場合は、このファイルの中身を直接
-- 稼働中のMySQLに対して1回だけ実行すること(event.genre_idのADD COLUMNは複数回実行するとエラーになる)。
-- 例: docker compose exec -T mysql mysql -u appuser -p event-planner < db/init/09_add_genre_and_actual.sql
CREATE TABLE IF NOT EXISTS event_genre (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(50) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_event_genre_user FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE,
    UNIQUE KEY uk_event_genre_user_name (user_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE event
    ADD COLUMN genre_id BIGINT NULL,
    ADD CONSTRAINT fk_event_genre FOREIGN KEY (genre_id) REFERENCES event_genre(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS event_actual (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_id BIGINT NOT NULL,
    work_date DATE NOT NULL,
    minutes INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_event_actual_event FOREIGN KEY (event_id) REFERENCES event(id) ON DELETE CASCADE,
    UNIQUE KEY uk_event_actual_event_date (event_id, work_date),
    INDEX idx_event_actual_date (work_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
