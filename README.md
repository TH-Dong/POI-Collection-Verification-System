# POI 数据采集及核验系统

武汉大学遥感信息工程学院 2024 级《数字软件工程架构》课程设计项目。

本项目实现了一个面向 POI 数据采集、核验和管理的多端系统，包含后端服务、Web 管理端和移动端应用。系统支持采集者现场提交 POI，核验者审核与驳回整改，管理员查看处理进展、任务、通知、地图分布和审计报表。

## 主要功能

- 账号登录、角色权限与 JWT 鉴权
- POI 新建、草稿保存、提交、核验和整改
- 移动端拍照/选图、定位、分类填写和 OCR 辅助识别
- 管理端 POI 列表、详情、地图展示和处理进展查看
- 任务中心、通知中心、争议处理和最终裁定
- 操作审计、登录留痕和 CSV 报表导出

## 技术栈

- 后端：Spring Boot 3、Java 17、JPA、Spring Security
- 管理端：React、TypeScript、Vite、Ant Design
- 移动端：React Native、Expo、TypeScript
- 基础设施：MySQL、Redis、MinIO、Docker Compose

## 目录结构

```text
backend/          后端服务
apps/admin-web/   Web 管理端
apps/mobile-app/  移动端应用
docs/             项目文档
infra/            基础设施初始化脚本
```

## 本地运行

1. 安装依赖

```bash
npm install
```

2. 准备环境变量

```bash
cp .env.example .env
```

按需填写 `.env` 中的数据库、JWT、地图、OCR、微信等配置。真实 key 不要提交到 GitHub。

3. 启动基础设施

```bash
docker compose up -d
```

4. 启动后端

```bash
cd backend
env -u HTTPS_PROXY -u HTTP_PROXY -u ALL_PROXY -u https_proxy -u http_proxy -u all_proxy \
JAVA_HOME=$(/usr/libexec/java_home -v 17) \
GRADLE_USER_HOME=$PWD/.gradle \
gradle --no-daemon bootRun
```

后端地址：`http://localhost:8080`

5. 启动管理端

```bash
npm run admin:dev
```

管理端地址：`http://localhost:5173`

6. 启动移动端

```bash
cd apps/mobile-app
npx expo start --host lan
```

移动端真机调试时，`EXPO_PUBLIC_API_BASE_URL` 需要填写电脑的局域网 IP，不能使用 `localhost`。

## 默认演示账号

- 管理员：`admin / 123456`
- 采集者：`collector / 123456`
- 核验者：`verifier / 123456`

## 注意事项

- `.env` 和各端本地环境变量文件不应提交到仓库。
- `.env.example` 只保留示例字段，不包含真实密钥。
- 高德地图、OCR、微信登录等第三方能力需要自行配置对应平台 key。
