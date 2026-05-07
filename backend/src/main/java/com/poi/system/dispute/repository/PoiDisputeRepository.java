package com.poi.system.dispute.repository;

import com.poi.system.dispute.entity.PoiDispute;
import com.poi.system.dispute.enums.DisputeStatus;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PoiDisputeRepository extends JpaRepository<PoiDispute, Long> {

    Optional<PoiDispute> findFirstByPoiIdAndStatusIn(Long poiId, Collection<DisputeStatus> statuses);

    List<PoiDispute> findByInitiatorIdOrderByUpdatedAtDesc(Long initiatorId);

    List<PoiDispute> findAllByOrderByUpdatedAtDesc();
}
