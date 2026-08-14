package co.jp.mkssj.eventplanner.controller;

import co.jp.mkssj.eventplanner.dto.CheckpointItem;
import co.jp.mkssj.eventplanner.dto.EventDto;
import co.jp.mkssj.eventplanner.dto.EventUpsertRequest;
import co.jp.mkssj.eventplanner.entity.Event;
import co.jp.mkssj.eventplanner.repository.EventRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.TransientDataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.Year;
import java.util.List;

/**
 * 年間イベント計画のCRUD API。
 * JwtAuthFilter によりこの下は全て認証必須(未認証は401)。
 * イベントはログイン中のユーザー(request属性 "userId")の分のみ操作できる。
 *
 * 例:
 * GET    /api/events?year=2026
 * POST   /api/events
 * PUT    /api/events/{id}
 * DELETE /api/events/{id}
 */
@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class EventController {

    private final EventRepository eventRepository;

    @GetMapping
    public List<EventDto> list(@RequestParam(required = false) Integer year, HttpServletRequest request) {
        Long userId = currentUserId(request);
        int targetYear = year != null ? year : Year.now().getValue();
        return eventRepository.findByUserIdAndYearOrderByStartDateAscIdAsc(userId, targetYear).stream()
                .map(this::toDto)
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public EventDto create(@RequestBody @Valid EventUpsertRequest request, HttpServletRequest httpRequest) {
        Long userId = currentUserId(httpRequest);
        validateDateRange(request.getStartDate(), request.getEndDate());
        Event event = new Event();
        event.setUserId(userId);
        applyRequest(event, request);
        return toDto(saveWithRetry(event));
    }

    @PutMapping("/{id}")
    public EventDto update(@PathVariable Long id, @RequestBody @Valid EventUpsertRequest request,
                            HttpServletRequest httpRequest) {
        Long userId = currentUserId(httpRequest);
        validateDateRange(request.getStartDate(), request.getEndDate());
        Event event = findOwnedEvent(id, userId);
        applyRequest(event, request);
        return toDto(saveWithRetry(event));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, HttpServletRequest httpRequest) {
        Long userId = currentUserId(httpRequest);
        Event event = findOwnedEvent(id, userId);
        eventRepository.delete(event);
    }

    /**
     * JwtAuthFilterが認証済みリクエストにセットした userId を取り出す。
     * フィルタを通過している以上ここがnullになることは無いはずだが、念のため検査する。
     */
    private Long currentUserId(HttpServletRequest request) {
        Object userId = request.getAttribute("userId");
        if (!(userId instanceof Long)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "認証が必要です");
        }
        return (Long) userId;
    }

    /** 指定idのイベントを取得し、ログイン中ユーザーの所有物であることを検証する。他人のものは404扱い。 */
    private Event findOwnedEvent(Long id, Long userId) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "指定されたイベントが見つかりません: id=" + id));
        if (!event.getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "指定されたイベントが見つかりません: id=" + id);
        }
        return event;
    }

    /**
     * チェックポイントは毎回「全削除して全件作り直す」方式(Event.replaceCheckpoints)で保存しているため、
     * 同じイベントに対する更新リクエストがほぼ同時に重なる(例: バーをドラッグした直後にチェックポイントも
     * 操作する等)と、MySQL(InnoDB)側で event_checkpoint テーブルの削除→挿入がデッドロックすることがある。
     * これはアプリのバグではなくInnoDBの仕様上起こり得るものなので、MySQL公式ドキュメントの推奨どおり
     * 「デッドロックを検知したら短い待機を挟んでリトライする」方式で吸収する。
     */
    private static final int MAX_SAVE_RETRIES = 3;

    private Event saveWithRetry(Event event) {
        int attempt = 0;
        while (true) {
            try {
                return eventRepository.save(event);
            } catch (TransientDataAccessException ex) {
                attempt++;
                if (attempt >= MAX_SAVE_RETRIES) {
                    throw ex;
                }
                try {
                    Thread.sleep(50L * attempt);
                } catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();
                    throw ex;
                }
            }
        }
    }

    private void validateDateRange(LocalDate start, LocalDate end) {
        if (start.isAfter(end)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "開始日は終了日より前(または同じ日)にしてください");
        }
    }

    private void applyRequest(Event event, EventUpsertRequest request) {
        event.setYear(request.getYear());
        event.setName(request.getName());
        // JSONデシリアライズ時は @Builder.Default が効かずnullになり得るため、ここでも空文字にフォールバックする
        event.setOwner(request.getOwner() != null ? request.getOwner() : "");
        event.setColor(request.getColor());
        event.setStartDate(request.getStartDate());
        event.setEndDate(request.getEndDate());
        event.setGoalDate(request.getGoalDate());
        event.setGoalColor(
                request.getGoalColor() != null && !request.getGoalColor().isBlank() ? request.getGoalColor() : "#b3241c");
        event.replaceCheckpoints(request.getCheckpoints());
    }

    private EventDto toDto(Event event) {
        List<CheckpointItem> checkpointItems = event.getCheckpoints().stream()
                .map(cp -> CheckpointItem.builder()
                        .date(cp.getCheckpointDate())
                        .label(cp.getLabel())
                        .color(cp.getColor())
                        .build())
                .toList();
        return EventDto.builder()
                .id(event.getId())
                .year(event.getYear())
                .name(event.getName())
                .owner(event.getOwner())
                .color(event.getColor())
                .startDate(event.getStartDate())
                .endDate(event.getEndDate())
                .goalDate(event.getGoalDate())
                .goalColor(event.getGoalColor())
                .checkpoints(checkpointItems)
                .build();
    }
}
