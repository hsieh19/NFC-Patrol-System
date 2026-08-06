// ==========================================
// 数字化智能巡更系统 - ESP32-C3 巡更棒主控固件
// ==========================================
#include "config.h"

// 实例化全局变量与对象 (必须在定义 config.h 中的 extern 后实例化)
WebServer server(80);
DNSServer dnsServer;
Preferences preferences;
MFRC522 mfrc522(RC522_CS, RC522_RST);
HardwareSerial rdmSerial(1);

String wandUuid = "";
String wandName = "未同步";
String serverUrl = "";
String wifiSsid = "";
String wifiPassword = "";
String cardType = "IC";
int wifiInterval = 60;

// AnyFlash OTA 相关全局变量实例化
String anyflashServer = "";
String otaDownloadUrl = "";
String otaNewVersion  = "";
String otaChangelog   = "";

bool isTimeSynced         = false;
bool isHttpServerRunning  = false;
unsigned long lastHttpActivityTime = 0;
unsigned long lastScanTime    = 0;
String lastScannedCard        = "";
String lastScannedCardToShow  = "无";

bool isWifiSleeping       = false;
bool isWifiConnecting     = false;
unsigned long lastWifiSyncTime    = 0;
unsigned long wifiConnectStartTime = 0;

// 低功耗与巡更计划全局变量实例化
bool isPatrolActive        = false;
unsigned long patrolStartMs    = 0;
unsigned long patrolDurationMs = 0;
int dynamicSleepIntervalSec    = SLEEP_INTERVAL_SEC;
bool lowPowerEnabled           = true;

// 包含具体模块的业务实现头文件
#include "utils.h"
#include "storage.h"
#include "low_power.h"   // ← 必须在 network.h 前引入（被其依赖）
#include "network.h"
#include "ota.h"
#include "card_reader.h"
#include "web_server.h"

// ==========================================
// WiFi 快速连接辅助函数
// ==========================================
bool connectWifi(int timeoutMs = WIFI_CONNECT_TIMEOUT_MS) {
    WiFi.mode(WIFI_STA);
    WiFi.begin(wifiSsid.c_str(), wifiPassword.c_str());
    Serial.print("[WiFi] 正在连接: " + wifiSsid + " ");
    unsigned long t = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - t < (unsigned long)timeoutMs) {
        delay(200);
        Serial.print(".");
    }
    Serial.println("");
    return WiFi.status() == WL_CONNECTED;
}

// ==========================================
// 心跳+补传的连网同步（唤醒后快速执行）
// ==========================================
void quickSync() {
    if (connectWifi()) {
        Serial.print("[WiFi] 连接成功，IP: ");
        Serial.println(WiFi.localIP());
        sendHeartbeat();      // 同步时间 / 获取云端指令
        syncOfflineRecords(); // 补传离线打卡缓存
        Ota::confirm_running_partition();
    } else {
        // 联网失败：尝试用 RTC 内存推算时间，保证打卡有时间戳
        Serial.println("[WiFi] 连接超时，使用 RTC 内存估算时间戳。");
        restoreTimeFromRTC();
    }
}

