# AGENTS.md

## 项目概况

项目名称：`POI 数据采集及核验移动应用`

当前技术栈：

- 后端：`Spring Boot 3 + Java 17 + JPA + Spring Security + JWT`
- 管理端：`React + TypeScript + Vite + Ant Design`
- 移动端：`React Native + Expo + TypeScript`
- 基础设施：`MySQL + Redis + MinIO + Docker Compose`

当前仓库是单仓结构：

- `backend`
- `apps/admin-web`
- `apps/mobile-app`
- `docs`
- `infra`

## 当前阶段状态

已完成：

- 阶段 0：需求与架构基线
- 阶段 1：系统骨架与基础能力
- 阶段 2：POI 采集最小闭环
- 阶段 3：核验与整改闭环
- 阶段 4：地图查询与空间辅助
- 阶段 5：异议处理与最终裁定
- 阶段 6：任务管理、通知与后台运营
- 阶段 7：私聊、群聊与协作增强
- 阶段 8：OCR、微信绑定与完整版本收尾

当前默认应视为：**阶段 8 已完成，仓库已进入完整版本状态**

## 当前已完成的业务闭环

已打通链路：

1. 采集者移动端登录
2. 新建 POI
3. 拍照/选图
4. 获取定位
5. 选择分类
6. 填写描述
7. 保存草稿 `DRAFT`
8. 提交待核验 `SUBMITTED`
9. 查看“我提交的 POI”列表
10. 查看 POI 详情
11. 核验者查看待核验列表
12. 核验者查看 POI 详情并审核
13. 核验者核验通过 `APPROVED`
14. 核验者驳回整改 `REJECTED`
15. 采集者查看整改意见
16. 采集者基于原记录整改并重新提交 `RESUBMITTED`
17. 管理员后台查看全量处理进展和详情
18. 管理端地图页查看 POI 分布、问题点和处理进展
19. 管理端从列表 / 详情跳转地图定位点位
20. 移动端采集者查看“我的地图”
21. 移动端核验者查看“空间核验”地图
22. 移动端通过高德地图查看点位、问题标记和导航入口
23. 管理端任务中心查看、新建、编辑任务
24. POI 提交 / 整改后自动生成核验任务
25. 异议创建 / 升级后自动生成争议或裁定任务
26. 管理端通知中心群发通知、管理模板
27. 移动端查看任务中心和通知中心
28. 管理端配置 POI 分类、错误类型、流程规则和用户角色
29. 管理端首页查看基础统计看板
30. 移动端 OCR 辅助识别招牌文字并回填建议
31. 移动端账号微信绑定 / 已绑定账号微信快捷登录
32. 管理端查看操作审计日志与登录留痕
33. 管理端导出 POI / 用户 / 审计 CSV 报表

当前支持八个状态：

- `DRAFT`
- `SUBMITTED`
- `APPROVED`
- `REJECTED`
- `RESUBMITTED`
- `DISPUTING`
- `ARBITRATING`
- `FINALIZED`

## 当前重要目录和职责

### 后端

- `backend/src/main/java/com/poi/system/auth`
  登录、当前用户、JWT、微信绑定 / 微信登录
- `backend/src/main/java/com/poi/system/ocr`
  OCR 识别辅助接口
- `backend/src/main/java/com/poi/system/audit`
  审计日志、登录留痕
- `backend/src/main/java/com/poi/system/report`
  报表导出
- `backend/src/main/java/com/poi/system/security`
  安全配置、JWT 过滤器、权限
- `backend/src/main/java/com/poi/system/file`
  上传接口、文件存储、回退策略
- `backend/src/main/java/com/poi/system/poi`
  POI 分类、POI 主数据、采集接口、核验接口、列表详情接口
- `backend/src/main/java/com/poi/system/dispute`
  异议单、沟通记录、升级、最终裁定
- `backend/src/main/java/com/poi/system/task`
  任务中心、任务派发、任务状态
- `backend/src/main/java/com/poi/system/notice`
  站内通知、通知模板、异步通知适配
- `backend/src/main/java/com/poi/system/dictionary`
  POI 分类、错误类型等后台字典
- `backend/src/main/java/com/poi/system/rule`
  流程规则配置
- `backend/src/main/java/com/poi/system/dashboard`
  统计首页
- `backend/src/main/resources/application.yml`
  后端配置

### 管理端

- `apps/admin-web/src/pages`
  当前主要页面：登录、阶段 6 统计首页、任务中心、通知中心、待核验列表/处理进展列表、POI 详情审核页、POI 进展详情页、争议处理中心、争议详情、最终裁定页、运营配置页
- `apps/admin-web/src/api`
  与后端 API 对接
- `apps/admin-web/src/layouts`
  后台整体布局

### 移动端

