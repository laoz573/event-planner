-- 外部公開にあたり、自己登録(誰でも新規登録できる状態)を廃止したため、
-- 最初にログインするためのマスターユーザーをここで1件だけ投入しておく。
-- このユーザーでログインしたあと、設定画面の「アカウント管理」から他のユーザーを追加できる。
--
-- username: masaya
-- password: 3939 (BCryptでハッシュ化して保存。平文はどこにも保存していない)
--
-- 【重要】4桁の非常に短いパスワードのため、ブルートフォース対策(3回間違えると24時間ロック)は
-- 効きますが、それでも推測されやすい点に変わりはありません。外部公開する場合は、
-- 初回ログイン後になるべく早く長いパスワードに変更することを強く推奨します
-- (現時点ではパスワード変更APIが無いため、変更する場合はDBのpassword_hash列を
--  BCryptでハッシュ化した新しい値に直接更新するか、開発側に変更APIの追加を依頼すること)。
--
-- db/init/ 配下のSQLは、MySQLコンテナのデータディレクトリが「まっさら」の状態で
-- 初回起動したときにしか自動実行されない(docker-entrypoint-initdb.dの仕様)。
-- 既存のコンテナ/ボリュームに追加で反映したい場合は、このファイルの中身を直接
-- 稼働中のMySQLに対して実行すること。
-- 例: docker compose exec -T mysql mysql -u appuser -p event-planner < db/init/07_seed_master_user.sql
-- 【注意】failed_attempts / locked_until 列を使うため、既存DBに手動適用する場合は
-- 先に 06_add_login_lockout.sql を適用してからこのファイルを実行すること。
--
-- 既に同名ユーザーが存在する場合は何もしない(重複作成やパスワード上書きを防ぐため)。
INSERT INTO app_user (username, password_hash, failed_attempts, locked_until)
SELECT 'masaya', '$2b$10$NoT2AmWHczJan.JR4vKRzuDw/mzEaS3lRBJXtpcmKLGfZww0lp4q6', 0, NULL
WHERE NOT EXISTS (SELECT 1 FROM app_user WHERE username = 'masaya');
