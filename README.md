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

本项目推荐使用 Docker 容器化部署。已内置 **Standalone** 模式优化，镜像体积极小且性能高效。

### 1. 镜像获取
本项目通过 GitHub Actions 自动构建并推送到 GHCR。每种版本提供两个变体：
- `latest`: 核心镜像，适用于 **MySQL** 外部数据库。
- `latest-sqlite`: 预置 SQLite 引擎的镜像，适用于单机部署。

### 2. 多数据库选型部署

#### 方案 A：连接外部 MySQL (推荐)
使用 `docker-compose.yml` 快速部署。
```yaml
version: '3.8'
services:
  nfc-app:
    image: ghcr.io/${YOUR_ID}/nfc-patrol-system:latest
    container_name: nfc-patrol
    restart: always
    environment:
      - DATABASE_URL=mysql://user:pass@192.168.1.10:3306/nfc_db
      - JWT_SECRET=your-32-char-secret
      - NEXT_PUBLIC_BASE_URL=https://patrol.your-domain.com
    ports:
      - "3000:3000"
```

#### 方案 B：使用本地 SQLite
适用于低功耗边缘网关或简易内网环境。
```yaml
version: '3.8'
services:
  nfc-app:
    image: ghcr.io/${YOUR_ID}/nfc-patrol-system:latest-sqlite
    container_name: nfc-patrol-lite
    restart: always
    volumes:
      - ./data:/app/data
    environment:
      - DATABASE_URL=file:/app/data/dev.db
      - JWT_SECRET=your-secret
      - NEXT_PUBLIC_BASE_URL=https://patrol.your-domain.com
    ports:
      - "3000:3000"
```

---

## 🔐 内网生产环境关键配置 (必读)

### 1. Nginx 反向代理 (SSL 卸载)
**核心要求**：由于 PWA 离线功能与 Web NFC 扫码必须在 **Secure Context (HTTPS)** 下运行，内网部署必须通过 Nginx 等代理层提供 HTTPS。

**Nginx 配置示例：**
```nginx
server {
    listen 443 ssl;
    server_name patrol.internal.com; # 您的内网 IP 或域名

    ssl_certificate /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000; # 转发到容器映射端口
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme; # 确保 App 识别 HTTPS 环境
    }
}
```

### 2. 注意事项
- **PWA 域名匹配**：`.env` 中的 `NEXT_PUBLIC_BASE_URL` 必须与用户实际访问的地址（含 `https://`）完全一致，否则 Service Worker 无法离线。
- **健康检查**：容器内置了健康检查接口 `/api/health`，可通过 `docker ps` 查看容器运行状态。
- **证书信任**：内网自签名证书需分发至巡更员手机端安装并信任，否则 PWA 无法实现“断网离线打开”。

---

## 📄 许可证
本项目遵循 MIT 协议。

