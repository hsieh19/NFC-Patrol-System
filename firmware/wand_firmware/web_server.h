#ifndef WEB_SERVER_H
#define WEB_SERVER_H

#include "config.h"
#include "utils.h"
#include "card_reader.h"
#include <time.h>

// ==========================================
// ESP32 Web 状态与配置网页模板
// ==========================================
const char* htmlTemplate = 
"<!DOCTYPE html>"
"<html>"
"<head>"
"  <meta charset='UTF-8'>"
"  <meta name='viewport' content='width=device-width, initial-scale=1.0'>"
"  <title>巡更棒配置与状态</title>"
"  <style>"
"    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f1f5f9; color: #334155; padding: 15px; margin: 0; }"
"    .container { background: white; border-radius: 16px; padding: 25px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); max-width: 450px; margin: 20px auto; }"
"    .status-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 15px; margin-bottom: 20px; }"
"    .status-item { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }"
"    .status-label { font-weight: bold; color: #1e3a8a; }"
"    h2 { margin-top: 0; color: #1e293b; text-align: center; font-size: 20px; }"
"    .field { margin-bottom: 15px; }"
"    label { display: block; font-weight: 600; margin-bottom: 6px; font-size: 13px; color: #475569; }"
"    input, select { width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; box-sizing: border-box; font-size: 14px; outline: none; }"
"    input:focus, select:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }"
"    button { width: 100%; padding: 12px; background: #2563eb; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 14px; transition: background 0.2s; }"
"    button:hover { background: #1d4ed8; }"
"  </style>"
"</head>"
"<body>"
"  <div class='container'>"
"    <h2>巡更棒配置与状态</h2>"
"    <div class='status-box'>"
"      <div class='status-item'>"
"        <span class='status-label'>设备名称：</span>"
"        <span>%WAND_NAME%</span>"
"      </div>"
"      <div class='status-item'>"
"        <span class='status-label'>局域网 IP：</span>"
"        <span style='font-family: monospace;'>%IP_ADDRESS%</span>"
"      </div>"
"      <div class='status-item'>"
"        <span class='status-label'>时间对时：</span>"
"        <span id='time-status'>%TIME_STATUS%</span>"
"      </div>"
"      <div class='status-item'>"
"        <span class='status-label'>最近读卡：</span>"
"        <span id='last-card' style='font-family: monospace; font-weight: bold; color: #2563eb;'>%LAST_CARD%</span>"
"      </div>"
"    </div>"
"    <form action='/save' method='POST'>"
"      <div class='field'>"
"        <label>授权 UUID</label>"
"        <input type='text' name='uuid' required value='%UUID%' placeholder='请输入后台生成的 UUID'>"
"      </div>"
"      <div class='field'>"
"        <label>WiFi 名称 (SSID)</label>"
"        <input type='text' name='ssid' required value='%SSID%' placeholder='WiFi SSID'>"
"      </div>"
"      <div class='field'>"
"        <label>WiFi 密码</label>"
"        <input type='password' name='password' placeholder='留空代表不修改'>"
"      </div>"
"      <div class='field'>"
"        <label>系统服务器根地址</label>"
"        <input type='text' name='server' required value='%SERVER%' placeholder='http://[ip]:[port]'>"
"      </div>"
"      <div class='field'>"
"        <label>工作读卡模式</label>"
"        <select name='mode'>"
"          <option value='IC' %SELECTED_IC%>IC卡模式 (RC522)</option>"
"          <option value='ID' %SELECTED_ID%>ID卡模式 (RDM6300)</option>"
"        </select>"
"      </div>"
"      <div class='field'>"
"        <label>WiFi 同步间隔 (秒，10 - 3600)</label>"
"        <input type='number' name='interval' min='10' max='3600' required value='%INTERVAL%' placeholder='默认 60 秒'>"
"      </div>"
"      <button type='submit'>保存并重启巡更棒</button>"
"    </form>"
"  </div>"
"  <script>"
"    setInterval(async () => {"
"      try {"
"        const res = await fetch('/api/status');"
"        if (res.ok) {"
"          const data = await res.json();"
"          document.getElementById('last-card').textContent = data.lastCard;"
"          document.getElementById('time-status').textContent = data.timeStatus;"
"        }"
"      } catch (e) {}"
"    }, 1500);"
"  </script>"
"</body>"
"</html>";

String getTimeStatus() {
    if (!isTimeSynced) return "未对时";
    
    struct timeval tv;
    gettimeofday(&tv, NULL);
    time_t nowTime = tv.tv_sec;
    struct tm* timeInfo = localtime(&nowTime);
    
    char buffer[30];
    strftime(buffer, sizeof(buffer), "%Y-%m-%d %H:%M:%S", timeInfo);
    return String(buffer);
}

void handleStatus() {
    if (isHttpServerRunning) {
        lastHttpActivityTime = millis();
    }
    String json = "{\"lastCard\":\"" + lastScannedCardToShow + "\",\"timeStatus\":\"" + getTimeStatus() + "\"}";
    server.send(200, "application/json; charset=utf-8", json);
}

