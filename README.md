# POI 数据采集及核验系统

面向教学演示与课程项目落地的 POI 数据采集、核验、整改、争议处理与协作系统。项目采用单仓结构，包含后端、管理端和移动端，覆盖从采集者现场上报到核验者审核、整改闭环、系统通知、地图辅助、OCR 识别、微信绑定与协作会话的完整流程。

## 软件介绍

本系统的核心目标是解决 POI 数据从“发现问题”到“提交、核验、整改、确认”的完整流程问题，适用于需要移动端采集、后台运营、地图定位辅助和多角色协作的场景。

当前仓库已完成以下能力：

- 账号登录、角色权限、JWT 鉴权
- POI 新建、草稿保存、提交待核验
- 核验通过、驳回整改、再次提交
- 地图展示、空间辅助定位、导航入口
- 任务中心、通知中心、系统公告
- 协作会话、私聊、群聊、头像昵称展示
- OCR 招牌文字识别辅助回填
- 微信绑定与微信快捷登录接入
- 报表导出、操作审计、登录留痕

当前默认视为：`阶段 8 已完成`

## 技术栈

- 后端：`Spring Boot 3` + `Java 17` + `JPA` + `Spring Security` + `JWT`
- 管理端：`React` + `TypeScript` + `Vite` + `Ant Design`
- 移动端：`React Native` + `Expo` + `TypeScript`
- 基础设施：`MySQL` + `Redis` + `MinIO` + `RabbitMQ` + `Docker Compose`

## 仓库结构

- `backend`：后端服务，负责认证、POI 业务、核验、争议、任务、通知、OCR、微信、文件上传、审计等
- `apps/admin-web`：Web 管理端，面向管理员和运营视角
- `apps/mobile-app`：移动端，面向采集者与核验者
- `infra`：基础设施初始化脚本
- `docs`：阶段文档、验收文档、使用说明

## 系统角色

当前系统主要包含三个角色：

- `admin`：管理员，负责全局运营、公告、配置、任务、报表与审计
- `collector`：采集者，负责现场 POI 数据采集、提交、整改、异议发起
- `verifier`：核验者，负责查看待核验数据、审核、驳回整改、争议处理

## 采集者功能

采集者在移动端可完成以下工作：

- 账号登录
- 查看首页待处理任务、高优先级任务、通知、会话
- 新建 POI
- 拍照或从相册选择现场图片
- 自动获取定位或使用地图辅助定位
- 选择分类并填写名称、描述
- 保存草稿
- 提交待核验记录
- 查看“我提交的 POI”列表
- 查看 POI 详情与历史核验记录
- 接收整改意见并修改后重新提交
- 发起异议申请
- 使用 OCR 辅助识别招牌文字并回填
- 绑定微信并进行快捷登录
- 在设置中维护昵称与头像
- 进入协作会话与相关人员沟通

## 核验者功能

核验者在移动端可完成以下工作：

- 账号登录
- 查看待处理任务、高优先级任务、通知、会话
- 查看待核验 POI 列表
- 查看 POI 详情、图片、地图位置和采集信息
- 对 POI 执行通过或驳回整改
- 填写核验意见和问题标签
- 查看争议列表和争议详情
- 处理沟通记录并升级到最终裁定流程
- 进入协作会话与采集者沟通
- 查看角色专属系统公告
- 使用头像和昵称参与协作会话

## 管理端功能

管理端主要面向管理员或课程演示操作：

- 登录后台管理系统
- 查看首页统计看板
- 查看全量 POI 处理进展
- 查看地图分布、问题点位和处理状态
- 管理任务中心
- 管理通知中心和模板
- 管理字典、分类、规则配置
- 查看审计日志与登录留痕
- 导出 POI / 用户 / 审计 CSV 报表

## 业务流程概览

### 采集闭环

1. 采集者登录移动端
2. 创建 POI
3. 上传现场图片
4. 获取定位
5. 选择分类并填写信息
6. 可选触发 OCR 识别辅助
7. 保存草稿或直接提交

### 核验闭环

1. 核验者查看待核验列表
2. 打开 POI 详情
3. 结合图片、位置、描述执行审核
4. 审核通过进入 `APPROVED`
5. 驳回则进入 `REJECTED`
6. 采集者整改后再次提交为 `RESUBMITTED`

### 争议闭环

1. 采集者对驳回结论发起异议
2. 记录进入 `DISPUTING`
3. 核验者沟通或升级处理
4. 管理员最终裁定

## 默认账号

- 管理员：`admin / 123456`
- 采集者：`collector / 123456`
- 核验者：`verifier / 123456`

## 环境要求

