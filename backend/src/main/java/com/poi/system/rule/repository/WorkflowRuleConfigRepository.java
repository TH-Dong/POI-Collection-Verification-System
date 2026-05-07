package com.poi.system.rule.repository;

import com.poi.system.rule.entity.WorkflowRuleConfig;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkflowRuleConfigRepository extends JpaRepository<WorkflowRuleConfig, Long> {

    Optional<WorkflowRuleConfig> findByCode(String code);
}
