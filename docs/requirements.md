# 需求文档 — RemovebgStranger（AI 涂抹去除人物 · 智能背景修复）

> 最后更新：2026-04-07（第四次更新）

---

## 一、项目背景

用户上传照片后，通过画笔涂抹的方式手动标记要去除的人物区域，系统使用 AI inpainting 模型（MAT）智能修复被涂抹区域的背景，最终效果为路人"凭空消失"，背景自然融合。UI 简洁现代，参考 remove.bg 风格，支持中英双语切换。

---

## 二、品牌规范

- **品牌名**：RemovebgStranger（页面内统一使用，有利于 SEO）
- **域名**：nobgstranger.cn（域名与品牌名不同，属正常情况）
- 页面内不使用 NoBGStranger，统一写 RemovebgStranger

---

## 三、目标用户

- 需要从照片中去除路人/闯入者的普通用户
- 摄影后期及内容创作者
- 社交媒体、营销短视频相关人员

---

## 四、核心需求（当前实现）

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

## 五、用户与权限体系（已实现）

### 账号系统
- Google OAuth 登录（NextAuth.js）
- ✅ **已发布（In production）**，所有 Google 账号均可登录
- 登录后用量进度条显示在 Header 右侧

### 配额规则

| 用户类型 | 月度配额 | 备注 |
|---------|---------|------|
| 未登录访客 | **不可用**，必须登录 | 点击处理直接弹出登录弹窗 |
| 登录 Free | **3次/月** | 注册一次性送3积分（共6次起步）|
| Pro $9.9/月 | 200次/月 | 到期自动降级 free |
| Pro+ $19.9/月 | 无限次 | |
| 积分包 | 永久有效 | 优先于月度配额消耗 |

### 升级弹窗（UpgradeModal）
- 未登录（guest）：显示 Google 登录引导，文案"注册即得每月3次 + 注册送3积分，共6次起步"
- 超限（free/pro）：显示订阅套餐 + 积分包双轨购买
- Free 套餐展示：3次/月

### 积分包定价

| 包 | 价格 | 单价 |
|----|------|------|
| 20积分 | $2.9 | $0.15/次 |
| 80积分 | $7.9 | $0.10/次（Popular）|
| 200积分 | $14.9 | $0.07/次（Best Value）|

---

## 六、支付系统（PayPal，✅ 生产环境）

### 积分包（一次性付款）
- 流程：点击「Pay with PayPal」→ 跳转 PayPal 付款页 → 确认付款 → 跳转 `/payment-success` → 返回首页
- userId 通过 return_url query 参数传递（不依赖 session）
- 幂等保护：payment_logs 表防重复发放

### 月订阅
- 流程：点击「Subscribe Pro/Pro+」→ 跳转 PayPal 订阅确认页 → 同意 → 跳转 `/payment-success` → 返回首页
- custom_id 格式：`userId|planKey`

### Webhook（✅ 已实现）
- 路由：`/api/paypal/webhook`
- 处理事件：

| 事件 | 处理逻辑 |
|------|---------|
| BILLING.SUBSCRIPTION.RENEWED | 延长 plan_expires_at 到下个周期 |
| BILLING.SUBSCRIPTION.CANCELLED | 保留到期时间，用到期为止 |
| BILLING.SUBSCRIPTION.EXPIRED | 立刻降级为 free |
| BILLING.SUBSCRIPTION.SUSPENDED | 同取消处理 |

- 签名验证：通过 PAYPAL_WEBHOOK_ID 调用 PayPal verify-webhook-signature API

### 支付成功页（`/payment-success`）
- 卡片弹出动效 + 庆祝图标
- 积分包：显示「+N credits added」+ 余额进度条
- 订阅：显示「Welcome to Pro/Pro+」
- 按钮：「Start Removing Background Strangers →」返回首页

### PayPal 生产环境配置
- `PAYPAL_ENV=production`
- `PAYPAL_CLIENT_ID=ASGXAcmb0XQ-aUPjcwZtySoDtWi0Rq2w7r_yOroEqBmBBUeF31qUFTtJJfx95QIXo1GOtmmvSOScvYhe`
- `PAYPAL_PLAN_PRO=P-4VJ24700X9616892MNHKQ32I`（$9.9/月）
- `PAYPAL_PLAN_PRO_PLUS=P-688658964Y498340NNHKQ4DI`（$19.9/月）
- `PAYPAL_WEBHOOK_ID=2KH049534W223120N`
- `ADMIN_TOKEN=ba3c316061dfae28ba3839fe332adb8f`

