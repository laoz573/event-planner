package co.jp.mkssj.eventplanner.controller;

import co.jp.mkssj.eventplanner.dto.ShareSettingDto;
import co.jp.mkssj.eventplanner.dto.ShareUpsertRequest;
import co.jp.mkssj.eventplanner.entity.AppUser;
import co.jp.mkssj.eventplanner.entity.Event;
import co.jp.mkssj.eventplanner.entity.EventShare;
import co.jp.mkssj.eventplanner.entity.UserShare;
import co.jp.mkssj.eventplanner.repository.AppUserRepository;
import co.jp.mkssj.eventplanner.repository.EventRepository;
import co.jp.mkssj.eventplanner.repository.EventShareRepository;
import co.jp.mkssj.eventplanner.repository.UserShareRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * 「自分のイベントを他の既存ユーザーに共有する」設定のAPI。
 * JwtAuthFilterによりこの下は全て認証必須(/api/shares/* をFilterConfigに追加済み)。
 *
 * 共有の管理(shareAllの切り替え・個別イベント選択の変更・解除)は共有した側(owner)だけが行える。
 * 共有される側は読み取り専用で、GET /api/events/shared から見るだけになる
 * (EventController#findOwnedEventは共有先ユーザーからのPUT/DELETEを404にするため、
 *  そもそも編集APIを叩いても弾かれる = 閲覧専用が担保される)。
 */
@RestController
@RequestMapping("/api/shares")
@RequiredArgsConstructor
public class ShareController {

    private final UserShareRepository userShareRepository;
    private final EventShareRepository eventShareRepository;
    private final EventRepository eventRepository;
    private final AppUserRepository appUserRepository;

    /** 自分(ログイン中のユーザー)が他の誰にどう共有しているかの一覧。 */
    @GetMapping
    public List<ShareSettingDto> list(HttpServletRequest request) {
        Long userId = currentUserId(request);
        return userShareRepository.findByOwnerUserId(userId).stream()
                .map(us -> toDto(us, userId))
                .toList();
    }

    /** 指定ユーザーへの共有設定を作成・更新する(既に設定があれば上書き)。 */
    @PutMapping("/{sharedWithUserId}")
    public ShareSettingDto upsert(@PathVariable Long sharedWithUserId,
                                   @RequestBody @Valid ShareUpsertRequest request,
                                   HttpServletRequest httpRequest) {
        Long userId = currentUserId(httpRequest);
        if (sharedWithUserId.equals(userId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "自分自身とは共有できません");
        }
        appUserRepository.findById(sharedWithUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "指定されたユーザーが見つかりません"));

        UserShare userShare = userShareRepository.findByOwnerUserIdAndSharedWithUserId(userId, sharedWithUserId)
                .orElseGet(() -> {
                    UserShare created = new UserShare();
                    created.setOwnerUserId(userId);
                    created.setSharedWithUserId(sharedWithUserId);
                    return created;
                });
        userShare.setShareAll(request.isShareAll());
        userShareRepository.save(userShare);

        // 個別イベント選択は、常に「送られてきたリストで全差し替え」する方針
        // (EventController#applyRequestのcheckpoints更新と同じ考え方)。shareAll=trueのときは無視する。
        eventShareRepository.deleteByOwnerUserIdAndSharedWithUserId(userId, sharedWithUserId);
        if (!request.isShareAll() && request.getEventIds() != null && !request.getEventIds().isEmpty()) {
            Set<Long> requestedIds = new HashSet<>(request.getEventIds());
            List<Event> ownedEvents = eventRepository.findAllById(requestedIds).stream()
                    .filter(e -> e.getUserId().equals(userId))
                    .toList();
            for (Event event : ownedEvents) {
                EventShare share = new EventShare();
                share.setEventId(event.getId());
                share.setOwnerUserId(userId);
                share.setSharedWithUserId(sharedWithUserId);
                eventShareRepository.save(share);
            }
        }

        return toDto(userShare, userId);
    }

    /** 指定ユーザーへの共有を完全に解除する(shareAll・個別選択のどちらも消える)。 */
    @DeleteMapping("/{sharedWithUserId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long sharedWithUserId, HttpServletRequest httpRequest) {
        Long userId = currentUserId(httpRequest);
        eventShareRepository.deleteByOwnerUserIdAndSharedWithUserId(userId, sharedWithUserId);
        userShareRepository.deleteByOwnerUserIdAndSharedWithUserId(userId, sharedWithUserId);
    }

    private Long currentUserId(HttpServletRequest request) {
        Object userId = request.getAttribute("userId");
        if (!(userId instanceof Long)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "認証が必要です");
        }
        return (Long) userId;
    }

    private ShareSettingDto toDto(UserShare userShare, Long ownerUserId) {
        String username = appUserRepository.findById(userShare.getSharedWithUserId())
                .map(AppUser::getUsername)
                .orElse("(削除済みユーザー)");
        List<Long> eventIds = userShare.isShareAll()
                ? List.of()
                : eventShareRepository.findByOwnerUserIdAndSharedWithUserId(ownerUserId, userShare.getSharedWithUserId())
                        .stream().map(EventShare::getEventId).toList();
        return ShareSettingDto.builder()
                .sharedWithUserId(userShare.getSharedWithUserId())
                .sharedWithUsername(username)
                .shareAll(userShare.isShareAll())
                .eventIds(eventIds)
                .build();
    }
}
