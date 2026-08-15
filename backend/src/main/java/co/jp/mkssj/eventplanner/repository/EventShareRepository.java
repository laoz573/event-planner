package co.jp.mkssj.eventplanner.repository;

import co.jp.mkssj.eventplanner.entity.EventShare;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EventShareRepository extends JpaRepository<EventShare, Long> {
    List<EventShare> findByOwnerUserIdAndSharedWithUserId(Long ownerUserId, Long sharedWithUserId);

    void deleteByOwnerUserIdAndSharedWithUserId(Long ownerUserId, Long sharedWithUserId);
}
