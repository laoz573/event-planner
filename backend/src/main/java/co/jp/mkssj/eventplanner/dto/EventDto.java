package co.jp.mkssj.eventplanner.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventDto {
    private Long id;
    private Integer year;
    private String name;
    private String owner;
    private String color;
    private LocalDate startDate;
    private LocalDate endDate;
    private LocalDate goalDate;
    private String goalColor;
    private List<CheckpointItem> checkpoints;

    /** ジャンルのid(未選択はnull)。共有されたイベントでは他人のジャンルなので設定しない。 */
    private Long genreId;

    /** 状態の手動指定(planned / progress / done)。nullなら日付から自動算出する。 */
    private String status;

    /**
     * 自分が所有するイベント(GET /api/events)ではnull。
     * 他ユーザーから共有されたイベント(GET /api/events/shared)では、共有元のユーザー名が入る。
     */
    private String ownerUsername;
}
