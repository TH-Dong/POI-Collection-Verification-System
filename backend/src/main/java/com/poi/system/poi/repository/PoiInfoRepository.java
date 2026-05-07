package com.poi.system.poi.repository;

import com.poi.system.poi.entity.PoiInfo;
import com.poi.system.poi.enums.PoiStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PoiInfoRepository extends JpaRepository<PoiInfo, Long> {

    List<PoiInfo> findByCollectorIdOrderByUpdatedAtDesc(Long collectorId);

    Optional<PoiInfo> findByIdAndCollectorId(Long id, Long collectorId);

    List<PoiInfo> findAllByOrderByUpdatedAtDesc();

    List<PoiInfo> findByStatusInOrderByUpdatedAtDesc(List<PoiStatus> statuses);
}
