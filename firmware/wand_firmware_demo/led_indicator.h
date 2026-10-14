#ifndef LED_INDICATOR_H
#define LED_INDICATOR_H

#include "config.h"

// ==========================================
// 双色共阴 LED 指示灯状态管理
// GPIO6 -> 红色 (HIGH 亮, LOW 灭)
// GPIO7 -> 绿色 (HIGH 亮, LOW 灭)
// ==========================================

static unsigned long redLedExpireMs = 0;
static bool isRedLedActive = false;

/**
 * @brief 初始化双色 LED 引脚
 */
inline void initLedIndicator() {
    pinMode(LED_RED_PIN, OUTPUT);
    digitalWrite(LED_RED_PIN, LOW);

    pinMode(LED_GREEN_PIN, OUTPUT);
    digitalWrite(LED_GREEN_PIN, LOW);

    isRedLedActive = false;
    redLedExpireMs = 0;
}

/**
 * @brief 熄灭所有 LED (休眠或关机前调用)
 */
inline void turnOffAllLeds() {
    isRedLedActive = false;
    redLedExpireMs = 0;
    digitalWrite(LED_RED_PIN, LOW);
    digitalWrite(LED_GREEN_PIN, LOW);
}

/**
 * @brief 读卡成功时调用，亮 3 秒红灯并暂时关闭绿灯
 */
inline void triggerCardSuccessLed() {
    isRedLedActive = true;
    redLedExpireMs = millis() + 3000;
    digitalWrite(LED_RED_PIN, HIGH);
    digitalWrite(LED_GREEN_PIN, LOW);
}

/**
 * @brief 在 loop 中高频非阻塞轮询更新 LED 状态
 * - 休眠由 enterDeepSleep() 控制全灭
 * - 读卡成功时优先红灯 3 秒
 * - 执行计划巡检 (isPatrolActive) 时亮绿灯
 * - 其余状态全灭
 */
inline void updateLedIndicator() {
    if (isRedLedActive) {
        if ((long)(millis() - redLedExpireMs) >= 0) {
            // 3 秒倒计时到期
            isRedLedActive = false;
            redLedExpireMs = 0;
            digitalWrite(LED_RED_PIN, LOW);
            // 恢复计划巡检状态下的绿灯
            digitalWrite(LED_GREEN_PIN, isPatrolActive ? HIGH : LOW);
        } else {
            // 保持红灯点亮，绿灯熄灭 (避免红绿混色)
            digitalWrite(LED_RED_PIN, HIGH);
            digitalWrite(LED_GREEN_PIN, LOW);
        }
    } else {
        digitalWrite(LED_RED_PIN, LOW);
        // 执行计划任务时亮绿灯，否则灭
        digitalWrite(LED_GREEN_PIN, isPatrolActive ? HIGH : LOW);
    }
}

#endif // LED_INDICATOR_H