---

## 七、页面结构

| 页面 | 路径 | 说明 |
|------|------|------|
| 主功能页 | `/` | 上传→涂抹→结果三步流程，Header 含 Pricing / FAQ 入口 |
| 定价页 | `/pricing` | 月订阅+积分包+对比表+FAQ，双语，Header 含 FAQ 入口 |
| FAQ 页 | `/faq` | 独立 FAQ 页，4组17问，双语，无邮件联系入口 |
| 支付成功页 | `/payment-success` | 支付完成后跳转，庆祝动效 |
| 管理统计 | `/api/admin/stats?token=xxx` | 用户数/用量统计（ADMIN_TOKEN 鉴权）|

### FAQ 页内容分组
- Getting Started（入门指南）
- Credits & Quotas（积分与配额）
- Plans & Billing（套餐与付款）
- Results & Quality（效果与质量）

---

## 八、技术架构

| 层级 | 技术 |
|------|------|
| 前端框架 | Next.js 16 + TypeScript |
| UI | 内联样式，无 UI 框架 |
| 画笔交互 | HTML5 Canvas |
| i18n | 自实现 Context + 翻译文件 |
| 后端 API | Next.js API Routes |
| Inpainting 模型 | iopaint 1.6.0（MAT, CPU） |
| 数据库 | SQLite（better-sqlite3），users + usage_logs + payment_logs |
| Auth | NextAuth.js + Google OAuth（JWT strategy，已发布生产）|
| 支付 | PayPal REST API v2（Orders + Subscriptions，生产环境）|
| 服务管理 | pm2（nobgstranger 进程） |
| 隧道 | Cloudflare Named Tunnel（systemd 管理，开机自启） |
| 域名 | nobgstranger.cn（GoDaddy + Cloudflare NS） |

---

## 九、部署信息

- 线上地址：https://nobgstranger.cn
- 代码：`/root/projects/RemovebgStranger/`
- GitHub：https://github.com/Aly1012/RemovebgStranger
- 环境变量：`/root/projects/RemovebgStranger/.env.local`

```bash
pm2 restart nobgstranger --update-env  # 重启服务（env 有变动时用此命令）
pm2 logs nobgstranger                   # 查看日志
npm run build                           # 重新构建
```

---

## 十、待办事项

- （可选）后台管理页面
- （可选）用户处理历史记录
- （可选）批量处理功能（Pro+ 预留入口）

---

## 十一、已知限制

- CPU 处理慢：无 GPU，MAT 处理约 30-60 秒
- 大面积遮挡效果一般
- API 超时：已设置 300 秒超时
- 无客服邮箱，FAQ 页不放邮件联系方式

---

## 十二、变更历史

| 日期 | 变更内容 |
|------|----------|
| 2026-03-29 | 初版文档；完成橡皮擦涂抹模式重构；iopaint 1.6.0 LaMa；国际化 |
| 2026-03-31 | 默认语言改为英文；语言切换按钮调整；模型从 LaMa 升级为 MAT；新增 Refine Again 按钮 |
| 2026-04-02 | 域名上线 nobgstranger.cn；生产模式部署；Google OAuth；SQLite 数据库；完整限额体系；注册送3积分；Header 用量进度条；超限升级弹窗 |
| 2026-04-05 | 重构用量控制系统（修复积分bug）；新增 /pricing 定价页；PayPal 沙盒支付接入（积分包+月订阅）；新增 /payment-success 支付成功页；品牌名统一为 RemovebgStranger |
| 2026-04-07 | 未登录改为不可用（弹登录引导）；Free 配额 5→3次/月；注册引导文案"共6次起步"；PayPal 切换生产环境；PayPal Webhook 实现（续费/取消/到期）；Google OAuth 发布（In production）；新增 /faq 独立FAQ页（4组17问双语）；主页和定价页 Header 加 FAQ 入口 |
