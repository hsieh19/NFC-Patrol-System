#ifndef LOW_POWER_H
#define LOW_POWER_H

#include "config.h"

// ==========================================
// RTC 慢速内存持久化变量 (Deep Sleep 期间保留)
// ==========================================
RTC_DATA_ATTR static int64_t  rtcBaseTimeSec  = 0;  // 上次对时 Unix 时间戳(秒)
RTC_DATA_ATTR static int64_t  rtcBaseTimerUs  = 0;  // 上次对时时 esp_timer 计数(微秒)
RTC_DATA_ATTR static int      offlineCacheCount = 0; // 离线未上传记录计数(唤醒快速判断)
RTC_DATA_ATTR static bool     wasDeepSleep    = false; // 是否由 Deep Sleep 唤醒

// ==========================================
// RDM6300 电源控制 (通过 AO3400 MOSFET)
// ==========================================

/**
 * @brief 开启 RDM6300 电源 (拉高 GPIO10，MOSFET 导通，接通 GND 回路)
 * 唤醒后需要等待约 50ms 供 125KHz 振荡器稳定
 */
void rdmPowerOn() {
    digitalWrite(RDM_PWR_PIN, HIGH);
    delay(50); // 等待 RDM6300 振荡器稳定
    Serial.println("[RDM6300] 电源已开启 (MOSFET ON)");
}

/**
 * @brief 关断 RDM6300 电源 (拉低 GPIO10，MOSFET 截止，断开 GND 回路)
 * 彻底断电，电流降至近似 0
 */
void rdmPowerOff() {
    if (rdmSerial) {
        rdmSerial.end(); // 先关闭 UART1，释放引脚
    }
    digitalWrite(RDM_PWR_PIN, LOW);
    Serial.println("[RDM6300] 电源已关断 (MOSFET OFF)");
}

// ==========================================
// 读卡器深度关断 (RC522 Hard Power-Down)
// ==========================================

/**
 * @brief 将 RC522 软关天线并通过 RST 引脚触发 Hard Power-Down
 * 硬关断后，RC522 消耗电流接近 0
 */
void rc522PowerDown() {
    mfrc522.PCD_AntennaOff();       // 关闭射频天线
    mfrc522.PCD_SoftPowerDown();    // 设置 PowerDown 位
    delay(5);
    digitalWrite(RC522_RST, LOW);   // RST 拉低 → 触发 Hard Power-Down
    Serial.println("[RC522] Hard Power-Down 已执行");
}

/**
 * @brief 从 Hard Power-Down 唤醒 RC522
 * RST 拉高后需要等待约 50ms 供晶振稳定
 */
void rc522PowerUp() {
    digitalWrite(RC522_RST, HIGH);
    delay(50);
    SPI.begin(RC522_SCK, RC522_MISO, RC522_MOSI, RC522_CS);
    mfrc522.PCD_Init();
    Serial.println("[RC522] 已唤醒并重新初始化");
}

// ==========================================
// 持久化时间戳辅助函数
// ==========================================

/**
 * @brief 每次成功对时后调用，将当前 POSIX 时间写入 RTC 内存
 * 用于 Deep Sleep 重启后估算时间，避免无时间戳打卡记录
 */
void persistTimeRef() {
    struct timeval tv;
    gettimeofday(&tv, NULL);
    rtcBaseTimeSec = (int64_t)tv.tv_sec;
    rtcBaseTimerUs = (int64_t)esp_timer_get_time();
    Serial.printf("[时间持久化] RTC 基准时间已保存: %lld\n", rtcBaseTimeSec);
}

/**
 * @brief 在 Deep Sleep 唤醒后未能联网时，通过 RTC 内存推算当前时间
 * 精度受 RTC RC 振荡器漂移影响，仅用于保证打卡记录有时间戳，非精确对时
 */
