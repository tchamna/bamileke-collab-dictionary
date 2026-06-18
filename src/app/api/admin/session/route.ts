import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  adminAuthConfigured,
  clearAdminSession,
  createAdminSession,
  isAdminSession,
  verifyAdminPassword,
} from '@/lib/adminAuth';

const loginSchema = z.object({
  password: z.string().min(1),
});

export async function GET() {
  return NextResponse.json({
    configured: adminAuthConfigured(),
    authenticated: await isAdminSession(),
  });
}

export async function POST(request: NextRequest) {
  if (!adminAuthConfigured()) {
    return NextResponse.json({ error: 'Admin password is not configured.' }, { status: 503 });
  }

  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !verifyAdminPassword(parsed.data.password)) {
    return NextResponse.json({ error: 'Invalid admin password.' }, { status: 401 });
  }

  await createAdminSession();
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await clearAdminSession();
  return NextResponse.json({ ok: true });
}

