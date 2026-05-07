package com.poi.system.security;

import com.poi.system.common.enums.RoleCode;
import java.util.Collection;
import java.util.EnumMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;

public final class PermissionCodes {

    public static final String DASHBOARD_VIEW = "dashboard:view";
    public static final String POI_COLLECT = "poi:collect";
    public static final String POI_REVIEW = "poi:review";
    public static final String TASK_MANAGE = "task:manage";
    public static final String NOTICE_MANAGE = "notice:manage";
    public static final String CHAT_USE = "chat:use";
    public static final String DISPUTE_HANDLE = "dispute:handle";
    public static final String OPERATIONS_MANAGE = "operations:manage";
    public static final String AUDIT_VIEW = "audit:view";
    public static final String REPORT_EXPORT = "report:export";
    public static final String WECHAT_BIND = "wechat:bind";
    public static final String OCR_RECOGNIZE = "ocr:recognize";

    private static final Map<RoleCode, Set<String>> ROLE_PERMISSIONS = buildMatrix();

    private PermissionCodes() {
    }

    public static Set<String> resolve(Collection<String> roleCodes) {
        Set<String> permissions = new LinkedHashSet<>();
        if (roleCodes == null) {
            return permissions;
        }
        for (String roleCode : roleCodes) {
            if (roleCode == null || roleCode.isBlank()) {
                continue;
            }
            try {
                permissions.addAll(ROLE_PERMISSIONS.getOrDefault(RoleCode.valueOf(roleCode.trim().toUpperCase()), Set.of()));
            } catch (IllegalArgumentException ignored) {
            }
        }
        return permissions;
    }

    private static Map<RoleCode, Set<String>> buildMatrix() {
        Map<RoleCode, Set<String>> matrix = new EnumMap<>(RoleCode.class);
        matrix.put(RoleCode.COLLECTOR, Set.of(
                POI_COLLECT,
                CHAT_USE,
                DISPUTE_HANDLE,
                WECHAT_BIND,
                OCR_RECOGNIZE
        ));
        matrix.put(RoleCode.VERIFIER, Set.of(
                DASHBOARD_VIEW,
                POI_REVIEW,
                TASK_MANAGE,
                NOTICE_MANAGE,
                CHAT_USE,
                DISPUTE_HANDLE,
                WECHAT_BIND,
                OCR_RECOGNIZE
        ));
        matrix.put(RoleCode.ADMIN, Set.of(
                DASHBOARD_VIEW,
                POI_REVIEW,
                TASK_MANAGE,
                NOTICE_MANAGE,
                CHAT_USE,
                DISPUTE_HANDLE,
                OPERATIONS_MANAGE,
                AUDIT_VIEW,
                REPORT_EXPORT,
                WECHAT_BIND,
                OCR_RECOGNIZE
        ));
        return matrix;
    }
}
