package com.poi.system.dispute.repository;

import com.poi.system.dispute.entity.PoiDisputeComment;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PoiDisputeCommentRepository extends JpaRepository<PoiDisputeComment, Long> {

    List<PoiDisputeComment> findByDisputeIdOrderByCreatedAtAsc(Long disputeId);
}
