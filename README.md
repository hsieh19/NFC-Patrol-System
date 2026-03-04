# NFC-Patrol-System (数字化智能巡更系统)

> 基于 **Next.js 16 (App Router)** 和 **Prisma** 打造的新一代全栈数字化智能巡更解决方案。通过“手机 + NFC 标签”实现低成本、高效率的点位管理、实时监控、离线补录与防作弊考核闭环。

---

## 🌟 核心功能特性

### 1. 智能多端自适应 (Smart Routing)
- **设备指纹映射**：通过 Middleware 精准识别 User-Agent。
    - **移动端 (Mobile APP)**：自动进入巡更作业主界面，深度优化单手操作体验与暗黑模式。
    - **管理端 (Admin Dashboard)**：自动进入桌面版管理中枢，提供全局视角监控与各类配置。
- **高阶安全鉴权**：集成基于强签名 JWT (`jose` edge-compatible) 的安全身份模型，所有输入源均经过 `XSS` 清洗。
- **系统初始化**：内置 `/init` 初始化向导，支持一键配置超级管理员及预设系统角色。

### 2. 移动端离线作业系统 (Mobile PWA)
- **极速 NFC 打卡**：基于 Web NFC API 感应逻辑，伴随设备物理级震动与沉浸式语音播报反馈。
- **离线同步机制**：厂区/地下室信号盲区保障。使用 `Dexie.js` (IndexedDB) 实现离线防呆模式，恢复网络后自动唤醒异步同步。
- **巡检设备报修**：支持现场详情描述，并一键智能关联最近的 NFC 坐标点位。

### 3. 管理总部指挥中心 (Admin Control Panel)
- **实时监控看板**：动态拉取最新巡更节点动态，直观展示实时打卡记录。
- **精细化角色与权限 (RBAC)**：
    - **统一角色定义**：基于 `src/lib/constants.ts` 统一管理系统角色（超级管理员、管理员、运维、安保）。
    - **虚拟路线规划**：地图资源点位录入、NFC 物理标签绑定。
    - **排班与软删除**：支持有序/无序路线，**计划支持软删除**以完整保留历史考核数据。
- **全量考勤审计**：
    - **考勤聚合计算**：后端实时计算考核完成率，支持在海量历史记录中进行多维度筛选。
    - **数据导出**：支持 CSV 格式导出指定周期、群组、角色的考核结果。

---

## 📂 核心代码目录结构

```text
src/
├── app/                  # Next.js 核心路由层
│   ├── admin/            # [PC] 企业管理总台 (Monitor, Checkpoint, Plan, Users)
│   ├── mobile/           # [App] 巡更作业端 
│   ├── api/              # 后端核心微服务 API
│   │   ├── admin/        # 管理 CRUD (用户、计划、点位、记录、考核分析)
│   │   ├── auth/         # 登录鉴权、系统初始化、状态检查
│   │   └── patrol/       # 巡更核心上传逻辑 (支持实时/补传)
│   └── middleware.ts     # Edge 层设备分流路由与全局 JWT 校验
├── components/           # UI 组件池
│   ├── admin/            # 管理后台功能模块组件
│   └── ui/               # 基础颗粒组件 (基于 shadcn/ui + Tailwind v4)
├── hooks/                # 自定义 Hooks (useSync 离线同步等)
├── lib/                  # 基础设施类库与常量
│   ├── auth.ts           # JWT 服务端核查验签库 
│   ├── constants.ts      # 中心化系统常量与初始角色定义
│   ├── db.ts             # Prisma Database Client (双轨 DB 支持)
│   └── offline-db.ts     # Mobile Dexie.js 离线数据库
└── prisma/               # Prisma 数据库 Schema 定义
```

---

## 🛠 技术栈

| 领域 | 技术方案 |
| :--- | :--- |
| **前端框架** | Next.js 16 (React 19) + TypeScript |
| **视觉呈现** | Tailwind CSS v4 + Lucide Icons + Radix UI |
| **数据持久化 (后端)**| Prisma ORM + MySQL / SQLite (支持切换) |
| **数据持久化 (前端)**| Dexie.js (IndexedDB API) |
| **安全体系** | JWT (jose) + bcryptjs + XSS Sanitizer |
| **本地开发** | Vite/Vitest (单元测试) + ESLint |
| **硬件协议** | Web NFC API + Vibration API + Speech Synthesis |

---

## 🚀 部署与极速启动

### 1. 环境准备
确保本机或服务器已安装 `Node.js 18+`。

### 2. 下载与配置
克隆代码库并根据样本文件创建环境变量：
```bash
cp .env.example .env
```
在 `.env` 中修改 `DB_TYPE` (`sqlite` 或 `mysql`)。若使用 MySQL，请配置相应的 `MYSQL_HOST` 等参数。

### 3. 安装与运行
```bash
# 1. 安装依赖
npm install

# 2. 运行初始化脚本 (包含数据库迁移与 Prisma Client 生成)
npm run dev

# 3. 访问系统
# - 首次访问会自动重定向至 /init 进行系统初始化
# - 正常登录请访问 /login
```

### 生产构建 (Bare Metal)
```bash
npm run build
npm run start
```

---

## 🏗 生产环境部署 (Docker)

推荐使用 Docker 进行容器化部署，本项目已内置多阶段构建优化的 `Dockerfile`。

### 1. 自动构建
每当向 GitHub 推送以 `v` 开头的标签（如 `v1.0.0`）时，GitHub Actions 会自动构建镜像并推送到 **GitHub Container Registry (GHCR)**。

### 2. 手动构建与运行
```bash
# 构建镜像
docker build -t nfc-patrol-system .

# 运行容器 (使用外部配置文件)
docker run -d \
  --name nfc-system \
  -p 3000:3000 \
  --env-file .env \
  nfc-patrol-system
```

### 3. Docker Compose 示例
```yaml
services:
  app:
    image: ghcr.io/${YOUR_GITHUB_ID}/nfc-patrol-system:latest
    ports:
      - "3000:3000"
    env_file:
      - .env
    environment:
      - DB_TYPE=mysql # 强制使用外部 MySQL
    restart: always
```

---

## 🔐 生产环境关键注意事项

### 1. 必须启用 HTTPS
**核心提醒**：由于 Web NFC API 的安全限制，系统必须在 **HTTPS** 环境下运行，否则移动端无法调用感应功能。建议在 Docker 前层挂载 **Nginx** 进行 SSL 卸载。

### 2. JWT 安全
生产环境务必在 `.env` 中修改 `JWT_SECRET` 为至少 32 位的随机字符串。

### 3. 数据库库选型
生产环境强烈建议将 `DB_TYPE` 设为 `mysql`，并连接独立的 MySQL 8.0 数据库以获得更好的并发性能。

---

## 📄 许可证
本项目遵循 MIT 协议。
