import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminSession } from '@/lib/adminAuth';
import { approveAdminContributions, deleteAdminContributions, rejectAdminContributions } from '@/lib/db';

const batchSchema = z.object({
  action: z.enum(['approve', 'reject', 'delete']),
  ids: z.array(z.number().int().positive()).min(1).max(500),
});

export async function PATCH(request: NextRequest) {
  const adminSession = await getAdminSession();
  if (!adminSession) return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 });

  const parsed = batchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updatedCount =
    parsed.data.action === 'approve'
      ? await approveAdminContributions(parsed.data.ids, adminSession.email)
      : parsed.data.action === 'reject'
        ? await rejectAdminContributions(parsed.data.ids, adminSession.email)
        : await deleteAdminContributions(parsed.data.ids);
  return NextResponse.json({ ok: true, updatedCount });
}
