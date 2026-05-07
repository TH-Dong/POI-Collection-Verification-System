package com.poi.system.poi.enums;

import java.util.Arrays;

public enum PoiReviewIssue {
    NAME_ERROR("NAME_ERROR", "名称错误"),
    CATEGORY_ERROR("CATEGORY_ERROR", "分类错误"),
    LOCATION_ERROR("LOCATION_ERROR", "定位错误"),
    ADDRESS_ERROR("ADDRESS_ERROR", "地址信息不完整"),
    PHOTO_ERROR("PHOTO_ERROR", "图片不清晰或缺失"),
    DESCRIPTION_ERROR("DESCRIPTION_ERROR", "描述信息不足"),
    DUPLICATE_SUSPECTED("DUPLICATE_SUSPECTED", "疑似重复点位"),
    OTHER("OTHER", "其他问题");

    private final String code;
    private final String label;

    PoiReviewIssue(String code, String label) {
        this.code = code;
        this.label = label;
    }

    public String getCode() {
        return code;
    }

    public String getLabel() {
        return label;
    }

    public static PoiReviewIssue fromCode(String code) {
        return Arrays.stream(values())
                .filter(item -> item.code.equalsIgnoreCase(code))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("unsupported review issue: " + code));
    }
}
