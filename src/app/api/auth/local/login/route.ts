import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { createErrorResponse } from '@/lib/api-error';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    const user = await db.user.findUnique({
      where: { username },
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

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.roleCode,
        groupId: user.groupId,
      },
    });
  } catch (error: unknown) {
    return createErrorResponse(error, 'Internal Server Error');
  }
}
