package co.jp.mkssj.eventplanner.repository;

import co.jp.mkssj.eventplanner.entity.UserShare;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserShareRepository extends JpaRepository<UserShare, Long> {
    List<UserShare> findByOwnerUserId(Long ownerUserId);

    Optional<UserShare> findByOwnerUserIdAndSharedWithUserId(Long ownerUserId, Long sharedWithUserId);

    void deleteByOwnerUserIdAndSharedWithUserId(Long ownerUserId, Long sharedWithUserId);
}
