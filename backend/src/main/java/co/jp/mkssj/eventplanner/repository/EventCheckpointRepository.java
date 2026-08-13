package co.jp.mkssj.eventplanner.repository;

import co.jp.mkssj.eventplanner.entity.EventCheckpoint;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 通常はEventのcascade(ALL)+orphanRemoval経由で操作されるため、
 * EventControllerから直接使うことはないが、他のマスタ系リポジトリ同様
 * エンティティ1つにつき1つのリポジトリを揃えておく。
 */
public interface EventCheckpointRepository extends JpaRepository<EventCheckpoint, Long> {
}
