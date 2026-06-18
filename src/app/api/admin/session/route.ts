import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  adminAuthConfigured,
  adminGoogleAuthConfigured,
  clearAdminSession,
  createAdminSession,
  getAdminSession,
  verifyAdminCredentials,
} from '@/lib/adminAuth';

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export async function GET() {
  const session = await getAdminSession();
  const passwordConfigured = adminAuthConfigured();
  const googleConfigured = adminGoogleAuthConfigured();
  return NextResponse.json({
    configured: passwordConfigured || googleConfigured,
    googleConfigured,
    authenticated: Boolean(session),
    email: session?.email ?? '',
  });
}

export async function POST(request: NextRequest) {
  if (!adminAuthConfigured()) {
    return NextResponse.json({ error: 'Admin access is not configured.' }, { status: 503 });
  }

  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !verifyAdminCredentials(parsed.data.email, parsed.data.password)) {
    return NextResponse.json({ error: 'Invalid admin email or password.' }, { status: 401 });
  }

  await createAdminSession(parsed.data.email);
  return NextResponse.json({ ok: true, email: parsed.data.email.trim().toLowerCase() });
}

export async function DELETE() {
  await clearAdminSession();
  return NextResponse.json({ ok: true });
}
