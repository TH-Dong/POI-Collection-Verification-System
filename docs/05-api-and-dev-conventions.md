# 接口与开发规范

## 1. API 设计原则

- 统一前缀：`/api/v1`
- 管理端和移动端共享业务接口，但可以按场景拆分控制器
- 使用 REST 风格，复杂流程动作采用动作型子路径
- 所有接口返回统一响应结构

## 2. 统一响应结构

建议格式：

```json
{
  "code": "0",
  "message": "success",
  "data": {},
  "requestId": "trace-id"
}
```

说明：

- `code`：业务码，`0` 表示成功
- `message`：响应描述
- `data`：业务数据
- `requestId`：请求链路标识

## 3. 统一错误码分层

- `AUTH_*`：认证相关错误
- `PERM_*`：权限相关错误
- `VALID_*`：参数校验错误
- `POI_*`：POI 业务错误
- `TASK_*`：任务错误
- `FILE_*`：文件上传错误
- `SYS_*`：系统内部错误

## 4. 推荐接口清单

### 4.1 认证接口

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

### 4.2 用户与字典

- `GET /api/v1/users/me/roles`
- `GET /api/v1/dicts/{typeCode}`

### 4.3 POI 采集

- `POST /api/v1/pois`
- `GET /api/v1/pois`
- `GET /api/v1/pois/{id}`
- `POST /api/v1/pois/{id}/attachments`

### 4.4 核验与整改

- `POST /api/v1/verifications`
- `POST /api/v1/rework-orders/{id}/reply`

### 4.5 异议与复核

- `POST /api/v1/disputes`
- `POST /api/v1/disputes/{id}/escalate`
- `POST /api/v1/arbitrations`

### 4.6 消息与通知

- `GET /api/v1/notices`
- `GET /api/v1/conversations`
- `GET /api/v1/conversations/{id}/messages`

## 5. 权限设计建议

- 采用 `RBAC` 模型
- 以角色控制菜单权限、接口权限、按钮权限
- 后续可在角色基础上叠加区域数据权限

建议基础角色编码：

- `COLLECTOR`
- `VERIFIER`
- `THIRD_PARTY`
- `ADMIN`

## 6. 开发规范

### 6.1 命名规范

- Java 包名使用小写英文
- 数据库表名使用 `snake_case`
- API 路径使用复数名词
- 枚举和状态码使用全大写英文

### 6.2 分支规范

- `main`：稳定分支
- `develop`：集成分支
- `feature/*`：功能开发分支
- `fix/*`：修复分支

### 6.3 提交规范

建议采用：

- `feat:`
- `fix:`
- `docs:`
- `refactor:`
- `chore:`

### 6.4 文档规范

- 每个业务模块要有接口说明
- 每个状态流转要有文字说明
- 关键表结构变更必须同步更新文档
