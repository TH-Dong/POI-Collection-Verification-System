package com.poi.system.config;

import com.poi.system.file.enums.FileStorageMode;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "app.file")
public class FileStorageProperties {

    private FileStorageMode mode = FileStorageMode.MINIO_FALLBACK_LOCAL;

    private String localUploadDir;
}
