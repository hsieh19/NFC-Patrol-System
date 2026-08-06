#ifndef NETWORK_H
#define NETWORK_H

#include "config.h"
#include "utils.h"
#include "storage.h"
#include "low_power.h"

// 前置声明外部 Web 状态服务器开启函数 (在 web_server.h 中定义)，避免循环引用
extern void startWebServerSTA();

// ==========================================
// 实时打卡单条记录上传逻辑
// ==========================================
bool uploadSingleRecord(String cardId, unsigned long long ts) {
    if (WiFi.status() != WL_CONNECTED) return false;
    
    HTTPClient http;
    String url = serverUrl + "/api/patrol/hardware-upload";
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    
    String payload = "{\"wandUuid\":\"" + wandUuid + "\",\"records\":[{\"cardId\":\"" + cardId + "\",\"timestamp\":" + String(ts) + "}]}";
    int code = http.POST(payload);
    
    bool success = false;
    if (code == 200) {
        String response = http.getString();
        
        // 实时响应可能包含工作模式变更 cardType，解析以保持同步
        int typeIdx = response.indexOf("\"cardType\":\"");
        if (typeIdx != -1) {
            String serverMode = response.substring(typeIdx + 12);
            int quoteIdx = serverMode.indexOf("\"");
            if (quoteIdx != -1) {
                serverMode = serverMode.substring(0, quoteIdx);
                serverMode.trim();
                if ((serverMode == "IC" || serverMode == "ID") && serverMode != cardType) {
                    Serial.println("[配置变更] 实时打卡响应中发现工作模式变更: " + cardType + " -> " + serverMode + "，设备正在保存并重启...");
                    preferences.putString("mode", serverMode);
                    delay(1000);
                    ESP.restart();
                }
            }
        }
        success = true;
    }
    http.end();
    return success;
}

// ==========================================
// 硬件接口通讯：心跳发送与对时
// ==========================================
void sendHeartbeat() {
    if (WiFi.status() != WL_CONNECTED) return;

    HTTPClient http;
    String url = serverUrl + "/api/patrol/heartbeat";
    http.begin(url);
    http.addHeader("Content-Type", "application/json");

    String payload = "{\"wandUuid\":\"" + wandUuid + "\",\"ipAddress\":\"" + WiFi.localIP().toString() + "\"}";
    
    Serial.println("[心跳上报] 载荷: " + payload);
    int code = http.POST(payload);
    
    if (code == 200) {
        String response = http.getString();
        Serial.println("[心跳响应] " + response);

        // 简易解析 JSON 中的 serverTime (毫秒时间戳)
        int timeIdx = response.indexOf("\"serverTime\":");
        if (timeIdx != -1) {
            String timeStr = response.substring(timeIdx + 13);
            int commaIdx = timeStr.indexOf(",");
            if (commaIdx != -1) timeStr = timeStr.substring(0, commaIdx);
            timeStr.replace("}", "");
            timeStr.trim();
            unsigned long long serverTime = strtoull(timeStr.c_str(), NULL, 10);
            syncLocalTime(serverTime);
            persistTimeRef(); // 持久化时间基准至 RTC 内存，供 Deep Sleep 后推算
        }

        // 简易解析 JSON 中的 wandName (设备名称)
        int nameIdx = response.indexOf("\"wandName\":\"");
        if (nameIdx != -1) {
            String nameStr = response.substring(nameIdx + 12);
            int quoteIdx = nameStr.indexOf("\"");
            if (quoteIdx != -1) {
                wandName = nameStr.substring(0, quoteIdx);
                preferences.putString("name", wandName); // 缓存回 NVS
                Serial.println("[名称同步] 服务端预设设备名称为: " + wandName);
            }
        }

        // 简易解析 JSON 中的 cardType (读卡工作模式)
        int typeIdx = response.indexOf("\"cardType\":\"");
        if (typeIdx != -1) {
            String serverMode = response.substring(typeIdx + 12);
            int quoteIdx = serverMode.indexOf("\"");
            if (quoteIdx != -1) {
                serverMode = serverMode.substring(0, quoteIdx);
                serverMode.trim();
                // 若服务端配置的模式与设备当前工作模式不同，写入 NVS 并自动重启切换硬件驱动
                if ((serverMode == "IC" || serverMode == "ID") && serverMode != cardType) {
                    Serial.println("[配置变更] 服务端更改了读卡工作模式: " + cardType + " -> " + serverMode + "，设备将在写入 NVS 后自动重启！");
                    preferences.putString("mode", serverMode);
                    delay(1000);
                    ESP.restart();
                }
            }
        }

        // 简易解析 JSON 中的 shouldWakeServer (远程唤醒)
        int wakeIdx = response.indexOf("\"shouldWakeServer\":true");
        if (wakeIdx != -1) {
            Serial.println("[远程唤醒] 收到服务端唤醒指令！正在启用配置网页...");
            startWebServerSTA();
            lastHttpActivityTime = millis(); // 重置保活计时器 (3分钟调试期)
        }

        // 简易解析 JSON 中的 sleepInterval (后端动态调整心跳间隔)
        int sleepIdx = response.indexOf("\"sleepInterval\":");
        if (sleepIdx != -1) {
            String sleepStr = response.substring(sleepIdx + 16);
            int endIdx = sleepStr.indexOf(",");
            if (endIdx == -1) endIdx = sleepStr.indexOf("}");
            if (endIdx != -1) sleepStr = sleepStr.substring(0, endIdx);
            sleepStr.trim();
            int newInterval = sleepStr.toInt();
            if (newInterval >= 60 && newInterval <= 3600) { // 合法范围: 1分钟 ~ 1小时
                dynamicSleepIntervalSec = newInterval;
                Serial.printf("[心跳间隔] 后端设置下一次心跳间隔为: %d 秒\n", dynamicSleepIntervalSec);
            }
        }

        // 简易解析 JSON 中的 patrolDuration (计划巡检指令)
        int patrolIdx = response.indexOf("\"patrolDuration\":");
        if (patrolIdx != -1) {
            String durStr = response.substring(patrolIdx + 17);
            int endIdx = durStr.indexOf(",");
            if (endIdx == -1) endIdx = durStr.indexOf("}");
            if (endIdx != -1) durStr = durStr.substring(0, endIdx);
            durStr.trim();
            int durationSec = durStr.toInt();
            if (durationSec > 0 && !isPatrolActive) {
                Serial.printf("[巡检计划] 收到巡检指令，巡检时长: %d 秒\n", durationSec);
                isPatrolActive = true;
                patrolStartMs  = millis();
                patrolDurationMs = (unsigned long)durationSec * 1000UL;
                // 蜂鸣器急促响 3 声，提醒用户巡检开始
                beep(200); delay(100); beep(200); delay(100); beep(400);
                Serial.println("[巡检开始] 蜂鸣器已提醒，进入巡检工作状态。");
            }
        }
    } else {
        Serial.printf("[心跳异常] 发送失败, HTTP 状态码: %d\n", code);
        if (code == 401) {
            Serial.println("[授权失效] 本设备 UUID 校验失败！");
        }
    }
    http.end();
}

