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
 * 個別に選択して共有された1イベント分。対応するUserShareがshareAll=falseのときにのみ意味を持つ
 * (shareAll=trueに切り替えても、後で個別選択に戻したときのために既存の選択は消さずに残す)。
 *
 * ownerUserIdは検索・所有権チェックを簡単にするための非正規化列で、常にevent.user_idと一致する。
 */
@Entity
@Table(name = "event_share")
@Getter
@Setter
@NoArgsConstructor
public class EventShare {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_id", nullable = false)
    private Long eventId;

    @Column(name = "owner_user_id", nullable = false)
    private Long ownerUserId;

    @Column(name = "shared_with_user_id", nullable = false)
    private Long sharedWithUserId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        createdAt = LocalDateTime.now();
    }
}
