#ifndef UTILS_H
#define UTILS_H

#include "config.h"

// ==========================================
// 有源蜂鸣器鸣叫提示
// ==========================================
void beep(int ms) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(ms);
    digitalWrite(BUZZER_PIN, LOW);
}

// ==========================================
// 校准 ESP32-C3 内部 RTC 系统时间
// ==========================================
void syncLocalTime(unsigned long long epochMs) {
    struct timeval tv;
    tv.tv_sec = epochMs / 1000;
    tv.tv_usec = (epochMs % 1000) * 1000;
    settimeofday(&tv, NULL);
    isTimeSynced = true;
    Serial.printf("[对时成功] 本地系统时间已校准为: %ld\n", tv.tv_sec);
}

// 获取当前绝对毫秒级时间戳
unsigned long long getAbsoluteTimestamp() {
    struct timeval tv;
    gettimeofday(&tv, NULL);
    return (unsigned long long)tv.tv_sec * 1000 + (tv.tv_usec / 1000);
}

#endif
