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
        return null;
    }

    const payload = await verifyToken(tokenCookie);

    if (!payload || !payload.id) {
        return null;
    }

    try {
        // Fetch fresh user data from database to ensure they haven't been deleted or roles changed
        const user = await db.user.findUnique({
            where: { id: payload.id },
            include: { role: true }
        });

        return user;
    } catch {
        return null;
    }
}