- `apps/mobile-app/src/screens/LoginScreen.tsx`
- `apps/mobile-app/src/screens/HomeScreen.tsx`
- `apps/mobile-app/src/screens/TaskCenterScreen.tsx`
- `apps/mobile-app/src/screens/NoticeCenterScreen.tsx`
- `apps/mobile-app/src/screens/PoiFormScreen.tsx`
- `apps/mobile-app/src/screens/PoiListScreen.tsx`
- `apps/mobile-app/src/screens/PoiDetailScreen.tsx`
- `apps/mobile-app/src/screens/PoiMapScreen.tsx`
- `apps/mobile-app/src/screens/VerifierPoiListScreen.tsx`
- `apps/mobile-app/src/screens/VerifierPoiDetailScreen.tsx`
- `apps/mobile-app/src/screens/DisputeSubmitScreen.tsx`
- `apps/mobile-app/src/screens/VerifierDisputeListScreen.tsx`
- `apps/mobile-app/src/screens/VerifierDisputeDetailScreen.tsx`
- `apps/mobile-app/src/screens/UploadTestScreen.tsx`
- `apps/mobile-app/src/api`
  移动端接口层
- `apps/mobile-app/src/navigation/RootNavigator.tsx`
  页面导航

## 重要业务说明

### UploadTestScreen

`UploadTestScreen` 是开发/联调用页面，不是核心业务页。

用途：

- 单独验证移动端图片上传
- 排查上传问题是页面、接口还是存储导致

如果后续进行 UI 清理，可以：

- 从首页移除入口
- 保留代码作为调试页
- 或后续删除

### PoiListScreen

`PoiListScreen` 是正式业务页，不应删除。

用途：

- 展示当前采集者的草稿和已提交记录
- 展示整改状态与整改意见摘要
- 提供进入详情和继续编辑被驳回记录的入口

### VerifierPoiListScreen / VerifierPoiDetailScreen

这两个页面是阶段 3 的正式业务页，不是调试页。

用途：

- 为核验者提供移动端待处理入口
- 查看待核验 POI 详情
- 执行通过 / 驳回整改操作
- 填写错误标记与核验说明

### PoiMapScreen

`PoiMapScreen` 是阶段 4 的正式业务页。

用途：

- 在移动端承载高德地图空间视图
- 按分类、状态、区域筛选点位
- 高亮问题点位
- 从地图进入详情或导航入口
- 为后续真实路径规划、重复点位提醒预留扩展位

补充说明：

- 当前地图已支持右上角 `+ / -` 辅助缩放
- 移动端缩放按钮是原生浮层，不依赖 WebView 内部点击
- marker 已缩小并改用更柔和的蓝橙绿系

### DisputeSubmitScreen

`DisputeSubmitScreen` 是阶段 5 的正式业务页。

用途：

- 采集者对驳回结论发起异议
- 补充异议说明
- 推进记录进入 `DISPUTING`

### VerifierDisputeListScreen / VerifierDisputeDetailScreen

这两个页面是阶段 5 的正式业务页，不是调试页。

用途：

- 为核验者提供移动端争议处理入口
- 查看争议详情和沟通记录
- 补充说明
- 升级到最终裁定

## 文件上传策略

当前默认文件策略：

- `FILE_STORAGE_MODE=MINIO_FALLBACK_LOCAL`

含义：

- 优先尝试写入 MinIO
- 若本机代理、SDK 或网络导致 MinIO 不稳定，则自动回退到本地目录
- 本地回退文件通过后端 URL 访问，而不是 `file://`

相关代码：

- `backend/src/main/java/com/poi/system/file/service/FileStorageService.java`
- `backend/src/main/java/com/poi/system/file/controller/FileController.java`

注意：

- 当前阶段为了保证开发和演示稳定，允许本地回退
- 如果后续要做更严格部署，可把策略改为 `MINIO`

## 运行与联调方式

### Docker 基础设施

使用：

```bash
docker compose up -d
```

容器包括：

- MySQL
- Redis
- MinIO

### 后端启动

建议使用 Java 17，并清掉代理环境后启动：

```bash
cd backend
env -u HTTPS_PROXY -u HTTP_PROXY -u ALL_PROXY -u https_proxy -u http_proxy -u all_proxy \
JAVA_HOME=$(/usr/libexec/java_home -v 17) \
GRADLE_USER_HOME=$PWD/.gradle \
gradle --no-daemon bootRun
```

后端地址：

- `http://localhost:8080`

健康检查：

- `http://localhost:8080/api/v1/auth/health`

### 管理端启动

```bash
npm run admin:dev
```

管理端地址：

- `http://localhost:5173`

### 移动端启动

```bash
cd apps/mobile-app
npx expo start --host lan
```

当前 Expo 常用地址：

- `exp://192.168.92.81:8081`

注意：

- 局域网 IP 可能变化，若变化需同步更新 `apps/mobile-app/.env`

## 当前环境变量重点

根目录 `.env` 里重要项包括：

