package co.jp.mkssj.eventplanner.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

/**
 * チェックポイント1件分(日付 + 任意の内容メモ)。
 * 例: 「50%の問題集完了」のように、そのチェックポイントで何をするか/したかを自由入力できる。
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckpointItem {

    @NotNull
    private LocalDate date;

    /** 未入力の場合は空文字として保存する。 */
    @Builder.Default
    @Size(max = 200, message = "チェックポイントの内容は200文字以内で入力してください")
    private String label = "";

    /**
     * チェックポイント(△)の色(#rrggbb)。未指定(null)の場合はサーバー側でデフォルト色にフォールバックする。
     * JSONデシリアライズ時は @Builder.Default が効かないため、null許容にしてコントローラー側でフォールバックする
     * (owner列と同じ方針)。@NotBlankは付けず、値がある場合のみ形式をチェックする。
     */
    @Builder.Default
    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "色は#rrggbb形式で指定してください")
    private String color = "#1c1a17";
}
