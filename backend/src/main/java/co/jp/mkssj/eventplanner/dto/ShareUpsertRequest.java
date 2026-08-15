package co.jp.mkssj.eventplanner.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

/**
 * 共有設定の作成・更新リクエスト。
 * shareAll=trueの場合はeventIdsを無視する(全イベントが対象になるため)。
 * shareAll=falseの場合、eventIdsで指定したイベントのみが共有対象になる
 * (送られてきたリストで全差し替えする。EventUpsertRequest.checkpointsと同じ方針)。
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShareUpsertRequest {

    private boolean shareAll;

    @Builder.Default
    private List<Long> eventIds = new ArrayList<>();
}
