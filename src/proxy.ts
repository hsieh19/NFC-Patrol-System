import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 拦截的路径，配置在此处的路径将会走中间件逻辑
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - login (login page)
         * - init (init page)
         */
        '/((?!api|_next/static|_next/image|favicon.ico|login|init|sw\\.js|manifest|icons|rootCA\\.crt).*)',
    ],
};

export async function proxy(request: NextRequest) {
    // 检查是否在登录页面，如果是的话不拦截（上面的 matcher 已经排除了 login，但这里可以再次防范）
    const pathname = request.nextUrl.pathname;
    if (pathname.startsWith('/login') || pathname.startsWith('/init')) {
        return NextResponse.next();
    }

    // JWT Verification
    const token = request.cookies.get('token')?.value;

    const loginUrl = new URL('/login', request.url);

    if (!token) {
        return NextResponse.redirect(loginUrl);
    }

    try {
        const secret = process.env.JWT_SECRET || 'nfc-patrol-system-super-secret-key-change-in-prod';
        const encoder = new TextEncoder();

        // Dynamic import logic since we use JOSE edge-compatible JWT verification
        const { jwtVerify } = await import('jose');
        await jwtVerify(token, encoder.encode(secret));

        // Token is valid, proceed
        return NextResponse.next();
    } catch (error) {
        // Token format incorrect, expired, or tampered with
        return NextResponse.redirect(loginUrl);
    }
}
