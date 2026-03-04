// System global constants for maintainability and avoiding magic numbers/strings

export const SYSTEM_CONSTANTS = {
    // Time intervals
    REPAIR_AUTO_LOCATE_TIME_WINDOW_MS: 15 * 60 * 1000, // 15 minutes window to match the latest checkpoint

    // Placeholders
    PLACEHOLDER_IMAGE_URL: 'DATA_URL_IMAGE',

    // Fallback / Defaults
    DEFAULT_ADMIN_USERNAME: 'system_admin',
    DEFAULT_ADMIN_NAME: '系统自动生成用户',
    DEFAULT_DEPARTMENT: '研发测试部',

    // Statuses
    REPAIR_STATUS_PENDING: 'PENDING',
    REPAIR_STATUS_RESOLVED: 'RESOLVED',

    PATROL_STATUS_NORMAL: 'NORMAL',
    PATROL_STATUS_ABNORMAL: 'ABNORMAL',

    // Default Plan types
    PLAN_TYPE_ORDERED: 'ORDERED',
    PLAN_TYPE_UNORDERED: 'UNORDERED',

    FREQUENCY_DAILY: 'DAILY',
} as const;
