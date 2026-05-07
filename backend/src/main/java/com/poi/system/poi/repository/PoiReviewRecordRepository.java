package com.poi.system.poi.repository;

import com.poi.system.poi.entity.PoiReviewRecord;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PoiReviewRecordRepository extends JpaRepository<PoiReviewRecord, Long> {

    List<PoiReviewRecord> findByPoiIdOrderByCreatedAtDesc(Long poiId);

    List<PoiReviewRecord> findByPoiIdInOrderByCreatedAtDesc(List<Long> poiIds);

    long countByPoiId(Long poiId);

    Optional<PoiReviewRecord> findFirstByPoiIdOrderByCreatedAtDesc(Long poiId);
}
