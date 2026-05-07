# POI 数据采集及核验移动应用

本仓库当前已完成：

- `阶段 0：项目定义与架构基线`
- `阶段 1：系统骨架与基础能力`
- `阶段 2：POI 采集最小闭环`
- `阶段 3：核验与整改闭环`
- `阶段 4：地图查询与空间辅助`
- `阶段 5：异议处理与最终裁定`
- `阶段 6：任务、通知与后台运营`
- `阶段 7：私聊、群聊与协作增强`
- `阶段 8：OCR、微信与优化收尾`

## 阶段 0 交付物

- [需求说明](docs/01-requirements.md)
- [系统架构基线](docs/02-architecture-baseline.md)
- [状态机与核心流程](docs/03-state-machine-and-process.md)
- [数据库初稿](docs/04-data-model-draft.md)
- [接口与开发规范](docs/05-api-and-dev-conventions.md)
- [迭代计划](docs/06-iteration-plan.md)
- [阶段 1 启动说明](docs/07-stage1-setup.md)
- [阶段 1 验收说明](docs/08-stage1-acceptance.md)
- [阶段 2 验收说明](docs/09-stage2-acceptance.md)
- [阶段 3 验收说明](docs/10-stage3-acceptance.md)
- [阶段 4 验收说明](docs/11-stage4-acceptance.md)
- [阶段 5 验收说明](docs/12-stage5-acceptance.md)
- [阶段 6 验收说明](docs/13-stage6-acceptance.md)
- [阶段 7 验收说明](docs/14-stage7-acceptance.md)
- [阶段 8 验收说明](docs/16-stage8-acceptance.md)
- [当前功能使用手册](docs/15-current-feature-guide.md)

## 阶段 0 目标

- 明确系统目标、范围、角色和核心用例
- 明确最关键的业务对象与状态机
- 给出课程项目可落地的技术架构基线
- 形成阶段 1 开发前必须统一的数据库、接口和规范草稿

## 后续阶段

- 阶段 2：POI 采集最小闭环
- 阶段 3：核验与整改闭环
- 阶段 4：地图查询与空间辅助
- 阶段 5：异议处理与最终裁定
- 阶段 6：任务、通知与后台运营
- 阶段 8：OCR、微信与优化收尾

## 当前工程结构

- `backend`：Spring Boot 后端，包含登录鉴权、角色权限、统一响应、异常处理、日志、文件上传、OCR、微信绑定与导出
- `apps/admin-web`：React 管理端，当前包含管理员进展查看、核验者审核工作台、争议处理中心和地图空间视图
- `apps/mobile-app`：React Native（Expo）移动端，当前包含采集者工作流、核验者待处理工作流、争议处理入口和高德地图页
- `infra`：MySQL 初始化脚本
- `docker-compose.yml`：MySQL、Redis、MinIO 本地依赖

补充说明：

- 管理端地图页需要根目录 `.env` 中配置 `VITE_AMAP_WEB_KEY`
- 移动端地图页需要 `apps/mobile-app/.env` 中配置 `EXPO_PUBLIC_AMAP_WEB_KEY`
- 高德 JSAPI 新 key 还需要同时配置对应 `jscode`
