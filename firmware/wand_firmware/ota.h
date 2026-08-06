#ifndef OTA_H
#define OTA_H

#include "config.h"

// 全局变量在 wand_firmware.ino 中定义，这里 extern 引用
extern String anyflashServer;
extern String otaDownloadUrl;
extern String otaNewVersion;
extern String otaChangelog;

namespace Ota {

    /**
     * @brief 验证当前运行分区为有效，关闭 Bootloader 自动回滚。
     * 在 setup() 中 Wi-Fi 连网稳定后调用，防止正常启动被误判为失败而触发意外回滚。
     */
    void confirm_running_partition() {
        const esp_partition_t* running = esp_ota_get_running_partition();
        if (running == NULL) return;

        esp_ota_img_states_t ota_state;
        if (esp_ota_get_state_partition(running, &ota_state) == ESP_OK) {
            if (ota_state == ESP_OTA_IMG_PENDING_VERIFY) {
                if (esp_ota_mark_app_valid_cancel_rollback() == ESP_OK) {
                    Serial.println("[OTA] 当前分区已标记为 VALID，自动回滚已关闭。");
                } else {
                    Serial.println("[OTA] 错误: 标记分区 VALID 失败！");
                }
            }
        }
    }

    /**
     * @brief 检查更新函数。返回 JSON 字符串，包含检查状态。
     * 供 WebServer 接口路由调用。
     */
    String checkOtaUpdate() {
        if (anyflashServer.length() == 0) {
            return "{\"status\":\"error\",\"message\":\"请先在配置页中设置并保存 OTA升级地址！\"}";
        }

        if (WiFi.status() != WL_CONNECTED) {
            return "{\"status\":\"error\",\"message\":\"设备未联网，请配置 WiFi 并确保其已连接外网。\"}";
        }

        HTTPClient http;
        // 构建请求 URL：<OTA升级地址>/api/ota/check?project=<PROJECT>&chip=<CHIP>
        String url = anyflashServer + "/api/ota/check?project=" + String(ANYFLASH_PROJECT) + "&chip=" + String(ANYFLASH_CHIP);
        
        Serial.println("[OTA] 正在向 AnyFlash 检查更新: " + url);
        http.begin(url);
        
        int httpCode = http.GET();
        String resultJson = "";
        
        if (httpCode == 200) {
            String response = http.getString();
            Serial.println("[OTA] 检查成功，收到响应: " + response);
            
            // 使用 ArduinoJson 解析响应
            StaticJsonDocument<768> doc;
            DeserializationError error = deserializeJson(doc, response);
            if (!error) {
                String serverVersion = doc["version"] | "";
                String downloadUrl = doc["url"] | "";
                String changelog = doc["changelog"] | "";
                
                otaNewVersion = serverVersion;
                otaDownloadUrl = downloadUrl;
                otaChangelog = changelog;
                
                // 比对版本
                if (serverVersion != "" && serverVersion != FIRMWARE_VERSION) {
                    // 发现新版本
                    StaticJsonDocument<768> outDoc;
                    outDoc["status"] = "success";
                    outDoc["hasUpdate"] = true;
                    outDoc["currentVersion"] = FIRMWARE_VERSION;
                    outDoc["newVersion"] = serverVersion;
                    outDoc["changelog"] = changelog;
                    
                    serializeJson(outDoc, resultJson);
                } else {
                    // 已是最新版本
                    resultJson = "{\"status\":\"success\",\"hasUpdate\":false,\"currentVersion\":\"" + String(FIRMWARE_VERSION) + "\"}";
                }
            } else {
                resultJson = "{\"status\":\"error\",\"message\":\"解析 AnyFlash 清单 JSON 失败。\"}";
            }
        } else {
            Serial.printf("[OTA] 检查失败，HTTP 状态码: %d\n", httpCode);
            resultJson = "{\"status\":\"error\",\"message\":\"连接 AnyFlash 失败，HTTP 状态码: " + String(httpCode) + "\"}";
        }
        http.end();
        return resultJson;
    }

    /**
     * @brief 异步 OTA 任务
     * 运行在 FreeRTOS 的独立任务中，避免阻塞 Web 响应和核心网络线程。
     */
    void doOtaUpdateTask(void *pvParameters) {
        Serial.println("[OTA] 启动升级线程，连接地址: " + otaDownloadUrl);
        
        // 临时注销任务看门狗守护，防止固件流式下载写入期间看门狗溢出触发 CPU 硬件复位变砖
        esp_task_wdt_delete(NULL);
        Serial.println("[OTA] 已临时注销当前任务看门狗。开始拉取固件...");

        WiFiClientSecure client;
        client.setInsecure(); // 忽略证书校验以适配 Cloudflare 强证书体系并简化固件大小

        // 升级完成后自动重启设备以运行新固件
        httpUpdate.rebootOnUpdate(true); 
        
        httpUpdate.onStart([]() {
            Serial.println("[OTA] httpUpdate 升级开始...");
        });
        httpUpdate.onEnd([]() {
            Serial.println("[OTA] httpUpdate 升级完毕。");
        });
        httpUpdate.onProgress([](int cur, int total) {
            Serial.printf("[OTA] 写入进度: %d%%\n", (cur * 100) / total);
        });
        httpUpdate.onError([](int err) {
            Serial.printf("[OTA] 升级出错，错误码: %d\n", err);
        });

        t_httpUpdate_return ret = httpUpdate.update(client, otaDownloadUrl);
        
        // 如果升级失败，将恢复任务看门狗监控
        esp_task_wdt_add(NULL);
        Serial.println("[OTA] 已恢复看门狗监控。");
        
        if (ret == HTTP_UPDATE_FAILED) {
            Serial.printf("[OTA] 升级失败! 错误: %s (码 %d)\n", 
                          httpUpdate.getLastErrorString().c_str(), httpUpdate.getLastError());
        } else if (ret == HTTP_UPDATE_NO_UPDATES) {
            Serial.println("[OTA] 没有可用更新。");
        } else if (ret == HTTP_UPDATE_OK) {
            // rebootOnUpdate(true) 时通常不会执行到这里，因为在此之前已重启
            Serial.println("[OTA] 升级成功，正在重启...");
            delay(1000);
            ESP.restart();
        }
        
        vTaskDelete(NULL); // 结束当前 FreeRTOS 任务
    }

    /**
     * @brief 触发 OTA 升级的入口。
     * 创建后台任务去执行升级，直接返回主调用方（以便 Web 服务顺利向浏览器发送 HTTP 状态 200 响应）。
     */
    bool startOtaUpdate() {
        if (otaDownloadUrl.length() == 0) {
            return false;
        }
        
        // 创建后台任务运行升级流程 (分配 8KB 栈空间，优先级 1)
        xTaskCreate(doOtaUpdateTask, "ota_update_task", 8192, NULL, 1, NULL);
        return true;
    }
}

#endif // OTA_H
