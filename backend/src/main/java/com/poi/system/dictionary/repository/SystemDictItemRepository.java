package com.poi.system.dictionary.repository;

import com.poi.system.dictionary.entity.SystemDictItem;
import com.poi.system.dictionary.enums.SystemDictType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SystemDictItemRepository extends JpaRepository<SystemDictItem, Long> {

    List<SystemDictItem> findByTypeOrderBySortOrderAscIdAsc(SystemDictType type);

    List<SystemDictItem> findByTypeAndActiveTrueOrderBySortOrderAscIdAsc(SystemDictType type);

    Optional<SystemDictItem> findByTypeAndItemCode(SystemDictType type, String itemCode);

    Optional<SystemDictItem> findByTypeAndItemCodeAndActiveTrue(SystemDictType type, String itemCode);

    boolean existsByTypeAndItemCodeAndIdNot(SystemDictType type, String itemCode, Long id);
}
