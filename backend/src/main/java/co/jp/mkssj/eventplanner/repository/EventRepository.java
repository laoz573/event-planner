package co.jp.mkssj.eventplanner.repository;

import co.jp.mkssj.eventplanner.entity.Event;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EventRepository extends JpaRepository<Event, Long> {
    List<Event> findByUserIdAndYearOrderByStartDateAscIdAsc(Long userId, Integer year);
}
