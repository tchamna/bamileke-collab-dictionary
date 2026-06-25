import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { deleteAdminContribution, updateAdminContribution } from '@/lib/db';
import { getAdminSession, requireAdmin } from '@/lib/adminAuth';

const updateSchema = z.object({
  language: z.string().trim().min(1).max(80),
  translation: z.string().trim().min(1).max(800),
  synonyms: z.string().trim().max(1200).default(''),
  contributorName: z.string().trim().max(120).default(''),
  notes: z.string().trim().max(1200).default(''),
  status: z.enum(['approved', 'pending', 'rejected']).default('pending'),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const adminSession = await getAdminSession();
  if (!adminSession) return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 });

  const { id } = await context.params;
  const contributionId = Number(id);
  if (!Number.isInteger(contributionId) || contributionId <= 0) {
    return NextResponse.json({ error: 'Invalid contribution id.' }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await updateAdminContribution({ id: contributionId, ...parsed.data, reviewerEmail: adminSession.email });
  if (!updated) {
    return NextResponse.json({ error: 'Contribution not found.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { id } = await context.params;
  const contributionId = Number(id);
  if (!Number.isInteger(contributionId) || contributionId <= 0) {
    return NextResponse.json({ error: 'Invalid contribution id.' }, { status: 400 });
  }

  const deleted = await deleteAdminContribution(contributionId);
  if (!deleted) {
    return NextResponse.json({ error: 'Contribution not found.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
