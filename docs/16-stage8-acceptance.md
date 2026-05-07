# 阶段 8 验收说明：OCR、微信绑定与完整版本收尾

## 1. 阶段目标

阶段 8 的目标是把课程项目从“主流程可跑”推进到“完整版本可演示”，补齐外部能力接入、账号体验、审计留痕和报表导出。

## 2. 本阶段实际完成内容

### 2.1 后端

已完成：

- 新增 `OCR` 识别接口：`POST /api/v1/ocr/recognize`
- 新增微信绑定 / 微信快捷登录接口：
  - `POST /api/v1/auth/wechat/login`
  - `GET /api/v1/auth/wechat/binding`
  - `POST /api/v1/auth/wechat/bind`
  - `DELETE /api/v1/auth/wechat/bind`
- 新增 `sys_operation_log`、`sys_login_log`
- 新增管理端审计接口：
  - `GET /api/v1/admin/audit/operations`
  - `GET /api/v1/admin/audit/logins`
- 新增报表导出接口：
  - `GET /api/v1/admin/reports/pois.csv`
  - `GET /api/v1/admin/reports/users.csv`
  - `GET /api/v1/admin/reports/audit.csv`
- `POI` 已支持保存 OCR 文本、OCR 置信度和 OCR 来源
- 文件上传返回实际落盘策略 `storageMode`
- 异常处理补充缺参、非法请求体、方法错误等提示

### 2.2 管理端

已完成：

- 看板页增加阶段 8 说明
- 新增导出 `POI / 用户 / 审计` 报表入口
- 增加分类覆盖与外部能力指标
- 运营配置页新增：
  - 微信绑定状态列
  - 操作审计页签
  - 登录留痕页签

### 2.3 移动端

已完成：

- 登录页增加微信快捷登录入口
- 首页增加微信绑定状态展示
- 新增“账号安全”页管理微信绑定
- `PoiFormScreen` 增加：
  - 图片预上传状态
  - OCR 招牌文字识别按钮
  - OCR 结果展示
  - 一键回填名称 / 描述 / 分类

## 3. 当前能力边界

当前阶段 8 默认提供的是：

- `mock 微信授权码` 演示流程
- `mock OCR` 可替换式接口
- CSV 导出
- 审计与登录留痕

当前未扩展：

- 真实微信 OAuth 回调
- 真实云 OCR 服务商联网调用
- Excel 多 Sheet 导出
- 图片消息 / 文件消息 OCR 批处理

## 4. 验收路径

### 4.1 移动端 OCR

1. 用 `collector / 123456` 登录移动端
2. 进入“新建 POI”
3. 选择一张文件名带有招牌语义的图片，例如包含 `服务站`、`社区`、`卫生` 等关键词
4. 点击“识别招牌文字”
5. 应看到 OCR 建议结果
6. 点击“一键回填”后，应回填名称 / 分类 / 描述建议

### 4.2 微信快捷登录

1. 打开移动端登录页
2. 在“微信快捷登录”中输入：
   - `wx-collector2`
   - 或 `wx-verifier2`
   - 或 `wx-admin`
3. 点击“微信快捷登录”
4. 应直接进入系统

### 4.3 微信绑定

1. 使用普通账号密码登录移动端
2. 进入“账号安全”
3. 输入一个新的 mock 微信授权码，例如 `wx-collector-demo`
4. 点击“绑定当前账号”
5. 返回首页后应能看到微信状态已绑定

### 4.4 审计日志

1. 在移动端执行一次：
   - POI 创建 / 编辑 / 提交
   - 微信绑定
2. 在管理端登录 `admin / 123456`
3. 进入“运营配置”
4. 查看“操作审计”页签
5. 应能看到对应留痕

### 4.5 报表导出

1. 使用 `admin / 123456` 登录管理端
2. 进入首页看板
3. 点击“导出 POI”/“导出用户”/“导出审计”
4. 应下载对应 CSV 文件

## 5. 已完成验证

```bash
npx tsc --noEmit -p apps/mobile-app/tsconfig.json
npm run build --prefix apps/admin-web
gradle --no-daemon -p backend compileJava
```

结果：

- 移动端 TypeScript 检查通过
- 管理端构建通过
- 后端 Java 编译通过

## 6. 当前结论

阶段 8 可视为完成。
