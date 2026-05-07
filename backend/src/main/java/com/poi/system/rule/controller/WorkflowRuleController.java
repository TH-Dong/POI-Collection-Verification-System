package com.poi.system.rule.controller;

import com.poi.system.common.api.ApiResponse;
import com.poi.system.rule.dto.UpdateWorkflowRuleRequest;
import com.poi.system.rule.dto.WorkflowRuleResponse;
import com.poi.system.rule.service.WorkflowRuleService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/admin/workflow-rules")
@PreAuthorize("hasRole('ADMIN')")
public class WorkflowRuleController {

    private final WorkflowRuleService workflowRuleService;

    @GetMapping
    public ApiResponse<List<WorkflowRuleResponse>> listAll() {
        return ApiResponse.success(workflowRuleService.listAll());
    }

    @PutMapping("/{id}")
    public ApiResponse<WorkflowRuleResponse> update(@PathVariable Long id, @Valid @RequestBody UpdateWorkflowRuleRequest request) {
        return ApiResponse.success(workflowRuleService.update(id, request));
    }
}
