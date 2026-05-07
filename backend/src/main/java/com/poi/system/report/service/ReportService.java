package com.poi.system.report.service;

import com.poi.system.audit.repository.SysLoginLogRepository;
import com.poi.system.audit.repository.SysOperationLogRepository;
import com.poi.system.poi.entity.PoiInfo;
import com.poi.system.poi.repository.PoiInfoRepository;
import com.poi.system.user.entity.SysUser;
import com.poi.system.user.repository.SysUserRepository;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ReportService {

    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
            .withZone(ZoneId.of("Asia/Shanghai"));

    private final PoiInfoRepository poiInfoRepository;
    private final SysUserRepository sysUserRepository;
    private final SysOperationLogRepository sysOperationLogRepository;
    private final SysLoginLogRepository sysLoginLogRepository;

    @Transactional(readOnly = true)
    public Resource exportPoiCsv() {
        StringBuilder builder = new StringBuilder();
        builder.append('\uFEFF');
        builder.append("ID,POI名称,分类,状态,采集者,地址,经度,纬度,OCR文本,微信绑定,更新时间\n");
        for (PoiInfo poi : poiInfoRepository.findAllByOrderByUpdatedAtDesc()) {
            builder.append(csv(poi.getId()))
                    .append(',').append(csv(poi.getPoiName()))
                    .append(',').append(csv(poi.getCategoryCode()))
                    .append(',').append(csv(poi.getStatus().name()))
                    .append(',').append(csv(poi.getCollector().getRealName()))
                    .append(',').append(csv(poi.getAddressText()))
                    .append(',').append(csv(poi.getLongitude()))
                    .append(',').append(csv(poi.getLatitude()))
                    .append(',').append(csv(poi.getOcrText()))
                    .append(',').append(csv(poi.getCollector().getWechatBoundAt() == null ? "未绑定" : "已绑定"))
                    .append(',').append(csv(formatInstant(poi.getUpdatedAt())))
                    .append('\n');
        }
        return new ByteArrayResource(builder.toString().getBytes(StandardCharsets.UTF_8));
    }

    @Transactional(readOnly = true)
    public Resource exportAuditCsv() {
        StringBuilder builder = new StringBuilder();
        builder.append('\uFEFF');
        builder.append("类型,用户,业务类型,业务ID,动作,结果,内容,时间\n");
        sysOperationLogRepository.findAllByOrderByCreatedAtDesc().forEach(log -> builder
                .append(csv("OPERATION"))
                .append(',').append(csv(log.getOperatorName()))
                .append(',').append(csv(log.getBizType()))
                .append(',').append(csv(log.getBizId()))
                .append(',').append(csv(log.getActionCode()))
                .append(',').append(csv("SUCCESS"))
                .append(',').append(csv(log.getContent()))
                .append(',').append(csv(formatInstant(log.getCreatedAt())))
                .append('\n'));
        sysLoginLogRepository.findAllByOrderByCreatedAtDesc().forEach(log -> builder
                .append(csv("LOGIN"))
                .append(',').append(csv(log.getUsername()))
                .append(',').append(csv("AUTH"))
                .append(',').append(csv(log.getUser() == null ? null : log.getUser().getId()))
                .append(',').append(csv("LOGIN"))
                .append(',').append(csv(log.getLoginResult()))
                .append(',').append(csv(log.getResultMessage()))
                .append(',').append(csv(formatInstant(log.getCreatedAt())))
                .append('\n'));
        return new ByteArrayResource(builder.toString().getBytes(StandardCharsets.UTF_8));
    }

    @Transactional(readOnly = true)
    public Resource exportUserCsv() {
        StringBuilder builder = new StringBuilder();
        builder.append('\uFEFF');
        builder.append("ID,用户名,姓名,手机号,状态,角色,微信昵称,微信绑定时间\n");
        List<SysUser> users = sysUserRepository.findAll();
        for (SysUser user : users) {
            builder.append(csv(user.getId()))
                    .append(',').append(csv(user.getUsername()))
                    .append(',').append(csv(user.getRealName()))
                    .append(',').append(csv(user.getPhone()))
                    .append(',').append(csv(user.getStatus().name()))
                    .append(',').append(csv(String.join("|", user.getRoles().stream().map(role -> role.getCode()).toList())))
                    .append(',').append(csv(user.getWechatNickname()))
                    .append(',').append(csv(formatInstant(user.getWechatBoundAt())))
                    .append('\n');
        }
        return new ByteArrayResource(builder.toString().getBytes(StandardCharsets.UTF_8));
    }

    private String formatInstant(Instant instant) {
        return instant == null ? "" : DATE_TIME_FORMATTER.format(instant);
    }

    private String csv(Object value) {
        String text = value == null ? "" : String.valueOf(value);
        String escaped = text.replace("\"", "\"\"");
        return "\"" + escaped + "\"";
    }
}
