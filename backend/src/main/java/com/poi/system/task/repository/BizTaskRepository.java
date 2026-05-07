package com.poi.system.task.repository;

import com.poi.system.task.entity.BizTask;
import com.poi.system.task.enums.TaskStatus;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BizTaskRepository extends JpaRepository<BizTask, Long> {

    List<BizTask> findAllByOrderByUpdatedAtDesc();

    List<BizTask> findByAssigneeIdOrderByUpdatedAtDesc(Long assigneeId);

    List<BizTask> findByBizTypeAndBizIdAndStatusIn(String bizType, Long bizId, Collection<TaskStatus> statuses);
}
