#ifndef WEB_SERVER_H
#define WEB_SERVER_H

#include "config.h"
#include "utils.h"
#include "card_reader.h"
#include <time.h>

// 前置声明 OTA 接口函数，避免包含顺序引发编译错误
namespace Ota {
    String checkOtaUpdate();
    bool startOtaUpdate();
}

// ==========================================
// ESP32 Web u72b6u6001u4e0eu914du7f6eu7f51u9875u6a21u677f
// ==========================================
const char* htmlTemplate = R"=====(<!DOCTYPE html>
<html>
<head>
  <meta charset='UTF-8'>
  <meta name='viewport' content='width=device-width, initial-scale=1.0'>
  <title>巡更棒配置与状态</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f1f5f9; color: #334155; padding: 15px; margin: 0; }
    .container { background: white; border-radius: 16px; padding: 25px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); max-width: 450px; margin: 20px auto; }
    .status-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 15px; margin-bottom: 20px; }
    .status-item { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
    .status-label { font-weight: bold; color: #1e3a8a; }
    h2 { margin-top: 0; color: #1e293b; text-align: center; font-size: 20px; }
    .tabs { display: flex; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; }
    .tab { flex: 1; text-align: center; padding: 10px 0; cursor: pointer; font-weight: bold; color: #64748b; border-bottom: 2px solid transparent; transition: all 0.2s; font-size: 14px; }
    .tab.active { color: #2563eb; border-bottom-color: #2563eb; }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
    .field { margin-bottom: 15px; }
    .field-row { display: flex; gap: 12px; margin-bottom: 15px; }
    .field-row .field { flex: 1; margin-bottom: 0; }
    label { display: block; font-weight: 600; margin-bottom: 6px; font-size: 13px; color: #475569; }
    input, select { width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; box-sizing: border-box; font-size: 14px; outline: none; }
    input:focus, select:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
    button { width: 100%; padding: 12px; background: #2563eb; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 14px; transition: background 0.2s; }
    button:hover { background: #1d4ed8; }
    button:disabled { background: #cbd5e1; cursor: not-allowed; }
    .loader { border: 4px solid #f3f3f3; border-top: 4px solid #2563eb; border-radius: 50%; width: 28px; height: 28px; animation: spin 1s linear infinite; margin: 20px auto; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class='container'>
    <h2>巡更棒配置与状态</h2>
    <div class='status-box'>
      <div class='status-item'>
        <span class='status-label'>设备名称：</span>
        <span>%WAND_NAME%</span>
      </div>
      <div class='status-item'>
        <span class='status-label'>局域网 IP：</span>
        <span style='font-family: monospace;'>%IP_ADDRESS%</span>
      </div>
      <div class='status-item'>
        <span class='status-label'>时间对时：</span>
        <span id='time-status'>%TIME_STATUS%</span>
      </div>
      <div class='status-item'>
        <span class='status-label'>最近读卡：</span>
        <span id='last-card' style='font-family: monospace; font-weight: bold; color: #2563eb;'>%LAST_CARD%</span>
      </div>
    </div>
    
    <div class='tabs'>
      <div id='btn-config' class='tab active' onclick="switchTab('config')">配置</div>
      <div id='btn-upgrade' class='tab' onclick="switchTab('upgrade')">升级</div>
    </div>
    
    <!-- 配置页内容 -->
    <div id='tab-config' class='tab-content active'>
      <form action='/save' method='POST'>
        <div class='field'>
          <label>授权 UUID</label>
          <input type='text' name='uuid' required value='%UUID%' placeholder='请输入后台生成的 UUID'>
        </div>
        <div class='field-row'>
          <div class='field'>
            <label>WiFi 名称 (SSID)</label>
            <input type='text' name='ssid' required value='%SSID%' placeholder='WiFi SSID'>
          </div>
          <div class='field'>
            <label>WiFi 密码</label>
            <input type='password' name='password' placeholder='留空代表不修改'>
          </div>
        </div>
        <div class='field'>
          <label>系统服务器根地址</label>
          <input type='text' name='server' required value='%SERVER%' placeholder='http://[ip]:[port]'>
        </div>
        <div class='field'>
          <label>OTA升级地址</label>
          <input type='text' name='anyflash' value='%ANYFLASH%' placeholder='https://firmware.yourdomain.com'>
        </div>
        <div class='field-row'>
          <div class='field'>
            <label>工作读卡模式</label>
            <select name='mode'>
              <option value='IC' %SELECTED_IC%>IC卡模式 (RC522)</option>
              <option value='ID' %SELECTED_ID%>ID卡模式 (RDM6300)</option>
            </select>
          </div>
          <div class='field'>
            <label>WiFi 同步间隔 (秒)</label>
            <input type='number' name='interval' min='10' max='3600' required value='%INTERVAL%'>
          </div>
        </div>
        <div class='field'>
          <label>省电模式</label>
          <select name='low_power'>
            <option value='1' %SELECTED_LP_ON%>启用 (日常日常深睡眠，15分钟心跳)</option>
            <option value='0' %SELECTED_LP_OFF%>禁用 (不休眠，全功能常驻/实时上传)</option>
          </select>
        </div>
        <button type='submit'>保存并重启巡更棒</button>
      </form>
    </div>
    
    <!-- 升级页内容 -->
    <div id='tab-upgrade' class='tab-content'>
      <div style='text-align: center; padding: 10px 0;'>
        <p style='font-size: 14px;'>当前固件版本：<strong style='color: #2563eb;'>%FIRMWARE_VERSION%</strong></p>
        <div id='ota-status' style='margin: 15px 0; padding: 15px; background: #f8fafc; border-radius: 8px; font-size: 13px; color: #64748b; text-align: left; display: none; border: 1px solid #cbd5e1; line-height: 1.5;'></div>
        <button id='check-update-btn' type='button' onclick='checkUpdate()' style='margin-bottom: 10px;'>检查新版本</button>
        <button id='start-upgrade-btn' type='button' onclick='startUpgrade()' style='background: #10b981; display: none;'>立即升级固件</button>
      </div>
    </div>
  </div>
  
  <script>
    // 定时轮询读卡和时间状态，使用传统 ES5 语法以获得最高的设备兼容性
    setInterval(function() {
      fetch('/api/status')
        .then(function(res) {
          if (res.ok) return res.json();
        })
        .then(function(data) {
          if (data) {
            document.getElementById('last-card').textContent = data.lastCard;
            document.getElementById('time-status').textContent = data.timeStatus;
          }
        })
        .catch(function() {});
    }, 1500);
    
    // Tab 选项卡切换，使用超高兼容性写法，不依赖 classList.toggle 进阶参数
    function switchTab(t) {
      ['config','upgrade'].forEach(function(id) {
        var tabEl = document.getElementById('tab-' + id);
        var btnEl = document.getElementById('btn-' + id);
        if (id === t) {
          tabEl.classList.add('active');
          btnEl.classList.add('active');
        } else {
          tabEl.classList.remove('active');
          btnEl.classList.remove('active');
        }
      });
    }
    
    // 手动触发固件版本检查
    function checkUpdate() {
      var btn = document.getElementById('check-update-btn');
      var statusBox = document.getElementById('ota-status');
      var upgradeBtn = document.getElementById('start-upgrade-btn');
      
      btn.disabled = true;
      btn.textContent = '正在检查...';
      statusBox.style.display = 'block';
      statusBox.innerHTML = '<p style="text-align:center;margin:0;">正在连接云端服务器检查更新...</p>';
      upgradeBtn.style.display = 'none';
      
      fetch('/api/ota/check-now')
        .then(function(res) {
          if (!res.ok) throw new Error('请求接口失败，请检查网络后再试。');
          return res.json();
        })
        .then(function(data) {
          if (data.status === 'success') {
            if (data.hasUpdate) {
              statusBox.innerHTML = '<p style="margin: 0 0 8px 0; color: #10b981; font-weight: bold;">发现新版本: ' + data.newVersion + '</p>' +
                                    '<p style="margin: 0 0 4px 0; font-weight: 600;">更新日志:</p>' +
                                    '<pre style="margin: 0; background: #e2e8f0; padding: 8px; border-radius: 4px; font-family: inherit; font-size: 12px; white-space: pre-wrap; word-break: break-all;">' + (data.changelog || '无更新描述') + '</pre>';
              upgradeBtn.style.display = 'block';
            } else {
              statusBox.innerHTML = '<p style="text-align:center;margin:0;color:#10b981;font-weight:bold;">当前已是最新版本！</p>';
            }
          } else {
            statusBox.innerHTML = '<p style="margin:0;color:#ef4444;">检查失败: ' + data.message + '</p>';
          }
          btn.disabled = false;
          btn.textContent = '检查新版本';
        })
        .catch(function(err) {
          statusBox.innerHTML = '<p style="margin:0;color:#ef4444;">网络连接异常，无法连通设备。</p>';
          btn.disabled = false;
          btn.textContent = '检查新版本';
        });
    }
    
    // 手动启动 OTA 升级流程
    function startUpgrade() {
      var statusBox = document.getElementById('ota-status');
      var checkBtn = document.getElementById('check-update-btn');
      var upgradeBtn = document.getElementById('start-upgrade-btn');
      
      if (!confirm('确定要升级固件吗？升级过程中请务必保持电源接通，设备升级完成后将自动重启。')) {
        return;
      }
      
      checkBtn.style.display = 'none';
      upgradeBtn.style.display = 'none';
      statusBox.innerHTML = '<div style="text-align:center;">' +
                            '<p style="margin:0 0 10px 0;color:#2563eb;font-weight:bold;">固件正在流式下载与烧录中...</p>' +
                            '<div class="loader"></div>' +
                            '<p style="margin:10px 0 0 0;font-size:11px;color:#94a3b8;">这通常需要 10 ~ 30 秒，完成后设备会自动重启并应用更新。</p>' +
                            '</div>';
      
      fetch('/api/ota/start', { method: 'POST' })
        .then(function(res) {
          if (!res.ok) throw new Error('请求升级接口异常。');
          return res.json();
        })
        .then(function(data) {
          if (data.status === 'success') {
            // 轮询检查设备是否重启完成
            var attempts = 0;
            var interval = setInterval(function() {
              attempts++;
              fetch('/api/status')
                .then(function(checkRes) {
                  if (checkRes.ok && attempts > 12) {
                    clearInterval(interval);
                    alert('固件升级并重启成功！');
                    window.location.reload();
                  }
                })
                .catch(function() {
                  // 离线说明正在重启，属于正常现象
                  if (attempts > 50) {
                    clearInterval(interval);
                    statusBox.innerHTML = '<p style="margin:0;color:#ef4444;">升级超时或设备已断开连接，请刷新页面检查当前运行版本。</p>';
                  }
                });
            }, 1500);
          } else {
            alert('启动升级失败: ' + data.message);
            window.location.reload();
          }
        })
        .catch(function(e) {
          // 异步 OTA 启动后设备可能会快速断开并重启，这会导致 fetch 请求异常失败
          // 这种属于正常连通断开，我们等待 5 秒直接重载页面
          setTimeout(function() {
            alert('固件已在后台启动升级，请稍候设备自动重启并查看状态。');
            window.location.reload();
          }, 5000);
        });
    }
  </script>
</body>
</html>)=====";
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

// 供前端轮询检查有无 OTA 升级的接口
void handleOtaCheck() {
    if (isHttpServerRunning) {
        lastHttpActivityTime = millis();
    }
    String json = Ota::checkOtaUpdate();
    server.send(200, "application/json; charset=utf-8", json);
}

// 供前端触发 OTA 升级的接口
void handleOtaStart() {
    if (isHttpServerRunning) {
        lastHttpActivityTime = millis();
    }
    if (Ota::startOtaUpdate()) {
        server.send(200, "application/json; charset=utf-8", "{\"status\":\"success\"}");
    } else {
        server.send(200, "application/json; charset=utf-8", "{\"status\":\"error\",\"message\":\"无可用固件包下载链接，请先重新检查新版本。\"}");
    }
}

void handleRoot() {
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
    html.replace("%ANYFLASH%", anyflashServer);
    html.replace("%FIRMWARE_VERSION%", FIRMWARE_VERSION);
    html.replace("%SELECTED_IC%", cardType == "IC" ? "selected" : "");
    html.replace("%SELECTED_ID%", cardType == "ID" ? "selected" : "");
    html.replace("%SELECTED_LP_ON%", lowPowerEnabled ? "selected" : "");
    html.replace("%SELECTED_LP_OFF%", !lowPowerEnabled ? "selected" : "");
    html.replace("%INTERVAL%", String(wifiInterval));
    html.replace("%LAST_CARD%", lastScannedCardToShow);
    
    server.sendHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    server.sendHeader("Pragma", "no-cache");
    server.sendHeader("Expires", "-1");
    server.send(200, "text/html; charset=utf-8", html);
}

void handleSave() {
    String newUuid = server.arg("uuid");
    String newSsid = server.arg("ssid");
    String newPassword = server.arg("password");
    String newServer = server.arg("server");
    String newAnyflash = server.arg("anyflash");
    String newMode = server.arg("mode");
    String newInterval = server.arg("interval");
    String newLowPower = server.arg("low_power");

    preferences.putString("uuid", newUuid);
    preferences.putString("ssid", newSsid);
    if (newPassword != "") {
        preferences.putString("password", newPassword);
    }
    preferences.putString("server", newServer);
    preferences.putString("anyflash", newAnyflash);
    preferences.putString("mode", newMode);
    preferences.putBool("low_power", newLowPower == "1");
    
    int intervalVal = newInterval.toInt();
    if (intervalVal < 10) intervalVal = 10;
    if (intervalVal > 3600) intervalVal = 3600;
    preferences.putInt("interval", intervalVal);

    // 构造带 UTF-8 编码和 6 秒自动跳转的等待网页
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
    server.on("/api/ota/check-now", HTTP_GET, handleOtaCheck);
    server.on("/api/ota/start", HTTP_POST, handleOtaStart);
    server.on("/save", HTTP_POST, handleSave);
    server.onNotFound(handleNotFound);
    server.begin();
    
    Serial.println("[AP配置模式] 热点开启: " + apName + ", 请访问 192.168.4.1 进行配置。");

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
        server.on("/api/ota/check-now", HTTP_GET, handleOtaCheck);
        server.on("/api/ota/start", HTTP_POST, handleOtaStart);
        server.on("/save", HTTP_POST, handleSave);
        server.begin();
        isHttpServerRunning = true;
        Serial.println("[远程唤醒] 本地 Web 状态服务器已被成功激活！");
    }
}

#endif