// ==========================================
// 主初始化逻辑
// ==========================================
void setup() {
    Serial.begin(115200);
    delay(300);

    // 设置本地时区为东八区 (北京时间 GMT+8)
    setenv("TZ", "CST-8", 1);
    tzset();

    // 基础 GPIO 初始化
    pinMode(BUZZER_PIN, OUTPUT);
    digitalWrite(BUZZER_PIN, LOW);  // 上电立即静音，防止 GPIO 保持高电平
    pinMode(CONFIG_BTN, INPUT_PULLUP);
    
    // 对 RDM 电源引脚启用内部下拉电阻并设为输出低电平，抑制上电浮空
    gpio_pullup_dis((gpio_num_t)RDM_PWR_PIN);
    gpio_pulldown_en((gpio_num_t)RDM_PWR_PIN);
    pinMode(RDM_PWR_PIN, OUTPUT);
    digitalWrite(RDM_PWR_PIN, LOW); // 默认关断 RDM6300 电源

    // 释放 Deep Sleep 期间的 GPIO hold（如已启用）
    gpio_hold_dis((gpio_num_t)RDM_PWR_PIN);
    gpio_deep_sleep_hold_dis();

    // 挂载 LittleFS 缓存文件系统
    if (!LittleFS.begin(true)) {
        Serial.println("[系统错误] LittleFS 挂载失败！");
    }

    // 从 NVS Preferences 加载参数
    preferences.begin("patrol_config", false);
    wandUuid   = preferences.getString("uuid", "");
    wifiSsid   = preferences.getString("ssid", "");
    wifiPassword = preferences.getString("password", "");
    serverUrl  = preferences.getString("server", "");
    anyflashServer = preferences.getString("anyflash", "");
    cardType   = preferences.getString("mode", "IC");
    wandName   = preferences.getString("name", "未同步");
    wifiInterval = preferences.getInt("interval", 60);
    lowPowerEnabled = preferences.getBool("low_power", false); // 读取 NVS 省电开关，默认关闭 (false)

    Serial.println("======================================");
    Serial.println("巡更棒固件启动，当前配置：");
    Serial.println("UUID: " + wandUuid);
    Serial.println("WiFi: " + wifiSsid);
    Serial.println("服务器: " + serverUrl);
    Serial.println("OTA地址: " + anyflashServer);
    Serial.println("读卡模式: " + cardType);
    Serial.println("设备名称: " + wandName);
    Serial.println("省电模式: " + String(lowPowerEnabled ? "已启用" : "已禁用"));
    Serial.println("======================================");

    // ==========================================
    // 若省电模式被禁用：直接执行全功能常驻模式
    // ==========================================
    if (!lowPowerEnabled) {
        Serial.println("[省电关闭] 处于不省电模式，全功能常驻运行。");
        
        // 1. 若参数为空，拉起 AP 配置热点
        if (wandUuid == "" || wifiSsid == "") {
            Serial.println("[引导配网] 设备未配置，启动 Web 配置热点。");
            startCaptivePortal();
            return;
        }

        // 2. 正常连接 WiFi (不限连接超时，最多尝试 15 秒)
        connectWifi(15000);

        if (WiFi.status() == WL_CONNECTED) {
            Serial.print("[WiFi] 连通！本地 IP: ");
            Serial.println(WiFi.localIP());
            // 首发心跳对时和数据同步
            sendHeartbeat();
            syncOfflineRecords();
            Ota::confirm_running_partition();
        }

        // 3. 常驻拉起本地 Web 状态与配置页面 (不设 3分钟超时)
        startWebServerSTA();
        
        // 4. 立刻加载读卡硬件驱动
        if (cardType == "IC") {
            initRC522();
        } else {
            initRDM6300();
        }
        
        // 结束 setup，进入不省电的 loop() 逻辑
        return;
    }

    // ==========================================
    // 判断唤醒来源，执行不同初始化分支
    // ==========================================
    esp_sleep_wakeup_cause_t cause = esp_sleep_get_wakeup_cause();

    if (cause == ESP_SLEEP_WAKEUP_TIMER && wasDeepSleep) {
        // ---- 分支 A：15 分钟 RTC 定时心跳唤醒 ----
        Serial.println("[唤醒] RTC 定时器心跳唤醒，执行快速同步...");

        // 若参数为空则无法联网，拉起 AP 配置热点
        if (wandUuid == "" || wifiSsid == "") {
            Serial.println("[引导配网] 设备未配置，启动 Web 配置热点。");
            startCaptivePortal();
            return; // 进入 AP 模式，不走低功耗逻辑
        }

        // 快速联网 + 心跳 + 补传离线数据
        quickSync();

        // 根据心跳响应结果决策下一步行为：
        if (isHttpServerRunning) {
            // 云端下发了 shouldWakeServer=true，保持 WiFi 常驻并开启 Web 服务
            Serial.println("[远程唤醒] Web 配置服务已激活，等待用户接入（3 分钟超时）。");
            lastHttpActivityTime = millis();
            // 进入 loop() 继续处理 Web 请求，不进入 Deep Sleep
        } else if (isPatrolActive) {
            // 云端下发了 patrolDuration，激活读卡硬件，进入巡检工作模式
            Serial.println("[巡检模式] 计划巡检已激活，正在启动读卡驱动...");
            WiFi.disconnect(true);
            WiFi.mode(WIFI_OFF); // 关闭 WiFi 节省电量，60 秒后再同步
            if (cardType == "IC") {
                initRC522();
            } else {
                initRDM6300();
            }
            lastWifiSyncTime = millis(); // 开始计时，60 秒后同步一次
            // 进入 loop() 执行读卡巡检逻辑
        } else {
            // 无任何指令，同步完成立刻重新睡死（最短唤醒时间，最小功耗）
            Serial.println("[心跳完毕] 无云端指令，立即重新进入 Deep Sleep...");
            enterDeepSleep(dynamicSleepIntervalSec);
            // enterDeepSleep() 内部调用 esp_deep_sleep_start()，此处以后不执行
        }

    } else {
        // ---- 分支 B：首次冷启动 / 手动复位上电 ----
        Serial.println("[冷启动] 首次上电或手动复位，执行完整初始化...");
        wasDeepSleep = false; // 重置深睡标志

        // 若未配置则直接启动配置热点
        if (wandUuid == "" || wifiSsid == "") {
            Serial.println("[引导配网] 检测到设备参数为空，启动 Web 配置热点。");
            startCaptivePortal();
            return;
        }

        // 首次上电：连网 → 心跳 → 补传 → 进入 Deep Sleep 正常循环
        // Web 配置服务只在心跳响应中收到 shouldWakeServer=true 时才激活
        quickSync();

        if (isHttpServerRunning) {
            // 云端指示激活配置页
            Serial.println("[配置激活] Web 配置页已拉起，等待用户接入。");
            lastHttpActivityTime = millis();
        } else if (isPatrolActive) {
            // 首次上电即有巡检计划（极少发生），激活读卡驱动
            WiFi.disconnect(true);
            WiFi.mode(WIFI_OFF);
            if (cardType == "IC") {
                initRC522();
            } else {
                initRDM6300();
            }
            lastWifiSyncTime = millis();
        } else {
            // 常规冷启动：同步完毕后直接进入正常的 15 分钟睡眠循环
            Serial.println("[冷启动完成] 同步完毕，进入 Deep Sleep 节能模式。");
            enterDeepSleep(dynamicSleepIntervalSec);
        }
    }
}

