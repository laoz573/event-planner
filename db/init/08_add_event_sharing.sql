-- イベント共有機能: 「自分のイベントを他の既存ユーザーに共有する」ための2テーブルを追加する。
--
-- user_share: owner_user_id(共有する側)がshared_with_user_id(共有される側)に対して
--   「全イベントを共有する(share_all=true)」か「個別に選んだイベントだけ共有する(share_all=false)」かを
--   1組につき1行で保持する。share_all=trueの場合、共有する側が今後追加するイベントも自動的に共有対象になる
--   (event側にフラグを持たせるのではなく、判定時に動的にJOINするため)。
--
-- event_share: share_all=falseのときに、個別に選択されたイベントを保持する
--   (owner_user_idは検索・所有権チェックを簡単にするための非正規化列。event.user_idと必ず一致する)。
--
-- 共有されたイベントは閲覧専用として扱う(共有される側はAPI上、そのイベントの所有者ではないため、
-- 既存のEventController#findOwnedEventの仕組みによりPUT/DELETEは404になる=読み取り専用が担保される)。
--
-- db/init/ 配下のSQLは、MySQLコンテナのデータディレクトリが「まっさら」の状態で
-- 初回起動したときにしか自動実行されない(docker-entrypoint-initdb.dの仕様)。
-- 既存のコンテナ/ボリュームに追加で反映したい場合は、このファイルの中身を直接
-- 稼働中のMySQLに対して実行すること。
-- 例: docker compose exec -T mysql mysql -u appuser -p event-planner < db/init/08_add_event_sharing.sql
--
-- 新規テーブルの追加なので(既存テーブルへのALTERではないため)、01_schema.sqlと同じく
-- `CREATE TABLE IF NOT EXISTS` で複数回実行しても安全なようにしている
-- (MariaDBの拡張構文が必要になるのはADD COLUMN IF NOT EXISTSのケースのみ)。
CREATE TABLE IF NOT EXISTS user_share (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    owner_user_id BIGINT NOT NULL,
    shared_with_user_id BIGINT NOT NULL,
    share_all BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_share_owner FOREIGN KEY (owner_user_id) REFERENCES app_user(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_share_target FOREIGN KEY (shared_with_user_id) REFERENCES app_user(id) ON DELETE CASCADE,
    UNIQUE KEY uk_user_share_pair (owner_user_id, shared_with_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS event_share (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_id BIGINT NOT NULL,
    owner_user_id BIGINT NOT NULL,
    shared_with_user_id BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_event_share_event FOREIGN KEY (event_id) REFERENCES event(id) ON DELETE CASCADE,
    CONSTRAINT fk_event_share_owner FOREIGN KEY (owner_user_id) REFERENCES app_user(id) ON DELETE CASCADE,
    CONSTRAINT fk_event_share_target FOREIGN KEY (shared_with_user_id) REFERENCES app_user(id) ON DELETE CASCADE,
    UNIQUE KEY uk_event_share_pair (event_id, shared_with_user_id),
    INDEX idx_event_share_owner_target (owner_user_id, shared_with_user_id),
    INDEX idx_event_share_target (shared_with_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
