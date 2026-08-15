package co.jp.mkssj.eventplanner.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** イベント共有の相手を選ぶ画面向けの、他ユーザーの最低限の情報(パスワード等は含まない)。 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSummaryDto {
    private Long id;
    private String username;
}