// ==========================================
// 离线缓存同步：上传至服务端并清空
// ==========================================
void syncOfflineRecords() {
    if (WiFi.status() != WL_CONNECTED || !isTimeSynced) return;
    if (!LittleFS.exists("/offline_records.txt")) return;

    File file = LittleFS.open("/offline_records.txt", "r");
    if (!file) return;

    // 读取所有记录，组装 JSON 数组
    String jsonRecords = "[";
    bool first = true;
    
    while (file.available()) {
        String line = file.readStringUntil('\n');
        line.trim();
        if (line == "") continue;
        
        int commaIdx = line.indexOf(',');
        if (commaIdx == -1) continue;
        
        String card = line.substring(0, commaIdx);
        String ts = line.substring(commaIdx + 1);

        if (!first) jsonRecords += ",";
        jsonRecords += "{\"cardId\":\"" + card + "\",\"timestamp\":" + ts + "}";
        first = false;
    }
    file.close();
    jsonRecords += "]";

    if (first) {
        // 没有合法记录，直接删掉缓存文件即可
        LittleFS.remove("/offline_records.txt");
        return;
    }

    HTTPClient http;
    String url = serverUrl + "/api/patrol/hardware-upload";
    http.begin(url);
    http.addHeader("Content-Type", "application/json");

    String payload = "{\"wandUuid\":\"" + wandUuid + "\",\"records\":" + jsonRecords + "}";
    Serial.println("[数据同步] 正在上传离线缓冲记录...");
    
    int code = http.POST(payload);
    if (code == 200) {
        Serial.println("[同步成功] 服务端已成功保存，清空本地离线缓存。");
        LittleFS.remove("/offline_records.txt");
    } else {
        Serial.printf("[同步失败] 接口返回状态码: %d，保留本地缓存以待重试。\n", code);
    }
    http.end();
}

#endif