本地开发建议环境：

- `Node.js 18+`
- `npm 9+`
- `Java 17`
- `Docker Desktop`
- Android 真机或模拟器

## 环境变量说明

根目录 `.env` 中重点变量：

```env
MINIO_ENDPOINT=http://127.0.0.1:9000
FILE_STORAGE_MODE=MINIO_FALLBACK_LOCAL
VITE_API_BASE_URL=http://localhost:8080
EXPO_PUBLIC_API_BASE_URL=http://你的电脑局域网IP:8080
OCR_PROVIDER=SILICONFLOW
OCR_BASE_URL=https://api.siliconflow.cn/v1
OCR_API_KEY=你的OCR服务Key
WECHAT_PROVIDER=OPEN_PLATFORM 或 MOCK
WECHAT_APP_ID=你的微信开放平台移动应用AppID
WECHAT_APP_SECRET=你的微信开放平台移动应用Secret
```

移动端目录 `apps/mobile-app/.env` 中至少需要：

```env
EXPO_PUBLIC_API_BASE_URL=http://你的电脑局域网IP:8080
EXPO_PUBLIC_AMAP_WEB_KEY=你的高德 Web Key
EXPO_PUBLIC_AMAP_SECURITY_JSCODE=你的高德 jscode
```

注意：

- 移动端不能把接口地址写成 `localhost`
- 真机调试必须使用电脑当前局域网 IP
- 修改 `.env` 后通常需要重启后端或 Expo

## 本地启动流程

### 1. 安装依赖

在仓库根目录执行：

```bash
npm install
```

### 2. 启动基础设施

```bash
docker compose up -d
```

默认会启动：

- MySQL：`3306`
- Redis：`6379`
- MinIO：`9000`
- MinIO Console：`9001`
- RabbitMQ：`5672`
- RabbitMQ Console：`15672`

### 3. 启动后端

```bash
cd backend
env -u HTTPS_PROXY -u HTTP_PROXY -u ALL_PROXY -u https_proxy -u http_proxy -u all_proxy \
JAVA_HOME=$(/usr/libexec/java_home -v 17) \
GRADLE_USER_HOME=$PWD/.gradle \
gradle --no-daemon bootRun
```

后端地址：

- `http://localhost:8080`
- 健康检查：`http://localhost:8080/api/v1/auth/health`

### 4. 启动管理端

在仓库根目录执行：

```bash
npm run admin:dev
```

管理端默认地址：

- `http://localhost:5173`

### 5. 启动移动端

```bash
cd apps/mobile-app
npx expo start --host lan
```

如果要用原生能力调试：

```bash
cd apps/mobile-app
npx expo start --dev-client
```

## 详细下载与使用流程

下面的流程面向第一次在新电脑或新手机上使用本系统。

## APK 下载

当前可直接下载的安卓安装包：

- [下载 Android APK](./apps/mobile-app/android/app/build/outputs/apk/release/app-release.apk)

如果你是在手机上访问 GitHub：

1. 打开仓库首页
2. 进入 `README` 中的 APK 下载链接
3. 点击下载 `app-release.apk`
4. 下载完成后允许浏览器或文件管理器安装未知来源应用
5. 安装完成后打开 App

如果 GitHub 页面预览没有直接开始下载，可以进入该文件页面后选择 `Download raw file`。

### A. 下载源码

1. 打开项目仓库 GitHub 页面
2. 选择 `Code`
3. 使用 `git clone` 或直接下载 ZIP

```bash
git clone https://github.com/TH-Dong/POI-Collection-Verification-System.git
cd POI-Collection-Verification-System
```

### B. 配置运行环境

1. 安装 Node.js、Java 17、Docker
2. 在根目录创建或检查 `.env`
3. 在 `apps/mobile-app/.env` 中填写移动端 API 地址与地图 Key
4. 启动 `docker compose up -d`
5. 启动后端
6. 启动管理端或移动端

### C. 管理端使用流程

1. 启动后访问 `http://localhost:5173`
2. 使用 `admin / 123456` 登录
3. 在首页查看统计面板
4. 进入任务中心、通知中心、运营配置、地图页进行管理

### D. 移动端开发模式使用流程

1. 确保手机与电脑在同一局域网
2. 修改 `apps/mobile-app/.env` 中的 `EXPO_PUBLIC_API_BASE_URL`
3. 执行：

```bash
cd apps/mobile-app
npx expo start --host lan
```

4. 使用 Expo 或 development build 打开应用
5. 使用 `collector / 123456` 或 `verifier / 123456` 登录

### E. 安卓 APK 构建与安装流程

如果你需要安装到安卓真机，而不是只用 Expo：

