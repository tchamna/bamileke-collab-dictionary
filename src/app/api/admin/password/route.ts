import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminSession } from '@/lib/adminAuth';
import { setAdminPasswordHash } from '@/lib/db';
import { hashPassword } from '@/lib/passwordHash';

const passwordSchema = z.object({
  password: z.string().min(12).max(200),
});

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 });
  }

  const parsed = passwordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Password must be at least 12 characters.' }, { status: 400 });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await setAdminPasswordHash(session.email, passwordHash);

  return NextResponse.json({ ok: true });
}
