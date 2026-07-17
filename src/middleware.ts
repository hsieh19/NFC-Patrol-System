import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 拦截的路径：排除公开资源与登录/初始化页面
export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico|login|init|sw\\.js|manifest|icons|rootCA\\.crt).*)',
    ],
};

export async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname;

    // matcher 已排除，这里作为双重保险
    if (pathname.startsWith('/login') || pathname.startsWith('/init')) {
        return NextResponse.next();
    }

    const token = request.cookies.get('token')?.value;
    const loginUrl = new URL('/login', request.url);

    if (!token) {
        return NextResponse.redirect(loginUrl);
    }

    try {
        const secret = process.env.JWT_SECRET || 'nfc-patrol-system-super-secret-key-change-in-prod';
        const { jwtVerify } = await import('jose');
        await jwtVerify(token, new TextEncoder().encode(secret));
        return NextResponse.next();
    } catch {
        // Token 过期、格式错误或被篡改
        return NextResponse.redirect(loginUrl);
    }
}