void restoreTimeFromRTC() {
    if (rtcBaseTimeSec == 0) return; // 从未对过时，无法推算
    int64_t elapsedUs = esp_timer_get_time() - rtcBaseTimerUs;
    int64_t estimatedSec = rtcBaseTimeSec + (elapsedUs / 1000000LL);
    struct timeval tv;
    tv.tv_sec = (time_t)estimatedSec;
    tv.tv_usec = 0;
    settimeofday(&tv, NULL);
    isTimeSynced = true; // 允许带时间戳打卡，但标注为估算
    Serial.printf("[时间推算] 估算当前时间戳: %lld (可能有漂移误差)\n", estimatedSec);
}

// ==========================================
// 进入深度睡眠 (核心低功耗入口)
// ==========================================

/**
 * @brief 安全进入 ESP32-C3 Deep Sleep，唤醒源为内部 RTC 定时器
 * 
 * 执行顺序：
 * 1. 蜂鸣器静音 (防止 GPIO 保持 HIGH 导致休眠期间持续鸣叫)
 * 2. RC522 Hard Power-Down
 * 3. RDM6300 断电 (MOSFET 截止)
 * 4. 关闭 WiFi 射频
 * 5. 设定 RTC 定时器唤醒 (使用动态间隔 dynamicSleepIntervalSec)
 * 6. 标记 wasDeepSleep = true，下次唤醒可判断来源
 * 7. esp_deep_sleep_start()
 * 
 * @param sleepSec 休眠时长(秒)，0 则使用 dynamicSleepIntervalSec 默认值
 */
void enterDeepSleep(int sleepSec = 0) {
    int actualSleepSec = (sleepSec > 0) ? sleepSec : dynamicSleepIntervalSec;
    if (actualSleepSec <= 0) actualSleepSec = SLEEP_INTERVAL_SEC;

    Serial.printf("\n[Deep Sleep] 准备进入深度休眠，将在 %d 秒后唤醒...\n", actualSleepSec);

    // Step 1: 蜂鸣器必须静音 (防止高电平保持导致休眠期间持续耗电)
    digitalWrite(BUZZER_PIN, LOW);

    // Step 2: RC522 Hard Power-Down (仅在 IC 卡模式下)
    if (cardType == "IC") {
        rc522PowerDown();
    }

    // Step 3: RDM6300 断电 (仅在 ID 卡模式下，通过 AO3400 MOSFET 截止)
    if (cardType == "ID") {
        rdmPowerOff();
    }

    // Step 4: 关闭 WiFi 射频
    if (isHttpServerRunning) {
        server.close();
        isHttpServerRunning = false;
    }
    WiFi.disconnect(true);
    WiFi.mode(WIFI_OFF);
    Serial.println("[Deep Sleep] WiFi 射频已关闭");

    // Step 5: 开启内部下拉，确保 RDM_PWR_PIN 低电平在休眠中由内部硬件拉低锁死，省掉外部下拉电阻
    if (cardType == "ID") {
        gpio_pullup_dis((gpio_num_t)RDM_PWR_PIN);  // 禁用上拉
        gpio_pulldown_en((gpio_num_t)RDM_PWR_PIN); // 启用下拉 (约 45kΩ)
        gpio_hold_en((gpio_num_t)RDM_PWR_PIN);     // 锁定 GPIO 状态
    }
    gpio_deep_sleep_hold_en(); // 启用 Deep Sleep 期间 GPIO hold 功能

    // Step 6: 标记深睡标志
    wasDeepSleep = true;

    // Step 7: 配置定时唤醒
    esp_sleep_enable_timer_wakeup((uint64_t)actualSleepSec * 1000000ULL);
    Serial.println("[Deep Sleep] >>> 进入 Deep Sleep，再见！");
    Serial.flush();
    delay(10); // 确保 Serial 缓冲区完全输出

    esp_deep_sleep_start();
    // 此行之后的代码不会执行，Deep Sleep 唤醒后从 setup() 重新开始
}

#endif