- `MINIO_ENDPOINT=http://127.0.0.1:9000`
- `FILE_STORAGE_MODE=MINIO_FALLBACK_LOCAL`
- `VITE_API_BASE_URL=http://localhost:8080`
- `VITE_AMAP_WEB_KEY=你的高德 Web 端 Key`
- `VITE_AMAP_SECURITY_JSCODE=你的高德安全密钥 jscode`
- `EXPO_PUBLIC_API_BASE_URL=http://192.168.92.81:8080`
- `EXPO_PUBLIC_AMAP_WEB_KEY=你的高德 Web 端 Key`
- `EXPO_PUBLIC_AMAP_SECURITY_JSCODE=你的高德安全密钥 jscode`

移动端目录也有：

- `apps/mobile-app/.env`

其中：

- `EXPO_PUBLIC_API_BASE_URL` 必须是电脑局域网 IP，不能是 `localhost`
- `VITE_AMAP_WEB_KEY` 用于管理端高德地图页
- `VITE_AMAP_SECURITY_JSCODE` 用于管理端 JSAPI 新 key 的安全配置
- `EXPO_PUBLIC_AMAP_WEB_KEY` 用于移动端 `WebView + 高德 JSAPI` 地图页
- `EXPO_PUBLIC_AMAP_SECURITY_JSCODE` 用于移动端 JSAPI 新 key 的安全配置

## 默认账号

- 管理员：`admin / 123456`
- 采集者：`collector / 123456`
- 核验者：`verifier / 123456`

说明：

- 当前实现不再依赖 `thirdparty` 独立角色
- 如果旧数据库里残留 `thirdparty` 账号，可忽略

## 已知历史问题

这些问题之前出现过，后续不要重复踩：

1. Java 版本错误
   后端要求 `Java 17`

2. JWT_SECRET 被误当成 Base64
   已修复，见 `JwtTokenProvider`

3. Expo 默认入口解析错误
   已改为 `apps/mobile-app/index.js`

4. 真机 Expo 访问后端失败
   原因是手机不能用 `localhost:8080`
   必须使用局域网 IP

5. MinIO 可能受本机代理干扰
   所以当前默认采用 `MINIO_FALLBACK_LOCAL`

6. 移动端地图页不显示高德底图
   原因通常是未配置 `EXPO_PUBLIC_AMAP_WEB_KEY`
   修改 `apps/mobile-app/.env` 后需要重启 Expo

7. 管理端地图页不显示高德底图
   原因通常是未配置 `VITE_AMAP_WEB_KEY`
   修改根目录 `.env` 后需要重启 `npm run admin:dev`

8. 高德 JSAPI 新 key 未配置 `jscode`
   管理端和移动端都可能导致地图不显示
   需要同时配置：
   - `VITE_AMAP_SECURITY_JSCODE`
   - `EXPO_PUBLIC_AMAP_SECURITY_JSCODE`

9. 移动端地图样式或缩放按钮未更新
   通常是 Expo 缓存未清干净
   需要执行 `npx expo start -c`

## 如果下一个 Agent 接手，应优先知道的事

1. 当前不是从零开始，阶段 6 已完成。
2. 不要重做登录、上传、采集、核验、整改、地图、争议、任务和通知流程骨架。
3. 管理端已经有任务中心、通知中心、运营配置页和统计首页。
4. 移动端已有任务中心、通知中心和首页待办提醒。
5. 当前最终裁定由 `admin` 负责，不再依赖独立 `thirdparty` 角色。
6. 移动端地图依赖 `react-native-webview`，并通过 `EXPO_PUBLIC_AMAP_WEB_KEY` 加载高德 JSAPI。
7. 当前已不是阶段 6/7 初始仓库，阶段 8 已完成。

## 阶段 8 收尾结果

当前仓库已额外具备：

1. OCR 辅助识别与表单回填
2. 微信绑定与 mock 快捷登录
3. 上传状态增强
4. 操作审计与登录留痕
5. 管理端导出报表

## 如果只做前端 UI 美化

只允许修改：

- `apps/admin-web/src/layouts/**`
- `apps/admin-web/src/pages/**`
- `apps/admin-web/src/components/**`
- `apps/admin-web/src/styles/**`
- `apps/mobile-app/src/screens/**`
- `apps/mobile-app/src/components/**`
- `apps/mobile-app/src/navigation/RootNavigator.tsx`

不要改：

- `backend/**`
- `apps/admin-web/src/api/**`
- `apps/admin-web/src/store/**`
- `apps/admin-web/src/router/**`
- `apps/admin-web/src/types/**`
- `apps/mobile-app/src/api/**`
- `apps/mobile-app/src/store/**`
- `apps/mobile-app/src/types/**`
- `docs/**`
- `.env*`
- `docker-compose.yml`

## 关键文档入口

- `docs/07-stage1-setup.md`
- `docs/08-stage1-acceptance.md`
- `docs/09-stage2-acceptance.md`
- `docs/10-stage3-acceptance.md`
- `docs/11-stage4-acceptance.md`
- `docs/12-stage5-acceptance.md`

如果新对话需要快速恢复上下文，优先读：

1. 本文件 `AGENTS.md`
2. `docs/12-stage5-acceptance.md`
3. `README.md`
