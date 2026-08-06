export interface PermissionDefinition {
  key: string;
  label: string;
}

export const ALL_PERMISSIONS: PermissionDefinition[] = [
  { key: "ALL", label: "全部权限（超级管理员）" },
  { key: "ADMIN_DASHBOARD", label: "管理后台访问" },
  { key: "ADMIN_USER_MANAGE", label: "用户管理" },
  { key: "ADMIN_ROLE_MANAGE", label: "角色管理" },
  { key: "ADMIN_GROUP_MANAGE", label: "分组管理" },
  { key: "ADMIN_CHECKPOINT", label: "巡检点配置" },
  { key: "ADMIN_SCHEDULE", label: "排班计划" },
  { key: "ADMIN_MONITOR", label: "实时监控" },
  { key: "APP_SCAN", label: "APP巡检打卡" },
  { key: "APP_REPAIR", label: "APP报修提交" },
];

export type PermissionKey = (typeof ALL_PERMISSIONS)[number]["key"];

