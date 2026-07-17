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

bool isTimeSynced = false;
bool isHttpServerRunning = false;
unsigned long lastHttpActivityTime = 0;
unsigned long lastScanTime = 0;
String lastScannedCard = "";
String lastScannedCardToShow = "无";

bool isWifiSleeping = false;
bool isWifiConnecting = false;
unsigned long lastWifiSyncTime = 0;
unsigned long wifiConnectStartTime = 0;

// 包含具体模块的业务实现头文件
#include "utils.h"
#include "storage.h"
#include "network.h"
#include "card_reader.h"
#include "web_server.h"

// ==========================================
// 主初始化逻辑
// ==========================================
void setup() {
    Serial.begin(115200);
    delay(500);

    // 设置本地时区为东八区 (北京时间 GMT+8)
    setenv("TZ", "CST-8", 1);
    tzset();

    pinMode(BUZZER_PIN, OUTPUT);
    digitalWrite(BUZZER_PIN, LOW);
    pinMode(CONFIG_BTN, INPUT_PULLUP);

    // 挂载 LittleFS 缓存文件系统
    if (!LittleFS.begin(true)) {
        Serial.println("[系统错误] LittleFS 挂载失败！");
    }

    // 从 NVS Naming Preferences 加载参数
    preferences.begin("patrol_config", false);
    wandUuid = preferences.getString("uuid", "");
    wifiSsid = preferences.getString("ssid", "");
    wifiPassword = preferences.getString("password", "");
    serverUrl = preferences.getString("server", "");
    cardType = preferences.getString("mode", "IC");
    wandName = preferences.getString("name", "未同步");
    wifiInterval = preferences.getInt("interval", 60);

    Serial.println("======================================");
    Serial.println("巡更棒固件启动，当前配置：");
    Serial.println("UUID: " + wandUuid);
    Serial.println("WiFi: " + wifiSsid);
    Serial.println("服务器: " + serverUrl);
    Serial.println("读卡模式: " + cardType);
    Serial.println("设备名称: " + wandName);
    Serial.println("同步间隔: " + String(wifiInterval) + " 秒");
    Serial.println("======================================");

    // 1. 若参数不全 (设备尚未初始化配置过)，自动拉起 Web 配置热点
    if (wandUuid == "" || wifiSsid == "") {
        Serial.println("[引导配网] 检测到设备参数为空，启动 Web 配置热点。");
        startCaptivePortal();
    }

    // 2. 尝试接入网络
    Serial.print("[WiFi] 正在连接: " + wifiSsid + " ");
    WiFi.begin(wifiSsid.c_str(), wifiPassword.c_str());
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
        delay(500);
        Serial.print(".");
        attempts++;
    }
    Serial.println("");

    if (WiFi.status() == WL_CONNECTED) {
        Serial.print("[WiFi] 连接成功！IP地址为: ");
        Serial.println(WiFi.localIP());
        
        // 开启 STA 本地配置 Web 调试服务，记录活跃计时
        server.on("/", HTTP_GET, handleRoot);
        server.on("/api/status", HTTP_GET, handleStatus);
        server.on("/save", HTTP_POST, handleSave);
        server.begin();
        isHttpServerRunning = true;
        lastHttpActivityTime = millis();
        
        // 首发在线心跳对时，并推送缓存的记录
        sendHeartbeat();
        syncOfflineRecords();
        lastWifiSyncTime = millis();
    } else {
        // 上电无法接入指定 WiFi，自适应拉起 AP 配置热点以防脱网
        Serial.println("[联网失败] WiFi 连接超时，自动启动 Web 配置热点 AP 模式...");
        startCaptivePortal();
    }

    // 3. 独占模式加载读卡硬件驱动
    if (cardType == "IC") {
        initRC522();
    } else {
        initRDM6300();
    }
}

// ==========================================
// 主运行死循环
// ==========================================
void loop() {
    // 1. 始终以无阻塞高频执行读卡逻辑（刷卡与写入 LittleFS 缓存）
    handleCardReading();

    // 2. 处理 STA 模式下的 Web 状态服务器生命周期（上电初始调试期）
    if (isHttpServerRunning) {
        if (WiFi.status() == WL_CONNECTED) {
            server.handleClient();
        }
        
        // 3分钟内没有任何 HTTP 客户端访问，主动进入休眠以节省能耗
        if (millis() - lastHttpActivityTime > 180000) {
            server.close();
            isHttpServerRunning = false;
            Serial.println("[功耗优化] 3分钟内无 HTTP 请求活跃，本地 Web 服务已休眠。");
            
            // 立刻断开并彻底关闭 WiFi 射频以节省电量
            Serial.println("[休眠 WiFi] 关闭 WiFi 射频以启用周期唤醒模式...");
            WiFi.disconnect(true);
            WiFi.mode(WIFI_OFF);
            isWifiSleeping = true;
            lastWifiSyncTime = millis();
        }
    }

    // 3. 周期性 WiFi 连接与射频休眠状态机 (仅在 Web 配置服务休眠后运行)
    if (!isHttpServerRunning) {
        if (isWifiSleeping) {
            // 周期时间到达，唤醒射频模块并尝试接入 WiFi
            if (millis() - lastWifiSyncTime >= (unsigned long)wifiInterval * 1000) {
                Serial.printf("[唤醒同步] 周期同步时间到 (%d秒)，正在激活 WiFi 射频...\n", wifiInterval);
                WiFi.mode(WIFI_STA);
                WiFi.begin(wifiSsid.c_str(), wifiPassword.c_str());
                
                isWifiConnecting = true;
                isWifiSleeping = false;
                wifiConnectStartTime = millis();
            }
        }
        else if (isWifiConnecting) {
            // 在连接中，不断轮询 WiFi 状态
            if (WiFi.status() == WL_CONNECTED) {
                Serial.println("[唤醒成功] WiFi 已建立连接，同步服务器配置与打卡数据...");
                beep(80); // 短音提示连网成功
                
                sendHeartbeat();      // 同步对时/名称/卡片类型
                syncOfflineRecords(); // 批量补传离线打卡数据
                
                if (isHttpServerRunning) {
                    // 被远程唤醒，WiFi 射频保持工作状态，不切断休眠
                    Serial.println("[远程唤醒] 本地 Web 状态服务器已被拉起，设备继续保持 WiFi 联网调试。");
                    isWifiSleeping = false;
                    isWifiConnecting = false;
                    lastWifiSyncTime = millis();
                } else {
                    // 同步完毕，立刻关闭 WiFi 射频进入休眠，最大化省电
                    Serial.println("[休眠 WiFi] 数据同步完成，断开 WiFi 并关闭射频模块。");
                    WiFi.disconnect(true);
                    WiFi.mode(WIFI_OFF);
                    
                    isWifiSleeping = true;
                    isWifiConnecting = false;
                    lastWifiSyncTime = millis();
                }
            }
            else if (millis() - wifiConnectStartTime > 15000) { // 15秒联网超时
                Serial.println("[唤醒超时] WiFi 重新连接超时 (15s)，放弃本次同步并返回休眠。");
                WiFi.disconnect(true);
                WiFi.mode(WIFI_OFF);
                
                isWifiSleeping = true;
                isWifiConnecting = false;
                lastWifiSyncTime = millis(); // 依然重置计时，等待下一个周期再试
            }
        }
    }
    
    delay(5);
}
