import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/adminAuth';
import { approveAdminContributions } from '@/lib/db';

const batchSchema = z.object({
  action: z.literal('approve'),
  ids: z.array(z.number().int().positive()).min(1).max(500),
});

export async function PATCH(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const parsed = batchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updatedCount = await approveAdminContributions(parsed.data.ids);
  return NextResponse.json({ ok: true, updatedCount });
}
