package co.jp.mkssj.eventplanner.repository;

import co.jp.mkssj.eventplanner.entity.EventGenre;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EventGenreRepository extends JpaRepository<EventGenre, Long> {
    List<EventGenre> findByUserIdOrderBySortOrderAscIdAsc(Long userId);

    Optional<EventGenre> findByIdAndUserId(Long id, Long userId);

    /** 同じ名前のジャンルが既にあるか(自分自身のidは除く。新規作成時は存在しないid=0を渡す)。 */
    boolean existsByUserIdAndNameAndIdNot(Long userId, String name, Long id);

    /** 現在の並び順の最大値(1件も無い場合はnull)。新規追加時に末尾へ並べるために使う。 */
    @org.springframework.data.jpa.repository.Query("SELECT MAX(g.sortOrder) FROM EventGenre g WHERE g.userId = :userId")
    Integer findMaxSortOrder(@org.springframework.data.repository.query.Param("userId") Long userId);
}
