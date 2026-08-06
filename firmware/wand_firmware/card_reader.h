#ifndef CARD_READER_H
#define CARD_READER_H

#include "config.h"
#include "utils.h"
#include "storage.h"
#include "network.h"

// ==========================================
// 单模读卡硬件初始化
// ==========================================
void initRC522() {
    // RC522_RST 需要设置为输出模式，并确保处于高电平 (Hard Power-Up 状态)
    pinMode(RC522_RST, OUTPUT);
    digitalWrite(RC522_RST, HIGH);
    delay(50); // 等待晶振稳定
    SPI.begin(RC522_SCK, RC522_MISO, RC522_MOSI, RC522_CS);
    mfrc522.PCD_Init();
    Serial.println("[初始化成功] MFRC522 (IC卡 13.56MHz) 已加载。");
}

void initRDM6300() {
    // 通过 AO3400 MOSFET 上电 RDM6300
    rdmPowerOn(); // 拉高 GPIO10，MOSFET 导通，RDM6300 接通 GND 回路
    rdmSerial.begin(9600, SERIAL_8N1, RDM6300_RX, -1);
    Serial.println("[初始化成功] RDM6300 (ID卡 125KHz) 串口监听已就绪。");
}

// ==========================================
// 正常读卡业务逻辑 (防连刷去抖)
// ==========================================
void handleCardReading() {
    String cardId = "";

    if (cardType == "IC") {
        // 读取 MFRC522
        if (mfrc522.PICC_IsNewCardPresent() && mfrc522.PICC_ReadCardSerial()) {
            for (byte i = 0; i < mfrc522.uid.size; i++) {
                cardId += String(mfrc522.uid.uidByte[i] < 0x10 ? "0" : "");
                cardId += String(mfrc522.uid.uidByte[i], HEX);
            }
            cardId.toUpperCase();
            mfrc522.PICC_HaltA();
        }
    } 
    else if (cardType == "ID") {
        // 读取 RDM6300 (UART1)
        if (rdmSerial.available() > 0) {
            byte frame[14];
            int readBytes = rdmSerial.readBytes(frame, 14);
            // 校验帧头 0x02，帧尾 0x03
            if (readBytes == 14 && frame[0] == 0x02 && frame[13] == 0x03) {
                // 提取中间 10 字节卡号
                for (int i = 1; i <= 10; i++) {
                    cardId += (char)frame[i];
                }
                cardId.trim();
            }
        }
    }

    if (cardId != "") {
        // 过滤第一个字节（厂商代码），只保留后4个字节的卡号 (即十六进制串的后8位)
        if (cardId.length() >= 10) {
            cardId = cardId.substring(cardId.length() - 8);
        }
        
        // 更新最近一次读取的有效卡号，供本地 Web 页面状态栏展示
        lastScannedCardToShow = cardId;

        unsigned long now = millis();
        // 防连刷去抖动限制：若刷同一张卡，间隔必须大于 1.5 秒
        if (cardId == lastScannedCard && (now - lastScanTime < 1500)) {
            return;
        }

        lastScanTime = now;
        lastScannedCard = cardId;
        beep(100); // 蜂鸣器滴声

        unsigned long long ts = getAbsoluteTimestamp();
        Serial.printf("[刷卡感应] 卡号: %s, 时间: %llu\n", cardId.c_str(), ts);

        // 如果连上 WiFi 且成功对过时，直接实时上传
        if (WiFi.status() == WL_CONNECTED && isTimeSynced) {
            if (uploadSingleRecord(cardId, ts)) {
                Serial.println("[实时上传] 成功打卡数据。");
            } else {
                Serial.println("[实时异常] 上传失败，将打卡数据保存至离线缓存。");
                cacheRecord(cardId, ts);
            }
        } else {
            // 离线打卡，写缓存
            cacheRecord(cardId, ts);
        }
    }
}

#endif
