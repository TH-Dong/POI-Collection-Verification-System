# 阶段 1 启动说明

## 1. 阶段 1 已完成内容

- 初始化 `React Admin Web`
- 初始化 `React Native Mobile App`
- 初始化 `Spring Boot Backend`
- 接入 `MySQL`、`Redis`、`MinIO`
- 实现登录、JWT 鉴权、角色权限控制
- 实现统一响应格式、全局异常处理、请求日志
- 实现基础文件上传接口
- 提供低保真可运行页面

## 2. 工程目录

```text
.
├── apps
│   ├── admin-web
│   └── mobile-app
├── backend
├── docs
├── infra
└── docker-compose.yml
```

## 3. 默认账号

系统启动后会自动初始化三类账号：

- 管理员：`admin / 123456`
- 采集者：`collector / 123456`
- 核验者：`verifier / 123456`

## 4. 后端接口

### 4.1 认证接口

- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`

### 4.2 占位页接口

- `GET /api/v1/admin/home`
- `GET /api/v1/mobile/home`

### 4.3 文件上传接口

- `POST /api/v1/files/upload`

## 5. 本地依赖启动

先复制环境变量：

```bash
cp .env.example .env
```

再启动基础设施：

```bash
docker compose up -d
```

启动后可用地址：

- MySQL: `localhost:3306`
- Redis: `localhost:6379`
- MinIO API: `http://localhost:9000`
- MinIO Console: `http://localhost:9001`

如果后端在本机访问 MinIO 出现奇怪的协议错误，优先把 `.env` 里的 `MINIO_ENDPOINT` 写成：

```bash
MINIO_ENDPOINT=http://127.0.0.1:9000
```

阶段 1 推荐同时保留：

```bash
FILE_STORAGE_MODE=MINIO_FALLBACK_LOCAL
```

这样即使 MinIO 在当前机器上受代理或 SDK 行为影响，上传也不会阻塞整个阶段 1 联调。

## 6. 后端启动
  你以后每次启动后端，进项目后输入这条就行：

cd backend
env -u HTTPS_PROXY -u HTTP_PROXY -u ALL_PROXY -u https_proxy -u http_proxy -u all_proxy \
JAVA_HOME=$(/usr/libexec/java_home -v 17) \
GRADLE_USER_HOME=$PWD/.gradle \
gradle --no-daemon bootRun

  启动后可以用这个地址检查：
  http://localhost:8080/api/v1/auth/health

  如果要停掉后端，启动它的那个终端里按 Ctrl+C。
  
当前仓库已经补齐了 `Gradle` 构建脚本，但当前环境里未安装 `gradle`，也没有生成 `gradle wrapper`。因此启动方式有两种：

### 方案 A：本机已安装 Gradle

```bash
cd backend
gradle bootRun
```

### 方案 B：先生成 wrapper 再启动

```bash
cd backend
gradle wrapper
./gradlew bootRun
```

默认后端地址：

- `http://localhost:8080`

如果终端提示 `8080` 被占用，不要重复启动新的后端实例。先确认已有 `java` 进程是否已经把服务跑起来。

## 7. 管理端启动

先安装依赖：

```bash
npm install
```

再启动管理端：

```bash
npm run admin:dev
```

默认地址：

- `http://localhost:5173`

如果要启用阶段 4 的管理端高德地图页，还需要在根目录 `.env` 中增加：

```bash
VITE_AMAP_WEB_KEY=你的高德 Web 端 Key
VITE_AMAP_SECURITY_JSCODE=你的高德安全密钥 jscode
```

修改后需要重启管理端。

## 8. 移动端启动

安装依赖后执行：

```bash
npm run mobile:start
```

默认采用 `Expo` 方式运行。

如果使用真机 `Expo Go`，必须把根目录 `.env` 中的 `EXPO_PUBLIC_API_BASE_URL` 改成你电脑在局域网中的真实 IP，例如：

```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.23:8080
```

当前项目也支持在 `apps/mobile-app/.env` 中单独配置该变量，优先建议把移动端专用地址写在这个文件里。

如果要启用阶段 4 的移动端高德地图页，还需要在 `apps/mobile-app/.env` 中增加：

```bash
EXPO_PUBLIC_AMAP_WEB_KEY=你的高德 Web 端 Key
EXPO_PUBLIC_AMAP_SECURITY_JSCODE=你的高德安全密钥 jscode
```

说明：

- 真机里 `localhost` 指的是手机自己，不是你的电脑
- Android 模拟器通常使用 `http://10.0.2.2:8080`
- iOS 模拟器通常可以继续使用 `http://localhost:8080`
- 修改地图 Key 后同样需要重启 Expo

修改 `.env` 后，需要重启 Expo。

## 9. 当前阶段的边界

阶段 1 只完成基础骨架和公共能力，不包含以下内容：

- POI 业务表单
- 核验流程
- 地图展示
- 异议处理
- 私聊群聊

## 10. 后续建议

阶段 2 直接从以下内容开始：

- POI 采集表单
- 分类字典接口
- 图片和定位绑定
- “我的 POI” 列表与详情
