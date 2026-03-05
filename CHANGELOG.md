# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-03-05

这是一个里程碑版本，标志着 **NFC 巡更点位管理系统** 的核心架构与功能集完整上线。本版本聚焦于提供企业级的 NFC 巡更闭环体验，并深度适配了内网 PWA 离线场景。

### ✨ 核心功能 (Core Features)

#### 1. 数字化巡更打卡 (Mobile App)
- **Web NFC 深度集成**：支持手机靠近 NFC 标签自动打卡，响应速度 < 500ms。
- **PWA 离线模式**：
    - 采用 **Stale-While-Revalidate** 缓存策略，支持弱网或断网环境下依然能“秒开”应用。
    - 实现了 **PWA 断网离线打开** 功能，适配内网 HTTPS 证书信任场景。
- **离线补录 (Offline Sync)**：基于 IndexedDB 的前端数据库，信号盲区自动转离线存储，恢复后手动/自动同步。
- **语音与辅助反馈**：打卡成功伴随震动反馈与沉浸式语音播报。

#### 2. 管理中枢 (Admin Dashboard)
- **RBAC 权限体系**：内置超级管理员、管理员、运维、安保四个标准角色。
- **点位与路线管理**：支持 NFC 标签物理绑定、逻辑分组及虚拟巡更路线规划。
- **计划与排班**：支持每日、每周、循环排班，确保巡更任务按序执行。
- **考核分析与审计**：
    - 后端实时聚合巡更完成率数据。
    - 支持全量历史记录追溯，并提供 **CSV 数据导出**。
- **软删除机制**：删除巡更计划时保留其关联的所有历史考核记录，确保审计完整性。

#### 3. 基础设施与安全 (Infrastructure)
- **多端识别分流**：根据设备 U-A 智能引导用户进入 Mobile 或 Admin 界面。
- **JWT 强加密鉴权**：全站基于 `jose` 库实现 Edge 级 JWT 校验。
- **系统初始化向导**：内置 `/init` 路由，支持零配置快速部署初任超级管理员。

### 🛠 工程化优化 (DevOps)

- **Next.js 16 Standalone**：大幅度精简 Docker 镜像体积。
- **GitHub Actions 矩阵构建**：单次推送自动生成 `latest` (MySQL) 及 `latest-sqlite` (SQLite) 双版本镜像。
- **内网 HTTPS 快速适配**：内置 `mkcert` 工具集成，解决内网 PWA 安装的信任锁死问题。
- **健康检查**：新增 `/api/health` 接口，支持分布式环境下的容器监控。

### 🔧 修复与调整 (Fixes)

- 修复了 Next.js 16 开发模式下频繁出现的“Negative time stamp”红屏报错。
- 修复了 `manifest.ts` 与静态文件冲突导致的 PWA 解析失败。
- 优化了 proxy 拦截逻辑，确保 PWA 核心资源（SW/Manifest）不受权限限制。


