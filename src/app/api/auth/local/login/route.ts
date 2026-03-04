import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { createErrorResponse } from '@/lib/api-error';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    const user = await db.user.findUnique({
      where: { username },
      include: { role: true }
    });

    if (!user || !user.password) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const tokenPayload = {
      id: user.id,
      username: user.username || '',
      name: user.name,
      roleCode: user.roleCode,
      groupId: user.groupId,
    };
    const { signToken } = await import('@/lib/auth');
    const token = await signToken(tokenPayload);

    let permissions = [];
    try {
      permissions = JSON.parse(user.role?.permissions || '[]');
    } catch {
      permissions = [];
    }

    const response = NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.roleCode,
        groupId: user.groupId,
        permissions: permissions
      },
    });

    response.cookies.set('token', token, {
      path: '/',
      maxAge: 86400, // 24 hours
      sameSite: 'lax',
      httpOnly: false, // set to false because we might need to access it on client side for now, though better to use httpOnly
    });

    return response;
  } catch (error: unknown) {
    return createErrorResponse(error, 'Internal Server Error');
  }
}
