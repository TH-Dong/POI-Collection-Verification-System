# 数据库初稿

## 1. 设计原则

- 主对象与过程记录分离
- 所有关键业务保留历史记录，不直接覆盖
- 字典和配置表独立管理
- 附件统一抽象，避免图片字段散落

## 2. 核心实体

### 2.1 用户与权限

| 表名 | 作用 | 关键字段 |
|---|---|---|
| `sys_user` | 用户信息 | `id`, `username`, `password_hash`, `real_name`, `phone`, `status`, `org_id` |
| `sys_role` | 角色定义 | `id`, `code`, `name`, `status` |
| `sys_permission` | 权限定义 | `id`, `code`, `name`, `type` |
| `sys_user_role` | 用户角色关系 | `user_id`, `role_id` |
| `sys_role_permission` | 角色权限关系 | `role_id`, `permission_id` |
| `sys_org` | 组织/区域 | `id`, `name`, `parent_id`, `region_code` |

### 2.2 字典与配置

| 表名 | 作用 | 关键字段 |
|---|---|---|
| `sys_dict_type` | 字典类型 | `id`, `code`, `name` |
| `sys_dict_item` | 字典项 | `id`, `type_code`, `item_code`, `item_name`, `sort_order` |
| `sys_config` | 系统配置 | `id`, `config_key`, `config_value`, `remark` |

### 2.3 POI 与采集

| 表名 | 作用 | 关键字段 |
|---|---|---|
| `poi_info` | POI 主表 | `id`, `poi_name`, `category_code`, `status`, `current_record_id`, `longitude`, `latitude`, `address_text` |
| `poi_collection_record` | 采集记录 | `id`, `poi_id`, `collector_id`, `title`, `description`, `longitude`, `latitude`, `collected_at`, `source_type`, `ocr_text` |
| `poi_attachment` | 附件表 | `id`, `biz_type`, `biz_id`, `file_name`, `file_url`, `file_type`, `file_size` |

### 2.4 核验与整改

| 表名 | 作用 | 关键字段 |
|---|---|---|
| `poi_verification_record` | 核验记录 | `id`, `poi_id`, `collection_record_id`, `verifier_id`, `result_code`, `error_type_code`, `error_description`, `verified_at` |
| `poi_rework_order` | 整改单 | `id`, `poi_id`, `verification_id`, `collector_id`, `status`, `deadline_at`, `reply_text` |

### 2.5 异议与第三方复核

| 表名 | 作用 | 关键字段 |
|---|---|---|
| `poi_dispute` | 异议单 | `id`, `poi_id`, `rework_order_id`, `initiator_id`, `status`, `content`, `escalated_at` |
| `poi_dispute_comment` | 异议沟通记录 | `id`, `dispute_id`, `sender_id`, `content`, `created_at` |
| `poi_arbitration_record` | 第三方复核记录 | `id`, `poi_id`, `dispute_id`, `reviewer_id`, `final_result`, `description`, `reviewed_at` |

### 2.6 任务与消息

| 表名 | 作用 | 关键字段 |
|---|---|---|
| `biz_task` | 任务主表 | `id`, `task_type`, `biz_id`, `assignee_id`, `status`, `priority`, `due_at` |
| `sys_notice` | 系统通知 | `id`, `notice_type`, `title`, `content`, `receiver_scope`, `created_by` |
| `sys_notice_user` | 用户通知关系 | `notice_id`, `user_id`, `read_flag`, `read_at` |
| `im_conversation` | 会话表 | `id`, `conversation_type`, `name`, `created_by` |
| `im_message` | 消息表 | `id`, `conversation_id`, `sender_id`, `message_type`, `content`, `sent_at` |

### 2.7 审计与日志

| 表名 | 作用 | 关键字段 |
|---|---|---|
| `sys_operation_log` | 操作日志 | `id`, `operator_id`, `biz_type`, `biz_id`, `action_code`, `content`, `created_at` |
| `sys_login_log` | 登录日志 | `id`, `user_id`, `login_ip`, `login_result`, `created_at` |

## 3. 实体关系摘要

- 一个 `POI` 对应多条 `采集记录`
- 一个 `POI` 对应多条 `核验记录`
- 一个 `核验记录` 可生成一个 `整改单`
- 一个 `整改单` 可对应零个或一个 `异议单`
- 一个 `异议单` 可对应一条 `第三方复核记录`
- 一个 `任务` 指向一个业务对象

## 4. 第一阶段最小建表范围

进入阶段 1 前，建议优先实现以下表：

- `sys_user`
- `sys_role`
- `sys_user_role`
- `sys_permission`
- `sys_role_permission`
- `sys_dict_type`
- `sys_dict_item`
- `poi_info`
- `poi_collection_record`
- `poi_attachment`
- `sys_operation_log`
