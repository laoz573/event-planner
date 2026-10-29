package co.jp.mkssj.eventplanner.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

/**
 * イベント1件に対して何個でも付けられるチェックポイント(△)。
 */
@Entity
@Table(name = "event_checkpoint")
@Getter
@Setter
@NoArgsConstructor
public class EventCheckpoint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    @Column(name = "checkpoint_date", nullable = false)
    private LocalDate checkpointDate;

    /** チェックポイントの内容メモ(例: 「50%の問題集完了」)。未入力の場合は空文字。 */
    @Column(nullable = false, length = 200)
    private String label = "";

    /** チェックポイント(△)の色(#rrggbb)。デフォルトは黒系。 */
    @Column(nullable = false, length = 7)
    private String color = "#1c1a17";

    /** 達成(true)/未達(false)。デフォルトは未達。 */
    @Column(nullable = false)
    private Boolean achieved = false;
}
