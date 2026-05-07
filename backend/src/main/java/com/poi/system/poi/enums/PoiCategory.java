package com.poi.system.poi.enums;

import java.util.Arrays;

public enum PoiCategory {
    RESTAURANT("餐饮服务"),
    RETAIL("零售购物"),
    EDUCATION("教育培训"),
    TRANSPORT("交通设施"),
    HEALTHCARE("医疗健康"),
    LIFE_SERVICE("生活服务"),
    OFFICE("办公园区"),
    OTHER("其他");

    private final String label;

    PoiCategory(String label) {
        this.label = label;
    }

    public String getCode() {
        return name();
    }

    public String getLabel() {
        return label;
    }

    public static PoiCategory fromCode(String code) {
        return Arrays.stream(values())
                .filter(item -> item.name().equalsIgnoreCase(code))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("unsupported poi category: " + code));
    }
}
