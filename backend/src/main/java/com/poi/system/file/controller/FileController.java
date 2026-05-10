package com.poi.system.file.controller;

import com.poi.system.common.api.ApiResponse;
import com.poi.system.file.dto.FileUploadResponse;
import com.poi.system.file.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.MediaTypeFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/files")
@RequiredArgsConstructor
public class FileController {

    private final FileStorageService fileStorageService;

    @PostMapping("/upload")
    @PreAuthorize("hasAnyRole('COLLECTOR', 'VERIFIER', 'ADMIN')")
    public ApiResponse<FileUploadResponse> upload(@RequestParam("file") MultipartFile file) {
        return ApiResponse.success(fileStorageService.upload(file));
    }

    @GetMapping("/content")
    public ResponseEntity<Resource> getFileContent(@RequestParam("objectName") String objectName) {
        Resource resource = fileStorageService.loadFile(objectName);
        MediaType mediaType = MediaTypeFactory.getMediaType(objectName).orElse(MediaType.APPLICATION_OCTET_STREAM);
        return ResponseEntity.ok()
                .contentType(mediaType)
                .body(resource);
    }

    @GetMapping("/local/{fileName}")
    public ResponseEntity<Resource> getLocalFile(@PathVariable String fileName) {
        Resource resource = fileStorageService.loadLocalFile(fileName);
        MediaType mediaType = MediaTypeFactory.getMediaType(resource).orElse(MediaType.APPLICATION_OCTET_STREAM);
        return ResponseEntity.ok()
                .contentType(mediaType)
                .body(resource);
    }
}
