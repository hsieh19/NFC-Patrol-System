import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { createErrorResponse } from '@/lib/api-error';

export async function PUT(req: NextRequest) {
    try {
        const { id, oldPassword, newPassword } = await req.json();

        if (!id || !oldPassword || !newPassword) {
            return NextResponse.json({ error: '参数不完整' }, { status: 400 });
        }

        const user = await db.user.findUnique({
            where: { id },
        });

        if (!user || !user.password) {
            return NextResponse.json({ error: '用户不存在' }, { status: 404 });
        }

        const isValid = await bcrypt.compare(oldPassword, user.password);
        if (!isValid) {
            return NextResponse.json({ error: '旧密码错误' }, { status: 401 });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        await db.user.update({
            where: { id },
            data: { password: hashedNewPassword },
        });

        return NextResponse.json({ success: true, message: '密码修改成功' });
    } catch (error: unknown) {
        return createErrorResponse(error, 'Internal Server Error');
    }
}
