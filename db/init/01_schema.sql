-- アプリのユーザーアカウント。パスワードはBCryptハッシュのみを保存する(平文は保存しない)。
CREATE TABLE IF NOT EXISTS app_user (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_app_user_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 年間イベント計画の1件分(名前・色・期間・ゴール)。チェックポイントはevent_checkpointに分離して持つ。
-- user_id によりユーザーごとにデータを分離する。
CREATE TABLE IF NOT EXISTS event (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    year INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    owner VARCHAR(50) NOT NULL DEFAULT '',
    color VARCHAR(7) NOT NULL DEFAULT '#9c2d96',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    goal_date DATE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_event_user FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE,
    INDEX idx_event_user_year (user_id, year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- イベント1件につき何個でも追加できるチェックポイント(△)
CREATE TABLE IF NOT EXISTS event_checkpoint (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_id BIGINT NOT NULL,
    checkpoint_date DATE NOT NULL,
    CONSTRAINT fk_event_checkpoint_event FOREIGN KEY (event_id) REFERENCES event(id) ON DELETE CASCADE,
    INDEX idx_event_checkpoint_event (event_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
