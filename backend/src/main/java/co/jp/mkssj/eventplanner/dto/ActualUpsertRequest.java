package co.jp.mkssj.eventplanner.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

/** 実績の保存リクエスト。同じイベント・同じ日付は上書きし、minutesが0なら削除する。 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ActualUpsertRequest {

    /**
     * 既存の1件を直すときのid。未指定(null)なら新しい1件として追加する
     * (同じイベント・同じ日付でも、小分けに何件でも入力できる)。
     */
    private Long id;

    @NotNull
    private Long eventId;

    @NotNull
    private LocalDate workDate;

    /** 作業時間(分)。1イベント・1日あたり24時間まで。 */
    @NotNull
    @Min(value = 0, message = "時間は0以上で入力してください")
    @Max(value = 24 * 60, message = "時間は24時間以内で入力してください")
    private Integer minutes;

    /** 備考(任意)。未指定(null)は空文字として保存する。 */
    @Size(max = 200, message = "備考は200文字以内で入力してください")
    private String note;
}
