package com.poi.system.dictionary.service;

import com.poi.system.common.exception.BusinessException;
import com.poi.system.dictionary.dto.DictItemResponse;
import com.poi.system.dictionary.dto.UpsertDictItemRequest;
import com.poi.system.dictionary.entity.SystemDictItem;
import com.poi.system.dictionary.enums.SystemDictType;
import com.poi.system.dictionary.repository.SystemDictItemRepository;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SystemDictService {

    private final SystemDictItemRepository dictItemRepository;

    @Transactional(readOnly = true)
    public List<DictItemResponse> listActive(SystemDictType type) {
        return dictItemRepository.findByTypeAndActiveTrueOrderBySortOrderAscIdAsc(type).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<DictItemResponse> listAll(SystemDictType type) {
        return dictItemRepository.findByTypeOrderBySortOrderAscIdAsc(type).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public DictItemResponse create(UpsertDictItemRequest request) {
        validateUnique(request.type(), request.itemCode(), null);
        SystemDictItem item = dictItemRepository.save(SystemDictItem.builder()
                .type(request.type())
                .itemCode(normalizeCode(request.itemCode()))
                .itemName(normalizeRequiredText(request.itemName(), "DICT_001", "itemName is required"))
                .description(normalizeOptionalText(request.description()))
                .sortOrder(request.sortOrder() == null ? 0 : request.sortOrder())
                .active(request.active() == null || request.active())
                .systemDefault(false)
                .build());
        return toResponse(item);
    }

    @Transactional
    public DictItemResponse update(Long id, UpsertDictItemRequest request) {
        SystemDictItem item = dictItemRepository.findById(id)
                .orElseThrow(() -> new BusinessException("DICT_404", "dictionary item not found", HttpStatus.NOT_FOUND));
        if (item.isSystemDefault() && item.getType() != request.type()) {
            throw new BusinessException("DICT_002", "system default item type cannot be changed");
        }
        validateUnique(request.type(), request.itemCode(), id);
        item.setType(request.type());
        item.setItemCode(normalizeCode(request.itemCode()));
        item.setItemName(normalizeRequiredText(request.itemName(), "DICT_001", "itemName is required"));
        item.setDescription(normalizeOptionalText(request.description()));
        item.setSortOrder(request.sortOrder() == null ? 0 : request.sortOrder());
        item.setActive(request.active() == null || request.active());
        return toResponse(dictItemRepository.save(item));
    }

    @Transactional
    public void ensureSeedItem(SystemDictType type, String itemCode, String itemName, String description, int sortOrder) {
        dictItemRepository.findByTypeAndItemCode(type, itemCode).orElseGet(() -> dictItemRepository.save(SystemDictItem.builder()
                .type(type)
                .itemCode(itemCode)
                .itemName(itemName)
                .description(description)
                .sortOrder(sortOrder)
                .active(true)
                .systemDefault(true)
                .build()));
    }

    @Transactional(readOnly = true)
    public String requireActiveLabel(SystemDictType type, String itemCode, String errorCode, String errorMessage) {
        return dictItemRepository.findByTypeAndItemCodeAndActiveTrue(type, normalizeCode(itemCode))
                .map(SystemDictItem::getItemName)
                .orElseThrow(() -> new BusinessException(errorCode, errorMessage));
    }

    @Transactional(readOnly = true)
    public Map<String, String> getActiveLabelMap(SystemDictType type) {
        Map<String, String> labelMap = new LinkedHashMap<>();
        for (SystemDictItem item : dictItemRepository.findByTypeAndActiveTrueOrderBySortOrderAscIdAsc(type)) {
            labelMap.put(item.getItemCode(), item.getItemName());
        }
        return labelMap;
    }

    private void validateUnique(SystemDictType type, String rawCode, Long currentId) {
        String code = normalizeCode(rawCode);
        boolean exists = currentId == null
                ? dictItemRepository.findByTypeAndItemCode(type, code).isPresent()
                : dictItemRepository.existsByTypeAndItemCodeAndIdNot(type, code, currentId);
        if (exists) {
            throw new BusinessException("DICT_003", "dictionary code already exists");
        }
    }

    private String normalizeCode(String value) {
        String normalized = normalizeRequiredText(value, "DICT_004", "itemCode is required")
                .replace('-', '_')
                .replace(' ', '_')
                .toUpperCase();
        if (!normalized.matches("[A-Z0-9_]+")) {
            throw new BusinessException("DICT_005", "itemCode only supports letters, numbers and underscore");
        }
        return normalized;
    }

    private String normalizeRequiredText(String value, String errorCode, String errorMessage) {
        String normalized = normalizeOptionalText(value);
        if (normalized == null) {
            throw new BusinessException(errorCode, errorMessage);
        }
        return normalized;
    }

    private String normalizeOptionalText(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private DictItemResponse toResponse(SystemDictItem item) {
        return new DictItemResponse(
                item.getId(),
                item.getType(),
                item.getItemCode(),
                item.getItemName(),
                item.getDescription(),
                item.getSortOrder(),
                item.isActive(),
                item.isSystemDefault()
        );
    }
}
