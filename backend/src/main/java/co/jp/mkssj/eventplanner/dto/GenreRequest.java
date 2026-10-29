package co.jp.mkssj.eventplanner.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** ジャンルの追加・名前変更リクエスト。 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class GenreRequest {

    @NotBlank(message = "ジャンル名を入力してください")
    @Size(max = 50, message = "ジャンル名は50文字以内で入力してください")
    private String name;
}
