package com.poi.system.ocr.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.poi.system.common.exception.BusinessException;
import com.poi.system.config.OcrProperties;
import com.poi.system.ocr.dto.OcrRecognizeResponse;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Service
public class OcrService {

    private static final Pattern EXTENSION_PATTERN = Pattern.compile("\\.[^.]+$");
    private static final Pattern JSON_OBJECT_PATTERN = Pattern.compile("\\{.*}", Pattern.DOTALL);
    private static final String UNRECOGNIZED_TEXT = "未稳定识别到清晰招牌文字";
    private static final String QWEN_SYSTEM_PROMPT = """
            你是 POI 数据采集系统中的 OCR 与图片理解助手。
            你的任务是识别现场照片中的门头、招牌、牌匾、机构名称或其他与地点身份最相关的文字，
            并输出可直接用于 POI 表单回填的结构化建议。
            你只能基于图片中能看到的内容作答，不要编造。
            你的输出必须是 JSON 对象，不要输出 Markdown 代码块，不要输出 JSON 之外的任何文字。
            """;
    private static final String QWEN_USER_PROMPT = """
            请分析这张图片，并返回一个 JSON 对象，字段必须完整：
            {
              "extractedText": "尽量完整的原始识别文字，无法识别时返回空字符串",
              "suggestedPoiName": "适合回填到 POI 名称的精简名称，无法判断时返回空字符串",
              "suggestedDescription": "1 句中文描述，说明这是什么地点或门店，无法判断时返回空字符串",
              "suggestedCategoryCode": "只能从 RESTAURANT、RETAIL、EDUCATION、TRANSPORT、HEALTHCARE、LIFE_SERVICE、OFFICE、OTHER 中选择一个，无法判断时返回空字符串",
              "confidence": "0 到 1 之间的小数"
            }

            输出要求：
            1. 优先识别门头、招牌、店名、机构牌匾上的中文文字。
            2. 如果图片里只有部分文字，也请忠实提取，不要凭空补全完整店名。
            3. suggestedPoiName 可以比 extractedText 更精简，但不能脱离图片证据。
            4. suggestedDescription 使用自然中文，例如“该点位疑似为社区卫生服务站，门头可见相关字样。”
            5. suggestedCategoryCode 必须使用给定英文编码。
            6. 如果没有把握，confidence 降低，并把不确定字段留空字符串。
            """;

    private static final Map<String, String> CATEGORY_KEYWORDS = Map.ofEntries(
            Map.entry("餐饮", "RESTAURANT"),
            Map.entry("饭店", "RESTAURANT"),
            Map.entry("饭馆", "RESTAURANT"),
            Map.entry("小吃", "RESTAURANT"),
            Map.entry("面馆", "RESTAURANT"),
            Map.entry("奶茶", "RESTAURANT"),
            Map.entry("咖啡", "RESTAURANT"),
            Map.entry("超市", "RETAIL"),
            Map.entry("商店", "RETAIL"),
            Map.entry("便利", "RETAIL"),
            Map.entry("购物", "RETAIL"),
            Map.entry("零售", "RETAIL"),
            Map.entry("学校", "EDUCATION"),
            Map.entry("大学", "EDUCATION"),
            Map.entry("学院", "EDUCATION"),
            Map.entry("幼儿园", "EDUCATION"),
            Map.entry("培训", "EDUCATION"),
            Map.entry("公交", "TRANSPORT"),
            Map.entry("地铁", "TRANSPORT"),
            Map.entry("车站", "TRANSPORT"),
            Map.entry("客运", "TRANSPORT"),
            Map.entry("停车", "TRANSPORT"),
            Map.entry("卫生", "HEALTHCARE"),
            Map.entry("医院", "HEALTHCARE"),
            Map.entry("诊所", "HEALTHCARE"),
            Map.entry("药店", "HEALTHCARE"),
            Map.entry("药房", "HEALTHCARE"),
            Map.entry("社区", "LIFE_SERVICE"),
            Map.entry("便民", "LIFE_SERVICE"),
            Map.entry("服务", "LIFE_SERVICE"),
            Map.entry("快递", "LIFE_SERVICE"),
            Map.entry("维修", "LIFE_SERVICE"),
            Map.entry("理发", "LIFE_SERVICE"),
            Map.entry("办公", "OFFICE"),
            Map.entry("大厦", "OFFICE"),
            Map.entry("园区", "OFFICE"),
            Map.entry("政务", "OFFICE"),
            Map.entry("中心", "OFFICE")
    );

