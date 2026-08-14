package co.jp.mkssj.eventplanner.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * イベントの作成・更新リクエスト。
 * チェックポイントは常に全件をリストで送り、サーバー側で全差し替えする
 * (行の追加・削除・並び替えをフロント側で自由に行えるようにするため)。
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventUpsertRequest {

    @NotNull
    private Integer year;

    @NotBlank
    @Size(max = 100)
    private String name;

    /** 担当(自由入力)。未入力の場合は空文字として保存する。 */
    @Builder.Default
    @Size(max = 50, message = "担当は50文字以内で入力してください")
    private String owner = "";

    @NotBlank
    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "色は#rrggbb形式で指定してください")
    private String color;

    @NotNull
    private LocalDate startDate;

    @NotNull
    private LocalDate endDate;

    /** ゴールを設定しない場合は null */
    private LocalDate goalDate;

    /** ゴール(■)の色(#rrggbb)。未指定(null)の場合はサーバー側でデフォルト色にフォールバックする。 */
    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "色は#rrggbb形式で指定してください")
    private String goalColor;

    @Builder.Default
    private List<@NotNull @Valid CheckpointItem> checkpoints = new ArrayList<>();
}
