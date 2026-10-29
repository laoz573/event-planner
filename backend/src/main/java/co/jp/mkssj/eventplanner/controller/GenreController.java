package co.jp.mkssj.eventplanner.controller;

import co.jp.mkssj.eventplanner.dto.GenreDto;
import co.jp.mkssj.eventplanner.dto.GenreRequest;
import co.jp.mkssj.eventplanner.entity.EventGenre;
import co.jp.mkssj.eventplanner.repository.EventGenreRepository;
import co.jp.mkssj.eventplanner.repository.EventRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * イベントのジャンル管理API(設定タブから使う)。JwtAuthFilterにより認証必須。
 *
 * GET    /api/genres        自分のジャンル一覧
 * POST   /api/genres        追加
 * PUT    /api/genres/{id}   名前の変更
 * DELETE /api/genres/{id}   削除(そのジャンルを選んでいたイベントは「未選択」に戻る)
 */
@RestController
@RequestMapping("/api/genres")
@RequiredArgsConstructor
public class GenreController {

    private final EventGenreRepository genreRepository;
    private final EventRepository eventRepository;

    @GetMapping
    public List<GenreDto> list(HttpServletRequest request) {
        Long userId = currentUserId(request);
        return genreRepository.findByUserIdOrderBySortOrderAscIdAsc(userId).stream().map(this::toDto).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public GenreDto create(@RequestBody @Valid GenreRequest body, HttpServletRequest request) {
        Long userId = currentUserId(request);
        String name = body.getName().trim();
        requireNameAvailable(userId, name, 0L);
        EventGenre genre = new EventGenre();
        genre.setUserId(userId);
        genre.setName(name);
        Integer max = genreRepository.findMaxSortOrder(userId);
        genre.setSortOrder(max == null ? 1 : max + 1);
        return toDto(genreRepository.save(genre));
    }

    @PutMapping("/{id}")
    public GenreDto rename(@PathVariable Long id, @RequestBody @Valid GenreRequest body, HttpServletRequest request) {
        Long userId = currentUserId(request);
        String name = body.getName().trim();
        EventGenre genre = findOwned(id, userId);
        requireNameAvailable(userId, name, id);
        genre.setName(name);
        return toDto(genreRepository.save(genre));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void delete(@PathVariable Long id, HttpServletRequest request) {
        Long userId = currentUserId(request);
        EventGenre genre = findOwned(id, userId);
        // DB側のFK(ON DELETE SET NULL)にも頼れるが、テスト用のH2(FKなし)でも同じ動きになるよう、
        // このジャンルを選んでいたイベントは明示的に未選択へ戻す。
        eventRepository.clearGenre(userId, id);
        genreRepository.delete(genre);
    }

    private void requireNameAvailable(Long userId, String name, Long excludeId) {
        if (name.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ジャンル名を入力してください");
        }
        if (genreRepository.existsByUserIdAndNameAndIdNot(userId, name, excludeId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "同じ名前のジャンルが既にあります");
        }
    }

    private EventGenre findOwned(Long id, Long userId) {
        return genreRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "指定されたジャンルが見つかりません: id=" + id));
    }

    private GenreDto toDto(EventGenre genre) {
        return new GenreDto(genre.getId(), genre.getName());
    }

    private Long currentUserId(HttpServletRequest request) {
        Object userId = request.getAttribute("userId");
        if (!(userId instanceof Long)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "認証が必要です");
        }
        return (Long) userId;
    }
}
