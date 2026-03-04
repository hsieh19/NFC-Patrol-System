# NFC-Patrol-System (数字化智能巡更系统)

> 基于 **Next.js 15 (App Router)** 和 **Prisma** 打造的新一代全栈数字化智能巡更解决方案。通过“手机 + NFC 标签”实现低成本、高效率的点位管理、实时监控、离线补录与防作弊考核闭环。

---

## 🌟 核心功能特性

### 1. 智能多端自适应 (Smart Routing)
- **设备指纹映射**：通过 Edge Middleware 精准识别 User-Agent 与 Device Type。
    - **移动端 (Mobile APP)**：自动进入巡更作业主界面，深度优化单手操作体验与暗黑模式。
    - **管理端 (Admin Dashboard)**：自动进入桌面版管理中枢，提供上帝视角监控与各类配置分布图。
- **高阶安全鉴权**：全面废弃弱权限系统。集成基于强签名 JWT (`jose` edge-compatible) 与 HttpOnly Cookie 的安全身份模型，所有输入源强制 `XSS` 清洗防注入。

### 2. 移动端离线作业系统 (Mobile PWA)
- **极速 NFC 打卡**：基于高性能 Web NFC API 感应逻辑（同时支持开发模式下的模拟感应），伴随设备物理级震动与沉浸式语音播报反馈。
- **无网断线保障**：由于厂区/地下室可能存在信号盲区，深度集成 `Dexie.js` (IndexedDB)。当设备处于断网状态时自动切入“离线防呆模式”，打卡及报修数据将加密暂存本地；待恢复网络信号后自动唤醒异步同步上传。
- **巡检设备定损与报修**：支持现场拍照留档、情况描述，并一键智能关联（防篡改）距离最近的 NFC 坐标卡点，实现维修任务即时流转闭环。

### 3. 管理总部指挥中心 (Admin Control Panel)
- **实时监控大屏**：通过 WebSocket / 高效轮询动态拉取最新巡更节点动态，支持重点区域未打卡的高亮报警。
- **精细化角色与资源管理**：
    - **RBAC 人员配置**：灵活配置管理员、维保员、安保人员等各种系统角色。
    - **虚拟路线规划**：地图资源点位录入、NFC 物理标签录入及位置绑定。
    - **排班与防作弊**：支持有序/无序路线自由排班，按日/周/月进行频次编排。
- **全量考勤审计看板**：
    - ** $O(1)$ 高性能大数据穿透**：底层已优化海量巡记录的重度运算聚合，支持在百万级历史记录中进行秒级考核计算。
    - **多维度 CSV 结果导出**：秒级将指定周期、群组、角色的排班完成率导出为标准 CSV 表格备档。

---

## 📂 核心代码目录结构

```text
src/
├── app/                  # Next.js 核心路由层
│   ├── (auth)/           # 认证子模块 (Login登录、Password重置等)
│   ├── admin/            # [PC] 企业管理总台 
│   ├── mobile/           # [App] 巡更作业端 
│   ├── api/              # 后端核心微服务 API
│   │   ├── admin/        # 管理 CRUD (用户、排班、点位、记录、高阶考核)
│   │   ├── auth/         # 登录鉴权签发验证、初始态校验
│   │   ├── patrol/       # 巡更核心流转上传、离线历史合流
│   │   └── repair/       # 维修上报事务机
│   └── middleware.ts     # Edge 层设备分流路由与 JWT 全局防火墙
├── components/           # UI 组件池
│   ├── admin/            # 管理后台组合组件
│   └── ui/               # 基础颗粒组件 (基于 shadcn/ui + Tailwind)
├── hooks/                # 自定义 Hooks (Offline-Sync、AudioPlayer 等)
├── lib/                  # 基础设施类库与常量
│   ├── auth.ts           # JWT 服务端核查验签库 
│   ├── constants.ts      # 全局常量防魔法字符映射字典
│   ├── db.ts             # Prisma Database Client 
│   └── offline-db.ts     # PWA Dexie.js 离线 DB 实例 (NFCPatrolSystemOffline)
└── prisma/               # Prisma 数据库 Schema 定义
```

---

## 🛠 前沿技术栈

| 领域 | 技术方案 |
| :--- | :--- |
| **前端基建** | Next.js 15 (React 19) + TypeScript |
| **视觉呈现** | Tailwind CSS + Framer Motion + Shadcn/UI |
| **数据持久化 (后端)**| Prisma ORM + MySQL 8 / SQLite (双轨支持) |
| **数据持久化 (前端)**| Dexie.js (IndexedDB API) |
| **安全体系** | JWT (jose) + bcryptjs + XSS Sanitizer |
| **工程质量** | Vitest (TDD/单元测试) + ESLint |
| **Web API 能力** | Web NFC API + Vibration API + Web Audio API |

---

## 🚀 部署与极速启动

### 1. 环境准备
确保本机或服务器已安装 `Node.js 18+`，如需生产环境请准备 `MySQL` 数据库连接串。

### 2. 下载与配置
克隆代码库并拷贝环境变量样本文件：
```bash
cp .env.example .env
```
根据需求在 `.env` 中修改 `DB_TYPE` （默认 `sqlite` 为免安装开发体验。填入 `mysql` 配合 `MYSQL_URL` 则为生产直连）。并切记修改内部的 `JWT_SECRET` 和 `DEFAULT_PASSWORD`。

### 3. 安装与启动
```bash
# 1. 抓取依赖
npm install

# 2. 映射构建数据库 Schema 并生成 Prisma Client 
# (若是第一次运行 sqlite 将自动生成 dev.db 文件)
npm run db:generate
npx prisma db push

# 3. 运行 TDD 单元测试防护网 (可选)
npm run test

# 4. 启动本地热重载开发服务器
npm run dev

# 采用生产全静态编译方案
npm run build && npm run start
```