    private static final Map<String, String> CATEGORY_ALIASES = Map.ofEntries(
            Map.entry("RESTAURANT", "RESTAURANT"),
            Map.entry("餐饮", "RESTAURANT"),
            Map.entry("餐饮服务", "RESTAURANT"),
            Map.entry("RETAIL", "RETAIL"),
            Map.entry("零售", "RETAIL"),
            Map.entry("零售购物", "RETAIL"),
            Map.entry("购物", "RETAIL"),
            Map.entry("EDUCATION", "EDUCATION"),
            Map.entry("教育", "EDUCATION"),
            Map.entry("教育培训", "EDUCATION"),
            Map.entry("TRANSPORT", "TRANSPORT"),
            Map.entry("交通", "TRANSPORT"),
            Map.entry("交通设施", "TRANSPORT"),
            Map.entry("HEALTHCARE", "HEALTHCARE"),
            Map.entry("医疗", "HEALTHCARE"),
            Map.entry("医疗健康", "HEALTHCARE"),
            Map.entry("LIFE_SERVICE", "LIFE_SERVICE"),
            Map.entry("生活服务", "LIFE_SERVICE"),
            Map.entry("便民服务", "LIFE_SERVICE"),
            Map.entry("OFFICE", "OFFICE"),
            Map.entry("办公", "OFFICE"),
            Map.entry("办公园区", "OFFICE"),
            Map.entry("OTHER", "OTHER"),
            Map.entry("其他", "OTHER"),
            Map.entry("GOV_SERVICE", "OFFICE")
    );

    private final OcrProperties ocrProperties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public OcrService(OcrProperties ocrProperties, ObjectMapper objectMapper) {
        this.ocrProperties = ocrProperties;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(ocrProperties.timeout())
                .build();
    }

    public OcrRecognizeResponse recognize(MultipartFile file) {
        validateImage(file);
        return switch (ocrProperties.provider()) {
            case MOCK -> recognizeByMock(file);
            case SILICONFLOW -> recognizeBySiliconFlow(file);
        };
    }

    private OcrRecognizeResponse recognizeBySiliconFlow(MultipartFile file) {
        if (ocrProperties.apiKey() == null || ocrProperties.apiKey().isBlank()) {
            throw new BusinessException(
                    "OCR_001",
                    "已启用 SiliconFlow OCR，但未配置 OCR_API_KEY",
                    HttpStatus.INTERNAL_SERVER_ERROR
            );
        }

        try {
            String contentType = resolveImageContentType(file);
            byte[] bytes = file.getBytes();
            String dataUrl = "data:" + contentType + ";base64," + Base64.getEncoder().encodeToString(bytes);
            String requestBody = objectMapper.writeValueAsString(buildQwenPayload(dataUrl));

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(ocrProperties.baseUrl() + "/chat/completions"))
                    .timeout(ocrProperties.timeout())
                    .header("Authorization", "Bearer " + ocrProperties.apiKey().trim())
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() >= 400) {
                throw new BusinessException(
                        "OCR_002",
                        "SiliconFlow OCR 调用失败: " + extractRemoteErrorMessage(response.body()),
                        HttpStatus.BAD_GATEWAY
                );
            }

