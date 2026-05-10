package com.poi.system.file.service;

import com.poi.system.common.exception.BusinessException;
import com.poi.system.config.FileStorageProperties;
import com.poi.system.config.MinioProperties;
import io.minio.BucketExistsArgs;
import io.minio.GetObjectArgs;
import io.minio.MakeBucketArgs;
import com.poi.system.file.dto.FileUploadResponse;
import com.poi.system.file.enums.FileStorageMode;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.util.Objects;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.PathResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Service
@RequiredArgsConstructor
public class FileStorageService {

    private final MinioClient minioClient;
    private final MinioProperties minioProperties;
    private final FileStorageProperties fileStorageProperties;

    public FileUploadResponse upload(MultipartFile file) {
        if (file.isEmpty()) {
            throw new BusinessException("FILE_002", "file must not be empty", HttpStatus.BAD_REQUEST);
        }

        String originalFilename = Objects.requireNonNullElse(file.getOriginalFilename(), "unknown.bin");
        String sanitizedFilename = originalFilename.replaceAll("[^a-zA-Z0-9._-]", "_");
        String objectName = String.format(
                "stage1/%s/%s-%s",
                LocalDate.now(),
                UUID.randomUUID(),
                sanitizedFilename
        );

        if (fileStorageProperties.getMode() == FileStorageMode.LOCAL) {
            return storeLocally(file, objectName, originalFilename);
        }

        try (InputStream inputStream = file.getInputStream()) {
            ensureBucket();
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(minioProperties.getBucket())
                            .object(objectName)
                            .stream(inputStream, file.getSize(), -1)
                            .contentType(Objects.requireNonNullElse(file.getContentType(), "application/octet-stream"))
                            .build()
            );

            return new FileUploadResponse(
                    objectName,
                    originalFilename,
                    file.getContentType(),
                    file.getSize(),
                    buildPublicFileUrl(objectName),
                    FileStorageMode.MINIO.name()
            );
        } catch (Exception ex) {
            if (fileStorageProperties.getMode() == FileStorageMode.MINIO) {
                log.error("Failed to upload file to MinIO in strict mode", ex);
                throw new BusinessException("FILE_003", "failed to upload file", HttpStatus.INTERNAL_SERVER_ERROR);
            }
            log.warn("MinIO upload failed, fallback to local storage: {}", ex.getMessage());
            return storeLocally(file, objectName, originalFilename);
        }
    }

    private void ensureBucket() throws Exception {
        boolean exists = minioClient.bucketExists(BucketExistsArgs.builder().bucket(minioProperties.getBucket()).build());
        if (!exists) {
            minioClient.makeBucket(MakeBucketArgs.builder().bucket(minioProperties.getBucket()).build());
        }
    }

    private FileUploadResponse storeLocally(MultipartFile file, String objectName, String originalFilename) {
        try (InputStream inputStream = file.getInputStream()) {
            Path baseDir = Path.of(fileStorageProperties.getLocalUploadDir());
            Files.createDirectories(baseDir);

            String normalizedObjectName = normalizeLocalObjectName(objectName);
            Path targetPath = baseDir.resolve(normalizedObjectName);
            Files.copy(inputStream, targetPath, StandardCopyOption.REPLACE_EXISTING);

            return new FileUploadResponse(
                    objectName,
                    originalFilename,
                    file.getContentType(),
                    file.getSize(),
                    buildLocalFileUrl(normalizedObjectName),
                    FileStorageMode.LOCAL.name()
            );
        } catch (Exception fallbackEx) {
            throw new BusinessException("FILE_003", "failed to upload file", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    public Resource loadLocalFile(String fileName) {
        Path baseDir = Path.of(fileStorageProperties.getLocalUploadDir());
        Path targetPath = baseDir.resolve(fileName).normalize();
        if (!targetPath.startsWith(baseDir) || !Files.exists(targetPath)) {
            throw new BusinessException("FILE_404", "file not found", HttpStatus.NOT_FOUND);
        }
        return new PathResource(targetPath);
    }

    public Resource loadFile(String objectName) {
        if (fileStorageProperties.getMode() != FileStorageMode.LOCAL) {
            try {
                return new InputStreamResource(
                        minioClient.getObject(
                                GetObjectArgs.builder()
                                        .bucket(minioProperties.getBucket())
                                        .object(objectName)
                                        .build()
                        )
                );
            } catch (Exception ex) {
                if (fileStorageProperties.getMode() == FileStorageMode.MINIO) {
                    throw new BusinessException("FILE_404", "file not found", HttpStatus.NOT_FOUND);
                }
                log.warn("Failed to read file from MinIO, fallback to local storage: {}", ex.getMessage());
            }
        }
        return loadLocalFile(normalizeLocalObjectName(objectName));
    }

    private String normalizeLocalObjectName(String objectName) {
        return objectName.replace('/', '_');
    }

    private String buildLocalFileUrl(String fileName) {
        return ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/api/v1/files/local/")
                .path(fileName)
                .toUriString();
    }

    private String buildPublicFileUrl(String objectName) {
        return ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/api/v1/files/content")
                .queryParam("objectName", objectName)
                .toUriString();
    }
}
