package co.jp.mkssj.eventplanner.entity;

import co.jp.mkssj.eventplanner.dto.CheckpointItem;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 年間イベント計画の1件分(期間・チェックポイント・ゴールをまとめて持つ)。
 * カレンダー上では紫の矢印(期間)・△(チェックポイント、複数可)・★(ゴール)で表示される。
 */
@Entity
@Table(name = "event")
@Getter
@Setter
@NoArgsConstructor
public class Event {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** このイベントを所有するユーザー(app_user.id)。ユーザーごとにデータを分離するためのキー。 */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false)
    private Integer year;

    @Column(nullable = false, length = 100)
    private String name;

    /** 担当(部署名・担当者名など自由入力)。未入力の場合は空文字。 */
    @Column(nullable = false, length = 50)
    private String owner;

    /** カレンダー上の矢印の色(#rrggbb)。デフォルトは紫。 */
    @Column(nullable = false, length = 7)
    private String color;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    /** ゴール(★)の日付。未設定の場合はカレンダー上に★を表示しない。 */
    @Column(name = "goal_date")
    private LocalDate goalDate;

    /** ゴール(■)の色(#rrggbb)。デフォルトは赤系(アクセントカラー)。 */
    @Column(name = "goal_color", nullable = false, length = 7)
    private String goalColor = "#b3241c";

    @OneToMany(mappedBy = "event", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("checkpointDate ASC")
    private List<EventCheckpoint> checkpoints = new ArrayList<>();

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

    /**
     * チェックポイント(日付+内容メモ)のリストで全件差し替える(既存分は orphanRemoval で自動削除)。
     * PUT/POSTのたびに「送られてきたリストが正」として扱うシンプルな更新方針。
     */
    public void replaceCheckpoints(List<CheckpointItem> items) {
        checkpoints.clear();
        if (items != null) {
            for (CheckpointItem item : items) {
                EventCheckpoint checkpoint = new EventCheckpoint();
                checkpoint.setEvent(this);
                checkpoint.setCheckpointDate(item.getDate());
                checkpoint.setLabel(item.getLabel() != null ? item.getLabel() : "");
                checkpoint.setColor(
                        item.getColor() != null && !item.getColor().isBlank() ? item.getColor() : "#1c1a17");
                checkpoints.add(checkpoint);
            }
        }
    }
}
