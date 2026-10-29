package co.jp.mkssj.eventplanner.repository;

import co.jp.mkssj.eventplanner.dto.ActualDto;
import co.jp.mkssj.eventplanner.entity.EventActual;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface EventActualRepository extends JpaRepository<EventActual, Long> {

    /**
     * ユーザーの全実績(年をまたいで全件)。イベント名・色・ジャンルIDを付けて返す。
     * ジャンルが未選択のイベントの実績は含めない(実績タブはジャンルを選んだイベントだけが対象のため)。
     */
    @Query("SELECT new co.jp.mkssj.eventplanner.dto.ActualDto(a.id, a.eventId, e.name, e.color, e.genreId, a.workDate, a.minutes, a.note) "
            + "FROM EventActual a, Event e "
            + "WHERE e.id = a.eventId AND e.userId = :userId AND e.genreId IS NOT NULL "
            + "ORDER BY a.workDate ASC, a.id ASC")
    List<ActualDto> findAllByUser(@Param("userId") Long userId);

    @Modifying
    @Transactional
    void deleteByEventId(Long eventId);
}
