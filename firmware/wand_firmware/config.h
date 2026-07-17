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
#define RDM6300_RX     9   // RDM6300 TX -> ESP32-C3 RX1

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

#endif
