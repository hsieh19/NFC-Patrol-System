import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createErrorResponse } from '@/lib/api-error';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const p = await params;
  return NextResponse.json({ message: "Dynamic route reachable", id: p.id });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const p = await params;
    const { nfcTagId, name, location, groupId } = await req.json();
    console.log(`[API] Updating checkpoint ${p.id}:`, { nfcTagId, name, location, groupId });

    const checkpoint = await db.checkpoint.update({
      where: { id: p.id },
      data: { nfcTagId, name, location, groupId: groupId || null },
    });
    return NextResponse.json(checkpoint);
  } catch (error: unknown) {
    console.error('[API] Update error:', error);
    if (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'NFC ID 已被其他点位占用' }, { status: 400 });
    }
    return createErrorResponse(error, 'Update failed');
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const p = await params;
    console.log(`[API] Deleting checkpoint: ${p.id}`);

    // 显式清理关联记录（虽然设置了 SetNull，但在某些严格约束下手动清理更稳健）
    await db.patrolRecord.updateMany({
      where: { checkpointId: p.id },
      data: { checkpointId: null }
    });

    // 清理 repairReport 中的外键关联
    await db.repairReport.updateMany({
      where: { checkpointId: p.id },
      data: { checkpointId: null }
    });

    // 清理路线关联
    await db.routeCheckpoint.deleteMany({
      where: { checkpointId: p.id }
    });

    await db.checkpoint.delete({
      where: { id: p.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('[API] Delete error:', error);
    return createErrorResponse(error, '删除失败');
  }
}
