package co.jp.mkssj.eventplanner.controller;

import co.jp.mkssj.eventplanner.dto.ActualDto;
import co.jp.mkssj.eventplanner.dto.ActualUpsertRequest;
import co.jp.mkssj.eventplanner.entity.Event;
import co.jp.mkssj.eventplanner.entity.EventActual;
import co.jp.mkssj.eventplanner.repository.EventActualRepository;
import co.jp.mkssj.eventplanner.repository.EventRepository;
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

import java.util.List;

/**
 * 実績(イベントごと・日付ごとの作業時間)API。時間は「分」で受け渡しする。JwtAuthFilterにより認証必須。
 *
 * GET    /api/actuals        自分の全実績(年をまたいで全件。ジャンル指定済みイベントのものだけ)
 * PUT    /api/actuals        保存(idなし=新しい1件を追加。同じ日に何件でも可 / idあり=その1件を更新。idありでminutesが0ならその1件を削除)
 * DELETE /api/actuals/{id}   削除
 */
@RestController
@RequestMapping("/api/actuals")
@RequiredArgsConstructor
public class ActualController {

    private final EventActualRepository actualRepository;
    private final EventRepository eventRepository;

    @GetMapping
    public List<ActualDto> list(HttpServletRequest request) {
        return actualRepository.findAllByUser(currentUserId(request));
    }

    @PutMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void upsert(@RequestBody @Valid ActualUpsertRequest body, HttpServletRequest request) {
        Long userId = currentUserId(request);
        Event event = eventRepository.findById(body.getEventId())
                .filter(e -> e.getUserId().equals(userId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "指定されたイベントが見つかりません: id=" + body.getEventId()));
        if (event.getGenreId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ジャンルが未選択のイベントには実績を入力できません");
        }

        EventActual actual;
        if (body.getId() == null) {
            // idなし = 新しい1件として追加(同じ日に何件あってもよい)
            if (body.getMinutes() <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "時間を入力してください");
            }
            actual = new EventActual();
        } else {
            // idあり = 既存の1件の更新(自分のイベントの実績だけ)。minutesが0ならその1件を削除する
            actual = actualRepository.findById(body.getId())
                    .filter(a -> eventRepository.findById(a.getEventId())
                            .map(e -> e.getUserId().equals(userId))
                            .orElse(false))
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "指定された実績が見つかりません: id=" + body.getId()));
            if (body.getMinutes() <= 0) {
                actualRepository.delete(actual);
                return;
            }
        }
        actual.setEventId(event.getId());
        actual.setWorkDate(body.getWorkDate());
        actual.setMinutes(body.getMinutes());
        actual.setNote(body.getNote() != null ? body.getNote().trim() : "");
        actualRepository.save(actual);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, HttpServletRequest request) {
        Long userId = currentUserId(request);
        EventActual actual = actualRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "指定された実績が見つかりません: id=" + id));
        // 他人のイベントの実績は404扱い
        boolean owned = eventRepository.findById(actual.getEventId())
                .map(e -> e.getUserId().equals(userId))
                .orElse(false);
        if (!owned) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "指定された実績が見つかりません: id=" + id);
        }
        actualRepository.delete(actual);
    }

    private Long currentUserId(HttpServletRequest request) {
        Object userId = request.getAttribute("userId");
        if (!(userId instanceof Long)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "認証が必要です");
        }
        return (Long) userId;
    }
}
