package com.poi.system.chat.enums;

public enum ConversationGroupCode {
    COLLECTOR_GROUP("采集者协作群"),
    VERIFIER_GROUP("核验者协作群");

    private final String defaultName;

    ConversationGroupCode(String defaultName) {
        this.defaultName = defaultName;
    }

    public String getDefaultName() {
        return defaultName;
    }
}
