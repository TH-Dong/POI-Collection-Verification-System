package com.poi.system.report.controller;

import com.poi.system.report.service.ReportService;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/admin/reports")
@PreAuthorize("hasRole('ADMIN')")
public class ReportController {

    private final ReportService reportService;

    @GetMapping(value = "/pois.csv", produces = "text/csv")
    public ResponseEntity<Resource> exportPois() {
        return buildCsvResponse("poi-report-" + LocalDate.now() + ".csv", reportService.exportPoiCsv());
    }

    @GetMapping(value = "/audit.csv", produces = "text/csv")
    public ResponseEntity<Resource> exportAudit() {
        return buildCsvResponse("audit-report-" + LocalDate.now() + ".csv", reportService.exportAuditCsv());
    }

    @GetMapping(value = "/users.csv", produces = "text/csv")
    public ResponseEntity<Resource> exportUsers() {
        return buildCsvResponse("user-report-" + LocalDate.now() + ".csv", reportService.exportUserCsv());
    }

    private ResponseEntity<Resource> buildCsvResponse(String filename, Resource resource) {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(resource);
    }
}
