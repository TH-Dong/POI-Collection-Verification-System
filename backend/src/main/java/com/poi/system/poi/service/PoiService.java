package com.poi.system.poi.service;

import com.poi.system.audit.service.AuditLogService;
import com.poi.system.common.exception.BusinessException;
import com.poi.system.dictionary.enums.SystemDictType;
import com.poi.system.dictionary.service.SystemDictService;
import com.poi.system.notice.dto.BusinessNoticeEvent;
import com.poi.system.notice.enums.NoticeType;
import com.poi.system.notice.service.BusinessNoticePublisher;
import com.poi.system.poi.dto.PoiCategoryResponse;
import com.poi.system.poi.dto.PoiDetailResponse;
import com.poi.system.poi.dto.PoiReviewRecordResponse;
import com.poi.system.poi.dto.PoiReviewRequest;
import com.poi.system.poi.dto.PoiSummaryResponse;
import com.poi.system.poi.dto.PoiUpsertRequest;
import com.poi.system.poi.entity.PoiInfo;
import com.poi.system.poi.entity.PoiReviewRecord;
import com.poi.system.poi.enums.PoiReviewDecision;
import com.poi.system.poi.enums.PoiStatus;
import com.poi.system.poi.repository.PoiInfoRepository;
import com.poi.system.poi.repository.PoiReviewRecordRepository;
import com.poi.system.task.enums.TaskStatus;
import com.poi.system.task.service.TaskService;
import com.poi.system.user.entity.SysUser;
import com.poi.system.user.repository.SysUserRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PoiService {

    private final PoiInfoRepository poiInfoRepository;
    private final PoiReviewRecordRepository poiReviewRecordRepository;
    private final SysUserRepository userRepository;
    private final SystemDictService systemDictService;
    private final TaskService taskService;
    private final BusinessNoticePublisher businessNoticePublisher;
    private final AuditLogService auditLogService;

    public List<PoiCategoryResponse> listCategories() {
        return systemDictService.listActive(SystemDictType.POI_CATEGORY).stream()
                .map(item -> new PoiCategoryResponse(item.itemCode(), item.itemName()))
                .toList();
    }

    @Transactional
    public PoiDetailResponse createPoi(Long collectorId, PoiUpsertRequest request) {
        SysUser collector = loadUser(collectorId);
        PoiStatus targetStatus = resolveCreateStatus(request.status());
        validateRequest(request, targetStatus);

        PoiInfo poi = PoiInfo.builder()
                .poiName(request.poiName().trim())
                .categoryCode(normalizeCategory(request.categoryCode()))
                .description(normalizeText(request.description()))
                .coverImageObjectName(normalizeText(request.coverImageObjectName()))
                .coverImageUrl(normalizeText(request.coverImageUrl()))
                .longitude(request.longitude())
                .latitude(request.latitude())
                .addressText(normalizeText(request.addressText()))
                .ocrText(normalizeText(request.ocrText()))
                .ocrConfidence(request.ocrConfidence())
                .ocrProvider(normalizeText(request.ocrProvider()))
                .status(targetStatus)
                .submittedAt(isSubmittedState(targetStatus) ? Instant.now() : null)
                .collector(collector)
                .build();

        PoiInfo savedPoi = poiInfoRepository.save(poi);
        if (isSubmittedState(targetStatus)) {
            taskService.assignVerifyTaskForPoi(savedPoi);
        }
        auditLogService.recordOperation(collectorId, "POI", savedPoi.getId(), "POI_CREATE", "创建 POI：" + savedPoi.getPoiName() + "，状态：" + savedPoi.getStatus().name());
        return toDetail(savedPoi, List.of());
    }

    @Transactional
    public PoiDetailResponse updatePoi(Long collectorId, Long poiId, PoiUpsertRequest request) {
        PoiInfo poi = poiInfoRepository.findByIdAndCollectorId(poiId, collectorId)
                .orElseThrow(() -> new BusinessException("POI_404", "poi not found", HttpStatus.NOT_FOUND));

        PoiStatus targetStatus = resolveCollectorUpdateStatus(poi, request.status());
        validateRequest(request, targetStatus);

        poi.setPoiName(request.poiName().trim());
        poi.setCategoryCode(normalizeCategory(request.categoryCode()));
        poi.setDescription(normalizeText(request.description()));
        poi.setCoverImageObjectName(normalizeText(request.coverImageObjectName()));
        poi.setCoverImageUrl(normalizeText(request.coverImageUrl()));
        poi.setLongitude(request.longitude());
        poi.setLatitude(request.latitude());
        poi.setAddressText(normalizeText(request.addressText()));
        poi.setOcrText(normalizeText(request.ocrText()));
        poi.setOcrConfidence(request.ocrConfidence());
        poi.setOcrProvider(normalizeText(request.ocrProvider()));
        poi.setStatus(targetStatus);
        if (isSubmittedState(targetStatus)) {
            poi.setSubmittedAt(Instant.now());
        } else if (targetStatus == PoiStatus.DRAFT) {
            poi.setSubmittedAt(null);
        }

        PoiInfo savedPoi = poiInfoRepository.save(poi);
        if (isSubmittedState(targetStatus)) {
            taskService.assignVerifyTaskForPoi(savedPoi);
        }
        auditLogService.recordOperation(collectorId, "POI", savedPoi.getId(), "POI_UPDATE", "更新 POI：" + savedPoi.getPoiName() + "，状态：" + savedPoi.getStatus().name());
        return toDetail(savedPoi, loadReviewRecords(savedPoi.getId()));
    }

    @Transactional(readOnly = true)
    public List<PoiSummaryResponse> listCollectorPois(Long collectorId) {
        return toSummaries(poiInfoRepository.findByCollectorIdOrderByUpdatedAtDesc(collectorId));
    }

    @Transactional(readOnly = true)
    public PoiDetailResponse getCollectorPoi(Long collectorId, Long poiId) {
        PoiInfo poi = poiInfoRepository.findByIdAndCollectorId(poiId, collectorId)
                .orElseThrow(() -> new BusinessException("POI_404", "poi not found", HttpStatus.NOT_FOUND));
        return toDetail(poi, loadReviewRecords(poiId));
    }

    @Transactional(readOnly = true)
    public List<PoiSummaryResponse> listVerifierPendingPois() {
        return toSummaries(poiInfoRepository.findByStatusInOrderByUpdatedAtDesc(List.of(PoiStatus.SUBMITTED, PoiStatus.RESUBMITTED)));
    }

    @Transactional
    public PoiDetailResponse reviewPoi(Long reviewerId, Long poiId, PoiReviewRequest request) {
        PoiInfo poi = poiInfoRepository.findById(poiId)
                .orElseThrow(() -> new BusinessException("POI_404", "poi not found", HttpStatus.NOT_FOUND));

        if (!isPendingReviewState(poi.getStatus())) {
            throw new BusinessException("POI_011", "poi is not waiting for review");
        }

        SysUser reviewer = loadUser(reviewerId);
        List<String> issues = normalizeReviewIssues(request.issueCodes());
        String reviewComment = normalizeText(request.reviewComment());
        validateReviewRequest(request.decision(), issues, reviewComment);

        PoiReviewRecord reviewRecord = PoiReviewRecord.builder()
                .poi(poi)
                .reviewer(reviewer)
                .round((int) poiReviewRecordRepository.countByPoiId(poiId) + 1)
                .decision(request.decision())
                .issueCodes(joinIssueCodes(issues))
                .reviewComment(reviewComment)
                .build();

        poi.setStatus(request.decision() == PoiReviewDecision.APPROVED ? PoiStatus.APPROVED : PoiStatus.REJECTED);
        poiInfoRepository.save(poi);
        poiReviewRecordRepository.save(reviewRecord);
        taskService.completePoiTasks(poiId, request.decision() == PoiReviewDecision.APPROVED ? TaskStatus.APPROVED : TaskStatus.REJECTED);
        publishReviewNotice(poi, reviewRecord);
        auditLogService.recordOperation(reviewerId, "POI", poiId, "POI_REVIEW", "核验结果：" + request.decision().name() + "，POI：" + poi.getPoiName());

        return toDetail(poi, loadReviewRecords(poiId));
    }

    @Transactional(readOnly = true)
    public List<PoiSummaryResponse> listAllPois() {
        return toSummaries(poiInfoRepository.findAllByOrderByUpdatedAtDesc());
    }

    @Transactional(readOnly = true)
    public PoiDetailResponse getPoiDetail(Long poiId) {
        PoiInfo poi = poiInfoRepository.findById(poiId)
                .orElseThrow(() -> new BusinessException("POI_404", "poi not found", HttpStatus.NOT_FOUND));
        return toDetail(poi, loadReviewRecords(poiId));
    }

    private SysUser loadUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("USER_404", "user not found", HttpStatus.NOT_FOUND));
    }

    private void validateRequest(PoiUpsertRequest request, PoiStatus targetStatus) {
        if (request.categoryCode() != null && !request.categoryCode().isBlank()) {
            normalizeCategory(request.categoryCode());
        }

        if (isSubmittedState(targetStatus)) {
            if (request.categoryCode() == null || request.categoryCode().isBlank()) {
                throw new BusinessException("POI_001", "category is required when submitting");
            }
            if (request.description() == null || request.description().isBlank()) {
                throw new BusinessException("POI_002", "description is required when submitting");
            }
            if (request.coverImageUrl() == null || request.coverImageUrl().isBlank()) {
                throw new BusinessException("POI_003", "coverImageUrl is required when submitting");
            }
            if (request.longitude() == null || request.latitude() == null) {
                throw new BusinessException("POI_004", "location is required when submitting");
            }
        }
    }

    private void validateReviewRequest(PoiReviewDecision decision, List<String> issues, String reviewComment) {
        if (decision == PoiReviewDecision.REJECTED) {
            if (issues.isEmpty()) {
                throw new BusinessException("POI_012", "at least one issue must be selected when rejecting");
            }
            if (reviewComment == null || reviewComment.isBlank()) {
                throw new BusinessException("POI_013", "review comment is required when rejecting");
            }
        }
    }

    private PoiStatus resolveCreateStatus(PoiStatus requestedStatus) {
        if (requestedStatus == PoiStatus.DRAFT || requestedStatus == PoiStatus.SUBMITTED) {
            return requestedStatus;
        }
        throw new BusinessException("POI_006", "collector cannot create poi with this status");
    }

    private PoiStatus resolveCollectorUpdateStatus(PoiInfo poi, PoiStatus requestedStatus) {
        return switch (poi.getStatus()) {
            case DRAFT -> resolveCreateStatus(requestedStatus);
            case REJECTED -> {
                if (requestedStatus == PoiStatus.SUBMITTED) {
                    yield PoiStatus.RESUBMITTED;
                }
                if (requestedStatus == PoiStatus.DRAFT) {
                    yield PoiStatus.REJECTED;
                }
                throw new BusinessException("POI_007", "invalid remediation status");
            }
            case SUBMITTED, RESUBMITTED -> throw new BusinessException("POI_008", "poi is already waiting for review");
            case APPROVED -> throw new BusinessException("POI_009", "approved poi cannot be edited");
            case DISPUTING, ARBITRATING, FINALIZED -> throw new BusinessException("POI_014", "poi is locked by dispute workflow");
        };
    }

    private boolean isSubmittedState(PoiStatus status) {
        return status == PoiStatus.SUBMITTED || status == PoiStatus.RESUBMITTED;
    }

    private boolean isPendingReviewState(PoiStatus status) {
        return status == PoiStatus.SUBMITTED || status == PoiStatus.RESUBMITTED;
    }

    private String normalizeCategory(String rawCategoryCode) {
        if (rawCategoryCode == null || rawCategoryCode.isBlank()) {
            return null;
        }
        String normalized = rawCategoryCode.trim().toUpperCase();
        systemDictService.requireActiveLabel(SystemDictType.POI_CATEGORY, normalized, "POI_005", "unsupported poi category");
        return normalized;
    }

    private String normalizeText(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private List<PoiSummaryResponse> toSummaries(List<PoiInfo> pois) {
        if (pois.isEmpty()) {
            return List.of();
        }

        Map<Long, List<PoiReviewRecord>> reviewMap = loadReviewMap(pois.stream().map(PoiInfo::getId).toList());
        return pois.stream()
                .map(poi -> toSummary(poi, reviewMap.getOrDefault(poi.getId(), List.of())))
                .toList();
    }

    private Map<Long, List<PoiReviewRecord>> loadReviewMap(List<Long> poiIds) {
        if (poiIds.isEmpty()) {
            return Map.of();
        }

        Map<Long, List<PoiReviewRecord>> reviewMap = new LinkedHashMap<>();
        for (PoiReviewRecord reviewRecord : poiReviewRecordRepository.findByPoiIdInOrderByCreatedAtDesc(poiIds)) {
            reviewMap.computeIfAbsent(reviewRecord.getPoi().getId(), key -> new ArrayList<>()).add(reviewRecord);
        }
        return reviewMap;
    }

    private List<PoiReviewRecord> loadReviewRecords(Long poiId) {
        return poiReviewRecordRepository.findByPoiIdOrderByCreatedAtDesc(poiId);
    }

    private PoiSummaryResponse toSummary(PoiInfo poi, List<PoiReviewRecord> reviewRecords) {
        String categoryName = resolveCategoryLabel(poi.getCategoryCode());
        PoiReviewRecord latestReview = reviewRecords.isEmpty() ? null : reviewRecords.get(0);
        List<String> latestIssueCodes = latestReview == null ? List.of() : extractIssueCodes(latestReview.getIssueCodes());
        return new PoiSummaryResponse(
                poi.getId(),
                poi.getPoiName(),
                poi.getCategoryCode(),
                categoryName,
                poi.getDescription(),
                poi.getCoverImageUrl(),
                poi.getStatus(),
                poi.getLongitude(),
                poi.getLatitude(),
                poi.getAddressText(),
                poi.getCollector().getId(),
                poi.getCollector().getRealName(),
                poi.getUpdatedAt(),
                poi.getSubmittedAt(),
                latestReview == null ? null : latestReview.getCreatedAt(),
                latestReview == null ? null : latestReview.getReviewer().getRealName(),
                latestReview == null ? null : latestReview.getReviewComment(),
                latestIssueCodes,
                toIssueLabels(latestIssueCodes),
                reviewRecords.size()
        );
    }

    private PoiDetailResponse toDetail(PoiInfo poi, List<PoiReviewRecord> reviewRecords) {
        String categoryName = resolveCategoryLabel(poi.getCategoryCode());
        PoiReviewRecord latestReview = reviewRecords.isEmpty() ? null : reviewRecords.get(0);
        List<String> latestIssueCodes = latestReview == null ? List.of() : extractIssueCodes(latestReview.getIssueCodes());
        return new PoiDetailResponse(
                poi.getId(),
                poi.getPoiName(),
                poi.getCategoryCode(),
                categoryName,
                poi.getDescription(),
                poi.getCoverImageObjectName(),
                poi.getCoverImageUrl(),
                poi.getLongitude(),
                poi.getLatitude(),
                poi.getAddressText(),
                poi.getOcrText(),
                poi.getOcrConfidence(),
                poi.getOcrProvider(),
                poi.getStatus(),
                poi.getCreatedAt(),
                poi.getUpdatedAt(),
                poi.getSubmittedAt(),
                poi.getCollector().getId(),
                poi.getCollector().getRealName(),
                latestReview == null ? null : latestReview.getCreatedAt(),
                latestReview == null ? null : latestReview.getReviewer().getRealName(),
                latestReview == null ? null : latestReview.getReviewComment(),
                latestIssueCodes,
                toIssueLabels(latestIssueCodes),
                reviewRecords.size(),
                reviewRecords.stream().map(this::toReviewRecord).toList()
        );
    }

    private PoiReviewRecordResponse toReviewRecord(PoiReviewRecord reviewRecord) {
        List<String> issueCodes = extractIssueCodes(reviewRecord.getIssueCodes());
        return new PoiReviewRecordResponse(
                reviewRecord.getId(),
                reviewRecord.getRound(),
                reviewRecord.getDecision(),
                reviewRecord.getReviewer().getRealName(),
                issueCodes,
                toIssueLabels(issueCodes),
                reviewRecord.getReviewComment(),
                reviewRecord.getCreatedAt()
        );
    }

    private List<String> normalizeReviewIssues(List<String> rawIssueCodes) {
        if (rawIssueCodes == null || rawIssueCodes.isEmpty()) {
            return List.of();
        }

        return rawIssueCodes.stream()
                .filter(code -> code != null && !code.isBlank())
                .map(String::trim)
                .map(String::toUpperCase)
                .distinct()
                .map(code -> {
                    systemDictService.requireActiveLabel(SystemDictType.REVIEW_ISSUE, code, "POI_010", "unsupported review issue");
                    return code;
                })
                .toList();
    }

    private String joinIssueCodes(List<String> issues) {
        if (issues.isEmpty()) {
            return null;
        }
        return issues.stream().reduce((left, right) -> left + "," + right).orElse(null);
    }

    private List<String> extractIssueCodes(String rawIssueCodes) {
        if (rawIssueCodes == null || rawIssueCodes.isBlank()) {
            return List.of();
        }

        return List.of(rawIssueCodes.split(",")).stream()
                .map(String::trim)
                .filter(code -> !code.isBlank())
                .toList();
    }

    private List<String> toIssueLabels(List<String> issueCodes) {
        if (issueCodes.isEmpty()) {
            return List.of();
        }
        Map<String, String> issueLabelMap = systemDictService.getActiveLabelMap(SystemDictType.REVIEW_ISSUE);
        return issueCodes.stream()
                .map(code -> issueLabelMap.getOrDefault(code, code))
                .toList();
    }

    private String resolveCategoryLabel(String categoryCode) {
        if (categoryCode == null || categoryCode.isBlank()) {
            return null;
        }
        return systemDictService.getActiveLabelMap(SystemDictType.POI_CATEGORY).getOrDefault(categoryCode, categoryCode);
    }

    private void publishReviewNotice(PoiInfo poi, PoiReviewRecord reviewRecord) {
        businessNoticePublisher.publish(new BusinessNoticeEvent(
                reviewRecord.getDecision() == PoiReviewDecision.APPROVED ? "POI_REVIEW_APPROVED" : "POI_REVIEW_REJECTED",
                NoticeType.WORKFLOW,
                reviewRecord.getDecision() == PoiReviewDecision.APPROVED ? "你的 POI 已核验通过" : "你的 POI 需要整改",
                reviewRecord.getDecision() == PoiReviewDecision.APPROVED
                        ? "{{poiName}} 已核验通过。"
                        : "{{poiName}} 被驳回，整改意见：{{comment}}",
                reviewRecord.getReviewer().getId(),
                List.of(poi.getCollector().getId()),
                Map.of(
                        "poiName", poi.getPoiName(),
                        "comment", reviewRecord.getReviewComment() == null ? "请查看详情" : reviewRecord.getReviewComment()
                )
        ));
    }
}
