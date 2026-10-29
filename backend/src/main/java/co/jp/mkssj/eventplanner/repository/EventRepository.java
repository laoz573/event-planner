package co.jp.mkssj.eventplanner.repository;

import co.jp.mkssj.eventplanner.entity.Event;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface EventRepository extends JpaRepository<Event, Long> {
    List<Event> findByUserIdAndYearOrderByStartDateAscIdAsc(Long userId, Integer year);

    /**
     * userIdに対して他のユーザーから共有されているイベント(指定の年のみ)を返す。
     * 対象は次のいずれか: (a) イベント所有者がuserIdに対してshareAll=trueで共有している、
     * または (b) EventShareで個別にuserIdへ共有されている。
     * 自分自身のイベントは対象外(user_id <> :userId)。
     */
    @Query("SELECT e FROM Event e WHERE e.year = :year AND e.userId <> :userId AND ("
            + "e.userId IN (SELECT us.ownerUserId FROM UserShare us WHERE us.sharedWithUserId = :userId AND us.shareAll = true) "
            + "OR e.id IN (SELECT es.eventId FROM EventShare es WHERE es.sharedWithUserId = :userId)"
            + ") ORDER BY e.startDate ASC, e.id ASC")
    List<Event> findSharedWithUser(@Param("userId") Long userId, @Param("year") Integer year);

    /** ジャンル削除時に、そのジャンルを選んでいたイベントを「未選択」(null)へ戻す。 */
    @Modifying(clearAutomatically = true)
    @Transactional
    @Query("UPDATE Event e SET e.genreId = null WHERE e.userId = :userId AND e.genreId = :genreId")
    void clearGenre(@Param("userId") Long userId, @Param("genreId") Long genreId);
}
