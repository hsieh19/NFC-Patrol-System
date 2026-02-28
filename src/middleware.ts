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
        '/((?!api|_next/static|_next/image|favicon.ico|login|init).*)',
    ],
};

export function middleware(request: NextRequest) {
    // 检查是否在登录页面，如果是的话不拦截（上面的 matcher 已经排除了 login，但这里可以再次防范）
    const pathname = request.nextUrl.pathname;
    if (pathname.startsWith('/login') || pathname.startsWith('/init')) {
        return NextResponse.next();
    }

    // 检查是否有登录凭证（比如本地 cookie 中是否包含 token）
    // 注意：在实际项目中，这里应该验证 Token 的有效性
    const token = request.cookies.get('token')?.value;

    if (!token) {
        // 如果没有 token，重定向到登录页
        // 使用 request.url 作为源 URL 构建完整的重定向 URL
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
    }

    // 放行
    return NextResponse.next();
}
