import { useMemo, useEffect, useState } from 'react';
import { PermissionKey } from '@/lib/permissions';

export interface UserInfo {
    id: string;
    username: string;
    name: string;
    roleCode: string;
    permissions?: string[]; // permissions array
    role?: {
        code: string;
        name: string;
        permissions: string; // JSON string
    };
}

export function usePermissions() {
    const [user, setUser] = useState<UserInfo | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const parsed = JSON.parse(userStr) as UserInfo;
                setUser(parsed);

                // If we already have permissions in localStorage (from new login logic), we don't strictly need to block loading
                if (parsed.permissions && parsed.permissions.length > 0) {
                    setLoading(false);
                }

                // Background refresh still good to stay synchronized
                fetch(`/api/admin/roles/${parsed.roleCode || (parsed as any).role}`)
                    .then(res => {
                        if (!res.ok) throw new Error('Failed to fetch role');
                        return res.json();
                    })
                    .then(roleData => {
                        if (roleData && roleData.permissions) {
                            setUser(prev => ({
                                ...prev!,
                                role: roleData
                            }));
                        }
                        setLoading(false);
                    })
                    .catch(() => {
                        setLoading(false);
                    });
            } catch (e) {
                setLoading(false);
            }
        } else {
            setLoading(false);
        }
    }, []);

    const permissions = useMemo(() => {
        // Priority 1: user.role.permissions (newest from fetch)
        if (user?.role?.permissions) {
            const p = user.role.permissions;
            // API returns permissions as array, but DB stores as JSON string
            if (Array.isArray(p)) return p as string[];
            if (typeof p === 'string') {
                try {
                    return JSON.parse(p) as string[];
                } catch {
                    // fall through
                }
            }
        }
        // Priority 2: user.permissions (from login payload)
        if (user?.permissions) return user.permissions;

        return [];
    }, [user]);

    const hasPermission = (permission: PermissionKey | PermissionKey[]) => {
        if (permissions.includes('ALL')) return true;
        if (Array.isArray(permission)) {
            return permission.some(p => permissions.includes(p));
        }
        return permissions.includes(permission);
    };

    return { hasPermission, loading, user };
}
