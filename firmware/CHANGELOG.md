# Changelog - Patrol Wand Firmware

All notable changes to the single-chip firmware project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [v1.0.0] - 2026-08-06

### Added

- **在线升级与配置双选项卡 (Tabs)**:
  - 重构本地 Web 配置页，新增“配置”与“升级”双 Tab。配置 Tab 用以配置系统参数，升级 Tab 专用于在线 OTA。
- **动态 OTA 升级地址**:
  - 配置页中提供“OTA升级地址”动态输入，允许用户自行绑定 AnyFlash 网关服务，数据以键值 `"anyflash"` 持久化保存至 NVS Preferences 中。
- **手动检查更新与流式刷写**:
  - 新增 `/api/ota/check-now` 接口，使用 `ArduinoJson` 动态提取 AnyFlash 网关返回的最新的升级版本号、下载链接及变更日志并回显前端。
  - 新增 `/api/ota/start` 接口，拉起 FreeRTOS 异步线程，支持浏览器成功回传响应后流式下载刷写新固件并自动重启。
- **取消误回退安全确认**:
  - 设备每次联网稳定后，自动调用 `esp_ota_mark_app_valid_cancel_rollback()` 标记运行分区有效，关闭 Bootloader 自动回滚，保障固件长期稳定性。

- **可配置省电模式**:
  - Web 配置页新增“省电模式”选项，数据以键值 `"low_power"` 保存至 NVS 中。用户可自行决定开启或关闭省电。
- **全自动低功耗心跳模式 (省电启用)**:
  - 日常处于微安级 Deep Sleep 深度休眠，每 15 分钟由 RTC 自动唤醒进行快速联网心跳，同步打卡缓存，无指令则在 3-5 秒内立即睡死。
- **云端巡更计划自动唤醒**:
  - 解析心跳返回的 `patrolDuration` 在计划巡更时间（及前 15 分钟准备期）保持唤醒和读卡工作，蜂鸣器自动鸣叫 3 声提醒用户，计划到期后自动重新睡死。
- **软硬件协同极省电优化**:
  - **硬件 MOSFET 断电控制**：使用 AO3400 N-MOSFET 作为低边开关完全断开 RDM6300 ID 读卡器供电，实现休眠零功耗。
  - **RC522 物理休眠**：休眠前自动拉低 RST 触发 RC522 物理硬休眠。
  - **内置下拉电阻**：开启 GPIO10 内部下拉，免去外部 10kΩ 物理下拉电阻。
- **RTC 离线时间推算**:
  - 休眠期间持久化上次的对时 Unix 秒与微秒时间差。若联网失败，则依据内部 RTC 自动估算当前绝对时间戳，保障离线记录具有有效时间信息。
- **常驻不省电模式 (省电禁用)**:
  - 若关闭省电，设备将一直维持常驻运行状态（WiFi 不断电，网页不超时，读卡不关闭，掉线自动后台重连），满足即时通讯需求。

- **ESP32-C3 简约版开机 Native USB CDC 挂起兼容**:
  - 针对简约版芯片脱离电脑 USB 独立供电（由充电头或电池供电）时因为缺少 USB Host 握手造成 `Serial` 写入缓冲区满引发的系统无限阻塞卡死致命硬件缺陷，通过在 GitHub Actions 编译时强行锁定 `CDCOnBoot=default`（禁用 Native USB CDC），改走硬件 UART0 串口输出，完美兼容。
- **看门狗超时引起升级中断防护 (WDT)**:
  - 在 OTA 固件流式下载与刷入 flash 期间，临时调用 `esp_task_wdt_delete(NULL)` 挂起任务看门狗，规避下载过久触发 CPU 硬重启导致设备变砖的风险。

### Fixed

- **Web 配置页“升级”标签无反应问题**:
  - 修复由于 C++ 编译期将多行双引号字符串合并为单行，导致其中的 JS 单行注释 `//` 误将后续代码（包括 `switchTab` 等函数）全部注释的致命 Bug。
  - 将 Web 页面的 `htmlTemplate` 重构为 C++11 Raw String Literal (`R"=====( ... )====="`)，从根本上解决无换行合并问题，并提升了代码可读性与 ES5 兼容性。
