package co.jp.mkssj.eventplanner.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

/** 実績1件分(イベント名・色・ジャンルIDを付けて返す。グラフでイベント計画と同じ色を使うため)。 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ActualDto {
    private Long id;
    private Long eventId;
    private String eventName;
    private String eventColor;
    private Long genreId;
    private LocalDate workDate;
    private Integer minutes;
    private String note;
}