void handleRoot() {
    // 每次用户访问网页，重置 HTTP 活跃时间以防被超时强关
    if (isHttpServerRunning) {
        lastHttpActivityTime = millis();
    }
    String html = String(htmlTemplate);
    html.replace("%WAND_NAME%", wandName);
    html.replace("%IP_ADDRESS%", WiFi.status() == WL_CONNECTED ? WiFi.localIP().toString() : "192.168.4.1 (AP模式)");
    html.replace("%TIME_STATUS%", getTimeStatus());
    html.replace("%UUID%", wandUuid);
    html.replace("%SSID%", wifiSsid);
    html.replace("%SERVER%", serverUrl);
    html.replace("%SELECTED_IC%", cardType == "IC" ? "selected" : "");
    html.replace("%SELECTED_ID%", cardType == "ID" ? "selected" : "");
    html.replace("%INTERVAL%", String(wifiInterval));
    html.replace("%LAST_CARD%", lastScannedCardToShow);
    
    server.send(200, "text/html; charset=utf-8", html);
}

void handleSave() {
    String newUuid = server.arg("uuid");
    String newSsid = server.arg("ssid");
    String newPassword = server.arg("password");
    String newServer = server.arg("server");
    String newMode = server.arg("mode");
    String newInterval = server.arg("interval");

    preferences.putString("uuid", newUuid);
    preferences.putString("ssid", newSsid);
    if (newPassword != "") {
        preferences.putString("password", newPassword);
    }
    preferences.putString("server", newServer);
    preferences.putString("mode", newMode);
    
    int intervalVal = newInterval.toInt();
    if (intervalVal < 10) intervalVal = 10;
    if (intervalVal > 3600) intervalVal = 3600;
    preferences.putInt("interval", intervalVal);

    // 构造带 UTF-8 编码和 6 秒自动跳转的精美等待网页
    String redirectHtml = 
        "<!DOCTYPE html>"
        "<html>"
        "<head>"
        "  <meta charset='UTF-8'>"
        "  <meta http-equiv='refresh' content='6;URL=/'>"
        "  <meta name='viewport' content='width=device-width, initial-scale=1.0'>"
        "  <title>保存配置</title>"
        "  <style>"
        "    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f1f5f9; text-align: center; padding-top: 80px; color: #334155; margin: 0; }"
        "    .card { background: white; border-radius: 16px; padding: 30px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); max-width: 350px; margin: 0 auto; border: 1px solid #e2e8f0; }"
        "    .loader { border: 4px solid #f3f3f3; border-top: 4px solid #2563eb; border-radius: 50%; width: 28px; height: 28px; animation: spin 1s linear infinite; margin: 20px auto; }"
        "    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }"
        "  </style>"
        "</head>"
        "<body>"
        "  <div class='card'>"
        "    <h3 style='color: #1e293b; margin-top: 0; font-size: 18px;'>配置保存成功</h3>"
        "    <p style='font-size: 14px; color: #64748b;'>设备正在重启，请稍候...</p>"
        "    <div class='loader'></div>"
        "    <p style='font-size: 11px; color: #94a3b8;'>系统将在 6 秒后自动跳转回首页</p>"
        "  </div>"
        "</body>"
        "</html>";

    server.send(200, "text/html; charset=utf-8", redirectHtml);
    
    beep(100); delay(100);
    beep(100); delay(100);
    beep(300);
    delay(2000);
    ESP.restart();
}

// Captive Portal 强制跳转
void handleNotFound() {
    String host = server.hostHeader();
    if (host != "192.168.4.1" && WiFi.status() != WL_CONNECTED) {
        server.sendHeader("Location", "http://192.168.4.1/", true);
        server.send(302, "text/plain", "");
    } else {
        server.send(404, "text/plain", "Not Found");
    }
}

// 启动 Web AP 配置模式
void startCaptivePortal() {
    WiFi.mode(WIFI_AP);
    String mac = WiFi.macAddress();
    mac.replace(":", "");
    String apName = "PatrolWand_" + mac.substring(mac.length() - 6);
    
    WiFi.softAP(apName.c_str());
    dnsServer.start(53, "*", WiFi.softAPIP());
    
    server.on("/", HTTP_GET, handleRoot);
    server.on("/api/status", HTTP_GET, handleStatus);
    server.on("/save", HTTP_POST, handleSave);
    server.onNotFound(handleNotFound);
    server.begin();
    
    Serial.println("[AP配置模式] 热点开启: " + apName + ", 请访问 192.168.4.1 进行配置。");
    
    // 持续哔声提示进入 AP 模式
    beep(200); delay(100); beep(200);

    while (true) {
        dnsServer.processNextRequest();
        server.handleClient();
        handleCardReading(); // 核心：支持在 AP 模式下无阻塞读卡并写入 LittleFS 缓存
        delay(5);
        // 物理按键短按可重启复位
        if (digitalRead(CONFIG_BTN) == LOW) {
            delay(200);
            ESP.restart();
        }
    }
}

// ==========================================
// 供外部 (如心跳远程唤醒) 调用的 Web 状态服务启动接口
// ==========================================
void startWebServerSTA() {
    if (!isHttpServerRunning) {
        server.on("/", HTTP_GET, handleRoot);
        server.on("/api/status", HTTP_GET, handleStatus);
        server.on("/save", HTTP_POST, handleSave);
        server.begin();
        isHttpServerRunning = true;
        Serial.println("[远程唤醒] 本地 Web 状态服务器已被成功激活！");
    }
}

#endif
