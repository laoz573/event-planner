package co.jp.mkssj.eventplanner.repository;

import co.jp.mkssj.eventplanner.entity.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {
    Optional<AppUser> findByUsername(String username);

    boolean existsByUsername(String username);

    /** イベント共有の相手を選ぶ画面向けに、自分以外の既存ユーザーをユーザー名順で返す。 */
    List<AppUser> findByIdNotOrderByUsernameAsc(Long id);
}