// ==========================================
// 主运行死循环（仅在非立即睡死的场景中执行）
// ==========================================
void loop() {
    // ---- 场景 A：省电未启用 (lowPowerEnabled == false) ----
    if (!lowPowerEnabled) {
        // 1. 始终以无阻塞高频执行读卡逻辑
        handleCardReading();

        // 2. 常驻处理 WebServer 请求
        if (WiFi.status() == WL_CONNECTED) {
            server.handleClient();
        }

        // 3. 后台 WiFi 掉线重连机制 (不休眠，掉线后每隔 15 秒重新连接一次)
        if (WiFi.status() != WL_CONNECTED) {
            static unsigned long lastReconnectTime = 0;
            if (millis() - lastReconnectTime > 15000) {
                Serial.println("[WiFi] 检测到掉线，正在后台尝试重新连接...");
                WiFi.begin(wifiSsid.c_str(), wifiPassword.c_str());
                lastReconnectTime = millis();
            }
        }
        
        // 4. 定时补传打卡缓存 (每隔 wifiInterval 秒)
        static unsigned long lastUploadTime = 0;
        if (millis() - lastUploadTime >= (unsigned long)wifiInterval * 1000) {
            if (WiFi.status() == WL_CONNECTED) {
                sendHeartbeat();      // 定时对时/获取云端名称
                syncOfflineRecords(); // 定时补传
            }
            lastUploadTime = millis();
        }

        delay(5);
        return; // 省电关闭时，后面的 Deep Sleep 业务逻辑不执行
    }

    // ---- Web 配置服务活跃期 ----
    if (isHttpServerRunning) {
        if (WiFi.status() == WL_CONNECTED) {
            server.handleClient();
        }
        // 3 分钟内无 HTTP 活跃请求，关服务并进入 Deep Sleep
        if (millis() - lastHttpActivityTime > WEB_CONFIG_TIMEOUT_MS) {
            Serial.println("[功耗优化] 3 分钟无 HTTP 活跃，关闭 Web 服务进入 Deep Sleep。");
            enterDeepSleep(dynamicSleepIntervalSec);
        }
        return; // Web 期间不执行巡检逻辑
    }

    // ---- 计划巡检工作期 ----
    if (isPatrolActive) {
        // 1. 持续高频读卡
        handleCardReading();

        // 2. 每 60 秒开启 WiFi 同步一次离线打卡数据
        if (millis() - lastWifiSyncTime >= 60000UL) {
            Serial.println("[巡检同步] 60 秒周期，开启 WiFi 上传打卡数据...");
            if (connectWifi(8000)) {
                syncOfflineRecords();
            }
            WiFi.disconnect(true);
            WiFi.mode(WIFI_OFF);
            lastWifiSyncTime = millis();
        }

        // 3. 检查巡检计划是否到期
        if (millis() - patrolStartMs >= patrolDurationMs) {
            Serial.println("[巡检结束] 计划时间已到，正在同步最终数据并进入 Deep Sleep...");
            if (connectWifi(8000)) {
                syncOfflineRecords();
            }
            isPatrolActive = false;
            enterDeepSleep(dynamicSleepIntervalSec);
        }

        return;
    }

    // 如果既没有 Web 服务也没有巡检任务，说明异常进入 loop，直接睡死
    Serial.println("[异常保护] loop() 无任务可运行，强制进入 Deep Sleep。");
    enterDeepSleep(dynamicSleepIntervalSec);
    delay(100);
}
