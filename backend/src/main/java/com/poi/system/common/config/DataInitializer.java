package com.poi.system.common.config;

import com.poi.system.audit.repository.SysLoginLogRepository;
import com.poi.system.audit.repository.SysOperationLogRepository;
import com.poi.system.chat.entity.ImConversation;
import com.poi.system.auth.service.WeChatAuthService;
import com.poi.system.chat.enums.ConversationGroupCode;
import com.poi.system.chat.repository.ImConversationMemberRepository;
import com.poi.system.chat.repository.ImConversationRepository;
import com.poi.system.chat.repository.ImMessageRepository;
import com.poi.system.chat.service.ChatService;
import com.poi.system.common.enums.RoleCode;
import com.poi.system.common.enums.UserStatus;
import com.poi.system.dictionary.enums.SystemDictType;
import com.poi.system.dictionary.service.SystemDictService;
import com.poi.system.dispute.entity.PoiArbitrationRecord;
import com.poi.system.dispute.entity.PoiDispute;
import com.poi.system.dispute.entity.PoiDisputeComment;
import com.poi.system.dispute.enums.DisputeCommentType;
import com.poi.system.dispute.enums.DisputeStatus;
import com.poi.system.dispute.repository.PoiArbitrationRecordRepository;
import com.poi.system.dispute.repository.PoiDisputeCommentRepository;
import com.poi.system.dispute.repository.PoiDisputeRepository;
import com.poi.system.poi.entity.PoiInfo;
import com.poi.system.poi.entity.PoiReviewRecord;
import com.poi.system.poi.enums.PoiCategory;
import com.poi.system.poi.enums.PoiReviewDecision;
import com.poi.system.poi.enums.PoiReviewIssue;
import com.poi.system.poi.enums.PoiStatus;
import com.poi.system.poi.repository.PoiInfoRepository;
import com.poi.system.poi.repository.PoiReviewRecordRepository;
import com.poi.system.notice.service.NoticeService;
import com.poi.system.notice.dto.BroadcastNoticeRequest;
import com.poi.system.notice.enums.NoticeReceiverScope;
import com.poi.system.notice.repository.SysNoticeRepository;
import com.poi.system.notice.repository.SysNoticeUserRepository;
import com.poi.system.task.dto.TaskSummaryResponse;
import com.poi.system.task.dto.TaskUpsertRequest;
import com.poi.system.task.dto.UpdateTaskStatusRequest;
import com.poi.system.task.enums.TaskPriority;
import com.poi.system.task.enums.TaskStatus;
import com.poi.system.task.enums.TaskType;
import com.poi.system.task.repository.BizTaskRepository;
import com.poi.system.task.service.TaskService;
import com.poi.system.rule.service.WorkflowRuleService;
import com.poi.system.user.entity.SysRole;
import com.poi.system.user.entity.SysUser;
import com.poi.system.user.repository.SysRoleRepository;
import com.poi.system.user.repository.SysUserRepository;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final SysRoleRepository roleRepository;
    private final SysUserRepository userRepository;
    private final PoiInfoRepository poiInfoRepository;
    private final PoiReviewRecordRepository poiReviewRecordRepository;
    private final PoiDisputeRepository poiDisputeRepository;
    private final PoiDisputeCommentRepository poiDisputeCommentRepository;
    private final PoiArbitrationRecordRepository poiArbitrationRecordRepository;
    private final BizTaskRepository bizTaskRepository;
    private final SysNoticeRepository sysNoticeRepository;
    private final SysNoticeUserRepository sysNoticeUserRepository;
    private final ImMessageRepository imMessageRepository;
    private final ImConversationMemberRepository imConversationMemberRepository;
    private final ImConversationRepository imConversationRepository;
    private final SysOperationLogRepository sysOperationLogRepository;
    private final SysLoginLogRepository sysLoginLogRepository;
    private final SystemDictService systemDictService;
    private final WorkflowRuleService workflowRuleService;
    private final NoticeService noticeService;
    private final ChatService chatService;
    private final TaskService taskService;
    private final WeChatAuthService weChatAuthService;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        SysRole collectorRole = ensureRole(RoleCode.COLLECTOR, "采集者");
        SysRole verifierRole = ensureRole(RoleCode.VERIFIER, "核验者");
        SysRole adminRole = ensureRole(RoleCode.ADMIN, "系统管理员");

        SysUser collector = ensureUser("collector", "123456", "Collector Demo", List.of(collectorRole));
        SysUser collector2 = ensureUser("collector2", "123456", "Collector Two", List.of(collectorRole));
        SysUser verifier = ensureUser("verifier", "123456", "Verifier Demo", List.of(verifierRole));
        SysUser verifier2 = ensureUser("verifier2", "123456", "Verifier Two", List.of(verifierRole));
        SysUser admin = ensureUser("admin", "123456", "Admin Demo", List.of(adminRole));
        ensureWechatBinding(collector2, "wx-collector2");
        ensureWechatBinding(verifier2, "wx-verifier2");
        ensureWechatBinding(admin, "wx-admin");

        seedStage6Defaults();
        resetBusinessData();
        seedStage7DemoData(collector, collector2, verifier, verifier2, admin);
    }

    private void seedStage6Defaults() {
        int categorySort = 10;
        for (PoiCategory category : PoiCategory.values()) {
            systemDictService.ensureSeedItem(SystemDictType.POI_CATEGORY, category.getCode(), category.getLabel(), "阶段 6 默认 POI 分类", categorySort);
            categorySort += 10;
        }

        int issueSort = 10;
        for (PoiReviewIssue issue : PoiReviewIssue.values()) {
            systemDictService.ensureSeedItem(SystemDictType.REVIEW_ISSUE, issue.getCode(), issue.getLabel(), "阶段 6 默认错误类型", issueSort);
            issueSort += 10;
        }

        workflowRuleService.ensureSeedRule(WorkflowRuleService.VERIFY_TASK_DUE_HOURS, "核验任务 SLA（小时）", "24", "POI 提交或整改后，核验任务默认截止小时数。");
        workflowRuleService.ensureSeedRule(WorkflowRuleService.DISPUTE_TASK_DUE_HOURS, "争议处理 SLA（小时）", "12", "采集者发起异议后，核验者争议处理默认截止小时数。");
        workflowRuleService.ensureSeedRule(WorkflowRuleService.ARBITRATION_TASK_DUE_HOURS, "最终裁定 SLA（小时）", "8", "争议升级后，管理员最终裁定默认截止小时数。");
        workflowRuleService.ensureSeedRule(WorkflowRuleService.TASK_AUTO_ASSIGN_ENABLED, "自动分配任务", "true", "开启后，系统会按角色默认接收人自动生成任务。");

        noticeService.ensureSeedTemplate("TASK_ASSIGNED", "任务派发通知", "你有新的任务待处理", "{{title}}，请在 {{dueAt}} 前处理。");
        noticeService.ensureSeedTemplate("POI_REVIEW_APPROVED", "POI 核验通过", "你的 POI 已核验通过", "{{poiName}} 已核验通过，可继续关注后续进展。");
        noticeService.ensureSeedTemplate("POI_REVIEW_REJECTED", "POI 被驳回整改", "你的 POI 需要整改", "{{poiName}} 被驳回，整改意见：{{comment}}");
        noticeService.ensureSeedTemplate("DISPUTE_CREATED", "POI 争议创建", "有新的争议待处理", "{{poiName}} 收到新的争议说明，请尽快查看。");
        noticeService.ensureSeedTemplate("DISPUTE_ESCALATED", "争议升级裁定", "有新的最终裁定任务", "{{poiName}} 的争议已升级，请管理员尽快裁定。");
        noticeService.ensureSeedTemplate("ARBITRATION_FINALIZED", "争议已裁定完成", "你的争议已裁定完成", "{{poiName}} 已完成最终裁定，结果：{{decision}}");
        noticeService.ensureSeedTemplate("CHAT_MESSAGE", "协作消息提醒", "你收到一条新的协作消息", "{{sender}} 在 {{conversationName}} 中发送了新消息：{{preview}}");
    }

    private void resetBusinessData() {
        sysOperationLogRepository.deleteAllInBatch();
        sysLoginLogRepository.deleteAllInBatch();
        imConversationMemberRepository.deleteAllInBatch();
        imMessageRepository.deleteAllInBatch();
        imConversationRepository.deleteAllInBatch();
        sysNoticeUserRepository.deleteAllInBatch();
        sysNoticeRepository.deleteAllInBatch();
        bizTaskRepository.deleteAllInBatch();
        poiArbitrationRecordRepository.deleteAllInBatch();
        poiDisputeCommentRepository.deleteAllInBatch();
        poiDisputeRepository.deleteAllInBatch();
        poiReviewRecordRepository.deleteAllInBatch();
        poiInfoRepository.deleteAllInBatch();
    }

    private SysRole ensureRole(RoleCode code, String name) {
        return roleRepository.findByCode(code.name()).orElseGet(() ->
                roleRepository.save(SysRole.builder().code(code.name()).name(name).build()));
    }

    private SysUser ensureUser(String username, String rawPassword, String realName, List<SysRole> roles) {
        return userRepository.findByUsername(username).orElseGet(() -> {
            SysUser user = SysUser.builder()
                    .username(username)
                    .passwordHash(passwordEncoder.encode(rawPassword))
                    .realName(realName)
                    .phone("13800000000")
                    .status(UserStatus.ACTIVE)
                    .roles(new LinkedHashSet<>(roles))
                    .build();
            return userRepository.save(user);
        });
    }

    private void ensureWechatBinding(SysUser user, String authCode) {
        if (user.getWechatBoundAt() != null) {
            return;
        }
        WeChatAuthService.WeChatProfile profile = weChatAuthService.resolveMockProfile(authCode);
        user.setWechatOpenId(profile.openId());
        user.setWechatUnionId(profile.unionId());
        user.setWechatNickname(profile.nickname());
        user.setWechatBoundAt(profile.issuedAt());
        userRepository.save(user);
    }

    private void seedStage7DemoData(SysUser collector, SysUser collector2, SysUser verifier, SysUser verifier2, SysUser admin) {
        PoiInfo draftPoi = createPoi(
                "北京中关村校园服务书亭",
                "EDUCATION",
                "保留为草稿，用于演示采集者继续编辑和草稿状态。",
                116.322901,
                39.983424,
                "北京市海淀区中关村东路 1 号北侧",
                PoiStatus.DRAFT,
                collector
        );

        PoiInfo submittedPoi = createPoi(
                "上海徐汇滨江便民驿站",
                "LIFE_SERVICE",
                "新提交待核验记录，用于演示待核验队列、地图查看和 POI 私聊。",
                121.454308,
                31.177301,
                "上海市徐汇区龙腾大道 2266 号附近",
                PoiStatus.SUBMITTED,
                collector
        );

        PoiInfo submittedPoi2 = createPoi(
                "深圳南山社区服务角",
                "GOV_SERVICE",
                "第二条待核验记录，用于展示不同采集者提交后的核验任务。",
                113.941874,
                22.533261,
                "广东省深圳市南山区科苑路 8 号附近",
                PoiStatus.SUBMITTED,
                collector2
        );

        PoiInfo rejectedPoi = createPoi(
                "广州体育西社区卫生点",
                "HEALTHCARE",
                "被驳回整改的记录，采集者可查看整改意见并继续编辑或发起异议。",
                113.330847,
                23.133102,
                "广东省广州市天河区体育西路 103 号",
                PoiStatus.REJECTED,
                collector
        );
        addReview(rejectedPoi, verifier, 1, PoiReviewDecision.REJECTED, "ADDRESS_ERROR,DESCRIPTION_ERROR", "门牌号不完整，开放时间和服务对象需要补充。");

        PoiInfo resubmittedPoi = createPoi(
                "武汉江汉路游客咨询台",
                "LIFE_SERVICE",
                "采集者已按意见整改并重新提交，用于演示整改复核。",
                114.291223,
                30.580916,
                "湖北省武汉市江岸区江汉路步行街 68 号",
                PoiStatus.RESUBMITTED,
                collector2
        );
        addReview(resubmittedPoi, verifier, 1, PoiReviewDecision.REJECTED, "PHOTO_ERROR,NAME_ERROR", "门头照片不完整，名称需补充正式牌匾内容。");

        PoiInfo approvedPoi = createPoi(
                "南京玄武湖志愿服务站",
                "LIFE_SERVICE",
                "已核验通过，用于演示通过后的详情查看。",
                118.805643,
                32.077122,
                "江苏省南京市玄武区玄武湖公园解放门入口",
                PoiStatus.APPROVED,
                collector
        );
        addReview(approvedPoi, verifier2, 1, PoiReviewDecision.APPROVED, "", "点位信息准确，图片与坐标一致。");

        PoiInfo disputingPoi = createPoi(
                "成都宽窄巷子游客服务点",
                "LIFE_SERVICE",
                "争议处理中，用于演示争议列表、任务中心和沟通记录。",
                104.055493,
                30.667299,
                "四川省成都市青羊区宽窄巷子景区东广场",
                PoiStatus.DISPUTING,
                collector2
        );
        addReview(disputingPoi, verifier, 1, PoiReviewDecision.REJECTED, "CATEGORY_ERROR,PHOTO_ERROR", "服务点类别填写不准确，现场照片缺少入口标识。");
        PoiDispute disputingDispute = createDispute(disputingPoi, collector2, DisputeStatus.DISPUTING, "现场为正式游客服务点，门头与导览牌都很清晰，请重新核对。", null, null);
        addSystemComment(disputingDispute, "采集者已发起异议，记录进入争议处理中。");
        addUserComment(disputingDispute, collector2, List.of(RoleCode.COLLECTOR.name()), "现场为正式游客服务点，门头与导览牌都很清晰，请重新核对。");
        addUserComment(disputingDispute, verifier, List.of(RoleCode.VERIFIER.name()), "目前照片没有覆盖完整门头，我建议补充证据后再判断。");

        PoiInfo arbitratingPoi = createPoi(
                "杭州西湖游客咨询台",
                "LIFE_SERVICE",
                "争议已升级管理员最终裁定，用于演示管理员任务和裁定入口。",
                120.155245,
                30.247646,
                "浙江省杭州市西湖区湖滨路 1 号游客咨询台",
                PoiStatus.ARBITRATING,
                collector
        );
        addReview(arbitratingPoi, verifier2, 1, PoiReviewDecision.REJECTED, "NAME_ERROR,LOCATION_ERROR", "名称与实际服务牌不一致，坐标偏离咨询台约 40 米。");
        PoiDispute arbitratingDispute = createDispute(arbitratingPoi, collector, DisputeStatus.ARBITRATING, "现场咨询台与路牌名称一致，但手机定位存在漂移，希望升级最终裁定。", Instant.now().minusSeconds(1800), null);
        addSystemComment(arbitratingDispute, "采集者已发起异议，记录进入争议处理中。");
        addUserComment(arbitratingDispute, collector, List.of(RoleCode.COLLECTOR.name()), "现场咨询台与路牌名称一致，但手机定位存在漂移，希望升级最终裁定。");
        addUserComment(arbitratingDispute, verifier2, List.of(RoleCode.VERIFIER.name()), "双方暂未达成一致，建议升级到最终裁定。");
        addSystemComment(arbitratingDispute, "争议单已升级至管理员最终裁定。");

        PoiInfo finalizedPoi = createPoi(
                "西安钟楼小吃服务站",
                "RETAIL",
                "管理员已完成最终裁定，记录保留完整争议和裁定历史。",
                108.947029,
                34.259411,
                "陕西省西安市碑林区钟楼东南角地下商业街入口",
                PoiStatus.FINALIZED,
                collector2
        );
        addReview(finalizedPoi, verifier, 1, PoiReviewDecision.REJECTED, "PHOTO_ERROR,OTHER", "原始照片无法证明服务站营业状态，建议驳回。");
        addReview(finalizedPoi, admin, 2, PoiReviewDecision.APPROVED, "", "管理员复核确认点位真实存在，最终裁定通过。");
        PoiDispute finalizedDispute = createDispute(finalizedPoi, collector2, DisputeStatus.FINALIZED, "现场服务站持续营业，已补拍更新照片，申请最终裁定。", Instant.now().minusSeconds(3600), Instant.now().minusSeconds(900));
        addSystemComment(finalizedDispute, "采集者已发起异议，记录进入争议处理中。");
        addUserComment(finalizedDispute, collector2, List.of(RoleCode.COLLECTOR.name()), "现场服务站持续营业，已补拍更新照片，申请最终裁定。");
        addUserComment(finalizedDispute, verifier, List.of(RoleCode.VERIFIER.name()), "原始照片存在遮挡，无法直接确认营业状态。");
        addSystemComment(finalizedDispute, "争议单已升级至管理员最终裁定。");
        addSystemComment(finalizedDispute, "管理员已给出最终裁定：支持采集方，记录已最终确认。");
        poiArbitrationRecordRepository.save(PoiArbitrationRecord.builder()
                .poi(finalizedPoi)
                .dispute(finalizedDispute)
                .reviewer(admin)
                .finalResult(PoiReviewDecision.APPROVED)
                .description("管理员复核确认点位真实存在，最终裁定通过。")
                .reviewedAt(Instant.now().minusSeconds(900))
                .build());

        taskService.assignVerifyTaskForPoi(submittedPoi);
        taskService.assignVerifyTaskForPoi(submittedPoi2);
        taskService.assignVerifyTaskForPoi(resubmittedPoi);
        taskService.assignDisputeTask(disputingDispute);
        taskService.assignArbitrationTask(arbitratingDispute);

        TaskSummaryResponse collectorTask = taskService.createAdminTask(admin.getId(), new TaskUpsertRequest(
                TaskType.COLLECTION,
                "POI",
                draftPoi.getId(),
                "补采照片与营业时间",
                "请补充草稿点位的现场照片和营业时间信息。",
                collector.getId(),
                TaskPriority.MEDIUM,
                TaskStatus.PENDING,
                Instant.now().plusSeconds(3600 * 24)
        ));
        TaskSummaryResponse collectorTask2 = taskService.createAdminTask(admin.getId(), new TaskUpsertRequest(
                TaskType.COLLECTION,
                "POI",
                submittedPoi2.getId(),
                "复核前补采点位周边图",
                "采集补充周边参照物照片，便于核验者快速定位。",
                collector2.getId(),
                TaskPriority.HIGH,
                TaskStatus.PENDING,
                Instant.now().plusSeconds(3600 * 12)
        ));
        taskService.updateMyTaskStatus(collector2.getId(), collectorTask2.id(), new UpdateTaskStatusRequest(TaskStatus.PROCESSING), false);

        noticeService.broadcast(admin.getId(), new BroadcastNoticeRequest(
                "阶段 7 演示环境已刷新",
                "已重新生成 POI、任务、通知和协作会话测试数据，请按不同角色重新登录查看。",
                NoticeReceiverScope.ALL,
                List.of(),
                List.of()
        ));
        noticeService.broadcast(admin.getId(), new BroadcastNoticeRequest(
                "采集者注意整改时效",
                "请优先处理“被驳回整改”和“补采资料”相关任务，并在 POI 详情中直接联系核验者。",
                NoticeReceiverScope.ROLE,
                List.of(RoleCode.COLLECTOR.name()),
                List.of()
        ));
        noticeService.broadcast(admin.getId(), new BroadcastNoticeRequest(
                "核验者今日待办提醒",
                "当前演示库包含新提交、整改复核和争议处理样例，请从待核验队列和协作会话开始查看。",
                NoticeReceiverScope.ROLE,
                List.of(RoleCode.VERIFIER.name()),
                List.of()
        ));

        chatService.ensureSeedDefaults(userRepository.findAll());
        seedRoleGroupMessages(collector, collector2, verifier, verifier2, admin);
        seedPoiPrivateMessages(collector, collector2, verifier, verifier2, submittedPoi, resubmittedPoi, disputingPoi);
    }

    private PoiInfo createPoi(
            String poiName,
            String categoryCode,
            String description,
            Double longitude,
            Double latitude,
            String addressText,
            PoiStatus status,
            SysUser collector
    ) {
        return poiInfoRepository.save(PoiInfo.builder()
                .poiName(poiName)
                .categoryCode(categoryCode)
                .description(description)
                .coverImageUrl(null)
                .longitude(longitude)
                .latitude(latitude)
                .addressText(addressText)
                .status(status)
                .submittedAt(status == PoiStatus.DRAFT ? null : Instant.now().minusSeconds(7200))
                .collector(collector)
                .build());
    }

    private void addReview(PoiInfo poi, SysUser reviewer, int round, PoiReviewDecision decision, String issueCodes, String comment) {
        poiReviewRecordRepository.save(PoiReviewRecord.builder()
                .poi(poi)
                .reviewer(reviewer)
                .round(round)
                .decision(decision)
                .issueCodes(issueCodes)
                .reviewComment(comment)
                .build());
    }

    private PoiDispute createDispute(PoiInfo poi, SysUser initiator, DisputeStatus status, String content, Instant escalatedAt, Instant finalizedAt) {
        return poiDisputeRepository.save(PoiDispute.builder()
                .poi(poi)
                .initiator(initiator)
                .status(status)
                .content(content)
                .escalatedAt(escalatedAt)
                .finalizedAt(finalizedAt)
                .build());
    }

    private void addSystemComment(PoiDispute dispute, String content) {
        poiDisputeCommentRepository.save(PoiDisputeComment.builder()
                .dispute(dispute)
                .commentType(DisputeCommentType.SYSTEM)
                .senderRoles("")
                .content(content)
                .build());
    }

    private void addUserComment(PoiDispute dispute, SysUser sender, List<String> roles, String content) {
        poiDisputeCommentRepository.save(PoiDisputeComment.builder()
                .dispute(dispute)
                .sender(sender)
                .commentType(DisputeCommentType.USER)
                .senderRoles(String.join(",", roles))
                .content(content)
                .build());
    }

    private void seedRoleGroupMessages(SysUser collector, SysUser collector2, SysUser verifier, SysUser verifier2, SysUser admin) {
        ImConversation collectorGroup = imConversationRepository.findByGroupCode(ConversationGroupCode.COLLECTOR_GROUP.name())
                .orElseThrow();
        ImConversation verifierGroup = imConversationRepository.findByGroupCode(ConversationGroupCode.VERIFIER_GROUP.name())
                .orElseThrow();

        chatService.sendMessage(collector.getId(), roleCodes(collector), collectorGroup.getId(), "我刚补完北京草稿点位的营业时间，稍后会继续上传门头照片。");
        chatService.sendMessage(collector2.getId(), roleCodes(collector2), collectorGroup.getId(), "深圳社区服务角已经重新提交，大家可以看看整改后的资料组织方式。");

        chatService.sendMessage(verifier.getId(), roleCodes(verifier), verifierGroup.getId(), "今天有两条新提交和一条整改复核，优先处理徐汇滨江和江汉路样例。");
        chatService.sendMessage(verifier2.getId(), roleCodes(verifier2), verifierGroup.getId(), "杭州西湖样例已经升级裁定，管理员可以直接在争议中心查看。");

        chatService.sendMessage(admin.getId(), roleCodes(admin), verifierGroup.getId(), "我已刷新阶段 7 演示数据，核验端今天重点看任务中心、通知中心和协作会话联动。");
    }

    private void seedPoiPrivateMessages(
            SysUser collector,
            SysUser collector2,
            SysUser verifier,
            SysUser verifier2,
            PoiInfo submittedPoi,
            PoiInfo resubmittedPoi,
            PoiInfo disputingPoi
    ) {
        Long submittedConversationId = chatService.openPoiPrivateConversation(verifier.getId(), roleCodes(verifier), submittedPoi.getId()).id();
        chatService.sendMessage(verifier.getId(), roleCodes(verifier), submittedConversationId, "我正在查看徐汇滨江便民驿站，请补充一张包含周边路牌的远景图。");
        chatService.sendMessage(collector.getId(), roleCodes(collector), submittedConversationId, "收到，我会在下午补拍并同步到记录里。");

        Long resubmittedConversationId = chatService.openPoiPrivateConversation(collector2.getId(), roleCodes(collector2), resubmittedPoi.getId()).id();
        chatService.sendMessage(collector2.getId(), roleCodes(collector2), resubmittedConversationId, "江汉路这条我已按意见补全门头照片和正式名称，请优先复核。");
        chatService.sendMessage(verifier.getId(), roleCodes(verifier), resubmittedConversationId, "好的，我会在整改复核队列里优先处理这条。");

        Long disputingConversationId = chatService.openPoiPrivateConversation(verifier2.getId(), roleCodes(verifier2), disputingPoi.getId()).id();
        chatService.sendMessage(verifier2.getId(), roleCodes(verifier2), disputingConversationId, "争议处理前我建议再补一张入口广角照片，方便和现场导览牌对应。");
        chatService.sendMessage(collector2.getId(), roleCodes(collector2), disputingConversationId, "明白，我晚点补拍后会继续在异议详情里说明。");
    }

    private List<String> roleCodes(SysUser user) {
        return user.getRoles().stream().map(role -> role.getCode()).toList();
    }
}
