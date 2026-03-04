import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import { NextRequest } from 'next/server';
import { db } from './db';

const getSecret = () => {
    // In production, you should use a strong environment variable secret
    // fallback to a default secret for development if none is provided.
    // It is important that this string is at least 32 bytes long for HS256 algorithm.
    const secret = process.env.JWT_SECRET || 'nfc-patrol-system-super-secret-key-change-in-prod';
    return new TextEncoder().encode(secret);
};

export interface UserJwtPayload extends JWTPayload {
    id: string;
    username: string;
    roleCode: string;
    groupId: string | null;
}

/**
 * Generate a JWT token for a user
 */
export async function signToken(payload: { id: string, username: string, roleCode: string, groupId: string | null }): Promise<string> {
    const token = await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h') // Token expires in 24 hours
        .sign(getSecret());

    return token;
}

/**
 * Verify a JWT token
 * Returns the decoded payload if valid, or null if invalid/expired
 */
export async function verifyToken(token: string): Promise<UserJwtPayload | null> {
    try {
        const { payload } = await jwtVerify(token, getSecret());
        return payload as UserJwtPayload;
    } catch (error) {
        return null;
    }
}

/**
 * Helper to get the authenticated user from the request
 * Used in API routes to get the user context safely
 */
export async function getAuthUser(req: NextRequest) {
    // Get token from cookie
    const tokenCookie = req.cookies.get('token')?.value;

    if (!tokenCookie) {
        console.log(`[Auth] No token cookie found`);
        return null;
    }

    const payload = await verifyToken(tokenCookie);

    if (!payload || !payload.id) {
        console.log(`[Auth] Token verification failed or ID missing: ${!!payload}`);
        return null;
    }

    try {
        const user = await db.user.findUnique({
            where: { id: payload.id },
            include: { role: true }
        });
        if (!user) console.log(`[Auth] User with ID ${payload.id} not found in DB`);
        return user;
    } catch (e) {
        console.error(`[Auth] DB Fetch Error:`, e);
        return null;
    }
}

/**
 * Check if the authenticated user has a specific permission
 */
export async function checkPermission(req: NextRequest, permission: string): Promise<boolean> {
    const user = await getAuthUser(req);
    if (!user || !user.role) {
        console.log(`[Permission Check] User not found or role missing for: ${permission}`);
        return false;
    }

    try {
        const permissions = JSON.parse(user.role.permissions || '[]') as string[];
        const hasPerm = permissions.includes('ALL') || permissions.includes(permission);
        console.log(`[Permission Check] User: ${user.username}, Role: ${user.roleCode}, Check: ${permission}, Result: ${hasPerm}`);
        return hasPerm;
    } catch (e) {
        console.error(`[Permission Check] Parse error for user ${user.username}:`, e);
        return false;
    }
}
