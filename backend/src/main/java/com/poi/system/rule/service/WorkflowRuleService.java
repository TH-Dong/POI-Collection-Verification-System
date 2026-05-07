package com.poi.system.rule.service;

import com.poi.system.common.exception.BusinessException;
import com.poi.system.rule.dto.UpdateWorkflowRuleRequest;
import com.poi.system.rule.dto.WorkflowRuleResponse;
import com.poi.system.rule.entity.WorkflowRuleConfig;
import com.poi.system.rule.repository.WorkflowRuleConfigRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class WorkflowRuleService {

    public static final String VERIFY_TASK_DUE_HOURS = "VERIFY_TASK_DUE_HOURS";
    public static final String DISPUTE_TASK_DUE_HOURS = "DISPUTE_TASK_DUE_HOURS";
    public static final String ARBITRATION_TASK_DUE_HOURS = "ARBITRATION_TASK_DUE_HOURS";
    public static final String TASK_AUTO_ASSIGN_ENABLED = "TASK_AUTO_ASSIGN_ENABLED";

    private final WorkflowRuleConfigRepository workflowRuleConfigRepository;

    @Transactional(readOnly = true)
    public List<WorkflowRuleResponse> listAll() {
        return workflowRuleConfigRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public WorkflowRuleResponse update(Long id, UpdateWorkflowRuleRequest request) {
        WorkflowRuleConfig rule = workflowRuleConfigRepository.findById(id)
                .orElseThrow(() -> new BusinessException("RULE_404", "workflow rule not found", HttpStatus.NOT_FOUND));
        rule.setConfigValue(normalizeRequiredText(request.configValue()));
        rule.setActive(request.active() == null || request.active());
        return toResponse(workflowRuleConfigRepository.save(rule));
    }

    @Transactional
    public void ensureSeedRule(String code, String name, String value, String description) {
        workflowRuleConfigRepository.findByCode(code).orElseGet(() -> workflowRuleConfigRepository.save(WorkflowRuleConfig.builder()
                .code(code)
                .name(name)
                .configValue(value)
                .description(description)
                .active(true)
                .build()));
    }

    @Transactional(readOnly = true)
    public int getIntValue(String code, int defaultValue) {
        return workflowRuleConfigRepository.findByCode(code)
                .filter(WorkflowRuleConfig::isActive)
                .map(WorkflowRuleConfig::getConfigValue)
                .map(value -> {
                    try {
                        return Integer.parseInt(value.trim());
                    } catch (NumberFormatException ex) {
                        return defaultValue;
                    }
                })
                .orElse(defaultValue);
    }

    @Transactional(readOnly = true)
    public boolean getBooleanValue(String code, boolean defaultValue) {
        return workflowRuleConfigRepository.findByCode(code)
                .filter(WorkflowRuleConfig::isActive)
                .map(WorkflowRuleConfig::getConfigValue)
                .map(value -> "true".equalsIgnoreCase(value.trim()) || "1".equals(value.trim()))
                .orElse(defaultValue);
    }

    private String normalizeRequiredText(String value) {
        if (value == null || value.trim().isEmpty()) {
            throw new BusinessException("RULE_001", "configValue is required");
        }
        return value.trim();
    }

    private WorkflowRuleResponse toResponse(WorkflowRuleConfig rule) {
        return new WorkflowRuleResponse(
                rule.getId(),
                rule.getCode(),
                rule.getName(),
                rule.getConfigValue(),
                rule.getDescription(),
                rule.isActive()
        );
    }
}
