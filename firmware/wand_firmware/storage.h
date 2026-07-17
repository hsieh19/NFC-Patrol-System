#ifndef STORAGE_H
#define STORAGE_H

#include "config.h"

// ==========================================
// 离线刷卡记录 LittleFS 缓存管理
// ==========================================
void cacheRecord(String cardId, unsigned long long ts) {
    File file = LittleFS.open("/offline_records.txt", "a");
    if (file) {
        // 卡号,时间戳 (逗号分隔，换行结束)
        file.printf("%s,%llu\n", cardId.c_str(), ts);
        file.close();
        Serial.printf("[离线缓存] 卡号: %s, 时间: %llu 写入 LittleFS 成功。\n", cardId.c_str(), ts);
    } else {
        Serial.println("[缓存失败] 无法打开缓存文件！");
    }
}

#endif
