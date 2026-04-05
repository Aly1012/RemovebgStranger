# 需求文档 — RemovebgStranger（AI 涂抹去除人物 · 智能背景修复）

> 最后更新：2026-04-05（第三次更新）

---

## 一、项目背景

用户上传照片后，通过画笔涂抹的方式手动标记要去除的人物区域，系统使用 AI inpainting 模型（MAT）智能修复被涂抹区域的背景，最终效果为路人"凭空消失"，背景自然融合。UI 简洁现代，参考 remove.bg 风格，支持中英双语切换。

---

## 二、目标用户

- 需要从照片中去除路人/闯入者的普通用户
- 摄影后期及内容创作者
- 社交媒体、营销短视频相关人员

---

## 三、核心需求（当前实现）

### 1. 上传功能
- 支持 JPG、PNG、WebP 格式
- 支持点击选择或拖拽上传
- 上传后立即进入涂抹阶段（无等待）

### 2. 橡皮擦涂抹工具
- 用画笔在图片上涂抹要去除的人物
- 可调节画笔大小（10px ~ 120px）
- 支持"清除重画"重置涂抹区域
- 支持触屏操作（移动端）
- 涂抹区域以半透明红色实时显示

### 3. AI 背景修复（inpainting）
- 使用 iopaint **MAT（Mask-Aware Transformer）** 模型
- 采用 CROP 策略，大图分块处理减少拼接痕迹
- 超过 1200px 的图片自动缩小处理后放大回原尺寸
- 涂抹区域自动膨胀处理，覆盖人物边缘（含发丝/阴影）
- 未涂抹区域背景像素完全保留（手动合并）

### 4. 结果展示及下载
- 处理完成后并排显示原图 vs 结果图
- 支持一键下载 PNG 格式结果图
- **🖌️ Refine Again（继续修复）按钮**：将当前结果图作为新输入，跳回涂抹阶段，支持无限迭代

### 5. 国际化（i18n）
- 支持中文 / English 双语切换
- 右上角语言切换按钮：EN 在左，中文 在右
- 默认语言：英文
- 所有页面全部适配

### 6. UI 设计
- 简洁现代，蓝紫渐变风格
- 三步进度条导航（Upload → Paint → Download）
- 响应式布局，支持移动端
- 无存储，隐私保护提示

---

## 四、用户与权限体系（已实现）

### 账号系统
- Google OAuth 登录（NextAuth.js）
- 登录后用量进度条显示在 Header 右侧
- ⚠️ 当前 Google OAuth 为测试模式，仅限自己账号登录；上线需在 Google Cloud Console 发布应用

### 配额规则

| 用户类型 | 月度配额 | 备注 |
|---------|---------|------|
| 未登录访客 | 2次/月（按IP） | 超限弹登录/升级提示 |
| 登录 Free | 5次/月 | 注册一次性送3积分 |
| Pro $9.9/月 | 200次/月 | 到期自动降级 free |
| Pro+ $19.9/月 | 无限次 | |
| 积分包 | 永久有效 | 优先于月度配额消耗 |

### 积分包定价

| 包 | 价格 | 单价 |
|----|------|------|
| 20积分 | $2.9 | $0.15/次 |
| 80积分 | $7.9 | $0.10/次（Popular）|
| 200积分 | $14.9 | $0.07/次（Best Value）|

---

## 五、支付系统（PayPal，当前为沙盒）

### 积分包（一次性付款）
- 流程：点击「Pay with PayPal」→ 跳转 PayPal 付款页 → 确认付款 → 跳转 `/payment-success` → 返回首页
- userId 通过 return_url query 参数传递（不依赖 session）
- 幂等保护：payment_logs 表防重复发放

### 月订阅
- 流程：点击「Subscribe Pro/Pro+」→ 跳转 PayPal 订阅确认页 → 同意 → 跳转 `/payment-success` → 返回首页
- custom_id 格式：`userId|planKey`

### 支付成功页（`/payment-success`）
- 卡片弹出动效 + 庆祝图标
- 积分包：显示「+N credits added」+ 余额进度条
- 订阅：显示「Welcome to Pro/Pro+」
- 按钮：「Start Removing Background Strangers →」返回首页

### PayPal 沙盒配置
- Plan ID Pro（$9.9/月）：`P-6FD38524406382430NHJBD2Y`
- Plan ID Pro+（$19.9/月）：`P-5E4454604P4703915NHJBFOQ`
- ⚠️ 当前为沙盒环境，下次切换生产时需替换 Client ID / Secret / Plan ID

---

## 六、页面结构

| 页面 | 路径 | 说明 |
|------|------|------|
| 主功能页 | `/` | 上传→涂抹→结果三步流程 |
| 定价页 | `/pricing` | 月订阅+积分包+对比表+FAQ，双语 |
| 支付成功页 | `/payment-success` | 支付完成后跳转，庆祝动效 |
| 管理统计 | `/api/admin/stats?token=xxx` | 用户数/用量统计（ADMIN_TOKEN 鉴权）|

---

## 七、技术架构

| 层级 | 技术 |
|------|------|
| 前端框架 | Next.js 16 + TypeScript |
| UI | 内联样式，无 UI 框架 |
| 画笔交互 | HTML5 Canvas |
| i18n | 自实现 Context + 翻译文件 |
| 后端 API | Next.js API Routes |
| Inpainting 模型 | iopaint 1.6.0（MAT, CPU） |
| 数据库 | SQLite（better-sqlite3），users + usage_logs + payment_logs |
| Auth | NextAuth.js + Google OAuth（JWT strategy） |
| 支付 | PayPal REST API v2（Orders + Subscriptions） |
| 服务管理 | pm2（nobgstranger 进程） |
| 隧道 | Cloudflare Named Tunnel（systemd 管理，开机自启） |
| 域名 | nobgstranger.cn（GoDaddy + Cloudflare NS） |

---

## 八、部署信息

- 线上地址：https://nobgstranger.cn
- 代码：`/root/projects/RemovebgStranger/`
- GitHub：https://github.com/Aly1012/RemovebgStranger
- 环境变量：`/root/projects/RemovebgStranger/.env.local`

```bash
pm2 restart nobgstranger   # 重启服务
pm2 logs nobgstranger       # 查看日志
npm run build               # 重新构建
```

---

## 九、待完成工作（P1）

- [ ] **PayPal 切换生产环境**：替换 Client ID / Secret / Plan ID，PAYPAL_ENV 改为 production
- [ ] **Google OAuth 发布**：Google Cloud Console 把应用从测试模式改为发布状态
- [ ] **FAQ 独立页面**（可选，目前 FAQ 内容已在 /pricing 内）

---

## 十、已知限制

- CPU 处理慢：无 GPU，MAT 处理约 30-60 秒
- 大面积遮挡效果一般
- API 超时：已设置 300 秒超时

---

## 十一、变更历史

| 日期 | 变更内容 |
|------|----------|
| 2026-03-29 | 初版文档；完成橡皮擦涂抹模式重构；iopaint 1.6.0 LaMa；国际化 |
| 2026-03-31 | 默认语言改为英文；语言切换按钮调整；模型从 LaMa 升级为 MAT；新增 Refine Again 按钮 |
| 2026-04-02 | 域名上线 nobgstranger.cn；生产模式部署；Google OAuth；SQLite 数据库；完整限额体系；注册送3积分；Header 用量进度条；超限升级弹窗 |
| 2026-04-05 | 重构用量控制系统（修复积分bug）；新增 /pricing 定价页；PayPal 沙盒支付接入（积分包+月订阅）；新增 /payment-success 支付成功页；品牌名统一为 RemovebgStranger |
