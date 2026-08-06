// System global constants for maintainability and avoiding magic numbers/strings

export const SYSTEM_CONSTANTS = {
    // Time intervals
    REPAIR_AUTO_LOCATE_TIME_WINDOW_MS: 15 * 60 * 1000, // 15 minutes window to match the latest checkpoint

    // Placeholders
    PLACEHOLDER_IMAGE_URL: 'DATA_URL_IMAGE',

    // Fallback / Defaults
    DEFAULT_ADMIN_USERNAME: 'system_admin',
    DEFAULT_ADMIN_NAME: '系统自动生成用户',
    DEFAULT_DEPARTMENT: '默认分组',

    // Statuses
    REPAIR_STATUS_PENDING: 'PENDING',
    REPAIR_STATUS_RESOLVED: 'RESOLVED',

    PATROL_STATUS_NORMAL: 'NORMAL',
    PATROL_STATUS_ABNORMAL: 'ABNORMAL',

    // Default Plan types
    PLAN_TYPE_ORDERED: 'ORDERED',
    PLAN_TYPE_UNORDERED: 'UNORDERED',

    FREQUENCY_DAILY: 'DAILY',

    // Role Definitions
    INITIAL_ROLES: [
        {
            code: 'SUPER_ADMIN',
            name: '超级管理员',
            description: '拥有所有权限的系统最高管理角色',
            isSystem: true,
            permissions: ['ALL']
        },
        {
            code: 'ADMIN',
            name: '管理员',
            description: '管理人员及巡检配置，但不具备系统级配置权限',
            isSystem: true,
            permissions: ['ADMIN_DASHBOARD', 'ADMIN_USER_MANAGE', 'ADMIN_CHECKPOINT', 'ADMIN_SCHEDULE', 'ADMIN_MONITOR', 'APP_SCAN', 'APP_REPAIR']
        },
        {
            code: 'OPERATOR',
            name: '运维人员',
            description: '负责设备维护与巡检执行',
            isSystem: true,
            permissions: ['APP_SCAN', 'APP_REPAIR', 'ADMIN_MONITOR']
        },
        {
            code: 'SECURITY',
            name: '保安人员',
            description: '负责常规巡逻打卡',
            isSystem: true,
            permissions: ['APP_SCAN']
        }
    ]
} as const;
