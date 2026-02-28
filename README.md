# 巡更打点系统 (NFC Patrol System)

基于 **Next.js 15 (App Router)** + **Feishu (飞书) 生态** 打造的新一代数字化巡更解决方案。通过“手机 + NFC 标签”实现低成本、高效率的点位管理、实时监控、离线补录与异常处置。

---

## 🌟 核心功能

### 1. 智能多端适配 (Smart Routing)
- **设备识别映射**：通过 Middleware 识别 User-Agent。
    - **移动端 (Mobile)**：自动进入巡更作业面，优化单手操作体验。
    - **管理端 (Admin)**：自动进入桌面版管理后台，提供大屏监控与配置面板。
- **统一身份认证**：集成基于 Cookie 的权限验证，支持飞书扫码与账号密码登录。

### 2. 移动端作业系统 (Mobile Terminal)
- **NFC 极速打卡**：基于高性能感应逻辑（支持物理感应与模拟调试），打卡时伴随物理震动与音效反馈。
- **离线作业保障**：集成 `Dexie.js` (IndexedDB)。在断网环境下自动进入“离线模式”，数据暂存本地；恢复网络后自动触发异步同步。
- **异常报修提报**：实时拍照、描述异常情况，并一键关联当前 NFC 点位，实现闭环处置。

### 3. 管理端指挥中心 (Admin Control Panel)
- **实时监控大屏**：动态拉取最新巡更动态，支持实时状态轮询与报警提醒。
- **精细化资源管理**：
    - **人员/角色管理**：支持多级权限划分（管理员、操作员、巡检员）。
    - **点位配置**：NFC 标签与地理位置、设备信息的绑定映射。
    - **排班计划**：灵活配置巡更路线与时间频率。
- **全量审计看板**：系统化展示巡更记录，支持历史溯源与数据报表。

---

## 📂 项目结构

```text
src/
├── app/                  # Next.js 核心路由与 API
│   ├── (auth)/           # 认证相关路由 (Login, Init)
│   ├── admin/            # [PC] 管理后台 (监控大屏、资源配置)
│   ├── mobile/           # [App] 巡更作业端 (NFC感应、历史、报修)
│   ├── api/              # 后端服务逻辑
│   │   ├── admin/        # 管理端 CRUD (点位、用户、排班、记录)
│   │   ├── auth/         # 登录鉴权、系统初始化校验
│   │   ├── patrol/       # 巡更数据上传、补录同步
│   │   └── repair/       # 报修单提交与状态更新
│   └── middleware.ts     # 关键：设备分流与统一权限拦截器
├── components/           # UI 组件库
│   ├── admin/            # 管理后台专用业务组件 (MonitorTab, UserTab等)
│   └── ui/               # 基础原子组件 (基于 shadcn/ui)
├── hooks/                # 自定义 React Hooks (如 use-sync 数据同步)
├── lib/                  # 基础设施层
│   ├── db.ts             # Prisma ORM (连接 PostgreSQL/SQLite)
│   ├── offline-db.ts     # Dexie.js 离线存储封装
│   ├── permissions.ts    # 角色权限校验函数
│   └── utils.ts          # 样式合并、格式化等通法
└── prisma/               # 数据库建模定义
```

---

## 🛠 技术深度栈

- **前端架构**: `Next.js 15` + `React 19` + `TypeScript`
- **样式系统**: `Tailwind CSS` + `Framer Motion` (动效) + `Shadcn/UI`
- **数据持久化**: 
    - **离线**: `Dexie.js` (IndexedDB Wrapper)
    - **在线**: `Prisma` + `SQLite/PostgreSQL`
- **实时通信**: API Polling / (规划中) Webhooks
- **移动交互**: Web NFC API + Vibration API + Web Audio API

---

## 🚀 快速开始

### 1. 环境准备
- Node.js 18+ 
- 已登录 GitHub CLI (`gh auth login`)

### 2. 安装与启动
```bash
# 安装依赖
npm install

# 初始化数据库
npx prisma db push

# 启动开发环境
npm run dev
```

### 3. 使用说明
- **模拟移动端**：在浏览器开发者工具（F12）中开启“手机模式”并刷新网页，即可进入巡更界面。
- **管理后台**：使用桌面浏览器直接访问即可进入管理看板。

---

## 📜 理念原则
秉承 **KISS (Keep It Simple, Stupid)** 设计理念，坚持前端无占位符 (No Placeholders)、交互全反馈。致力于用最轻量的代码实现工业级可靠的数字化工具。
