package co.jp.mkssj.eventplanner.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

/**
 * 自分(ログイン中のユーザー)が誰にどう共有しているかを表す1件分。
 * shareAll=trueのときeventIdsは空リスト(全イベントが対象なので個別指定は意味を持たない)。
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShareSettingDto {
    private Long sharedWithUserId;
    private String sharedWithUsername;
    private boolean shareAll;
    private List<Long> eventIds;
}