            ModelSuggestion suggestion = parseModelResponse(response.body());
            return normalizeSuggestion(suggestion, providerName());
        } catch (BusinessException ex) {
            throw ex;
        } catch (IOException ex) {
            log.error("Failed to call SiliconFlow OCR due to IO error", ex);
            throw new BusinessException("OCR_003", "SiliconFlow OCR 请求失败，请检查网络或 OCR 配置", HttpStatus.BAD_GATEWAY);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            log.error("SiliconFlow OCR request interrupted", ex);
            throw new BusinessException("OCR_004", "SiliconFlow OCR 请求被中断", HttpStatus.BAD_GATEWAY);
        }
    }

    private OcrRecognizeResponse recognizeByMock(MultipartFile file) {
        String rawName = file == null ? "" : file.getOriginalFilename();
        String extractedText = normalizeSeedText(rawName);
        if (extractedText.isBlank()) {
            extractedText = UNRECOGNIZED_TEXT;
        }
        String categoryCode = inferCategory(extractedText, null);
        String poiName = UNRECOGNIZED_TEXT.equals(extractedText) ? null : truncate(extractedText, 128);
        String description = buildDescription(poiName, extractedText, null);
        double confidence = poiName == null ? 0.42D : 0.78D;
        return new OcrRecognizeResponse(
                extractedText,
                poiName,
                description,
                categoryCode,
                confidence,
                "MOCK_OCR"
        );
    }

    private Map<String, Object> buildQwenPayload(String dataUrl) {
        return Map.of(
                "model", ocrProperties.model(),
                "messages", List.of(
                        Map.of(
                                "role", "user",
                                "content", List.of(
                                        Map.of("type", "image_url", "image_url", Map.of("url", dataUrl, "detail", "auto")),
                                        Map.of("type", "text", "text", QWEN_SYSTEM_PROMPT + "\n\n" + QWEN_USER_PROMPT)
                                )
                        )
                ),
                "temperature", 0.1D
        );
    }

    private ModelSuggestion parseModelResponse(String responseBody) throws IOException {
        JsonNode root = objectMapper.readTree(responseBody);
        JsonNode contentNode = root.path("choices").path(0).path("message").path("content");
        String content = flattenContent(contentNode);
        if (content.isBlank()) {
            throw new BusinessException("OCR_005", "OCR 服务未返回可解析内容", HttpStatus.BAD_GATEWAY);
        }

        String jsonText = extractJsonObject(content);
        JsonNode payload = objectMapper.readTree(jsonText);
        return new ModelSuggestion(
                textOrNull(payload, "extractedText"),
                textOrNull(payload, "suggestedPoiName"),
                textOrNull(payload, "suggestedDescription"),
                textOrNull(payload, "suggestedCategoryCode"),
                payload.path("confidence").isMissingNode() || payload.path("confidence").isNull()
                        ? null
                        : payload.path("confidence").asDouble()
        );
    }

    private String flattenContent(JsonNode contentNode) {
        if (contentNode == null || contentNode.isMissingNode() || contentNode.isNull()) {
            return "";
        }
        if (contentNode.isTextual()) {
            return contentNode.asText();
        }
        if (contentNode.isArray()) {
            StringBuilder builder = new StringBuilder();
            for (JsonNode item : contentNode) {
                if (item.isTextual()) {
                    builder.append(item.asText());
                    continue;
                }
                if (item.hasNonNull("text")) {
                    builder.append(item.path("text").asText());
                }
            }
            return builder.toString();
        }
        return contentNode.toString();
    }

    private String extractJsonObject(String content) {
        String normalized = content == null ? "" : content.trim();
        if (normalized.startsWith("```")) {
            normalized = normalized.replaceFirst("^```(?:json)?\\s*", "");
            normalized = normalized.replaceFirst("\\s*```$", "");
        }
        Matcher matcher = JSON_OBJECT_PATTERN.matcher(normalized);
        if (!matcher.find()) {
            throw new BusinessException("OCR_006", "OCR 服务返回内容不是有效 JSON", HttpStatus.BAD_GATEWAY);
        }
        return matcher.group();
    }

    private OcrRecognizeResponse normalizeSuggestion(ModelSuggestion suggestion, String provider) {
        String extractedText = normalizeFreeText(suggestion.extractedText(), 255);
        if (extractedText == null) {
            extractedText = UNRECOGNIZED_TEXT;
        }

        String suggestedPoiName = normalizeFreeText(suggestion.suggestedPoiName(), 128);
        if (suggestedPoiName == null && !UNRECOGNIZED_TEXT.equals(extractedText)) {
            suggestedPoiName = truncate(extractedText, 128);
        }

        String suggestedDescription = buildDescription(
                suggestedPoiName,
                extractedText,
                normalizeFreeText(suggestion.suggestedDescription(), 1000)
        );
        String suggestedCategoryCode = normalizeCategoryCode(
                suggestion.suggestedCategoryCode(),
                suggestedPoiName,
                extractedText,
                suggestedDescription
        );
        double confidence = normalizeConfidence(suggestion.confidence(), suggestedPoiName == null ? 0.45D : 0.86D);

        return new OcrRecognizeResponse(
                extractedText,
                suggestedPoiName,
                suggestedDescription,
                suggestedCategoryCode,
                confidence,
                provider
        );
    }

    private String normalizeCategoryCode(String rawCategoryCode, String poiName, String extractedText, String description) {
        if (rawCategoryCode != null && !rawCategoryCode.isBlank()) {
            String normalizedKey = rawCategoryCode.trim()
                    .toUpperCase(Locale.ROOT)
                    .replace('-', '_')
                    .replace(' ', '_');
            if (CATEGORY_ALIASES.containsKey(normalizedKey)) {
                return CATEGORY_ALIASES.get(normalizedKey);
            }

            String mappedByAlias = CATEGORY_ALIASES.get(rawCategoryCode.trim());
            if (mappedByAlias != null) {
                return mappedByAlias;
            }
        }
        return inferCategory(extractedText, joinForCategory(poiName, description));
    }

    private String inferCategory(String extractedText, String extraText) {
        String combined = joinForCategory(extractedText, extraText);
        if (combined == null || combined.isBlank()) {
            return "OTHER";
        }
        String normalized = combined.toLowerCase(Locale.ROOT);
        for (Map.Entry<String, String> entry : CATEGORY_KEYWORDS.entrySet()) {
            if (normalized.contains(entry.getKey().toLowerCase(Locale.ROOT))) {
                return entry.getValue();
            }
        }
        return "OTHER";
    }

    private String buildDescription(String poiName, String extractedText, String modelDescription) {
        String normalizedModelDescription = normalizeFreeText(modelDescription, 1000);
        if (normalizedModelDescription != null) {
            return normalizedModelDescription;
        }
        if (poiName == null || poiName.isBlank()) {
            return "OCR 未能稳定提取招牌文字，请人工补充 POI 名称与描述。";
        }
        return truncate("OCR 辅助识别到招牌文字：" + poiName + "，请人工确认后提交。", 1000);
    }

    private double normalizeConfidence(Double rawConfidence, double fallback) {
        if (rawConfidence == null) {
            return fallback;
        }
        double normalized = rawConfidence;
        if (normalized > 1D && normalized <= 100D) {
            normalized = normalized / 100D;
        }
        if (normalized < 0D || normalized > 1D) {
            return fallback;
        }
        return normalized;
    }

    private String providerName() {
        return truncate("SILICONFLOW_" + ocrProperties.model(), 64);
    }

    private String extractRemoteErrorMessage(String responseBody) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            String message = textOrNull(root.path("error"), "message");
            if (message != null) {
                return message;
            }
            message = textOrNull(root, "message");
            if (message != null) {
                return message;
            }
        } catch (Exception ex) {
            log.warn("Failed to parse Qwen OCR error response: {}", responseBody, ex);
        }
        return "远端服务返回异常";
    }

    private void validateImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("OCR_007", "OCR 图片不能为空");
        }
        String contentType = file.getContentType();
        if (contentType != null && !contentType.isBlank() && !contentType.toLowerCase(Locale.ROOT).startsWith("image/")) {
            throw new BusinessException("OCR_008", "OCR 仅支持图片文件");
        }
    }

    private String resolveImageContentType(MultipartFile file) {
        String contentType = file.getContentType();
        if (contentType != null && !contentType.isBlank()) {
            return contentType;
        }

        String filename = file.getOriginalFilename();
        if (filename == null) {
            return "image/jpeg";
        }
        String lowerName = filename.toLowerCase(Locale.ROOT);
        if (lowerName.endsWith(".png")) {
            return "image/png";
        }
        if (lowerName.endsWith(".webp")) {
            return "image/webp";
        }
        if (lowerName.endsWith(".gif")) {
            return "image/gif";
        }
        return "image/jpeg";
    }

    private String normalizeSeedText(String originalFilename) {
        if (originalFilename == null || originalFilename.isBlank()) {
            return "";
        }
        String normalized = EXTENSION_PATTERN.matcher(originalFilename).replaceFirst("");
        normalized = normalized.replaceAll("[_\\-]+", " ");
        normalized = normalized.replaceAll("\\b(img|image|photo|wx_camera|mmexport|dsc|pxl)\\b", " ");
        normalized = normalized.replaceAll("\\d+", " ");
        normalized = normalized.replaceAll("\\s{2,}", " ").trim();
        return normalized.isBlank() ? "" : truncate(normalized, 32);
    }

    private String normalizeFreeText(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        String normalized = value.replaceAll("\\s+", " ").trim();
        if (normalized.isBlank()) {
            return null;
        }
        return truncate(normalized, maxLength);
    }

    private String joinForCategory(String first, String second) {
        String left = first == null ? "" : first;
        String right = second == null ? "" : second;
        String joined = (left + " " + right).trim();
        return joined.isBlank() ? null : joined;
    }

    private String truncate(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength).trim();
    }

    private String textOrNull(JsonNode node, String fieldName) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }
        JsonNode target = node.path(fieldName);
        if (target.isMissingNode() || target.isNull()) {
            return null;
        }
        String value = target.asText();
        return value == null || value.isBlank() ? null : value;
    }

    private record ModelSuggestion(
            String extractedText,
            String suggestedPoiName,
            String suggestedDescription,
            String suggestedCategoryCode,
            Double confidence
    ) {
    }
}
