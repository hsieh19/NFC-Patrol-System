#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h>
#include <SPI.h>
#include <MFRC522.h>
#include <HardwareSerial.h>
#include <WiFi.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <sys/time.h>
#include <LittleFS.h>
#include <ArduinoJson.h>
#include <WiFiClientSecure.h>
#include <HTTPUpdate.h>
#include <esp_ota_ops.h>
#include <esp_task_wdt.h>
#include <esp_sleep.h>
#include <driver/gpio.h>

// ==========================================
// AnyFlash OTA 升级配置
// ==========================================
#define FIRMWARE_VERSION       "v1.0.0"
#define ANYFLASH_PROJECT       "patrol_wand"
#define ANYFLASH_CHIP          "ESP32C3"

// ==========================================
// 硬件引脚配置
// ==========================================
#define BUZZER_PIN     3   // 有源蜂鸣器驱动脚 (高电平有效)
#define CONFIG_BTN     2   // 配网/重置物理按键 (低电平有效)

// MFRC522 (SPI) 引脚配置
#define RC522_SCK      4
#define RC522_MISO     5
#define RC522_MOSI     6
#define RC522_CS       7
#define RC522_RST      8

// RDM6300 (UART1) 引脚配置
#define RDM6300_RX     1   // RDM6300 TX -> ESP32-C3 RX1

// RDM6300 电源控制引脚 (AO3400 N-ch MOSFET 低边开关控制)
// HIGH = MOSFET 导通 = RDM6300 有 GND 回路 = 供电工作
// LOW  = MOSFET 断开 = RDM6300 断电 = 零功耗待机
#define RDM_PWR_PIN    10

// ==========================================
// 低功耗控制常量
// ==========================================
#define SLEEP_INTERVAL_SEC     900    // 日常心跳唤醒间隔 (秒，默认 15 分钟)
#define WEB_CONFIG_TIMEOUT_MS  180000 // Web 配置活跃超时 (毫秒，3 分钟)
#define WIFI_CONNECT_TIMEOUT_MS 12000 // WiFi 连接最大等待时间 (毫秒)

// ==========================================
// 全局对象 extern 声明
// ==========================================
extern WebServer server;
extern DNSServer dnsServer;
extern Preferences preferences;
extern MFRC522 mfrc522;
extern HardwareSerial rdmSerial;

// ==========================================
// 运行状态与配置变量 extern 声明
// ==========================================
extern String wandUuid;
extern String wandName;
extern String serverUrl;
extern String wifiSsid;
extern String wifiPassword;
extern String cardType;
extern int wifiInterval;

extern bool isTimeSynced;
extern bool isHttpServerRunning;
extern unsigned long lastHttpActivityTime;
extern unsigned long lastScanTime;
extern String lastScannedCard;
extern String lastScannedCardToShow; // 最近读取的点位卡号 (清洗后的4字节)

extern bool isWifiSleeping;
extern bool isWifiConnecting;
extern unsigned long lastWifiSyncTime;
extern unsigned long wifiConnectStartTime;

// 低功耗与巡更计划全局变量
extern bool isPatrolActive;          // 是否处于计划巡检工作状态
extern unsigned long patrolStartMs;  // 巡检开启时间戳
extern unsigned long patrolDurationMs; // 巡检持续时长(毫秒)
extern int dynamicSleepIntervalSec;  // 后端下发的动态心跳间隔（秒）
extern bool lowPowerEnabled;         // 是否启用省电功能

// OTA 相关全局变量
extern String anyflashServer;
extern String otaDownloadUrl;
extern String otaNewVersion;
extern String otaChangelog;

#endif

