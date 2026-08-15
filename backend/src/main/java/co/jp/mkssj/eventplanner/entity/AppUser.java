package co.jp.mkssj.eventplanner.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * アプリのユーザーアカウント。イベントはこのユーザー単位で分離される。
 * パスワードは平文では保存せず、BCryptでハッシュ化して保存する。
 */
@Entity
@Table(name = "app_user")
@Getter
@Setter
@NoArgsConstructor
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String username;

    @Column(name = "password_hash", nullable = false, length = 100)
    private String passwordHash;

    /** パスワードを連続で間違えた回数。ログイン成功時、またはロック期限経過時に0へ戻る。 */
    @Column(name = "failed_attempts", nullable = false)
    private int failedAttempts;

    /** この時刻より前はログイン不可(3回連続でパスワードを間違えたときにセットされる)。null=ロックなし。 */
    @Column(name = "locked_until")
    private LocalDateTime lockedUntil;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        createdAt = LocalDateTime.now();
    }
}
