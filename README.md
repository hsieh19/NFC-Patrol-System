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

### 3. 智能巡更棒作业系统 (ESP32-C3 Wand)
- **多类型传感器兼容**：支持 RC522 (13.56MHz IC卡) 和 RDM6300 (125KHz ID卡) 单模读卡切换，设备端内置字节清洗以过滤厂商前缀（保留后 4 字节）。
- **极速 AP 配网与无阻塞感应**：上电无网自启动专属配网 AP。配网与离网状态下刷卡无阻塞，记录自动写入本地 LittleFS 缓存中。
- **极致续航功耗优化**：网页状态页 3 分钟超时自动注销；WiFi 模块平时关闭射频，仅在设定间隔（默认 60s）自动唤醒同步心跳与离线数据，完成后重回休眠。
- **下次同步自动远程唤醒**：支持后台一键发送唤醒指令，巡更棒在下一次心跳周期唤醒时接收命令，本地自动拉起 Web 调试页面并鸣哨提示，且状态机跳过射频休眠。

### 4. 管理总部指挥中心 (Admin Control Panel)
- **实时监控看板**：动态拉取最新巡更节点动态，直观展示实时打卡记录（支持新卡号显示与一键双击全选复制）。
- **精细化角色与权限 (RBAC)**：
    - **统一角色定义**：基于 `src/lib/constants.ts` 统一管理系统角色（超级管理员、管理员、运维、安保）。
    - **巡更棒分配与对时**：支持巡更棒 UUID 注册与人员绑定，心跳自动接收名称及对时。
    - **虚拟路线规划**：去 NFC 化点位录入、支持选择/区分 IC卡 或 ID卡工作模式。
    - **排班与软删除**：支持排班与路线规划，计划支持软删除以完整保留审计链。
- **全量考勤审计**：
    - **考勤聚合计算**：后端实时计算考核完成率，支持在海量历史记录中进行多维度筛选。
    - **数据导出**：支持 CSV 格式导出指定周期、群组、角色的考核结果。

---

## 📂 核心代码目录结构

```text
NFC-Patrol-System/
├── firmware/                 # 智能巡更棒固件 (ESP32-C3)
│   ├── wand_firmware/        # Arduino/C++ 固件源码
│   └── CHANGELOG.md          # 固件更新日志
└── server/                   # 全栈 Web 业务系统 (Next.js 16)
    ├── prisma/               # Prisma 数据库 Schema 与数据库接口
    ├── src/                  # Next.js 源码层
    │   ├── app/              # 核心路由层 (App Router)
    │   │   ├── admin/        # [PC] 企业管理总台 (Monitor, Checkpoint, Plan, Users)
    │   │   ├── mobile/       # [App] 移动巡更作业端
    │   │   ├── api/          # 后端核心 API (含巡更棒接口 /api/patrol/...)
    │   │   └── middleware.ts # 统一设备分流与 JWT 鉴权中间件
    │   ├── components/       # UI 组件池
    │   ├── hooks/            # React 自定义 Hooks (含 IndexedDB 同步逻辑)
    │   └── lib/              # 工具函数、常数项与底层 DB Client
    ├── Dockerfile            # 生产环境容器化构建配置
    ├── package.json          # Node.js 项目配置与依赖说明
    └── tsconfig.json         # TypeScript 编译配置
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
确保本机或服务器已安装 `Node.js 18+`，并且已安装 **Arduino IDE**（用以编译巡更棒固件）。

### 2. 下载与配置
克隆代码库，进入 `server/` 文件夹中并根据样本文件创建环境变量：
```bash
cd server
cp .env.example .env
```
在 `.env` 中修改 `DB_TYPE` (`sqlite` 或 `mysql`)。若使用 MySQL，请配置相应的 `MYSQL_HOST` 等参数。

### 3. 全栈服务安装与运行
所有 Next.js 服务命令都必须在 `server/` 目录下执行：
```bash
# 1. 进入 server 目录
cd server

# 2. 安装依赖
npm install

# 3. 运行系统启动与开发服务器 (此脚本会自动执行数据库迁移与 Prisma Client 生成)
npm run dev