1. 构建 release APK

```bash
cd apps/mobile-app
npm run android:preview
```

2. 生成的 APK 默认位于：

```text
apps/mobile-app/android/app/build/outputs/apk/release/app-release.apk
```

3. 安装到已连接的安卓设备：

```bash
cd apps/mobile-app
npm run android:install-preview
```

如果需要手动安装：

```bash
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

## 给别人使用时要注意什么

可以把 APK 直接发给别人安装，但是否能正常使用，取决于后端是否可访问。

### 情况 1：你现在这种本地联调方式

当前移动端接口地址通常是：

```text
http://你的电脑局域网IP:8080
```

这意味着：

- 你的后端必须开着
- 你的电脑必须在线
- 别人的手机必须能访问到你的电脑
- 通常需要在同一局域网内

如果你关闭后端，或者别人不在同一个网络环境，App 就无法正常使用登录、列表、上传、OCR、通知等功能。

### 情况 2：你想让别人随时随地都能使用

你需要：

1. 把后端部署到公网服务器
2. 把数据库、文件服务、OCR 配置一起部署好
3. 把移动端的 `EXPO_PUBLIC_API_BASE_URL` 改成公网域名或公网 IP
4. 重新打包 APK

只有这样，别人安装后才不依赖你本地电脑持续开机。

### F. 采集者实际使用流程

1. 使用 `collector / 123456` 登录
2. 点击“新建 POI”
3. 上传现场照片
4. 自动定位或地图辅助定位
5. 填写名称、分类、描述
6. 可点击“识别招牌文字”获取 OCR 建议
7. 保存草稿或直接提交
8. 在“我的 POI”中查看处理状态
9. 如被驳回，按整改意见修改并重新提交

### G. 核验者实际使用流程

1. 使用 `verifier / 123456` 登录
2. 进入待核验列表
3. 打开某个 POI 详情
4. 核对图片、位置、描述和分类
5. 执行“通过”或“驳回整改”
6. 填写核验意见
7. 如出现争议，进入争议处理流程

## 当前 OCR 说明

当前 OCR 通过 SiliconFlow 兼容接口调用视觉大模型，用于识别招牌、门头和地点相关文字。页面中的 OCR 结果会显示模型来源说明，例如：

```text
本次结果由 SiliconFlow 提供的 Qwen/Qwen3-VL-32B-Instruct 模型生成。
```

注意：

- OCR 结果只作为辅助建议，最终仍需人工确认
- 图片越清晰、文字越居中，识别效果越稳定

## 微信登录说明

移动端微信快捷登录依赖微信开放平台移动应用配置，必须保证以下信息一致：

- Android 包名
- 应用签名 MD5
- 微信开放平台移动应用 AppID
- 移动应用已开通微信登录能力

若使用 Expo Go，只能查看页面，不能验证原生微信授权。微信登录测试应使用 development build 或 release APK。

## 常见问题

### 1. 手机访问后端失败

原因通常是移动端接口地址写成了 `localhost`。  
请把 `EXPO_PUBLIC_API_BASE_URL` 改成电脑当前局域网 IP。

### 2. 地图不显示

请检查：

- `VITE_AMAP_WEB_KEY`
- `VITE_AMAP_SECURITY_JSCODE`
- `EXPO_PUBLIC_AMAP_WEB_KEY`
- `EXPO_PUBLIC_AMAP_SECURITY_JSCODE`

### 3. OCR 识别失败

请检查：

- `OCR_PROVIDER`
- `OCR_API_KEY`
- 当前网络能否访问 `https://api.siliconflow.cn/v1`
- 图片是否清晰、是否包含招牌文字

### 4. 微信登录失败

请检查：

- `WECHAT_APP_ID`
- Android 包名
- Android 签名 MD5
- 是否安装的是正确签名的 APK
- 微信开放平台是否已审核并开通登录能力

## 相关文档

- [阶段 1 启动说明](docs/07-stage1-setup.md)
- [阶段 1 验收说明](docs/08-stage1-acceptance.md)
- [阶段 2 验收说明](docs/09-stage2-acceptance.md)
- [阶段 3 验收说明](docs/10-stage3-acceptance.md)
- [阶段 4 验收说明](docs/11-stage4-acceptance.md)
- [阶段 5 验收说明](docs/12-stage5-acceptance.md)
- [阶段 6 验收说明](docs/13-stage6-acceptance.md)
- [阶段 7 验收说明](docs/14-stage7-acceptance.md)
- [当前功能使用手册](docs/15-current-feature-guide.md)
- [阶段 8 验收说明](docs/16-stage8-acceptance.md)
