package com.poi.system.poi.entity;

import com.poi.system.poi.enums.PoiStatus;
import com.poi.system.user.entity.SysUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "poi_info")
public class PoiInfo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "poi_name", nullable = false, length = 128)
    private String poiName;

    @Column(name = "category_code", length = 64)
    private String categoryCode;

    @Column(name = "description_text", length = 1000)
    private String description;

    @Column(name = "cover_image_object_name", length = 255)
    private String coverImageObjectName;

    @Column(name = "cover_image_url", length = 500)
    private String coverImageUrl;

    @Column
    private Double longitude;

    @Column
    private Double latitude;

    @Column(name = "address_text", length = 255)
    private String addressText;

    @Column(name = "ocr_text", length = 255)
    private String ocrText;

    @Column(name = "ocr_confidence")
    private Double ocrConfidence;

    @Column(name = "ocr_provider", length = 64)
    private String ocrProvider;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private PoiStatus status;

    @Column(name = "submitted_at")
    private Instant submittedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "collector_id", nullable = false)
    private SysUser collector;

    @PrePersist
    public void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
