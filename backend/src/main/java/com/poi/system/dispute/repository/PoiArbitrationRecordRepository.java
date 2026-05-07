package com.poi.system.dispute.repository;

import com.poi.system.dispute.entity.PoiArbitrationRecord;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PoiArbitrationRecordRepository extends JpaRepository<PoiArbitrationRecord, Long> {

    Optional<PoiArbitrationRecord> findByDisputeId(Long disputeId);
}
