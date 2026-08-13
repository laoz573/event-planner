package co.jp.mkssj.eventplanner.controller;

import co.jp.mkssj.eventplanner.dto.EventDto;
import co.jp.mkssj.eventplanner.dto.EventUpsertRequest;
import co.jp.mkssj.eventplanner.entity.Event;
import co.jp.mkssj.eventplanner.entity.EventCheckpoint;
import co.jp.mkssj.eventplanner.repository.EventRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
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
        return toDto(eventRepository.save(event));
    }

    @PutMapping("/{id}")
    public EventDto update(@PathVariable Long id, @RequestBody @Valid EventUpsertRequest request,
                            HttpServletRequest httpRequest) {
        Long userId = currentUserId(httpRequest);
        validateDateRange(request.getStartDate(), request.getEndDate());
        Event event = findOwnedEvent(id, userId);
        applyRequest(event, request);
        return toDto(eventRepository.save(event));
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
        event.replaceCheckpoints(request.getCheckpoints());
    }

    private EventDto toDto(Event event) {
        List<LocalDate> checkpointDates = event.getCheckpoints().stream()
                .map(EventCheckpoint::getCheckpointDate)
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
                .checkpoints(checkpointDates)
                .build();
    }
}
