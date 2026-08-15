package co.jp.mkssj.eventplanner.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * 「ownerUserIdの人が、sharedWithUserIdの人に自分のイベントを共有する」設定。
 * owner/sharedWithの組み合わせにつき1行だけ持つ(DB側でuk_user_share_pairにより保証)。
 *
 * shareAll=true の場合、ownerUserIdの現在・今後の全イベントが共有対象になる
 * (イベント側にフラグを持たせず、参照時にJOINで動的に判定するため、後から追加したイベントも自動的に含まれる)。
 * shareAll=false の場合は、EventShareで個別に指定されたイベントのみが共有対象になる。
 */
@Entity
@Table(name = "user_share")
@Getter
@Setter
@NoArgsConstructor
public class UserShare {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "owner_user_id", nullable = false)
    private Long ownerUserId;

    @Column(name = "shared_with_user_id", nullable = false)
    private Long sharedWithUserId;

    @Column(name = "share_all", nullable = false)
    private boolean shareAll;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