# 4. (可选) 运行 HTTPS 模式开发服务器 (推荐用于移动端真机 NFC 调试)
npm run dev:https
```
**系统访问**：
- 首次访问会自动重定向至 `/init` 进行超级管理员账号和系统初始化。
- 正常登录请访问 `/login`。

#### 生产构建 (Bare Metal)
在 `server/` 目录下运行：
```bash
npm run build
npm run start
```

### 4. 智能巡更棒固件编译与烧录指引
固件源码位于根目录的 [firmware/wand_firmware/](file:///e:/AI%20Project/NFC-Patrol-System/firmware/wand_firmware) 文件夹中。
- **环境搭建**：使用 **Arduino IDE**。请通过“库管理器”搜索并安装以下依赖库：
  - **`MFRC522`** (IC卡 13.56MHz 驱动库)
  - **`ArduinoJson`** (JSON 解析与序列化库，推荐 7.x 版本)
- **分区配置 (重要)**：
  在 `Tools` -> `Partition Scheme` 中必须选择：**`Minimal SPIFFS (1.9MB APP with OTA/190KB SPIFFS)`**（在部分 ESP32 开发板上被称为 `Minimal OTA`）。这能确保固件拥有充裕的 APP 双 OTA 槽位，并留出 LittleFS 本地离线打卡数据存储扇区。
- **低功耗心跳模式说明**：
  新版固件支持低功耗心跳管理，可以在 Web 配置页中的 **配置/升级 (Tabs)** 页独立开关 `"low_power"` 省电模式。开启后平时自动处于微安级 Deep Sleep 定时唤醒，仅在后台安排的巡更计划期间（及前 15 分钟准备期）保持持续唤醒读卡状态。

---

## 🏗 生产环境部署 (Docker)

本项目推荐使用 Docker 容器化部署。已内置 **Standalone** 模式优化，镜像体积极小且性能高效。

### 1. 镜像获取
本项目通过 GitHub Actions 自动构建并推送到 GHCR。每种版本提供两个变体：
- `latest`: 核心镜像，适用于 **MySQL** 外部数据库。
- `latest-sqlite`: 预置 SQLite 引擎的镜像，适用于单机部署。

### 2. 多数据库选型部署

本项目已预置 `docker-compose.yml` 配置文件。您可以直接下载并根据需要修改。

#### 部署执行：
1. **下载项目文件**，确保 `docker-compose.yml` 位于部署目录下。
2. **选择镜像版本**：
   - **MySQL 版**：使用默认 `image: ghcr.io/${YOUR_ID}/nfc-patrol-system:latest`。
   - **SQLite 版**：将镜像改为 `...:latest-sqlite`，并挂载数据卷 `./data:/app/data`。
3. **关键参数配置**：修改 `environment` 部分：
   - `DATABASE_URL`: 数据库连接字符串。
   - `JWT_SECRET`: 务必修改为随机的长字符串。
   - `NEXT_PUBLIC_BASE_URL`: 必须填写内网 Nginx 暴露的完整 **HTTPS** 地址。
4. **启动容器**：
```bash
docker-compose up -d
```

---

## 🔐 内网生产环境关键配置 (必读)

### 1. Nginx 反向代理 (SSL 卸载)
**核心要求**：由于 PWA 离线功能与 Web NFC 扫码必须在 **Secure Context (HTTPS)** 下运行，内网部署必须通过 Nginx 等代理层提供 HTTPS。

详细配置请参考：[Nginx 生产环境配置指南](./docs/nginx.md)



### 2. 注意事项
- **PWA 域名匹配**：`.env` 中的 `NEXT_PUBLIC_BASE_URL` 必须与用户实际访问的地址（含 `https://`）完全一致，否则 Service Worker 无法离线。
- **健康检查**：容器内置了健康检查接口 `/api/health`，可通过 `docker ps` 查看容器运行状态。
- **证书信任**：内网自签名证书需分发至巡更员手机端安装并信任，否则 PWA 无法实现“断网离线打开”。

---

## 📄 许可证
本项目遵循 MIT 协议。

